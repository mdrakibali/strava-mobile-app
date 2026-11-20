import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FeedCard, FeedCardSkeleton } from '../../components/activity/FeedCard';
import {
  AppBar,
  AppText,
  color,
  EmptyState,
  ErrorState,
  IconButton,
  space,
} from '../../design';
import { useApp } from '../../context/AppContext';
import { ActivityView, fromFeedItem } from '../../lib/activityView';
import { formatClock } from '../../lib/format';
import { api } from '../../services/api';

type Status = 'loading' | 'ready' | 'error';

/**
 * Home feed = own + followed athletes (research §13), newest first, cursor-paginated.
 * Reference: ScreensDesign 374837 / 374809.
 */
export default function HomeFeedScreen() {
  const router = useRouter();
  const { currentUser, unreadNotificationCount, activeRecording } = useApp();
  const [items, setItems] = useState<ActivityView[]>([]);
  const [status, setStatus] = useState<Status>('loading');
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadMoreError, setLoadMoreError] = useState(false);
  const cursorRef = useRef<string | null>(null);
  const hasNextRef = useRef(false);

  // Defence in depth only — the server must enforce visibility (technical audit PRIV-02).
  const visibleToMe = useCallback(
    (a: ActivityView) => a.athlete.id === currentUser.id || a.visibility !== 'ONLY_ME',
    [currentUser.id]
  );

  /** Fetches page 1 without touching state; callers apply the result. */
  const fetchFirstPage = useCallback(async () => {
    const res = await api.feed.getFeed('following');
    return {
      items: res.feed.map(fromFeedItem).filter(visibleToMe),
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
        if (cancelled) return;
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
    try {
      const page = await fetchFirstPage();
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
    try {
      const res = await api.feed.getFeed('following', cursorRef.current);
      cursorRef.current = res.nextCursor;
      hasNextRef.current = res.hasNextPage;
      const next = res.feed.map(fromFeedItem).filter(visibleToMe);
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

  const header = (
    <AppBar
      title="Home"
      large
      leading="none"
      right={
        <>
          <IconButton icon="search-outline" accessibilityLabel="Find athletes" onPress={() => router.push('/search')} />
          <IconButton
            icon="notifications-outline"
            accessibilityLabel="Notifications"
            badgeCount={unreadNotificationCount}
            onPress={() => router.push('/notifications')}
          />
        </>
      }
    />
  );

  const recordingBanner =
    activeRecording.isRecording ? (
      <Pressable
        onPress={() => router.push('/record')}
        accessibilityRole="button"
        accessibilityLabel="Return to recording"
        style={[styles.banner, activeRecording.isPaused && { backgroundColor: color.warning }]}>
        <Ionicons
          name={activeRecording.isPaused ? 'pause' : 'radio-button-on'}
          size={18}
          color={activeRecording.isPaused ? color.ink : color.inverse}
        />
        <AppText
          variant="bodyStrong"
          color={activeRecording.isPaused ? 'ink' : 'inverse'}
          style={{ flex: 1, marginLeft: space.sm }}>
          {activeRecording.isPaused ? 'Recording paused' : 'Recording'} · {formatClock(activeRecording.elapsedSeconds)}
        </AppText>
        <AppText variant="label" color={activeRecording.isPaused ? 'ink' : 'inverse'} style={{ fontWeight: '700' }}>
          Return
        </AppText>
      </Pressable>
    ) : null;

  let body: React.ReactNode;
  if (status === 'loading') {
    body = (
      <View>
        <FeedCardSkeleton />
        <FeedCardSkeleton />
      </View>
    );
  } else if (status === 'error') {
    body = <ErrorState message="We couldn’t load your feed. Check your connection and try again." onRetry={retry} />;
  } else {
    body = (
      <FlatList
        data={items}
        keyExtractor={(a) => `${a.id}:${a.kudosCount}:${a.commentsCount}`}
        renderItem={({ item }) => <FeedCard activity={item} currentUserId={currentUser.id} />}
        onEndReached={onEndReached}
        onEndReachedThreshold={0.6}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[color.brand]} />}
        contentContainerStyle={items.length === 0 ? { flexGrow: 1 } : { paddingTop: space.sm, paddingBottom: space.xxxl }}
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
          loadingMore ? (
            <ActivityIndicator style={{ margin: space.xl }} color={color.brand} />
          ) : loadMoreError ? (
            <View style={{ padding: space.gutter }}>
              <ErrorState compact message="Couldn’t load more activities." onRetry={onEndReached} />
            </View>
          ) : undefined
        }
      />
    );
  }

  return (
    <SafeAreaView edges={['top']} style={styles.screen}>
      {header}
      {recordingBanner}
      {body}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.canvas },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: color.brand,
    paddingHorizontal: space.gutter,
    minHeight: 48,
  },
});
