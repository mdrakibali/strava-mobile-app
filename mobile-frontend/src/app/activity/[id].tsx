import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useRef, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { ActivityBody, DetailSkeleton } from '../../components/activity/ActivityBody';
import { MapView } from '../../components/map/MapView';
import { useApp } from '../../context/AppContext';
import { AppBar, AppText, EmptyState, ErrorState, IconButton } from '../../design';
import { useActivityDetail, useDeleteActivity } from '../../hooks/useActivities';
import { useKeyboardInset } from '../../lib/useKeyboardInset';

export default function ActivityDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const { currentUser } = useApp();
  const keyboard = useKeyboardInset();
  const scrollRef = useRef<{ scrollToEnd: (options?: { animated?: boolean }) => void } | null>(null);
  const [isScrolled, setIsScrolled] = useState(false);

  const { data, isLoading, isError, error, refetch } = useActivityDetail(id);
  const { mutate: deleteActivity } = useDeleteActivity();

  if (isLoading) {
    return (
      <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
        <AppBar title="" />
        <DetailSkeleton />
      </SafeAreaView>
    );
  }

  if (isError || !data?.activity) {
    const isNotFound = /not found/i.test(String(error?.message || ''));
    return (
      <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
        <AppBar title="Activity" />
        {isNotFound ? (
          <EmptyState
            icon="eye-off-outline"
            title="This activity isn’t available"
            body="It may have been deleted, or its owner made it private."
            primary={{ label: 'Go back', onPress: () => router.back() }}
          />
        ) : (
          <ErrorState
            message={error?.message || 'We couldn’t load this activity.'}
            onRetry={() => refetch()}
          />
        )}
      </SafeAreaView>
    );
  }

  const { activity, isOwner } = data;
  const hasMap = activity.route.length > 1;
  const mapHeight = Math.round(height * 0.42);

  const confirmDelete = (activityId: string) =>
    Alert.alert('Delete activity?', 'It will be removed for everyone. This can’t be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          deleteActivity(activityId, {
            onSuccess: () => router.back(),
            onError: (e: any) => Alert.alert('Couldn’t delete', e?.message ?? 'Please try again.'),
          });
        },
      },
    ]);

  return (
    <View className="flex-1 bg-white">
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={insets.top}>
        <ScrollView
          ref={(node) => {
            scrollRef.current = node;
          }}
          style={{ flex: 1 }}
          automaticallyAdjustKeyboardInsets
          keyboardShouldPersistTaps="handled"
          onScroll={(e) => {
            const y = e.nativeEvent.contentOffset.y;
            const threshold = hasMap ? mapHeight - (insets.top + 56) : 20;
            setIsScrolled(y > threshold);
          }}
          scrollEventThrottle={16}
          contentContainerStyle={{ paddingBottom: insets.bottom + 32 + keyboard }}>
          {hasMap ? (
            <View style={{ height: mapHeight }}>
              <MapView mode="route" route={activity.route} padding={{ top: insets.top, bottom: 24 }} />
            </View>
          ) : (
            <View style={{ height: insets.top + 56 }} />
          )}
          <View className={`bg-white p-4 pt-6 ${hasMap ? '-mt-5 rounded-t-3xl' : ''}`}>
            <ActivityBody
              activity={activity}
              isOwner={isOwner}
              currentUserId={currentUser.id}
              currentUserName={currentUser.displayName}
              currentUserAvatar={currentUser.avatarUrl}
              onComposerFocus={() => {
                setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 80);
              }}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
      <View
        pointerEvents="box-none"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: insets.top + 56,
          paddingTop: insets.top,
          backgroundColor: isScrolled || !hasMap ? '#FFFFFF' : 'transparent',
          borderBottomWidth: isScrolled || !hasMap ? 1 : 0,
          borderBottomColor: '#F3F4F6',
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: 16,
          zIndex: 50,
        }}>
        <IconButton
          icon="arrow-back"
          appearance={isScrolled || !hasMap ? 'plain' : 'floating'}
          accessibilityLabel="Back"
          onPress={() => router.back()}
        />
        {isScrolled || !hasMap ? (
          <AppText
            variant="title3"
            numberOfLines={1}
            style={{ flex: 1, marginHorizontal: 12, textAlign: 'center' }}>
            {activity.title}
          </AppText>
        ) : (
          <View style={{ flex: 1 }} />
        )}
        {isOwner ? (
          <IconButton
            icon="ellipsis-vertical"
            appearance={isScrolled || !hasMap ? 'plain' : 'floating'}
            accessibilityLabel="Activity options"
            onPress={() =>
              Alert.alert(activity.title, undefined, [
                {
                  text: 'Edit activity',
                  onPress: () => router.push({ pathname: '/activity/edit/[id]', params: { id: activity.id } }),
                },
                { text: 'Delete activity', style: 'destructive', onPress: () => confirmDelete(activity.id) },
                { text: 'Cancel', style: 'cancel' },
              ])
            }
          />
        ) : (
          <View style={{ width: 40 }} />
        )}
      </View>
    </View>
  );
}
