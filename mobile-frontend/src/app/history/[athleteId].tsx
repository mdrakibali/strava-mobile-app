import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useMemo } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useInfiniteQuery } from '@tanstack/react-query';
import { FeedCard, FeedCardSkeleton } from '../../components/activity/FeedCard';
import { useApp } from '../../context/AppContext';
import { AppBar, EmptyState, ErrorState, space } from '../../design';
import { fromProfileActivity, toAthleteSummary } from '../../lib/activityView';
import { activityKeys } from '../../hooks/useActivities';
import { api } from '../../services/api';

/**
 * Full activity history (GET /athletes/:id/activities).
 */
export default function ActivityHistoryScreen() {
  const { athleteId } = useLocalSearchParams<{ athleteId: string }>();
  const router = useRouter();
  const { currentUser } = useApp();
  const isSelf = athleteId === currentUser.id;

  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
    isRefetching,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: activityKeys.history(athleteId || ''),
    queryFn: async ({ pageParam }) => {
      const [profile, page] = await Promise.all([
        api.athletes.getProfile(athleteId!),
        api.athletes.listActivities(athleteId!, pageParam ?? null),
      ]);
      const athlete = toAthleteSummary(profile.athlete);
      return {
        items: (page.activities || []).map((r) => fromProfileActivity(r, athlete)),
        nextCursor: page.nextCursor,
        hasNextPage: page.hasNextPage,
      };
    },
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => (lastPage.hasNextPage && lastPage.nextCursor ? lastPage.nextCursor : null),
    enabled: Boolean(athleteId),
  });

  const list = useMemo(() => {
    return (data?.pages ?? []).flatMap((p) => p.items ?? []);
  }, [data]);

  const onEndReached = () => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  };

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: '#F7F7F8' }}>
      <AppBar title="Activities" />
      {isLoading ? (
        <View>
          <FeedCardSkeleton />
          <FeedCardSkeleton />
        </View>
      ) : isError ? (
        <ErrorState
          message={error?.message ?? "We couldn’t load these activities."}
          onRetry={() => refetch()}
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
            />
          )}
          onEndReached={onEndReached}
          onEndReachedThreshold={0.5}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={() => refetch()}
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
            isFetchingNextPage ? (
              <ActivityIndicator style={{ margin: space.xl }} color="#FC4C02" />
            ) : undefined
          }
        />
      )}
    </SafeAreaView>
  );
}
