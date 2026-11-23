import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { AppBar, AppText, Avatar, color, EmptyState, ErrorState, LoadingState, space } from '../../../design';
import { toAthleteSummary } from '../../../lib/activityView';
import { activityKeys } from '../../../hooks/useActivities';
import { api } from '../../../services/api';

/** Who gave kudos (GET /activities/:id/kudos). */
export default function KudosListScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [extraItems, setExtraItems] = useState<any[]>([]);
  const [loadingMore, setLoadingMore] = useState(false);
  const cursor = useRef<string | null>(null);

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: activityKeys.kudos(id || ''),
    queryFn: async () => {
      if (!id) throw new Error('ID required');
      const res = await api.activities.listKudos(id);
      cursor.current = res.nextCursor;
      return res;
    },
    enabled: Boolean(id),
  });

  const athletes = [...(data?.athletes ?? []), ...extraItems];
  const count = data?.kudosCount ?? athletes.length;

  const more = async () => {
    if (!cursor.current || loadingMore || !id) return;
    setLoadingMore(true);
    try {
      const res = await api.activities.listKudos(id, cursor.current);
      cursor.current = res.nextCursor;
      setExtraItems((prev) => [...prev, ...res.athletes.filter((a: any) => !prev.some((p) => p.id === a.id))]);
    } finally {
      setLoadingMore(false);
    }
  };

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
          onEndReached={more}
          contentContainerStyle={athletes.length === 0 ? { flexGrow: 1 } : undefined}
          ListEmptyComponent={<EmptyState icon="thumbs-up-outline" title="No kudos yet" />}
          ListFooterComponent={loadingMore ? <ActivityIndicator color={color.brand} style={{ margin: space.lg }} /> : undefined}
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
