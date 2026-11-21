import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, RefreshControl, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FeedCard, FeedCardSkeleton } from '../../components/activity/FeedCard';
import { HomeHeader } from '../../components/home/HomeHeader';
import { EmptyState, ErrorState } from '../../design';
import { useApp } from '../../context/AppContext';
import { APP_NAME } from '../../config/app';
import { ActivityView, fromFeedItem } from '../../lib/activityView';
import { presentActivities, useActivityRevision } from '../../lib/publishedActivities';
import { withoutRemoved } from '../../lib/removedActivities';
import { socialStore } from '../../lib/social';
import { formatClock } from '../../lib/format';
import { api } from '../../services/api';
import { syncWorker } from '../../tracking/sync';
import { recordingEngine } from '../../tracking/engine';
import { isRecordingActive, timerSeconds, useNow, usePendingUploads, useRecording } from '../../tracking/useRecording';

type Status = 'loading' | 'ready' | 'error';

/**
 * Home feed = every activity this viewer is allowed to see, newest first.
 * Using the following list whenever it is non-empty hid everyone else as soon as you
 * had one activity of your own.
 */
const HOME_FEED_TAB = 'all' as const;
export default function HomeFeedScreen() {
  const router = useRouter();
  const { currentUser, unreadNotificationCount } = useApp();
  const rec = useRecording();
  const active = isRecordingActive(rec);
  const paused = rec.lifecycle.status === 'paused';
  const interrupted = rec.lifecycle.pauseReason === 'interrupted';
  const now = useNow(active && !paused);
  const pending = usePendingUploads();
  const attention = pending.filter((p) => p.state === 'needs_attention');
  const [items, setItems] = useState<ActivityView[]>([]);
  const [status, setStatus] = useState<Status>('loading');
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadMoreError, setLoadMoreError] = useState(false);
  const cursorRef = useRef<string | null>(null);
  const hasNextRef = useRef(false);
  // Bumped by every first-page load; a "load more" that started before it is discarded, so a
  // refresh can never be followed by a stale page appended to the fresh list.
  const generation = useRef(0);
  const lastLoadedAt = useRef(0);
  const requestSeq = useRef(0);
  const revision = useActivityRevision();

  // Defence in depth only — the server must enforce visibility (technical audit PRIV-02).
  const visibleToMe = useCallback(
    (a: ActivityView) => a.athlete.id === currentUser.id || a.visibility !== 'ONLY_ME',
    [currentUser.id]
  );

  /** Fetches page 1 without touching state; callers apply the result. */
  const fetchFirstPage = useCallback(async () => {
    const seq = ++requestSeq.current;
    const readTick = socialStore.beginRead();
    const res = await api.feed.getFeed(HOME_FEED_TAB, undefined, 500);
    const items = withoutRemoved((res?.feed || []).map(fromFeedItem).filter(visibleToMe));
    socialStore.seed(items, readTick);
    return {
      seq,
      items,
      cursor: res.nextCursor,
      hasNext: res.hasNextPage,
    };
  }, [visibleToMe]);

  // First page: state is only set in promise callbacks (status starts as 'loading').
  const [reloadKey, setReloadKey] = useState(0);
  useEffect(() => {
    let cancelled = false;
    fetchFirstPage().then(
      (page) => {
        if (cancelled || page.seq !== requestSeq.current) return;
        generation.current++;
        lastLoadedAt.current = Date.now();
        cursorRef.current = page.cursor;
        hasNextRef.current = page.hasNext;
        setItems(page.items);
        setStatus('ready');
      },
      () => !cancelled && setStatus('error')
    );
    return () => {
      cancelled = true;
    };
  }, [fetchFirstPage, reloadKey]);

  const retry = () => {
    setStatus('loading');
    setReloadKey((k) => k + 1);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    syncWorker.kick(); // also push any activity still waiting to upload
    try {
      const page = await fetchFirstPage();
      if (page.seq !== requestSeq.current) return;
      generation.current++;
      lastLoadedAt.current = Date.now();
      setLoadMoreError(false);
      cursorRef.current = page.cursor;
      hasNextRef.current = page.hasNext;
      setItems(page.items);
      setStatus('ready');
    } catch {
      // keep current items; surface error only if we have nothing to show
      if (items.length === 0) setStatus('error');
    } finally {
      setRefreshing(false);
    }
  };

  const onEndReached = async () => {
    if (loadingMore || !hasNextRef.current || !cursorRef.current || status !== 'ready') return;
    setLoadingMore(true);
    setLoadMoreError(false);
    const gen = generation.current;
    const readTick = socialStore.beginRead();
    try {
      const res = await api.feed.getFeed(HOME_FEED_TAB, cursorRef.current);
      if (gen !== generation.current) return; // a refresh replaced the list meanwhile
      cursorRef.current = res.nextCursor;
      hasNextRef.current = res.hasNextPage;
      const next = withoutRemoved(res.feed.map(fromFeedItem).filter(visibleToMe));
      socialStore.seed(next, readTick);
      setItems((prev) => {
        const seen = new Set(prev.map((p) => p.id));
        return [...prev, ...next.filter((n) => !seen.has(n.id))];
      });
    } catch {
      setLoadMoreError(true);
    } finally {
      setLoadingMore(false);
    }
  };

  // Fresh data whenever Home is shown again (after saving, following someone, commenting, deleting…),
  // without a loading flash.
  useFocusEffect(
    useCallback(() => {
      fetchFirstPage()
        .then((page) => {
          if (page.seq !== requestSeq.current) return;
          generation.current++;
          lastLoadedAt.current = Date.now();
          cursorRef.current = page.cursor;
          hasNextRef.current = page.hasNext;
          setItems(page.items);
          setStatus('ready');
        })
        .catch(() => {});
    }, [fetchFirstPage])
  );

  // An activity just finished uploading → show it.
  const pendingCount = pending.length;
  const prevPending = useRef(pendingCount);
  useEffect(() => {
    if (pendingCount < prevPending.current) setReloadKey((k) => k + 1);
    prevPending.current = pendingCount;
  }, [pendingCount]);

  // Saved on the phone but not yet confirmed by the server (local-first; never silently dropped).
  const uploadsBanner =
    pending.length > 0 ? (
      <TouchableOpacity
        onPress={() => syncWorker.kick(true)}
        activeOpacity={0.85}
        className={`flex-row items-center px-4 py-2 border-b border-gray-200 ${attention.length ? 'bg-red-50' : 'bg-white'}`}>
        <Ionicons name={attention.length ? 'warning-outline' : 'cloud-upload-outline'} size={18} color={attention.length ? '#DC2626' : '#1F2937'} />
        <View className="flex-1 ml-3">
          <Text className="text-xs font-bold text-gray-900">{pending.length === 1 ? `“${pending[0].title}” is waiting to upload` : `${pending.length} activities waiting to upload`}</Text>
          <Text className="text-[11px] text-gray-500" numberOfLines={1}>{attention.length ? attention[0].lastError ?? 'Upload rejected.' : 'Saved locally. Uploads automatically when online.'}</Text>
        </View>
        <Text className="text-xs font-black text-[#FC4C02]">Retry</Text>
      </TouchableOpacity>
    ) : null;

  const activeWorkoutBanner = active ? (
    <View className="mx-4 my-2 p-3 rounded-2xl bg-orange-50 border-2 border-[#FC4C02] flex-row items-center justify-between shadow-sm">
      <TouchableOpacity onPress={() => router.push('/record')} activeOpacity={0.85} className="flex-row items-center flex-1 mr-2">
        <View className="w-8 h-8 rounded-full bg-[#FC4C02] items-center justify-center mr-2.5">
          <Ionicons name="radio-button-on" size={16} color="#FFFFFF" />
        </View>
        <View className="flex-1">
          <Text className="text-xs font-black text-gray-900">Workout in progress</Text>
          <Text className="text-[11px] font-bold text-[#FC4C02]">{rec.sport} · {paused ? 'Paused' : 'Recording'} (tap to return)</Text>
        </View>
      </TouchableOpacity>
      <View className="flex-row items-center">
        <TouchableOpacity onPress={() => router.push('/record')} className="bg-[#FC4C02] px-3 py-1 rounded-full mr-1.5">
          <Text className="text-white text-xs font-black">Return</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => Alert.alert('Discard?', 'End and delete this workout?', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Discard', style: 'destructive', onPress: () => recordingEngine.discard() },
          ])}
          className="p-1 rounded-full bg-orange-100 active:bg-orange-200">
          <Ionicons name="close" size={16} color="#EA580C" />
        </TouchableOpacity>
      </View>
    </View>
  ) : null;

  const feed = useMemo(() => presentActivities(items).filter(visibleToMe), [items, revision, visibleToMe]);

  let body: React.ReactNode;
  if (status === 'loading') {
    body = (<View><FeedCardSkeleton /><FeedCardSkeleton /></View>);
  } else if (status === 'error') {
    body = <ErrorState message="We couldn’t load your feed. Check your connection and try again." onRetry={retry} />;
  } else {
    body = (
      <FlatList
        data={feed}
        keyExtractor={(a) => a.id}
        renderItem={({ item }) => (
          <FeedCard activity={item} currentUserId={currentUser.id} onDelete={(id) => setItems((prev) => prev.filter((a) => a.id !== id))} />
        )}
        onEndReached={onEndReached}
        onEndReachedThreshold={0.6}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#FC4C02']} />}
        contentContainerStyle={feed.length === 0 ? { flexGrow: 1 } : { paddingTop: 8, paddingBottom: 64 }}
        initialNumToRender={4}
        windowSize={7}
        ListEmptyComponent={
          <EmptyState
            icon="people-outline"
            title="Your feed is empty"
            body="Record an activity or follow athletes to see their activities here."
            primary={{ label: 'Record an activity', onPress: () => router.push('/record') }}
            secondary={{ label: 'Find athletes', onPress: () => router.push('/search') }}
          />
        }
        ListFooterComponent={
          loadingMore ? <ActivityIndicator className="m-6" color="#FC4C02" /> : loadMoreError ? (
            <View className="p-4"><ErrorState compact message="Couldn’t load more activities." onRetry={onEndReached} /></View>
          ) : undefined
        }
      />
    );
  }

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: '#F7F7F8' }}>
      <HomeHeader unreadNotificationCount={unreadNotificationCount} />
      {activeWorkoutBanner}
      {uploadsBanner}
      {body}
    </SafeAreaView>
  );
}
