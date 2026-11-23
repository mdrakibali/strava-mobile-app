import { useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';
import { FlatList, RefreshControl, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FeedCard, FeedCardSkeleton } from '../../components/activity/FeedCard';
import { useApp } from '../../context/AppContext';
import { AppBar, EmptyState, ErrorState } from '../../design';
import { useAthleteActivities } from '../../hooks/useActivities';

/**
 * Full activity history (GET /athletes/:id/activities).
 */
export default function ActivityHistoryScreen() {
  const { athleteId } = useLocalSearchParams<{ athleteId: string }>();
  const router = useRouter();
  const { currentUser } = useApp();
  const isSelf = athleteId === currentUser.id;

  const {
    data: list = [],
    isLoading,
    isError,
    error,
    refetch,
    isRefetching,
  } = useAthleteActivities(athleteId);

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
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={() => {
                void refetch();
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
        />
      )}
    </SafeAreaView>
  );
}
