import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useMemo } from 'react';
import { ActivityIndicator, Alert, FlatList, RefreshControl, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FeedCard, FeedCardSkeleton } from '../../components/activity/FeedCard';
import { HomeHeader } from '../../components/home/HomeHeader';
import { EmptyState, ErrorState } from '../../design';
import { useApp } from '../../context/AppContext';
import { useFeed } from '../../hooks/useActivities';
import { syncWorker } from '../../tracking/sync';
import { recordingEngine } from '../../tracking/engine';
import { isRecordingActive, usePendingUploads, useRecording } from '../../tracking/useRecording';

const HOME_FEED_TAB = 'all' as const;

export default function HomeFeedScreen() {
  const router = useRouter();
  const { currentUser, unreadNotificationCount } = useApp();
  const rec = useRecording();
  const active = isRecordingActive(rec);
  const paused = rec.lifecycle.status === 'paused';
  const pending = usePendingUploads();
  const attention = pending.filter((p) => p.state === 'needs_attention');

  // React Query infinite feed
  const {
    data,
    isLoading,
    isError,
    refetch,
    isRefetching,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useFeed(HOME_FEED_TAB);

  // Flatten and filter activities
  const feed = useMemo(() => {
    const pages = data?.pages ?? [];
    const all = pages.flatMap((p) => p.items ?? []);
    // Defence in depth: server enforces visibility
    return all.filter((a) => a.athlete.id === currentUser.id || a.visibility !== 'ONLY_ME');
  }, [data, currentUser.id]);

  const onRefresh = async () => {
    syncWorker.kick();
    await refetch();
  };

  const onEndReached = () => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  };

  // Uploads banner
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

  // Active workout banner
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

  let body: React.ReactNode;
  if (isLoading) {
    body = (
      <View>
        <FeedCardSkeleton />
        <FeedCardSkeleton />
      </View>
    );
  } else if (isError) {
    body = <ErrorState message="We couldn’t load your feed. Check your connection and try again." onRetry={() => refetch()} />;
  } else {
    body = (
      <FlatList
        data={feed}
        keyExtractor={(a) => a.id}
        renderItem={({ item }) => (
          <FeedCard activity={item} currentUserId={currentUser.id} />
        )}
        onEndReached={onEndReached}
        onEndReachedThreshold={0.5}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={onRefresh} colors={['#FC4C02']} />}
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
          isFetchingNextPage ? <ActivityIndicator className="m-6" color="#FC4C02" /> : undefined
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
