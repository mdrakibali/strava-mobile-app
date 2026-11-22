import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FeedCard, FeedCardSkeleton } from '../../components/activity/FeedCard';
import { useApp } from '../../context/AppContext';
import { AppBar, EmptyState, ErrorState, space } from '../../design';
import { ActivityView, fromProfileActivity, toAthleteSummary } from '../../lib/activityView';
import { presentActivities, useActivityRevision } from '../../lib/publishedActivities';
import { markActivityRemoved, withoutRemoved } from '../../lib/removedActivities';
import { socialStore } from '../../lib/social';
import { api } from '../../services/api';

/**
 * Full activity history (GET /athletes/:id/activities). The server applies the visibility policy
 * and paginates with a (start_time, id) cursor, so nothing is skipped or repeated.
 */
export default function ActivityHistoryScreen() {
  const { athleteId } = useLocalSearchParams<{ athleteId: string }>();
  const router = useRouter();
  const { currentUser } = useApp();
  const isSelf = athleteId === currentUser.id;
  const [items, setItems] = useState<ActivityView[]>([]);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [errMsg, setErrMsg] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [moreError, setMoreError] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const cursor = useRef<string | null>(null);
  const hasNext = useRef(false);
  const athleteRef = useRef(toAthleteSummary({ id: athleteId }));
  const revision = useActivityRevision();
  const list = useMemo(
    () => {
      void revision;
      return presentActivities(items).filter((a) => a.athlete.id === athleteId);
    },
    [items, revision, athleteId]
  );

  useEffect(() => {
    if (!athleteId) return;
    let cancelled = false;
    const readTick = socialStore.beginRead();
    Promise.all([api.athletes.getProfile(athleteId), api.athletes.listActivities(athleteId, null)]).then(
      ([profile, page]) => {
        if (cancelled) return;
        athleteRef.current = toAthleteSummary(profile.athlete);
        cursor.current = page.nextCursor;
        hasNext.current = page.hasNextPage;
        const rows = withoutRemoved(page.activities.map((r) => fromProfileActivity(r, athleteRef.current)));
        socialStore.seed(rows, readTick);
        setItems(rows);
        setStatus('ready');
        setRefreshing(false);
      },
      (e: any) => {
        if (cancelled) return;
        setErrMsg(e?.message ?? null);
        setStatus('error');
        setRefreshing(false);
      }
    );
    return () => {
      cancelled = true;
    };
  }, [athleteId, reloadKey]);

  const loadMore = async () => {
    if (loadingMore || !hasNext.current || !cursor.current || status !== 'ready') return;
    setLoadingMore(true);
    setMoreError(false);
    const readTick = socialStore.beginRead();
    try {
      const page = await api.athletes.listActivities(athleteId!, cursor.current);
      cursor.current = page.nextCursor;
      hasNext.current = page.hasNextPage;
      const next = withoutRemoved(page.activities.map((r) => fromProfileActivity(r, athleteRef.current)));
      socialStore.seed(next, readTick);
      setItems((prev) => {
        const seen = new Set(prev.map((p) => p.id));
        return [...prev, ...next.filter((n) => !seen.has(n.id))];
      });
    } catch {
      setMoreError(true);
    } finally {
      setLoadingMore(false);
    }
  };

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: '#F7F7F8' }}>
      <AppBar title="Activities" />
      {status === 'loading' ? (
        <View>
          <FeedCardSkeleton />
          <FeedCardSkeleton />
        </View>
      ) : status === 'error' ? (
        <ErrorState
          message={errMsg ?? "We couldn’t load these activities."}
          onRetry={() => {
            setStatus('loading');
            setReloadKey((k) => k + 1);
          }}
        />
      ) : (
        <FlatList
          data={list}
          keyExtractor={(a) => a.id}
          renderItem={({ item }) => (
            <FeedCard
              activity={item}
              currentUserId={isSelf ? currentUser.id : undefined}
              showAthlete={false}
              onDelete={(deletedId) => {
                markActivityRemoved(deletedId);
                setItems((prev) => prev.filter((a) => a.id !== deletedId));
              }}
            />
          )}
          onEndReached={loadMore}
          onEndReachedThreshold={0.6}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                setReloadKey((k) => k + 1);
              }}
              colors={['#FC4C02']}
            />
          }
          contentContainerStyle={list.length === 0 ? { flexGrow: 1 } : { paddingTop: 8, paddingBottom: 64 }}
          ListEmptyComponent={
            <EmptyState
              icon="footsteps-outline"
              title={isSelf ? 'No activities yet' : 'No activities to show'}
              primary={isSelf ? { label: 'Record an activity', onPress: () => router.push('/record') } : undefined}
            />
          }
          ListFooterComponent={
            loadingMore ? (
              <ActivityIndicator style={{ margin: space.xl }} color="#FC4C02" />
            ) : moreError ? (
              <View style={{ padding: space.gutter }}>
                <ErrorState compact message="Couldn’t load more activities." onRetry={loadMore} />
              </View>
            ) : undefined
          }
        />
      )}
    </SafeAreaView>
  );
}
