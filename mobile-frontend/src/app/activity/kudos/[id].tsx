import { useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';
import { FlatList, Pressable, RefreshControl, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppBar, AppText, Avatar, EmptyState, ErrorState, LoadingState, space } from '../../../design';
import { toAthleteSummary } from '../../../lib/activityView';
import { useKudosList } from '../../../hooks/useActivities';

/**
 * Athletes who gave kudos on this activity.
 * Managed directly via React Query (all items fetched at once, no pagination).
 */
export default function KudosListScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const { data, isLoading, isError, error, refetch, isRefetching } = useKudosList(id);

  const athletes = data?.athletes ?? [];
  const count = data?.kudosCount ?? athletes.length;

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
      <AppBar title={count > 0 ? `Kudos (${count})` : 'Kudos'} />
      {isLoading ? (
        <LoadingState />
      ) : isError ? (
        <ErrorState
          message={error?.message ?? "We couldn’t load kudos."}
          onRetry={() => refetch()}
        />
      ) : (
        <FlatList
          data={athletes}
          keyExtractor={(a) => a.id}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={() => {
                void refetch();
              }}
              colors={['#FC4C02']}
            />
          }
          contentContainerStyle={athletes.length === 0 ? { flexGrow: 1 } : undefined}
          ListEmptyComponent={<EmptyState icon="thumbs-up-outline" title="No kudos yet" />}
          renderItem={({ item }) => {
            const a = toAthleteSummary(item);
            return (
              <Pressable
                onPress={() => router.push({ pathname: '/athlete/[id]', params: { id: a.id } })}
                accessibilityRole="button"
                className="flex-row items-center px-4 py-3 border-b border-gray-100 active:bg-gray-50">
                <Avatar uri={a.avatarUrl} name={a.displayName} size={40} />
                <View style={{ marginLeft: space.md, flex: 1 }}>
                  <AppText variant="bodyStrong">{a.displayName}</AppText>
                  {a.city ? (
                    <AppText variant="caption" color="inkSecondary">
                      {a.city}
                    </AppText>
                  ) : null}
                </View>
              </Pressable>
            );
          }}
        />
      )}
    </SafeAreaView>
  );
}
