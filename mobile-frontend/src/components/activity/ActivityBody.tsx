import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Alert, Pressable, View } from 'react-native';
import { AppText, Avatar, Skeleton, space } from '../../design';
import { ActivityView } from '../../lib/activityView';
import { formatActivityDate } from '../../lib/format';
import { setKudos, useSocial } from '../../lib/social';
import { shareActivity } from '../../lib/share';
import { sportConfig } from '../../lib/sports';
import { VISIBILITY_LABEL } from './FeedCard';
import { ActivityComments } from './ActivityComments';
import { ActivitySplits } from './ActivitySplits';
import { ActivityStatsGrid } from './ActivityStatsGrid';

export const ActivityBody: React.FC<{
  activity: ActivityView;
  isOwner: boolean;
  currentUserId: string;
  currentUserName: string;
  currentUserAvatar?: string;
}> = ({ activity, isOwner, currentUserId, currentUserName, currentUserAvatar }) => {
  const router = useRouter();
  const sport = sportConfig(activity.sportType);
  const social = useSocial(activity.id, {
    hasKudos: activity.hasKudos,
    kudosCount: activity.kudosCount,
    commentsCount: activity.commentsCount,
  });
  const [kudosPending, setKudosPending] = useState(false);

  const onKudos = async () => {
    if (kudosPending) return;
    setKudosPending(true);
    try {
      await setKudos(activity.id, !social.hasKudos);
    } catch (e: any) {
      Alert.alert('Kudos not updated', e?.message ?? 'Check your connection and try again.');
    } finally {
      setKudosPending(false);
    }
  };

  const openKudos = () => router.push({ pathname: '/activity/kudos/[id]', params: { id: activity.id } });
  const visibility = VISIBILITY_LABEL[activity.visibility] ?? VISIBILITY_LABEL.PUBLIC;

  return (
    <View>
      <Pressable
        onPress={() => router.push({ pathname: '/athlete/[id]', params: { id: activity.athlete.id } })}
        accessibilityRole="button"
        accessibilityLabel={`${activity.athlete.displayName}'s profile`}
        className="flex-row items-center">
        <Avatar uri={activity.athlete.avatarUrl} name={activity.athlete.displayName} size={48} />
        <View style={{ flex: 1, marginLeft: space.md }}>
          <AppText variant="title3">{activity.athlete.displayName}</AppText>
          <View className="flex-row items-center mt-0.5">
            <Ionicons name={sport.icon} size={14} color="#6B7280" />
            <AppText variant="caption" color="inkTertiary" style={{ marginLeft: space.xs, flexShrink: 1 }}>
              {formatActivityDate(activity.startTime)}
              {activity.athlete.city ? ` · ${activity.athlete.city}` : ''}
            </AppText>
          </View>
        </View>
      </Pressable>

      <AppText variant="title1" style={{ marginTop: space.lg }}>
        {activity.title}
      </AppText>
      {isOwner ? (
        <View className="flex-row items-center mt-1">
          <Ionicons name={visibility.icon} size={14} color="#4B5563" />
          <AppText variant="label" color="inkSecondary" style={{ marginLeft: space.xs }}>
            Visible to: {visibility.label}
          </AppText>
        </View>
      ) : null}
      {activity.description ? (
        <AppText variant="body" color="inkSecondary" style={{ marginTop: space.sm }}>
          {activity.description}
        </AppText>
      ) : null}

      <ActivityStatsGrid activity={activity} />
      <ActivitySplits splits={activity.splits} elevationProfile={activity.elevationProfile} showSplits={sport.primaryMetric === 'pace'} />

      <View className="mt-6 pt-6 border-t border-gray-100">
        <View className="flex-row justify-between items-center">
          <Pressable onPress={openKudos} disabled={social.kudosCount === 0} accessibilityRole="button" style={{ flex: 1 }}>
            <AppText variant="bodyStrong" color={social.kudosCount > 0 ? 'ink' : 'inkSecondary'}>
              {social.kudosCount > 0 ? `${social.kudosCount} gave kudos ›` : 'No kudos yet'}
            </AppText>
          </Pressable>
          <AppText variant="label" color="inkSecondary">
            {social.commentsCount} {social.commentsCount === 1 ? 'comment' : 'comments'}
          </AppText>
        </View>
        <View className="flex-row mt-3 border-y border-gray-100">
          <Pressable
            onPress={isOwner ? openKudos : onKudos}
            disabled={kudosPending}
            accessibilityRole="button"
            className="flex-1 flex-row items-center justify-center min-h-[52px] active:bg-gray-50">
            <Ionicons name={social.hasKudos ? 'thumbs-up' : 'thumbs-up-outline'} size={24} color={social.hasKudos ? '#FC4C02' : '#111827'} />
            <AppText variant="label" style={{ marginLeft: space.sm, fontWeight: '600' }} color={social.hasKudos ? 'brandText' : 'ink'}>
              {isOwner ? 'Kudos' : social.hasKudos ? 'Kudos given' : 'Give kudos'}
            </AppText>
          </Pressable>
          {activity.visibility !== 'ONLY_ME' ? (
            <Pressable
              onPress={() => shareActivity(activity)}
              accessibilityRole="button"
              className="flex-1 flex-row items-center justify-center min-h-[52px] active:bg-gray-50">
              <Ionicons name="share-social-outline" size={24} color="#111827" />
              <AppText variant="label" style={{ marginLeft: space.sm, fontWeight: '600' }}>Share</AppText>
            </Pressable>
          ) : null}
        </View>
      </View>

      <ActivityComments
        activityId={activity.id}
        initialComments={activity.comments}
        isOwner={isOwner}
        currentUserId={currentUserId}
        currentUserName={currentUserName}
        currentUserAvatar={currentUserAvatar}
      />
    </View>
  );
};

export const DetailSkeleton: React.FC = () => (
  <View>
    <Skeleton style={{ height: 260, borderRadius: 0 }} />
    <View style={{ padding: space.gutter }}>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <Skeleton style={{ width: 48, height: 48, borderRadius: 24 }} />
        <View style={{ marginLeft: space.md, flex: 1 }}>
          <Skeleton style={{ width: '50%', height: 16 }} />
          <Skeleton style={{ width: '70%', height: 12, marginTop: space.sm }} />
        </View>
      </View>
      <Skeleton style={{ width: '70%', height: 28, marginTop: space.xl }} />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: space.lg, gap: space.lg }}>
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} style={{ width: '45%', height: 48 }} />
        ))}
      </View>
    </View>
  </View>
);

