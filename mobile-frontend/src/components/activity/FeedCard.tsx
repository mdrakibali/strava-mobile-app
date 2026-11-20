import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { memo, useState } from 'react';
import { Alert, Pressable, Text, View } from 'react-native';
import { Avatar, Skeleton } from '../../design';
import { ActivityView, avgSpeedOf } from '../../lib/activityView';
import {
  formatActivityDate,
  formatDuration,
  kmValue,
  paceValue,
  speedValue,
} from '../../lib/format';
import { setKudos, useSocial } from '../../lib/social';
import { shareActivity } from '../../lib/share';
import { sportConfig } from '../../lib/sports';
import { RoutePreview } from '../map/RoutePreview';

export const VISIBILITY_LABEL = {
  PUBLIC: { label: 'Everyone', icon: 'globe-outline' },
  FOLLOWERS_ONLY: { label: 'Followers', icon: 'people-outline' },
  ONLY_ME: { label: 'Only you', icon: 'lock-closed-outline' },
} as const;

interface FeedCardProps {
  activity: ActivityView;
  currentUserId?: string;
  /** Hide the athlete row (e.g. on a profile where every item is the same athlete). */
  showAthlete?: boolean;
}

/** Feed card (reference: ScreensDesign 374837). Title → 3 stats → route → social. */
export const FeedCard = memo(function FeedCard({
  activity,
  currentUserId,
  showAthlete = true,
}: FeedCardProps) {
  const router = useRouter();
  const sport = sportConfig(activity.sportType);
  const isOwn = activity.athlete.id === currentUserId;
  const social = useSocial(activity.id, {
    hasKudos: activity.hasKudos,
    kudosCount: activity.kudosCount,
    commentsCount: activity.commentsCount,
  });
  const [pending, setPending] = useState(false);

  const open = () => router.push({ pathname: '/activity/[id]', params: { id: activity.id } });
  const openKudos = () => router.push({ pathname: '/activity/kudos/[id]', params: { id: activity.id } });
  const openComments = () => router.push({ pathname: '/activity/[id]', params: { id: activity.id, focus: 'comments' } });

  // Own activity: the kudos button shows who gave kudos (you can't kudos yourself).
  const onKudos = async () => {
    if (isOwn) return openKudos();
    if (pending) return;
    setPending(true);
    try {
      await setKudos(activity.id, !social.hasKudos);
    } catch (e: any) {
      Alert.alert('Kudos not updated', e?.message ?? 'Check your connection and try again.');
    } finally {
      setPending(false);
    }
  };

  const speedOrPace =
    sport.primaryMetric === 'speed'
      ? { label: 'Speed', value: speedValue(avgSpeedOf(activity)), unit: 'km/h' }
      : { label: 'Pace', value: paceValue(activity.distanceMeters, activity.movingTimeSeconds), unit: '/km' };

  const visibility = VISIBILITY_LABEL[activity.visibility] ?? VISIBILITY_LABEL.PUBLIC;
  const location = activity.athlete.city;

  return (
    <View className="bg-white border-y border-gray-100 mb-2">
      {showAthlete ? (
        <View className="flex-row items-center px-4 pt-4">
          <Pressable
            onPress={() => router.push({ pathname: '/athlete/[id]', params: { id: activity.athlete.id } })}
            accessibilityRole="button"
            accessibilityLabel={`${activity.athlete.displayName}'s profile`}
            className="flex-row items-center flex-1">
            <Avatar uri={activity.athlete.avatarUrl} name={activity.athlete.displayName} size={40} />
            <View className="flex-1 ml-3">
              <View className="flex-row items-center">
                <Text className="text-sm font-bold text-gray-900" numberOfLines={1}>
                  {activity.athlete.displayName}
                </Text>
              </View>
              <View className="flex-row items-center mt-0.5">
                <Ionicons name={sport.icon} size={14} color="#6B7280" />
                <Text className="ml-1 text-xs text-gray-500 flex-shrink" numberOfLines={1}>
                  {formatActivityDate(activity.startTime)}
                  {location ? ` · ${location}` : ''}
                </Text>
              </View>
            </View>
          </Pressable>
          <Pressable
            hitSlop={12}
            onPress={() => shareActivity(activity)}
            accessibilityRole="button"
            accessibilityLabel="Activity options"
            className="p-1">
            <Ionicons name="ellipsis-horizontal" size={20} color="#4B5563" />
          </Pressable>
        </View>
      ) : (
        <View className="flex-row items-center px-4 pt-4">
          <Ionicons name={sport.icon} size={14} color="#6B7280" />
          <Text className="ml-1 text-xs text-gray-500">
            {formatActivityDate(activity.startTime)}
          </Text>
        </View>
      )}

      <Pressable onPress={open} accessibilityRole="button" accessibilityLabel={`Open ${activity.title}`}>
        <View className="px-4">
          <Text className="text-lg font-bold text-gray-900 mt-2.5" numberOfLines={2}>
            {activity.title}
          </Text>
          {isOwn && activity.visibility !== 'PUBLIC' ? (
            <View className="flex-row items-center mt-1">
              <Ionicons name={visibility.icon} size={13} color="#4B5563" />
              <Text className="ml-1 text-xs text-gray-600">
                {visibility.label}
              </Text>
            </View>
          ) : null}
          {activity.description ? (
            <Text className="text-sm text-gray-600 mt-1" numberOfLines={2}>
              {activity.description}
            </Text>
          ) : null}
          <View className="flex-row my-3 items-center">
            <View className="flex-1">
              <Text className="text-xs text-gray-500 font-medium">Distance</Text>
              <View className="flex-row items-baseline mt-0.5">
                <Text className="text-xl font-bold text-gray-900">{kmValue(activity.distanceMeters)}</Text>
                <Text className="text-xs text-gray-500 ml-1 font-semibold">km</Text>
              </View>
            </View>
            <View className="flex-1">
              <Text className="text-xs text-gray-500 font-medium">{speedOrPace.label}</Text>
              <View className="flex-row items-baseline mt-0.5">
                <Text className="text-xl font-bold text-gray-900">{speedOrPace.value}</Text>
                {speedOrPace.value !== '–' && speedOrPace.unit ? (
                  <Text className="text-xs text-gray-500 ml-1 font-semibold">{speedOrPace.unit}</Text>
                ) : null}
              </View>
            </View>
            <View className="flex-1">
              <Text className="text-xs text-gray-500 font-medium">Time</Text>
              <View className="flex-row items-baseline mt-0.5">
                <Text className="text-xl font-bold text-gray-900">{formatDuration(activity.movingTimeSeconds)}</Text>
              </View>
            </View>
          </View>
        </View>
        <RoutePreview route={activity.route} height={240} />
      </Pressable>

      <View className="pt-3 px-4 flex-row justify-between">
        <Pressable onPress={openKudos} disabled={social.kudosCount === 0} accessibilityRole="button" hitSlop={8}>
          <Text className="text-xs text-gray-500 font-medium">
            {social.kudosCount > 0 ? `${social.kudosCount} gave kudos` : isOwn ? 'No kudos yet' : 'Be the first to give kudos'}
          </Text>
        </Pressable>
        {social.commentsCount > 0 ? (
          <Pressable onPress={openComments} accessibilityRole="button" hitSlop={8}>
            <Text className="text-xs text-gray-500 font-medium">
              {social.commentsCount} {social.commentsCount === 1 ? 'comment' : 'comments'}
            </Text>
          </Pressable>
        ) : null}
      </View>

      <View className="flex-row mt-1 border-t border-gray-50">
        <Pressable
          onPress={onKudos}
          disabled={pending}
          accessibilityRole="button"
          accessibilityLabel={isOwn ? 'See who gave kudos' : social.hasKudos ? 'Remove kudos' : 'Give kudos'}
          accessibilityState={{ selected: social.hasKudos === true, busy: pending }}
          className="flex-1 flex-row items-center justify-center min-h-[48px] active:bg-gray-50">
          <Ionicons
            name={social.hasKudos ? 'thumbs-up' : 'thumbs-up-outline'}
            size={22}
            color={social.hasKudos ? '#FC4C02' : '#1F2937'}
          />
        </Pressable>
        <Pressable
          onPress={openComments}
          accessibilityRole="button"
          accessibilityLabel="Comment"
          className="flex-1 flex-row items-center justify-center min-h-[48px] active:bg-gray-50">
          <Ionicons name="chatbox-ellipses-outline" size={22} color="#1F2937" />
        </Pressable>
        {activity.visibility !== 'ONLY_ME' ? (
          <Pressable
            onPress={() => shareActivity(activity)}
            accessibilityRole="button"
            accessibilityLabel="Share activity"
            className="flex-1 flex-row items-center justify-center min-h-[48px] active:bg-gray-50">
            <Ionicons name="share-social-outline" size={22} color="#1F2937" />
          </Pressable>
        ) : null}
      </View>
    </View>
  );
});

export const FeedCardSkeleton: React.FC = () => (
  <View className="bg-white border-y border-gray-100 mb-2 pb-4" accessibilityLabel="Loading activity">
    <View className="flex-row items-center px-4 pt-4">
      <Skeleton className="w-10 h-10 rounded-full" />
      <View className="flex-1 ml-3">
        <Skeleton className="w-[45%] h-3.5" />
        <Skeleton className="w-[65%] h-3 mt-2" />
      </View>
    </View>
    <View className="px-4">
      <Skeleton className="w-[60%] h-5 mt-4" />
      <View className="flex-row mt-3 gap-4">
        <Skeleton className="w-16 h-8.5" />
        <Skeleton className="w-16 h-8.5" />
        <Skeleton className="w-16 h-8.5" />
      </View>
    </View>
    <Skeleton className="h-44 rounded-none mt-3" />
  </View>
);