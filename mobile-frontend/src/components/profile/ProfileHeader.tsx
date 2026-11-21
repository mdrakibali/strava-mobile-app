import { useRouter } from 'expo-router';
import React from 'react';
import { Pressable, View } from 'react-native';
import { AppText, Avatar, Button } from '../../design';
import { AthleteSummary } from '../../lib/activityView';
import { AthleteStats } from '../../services/api';

interface Props {
  athleteId: string;
  athlete: AthleteSummary & { bio?: string | null };
  stats: AthleteStats | null;
  followersCount: number;
  followingCount: number;
  isFollowing: boolean;
  isSelf: boolean;
  followPending: boolean;
  onToggleFollow: () => void;
  onShare: () => void;
}

export const ProfileHeader: React.FC<Props> = ({
  athleteId,
  athlete,
  stats,
  followersCount,
  followingCount,
  isFollowing,
  isSelf,
  followPending,
  onToggleFollow,
  onShare,
}) => {
  const router = useRouter();
  const location = [athlete.city, athlete.country].filter(Boolean).join(', ');

  return (
    <View className="bg-white p-4 border-b border-gray-100">
      <View className="flex-row items-center">
        <Avatar uri={athlete.avatarUrl} name={athlete.displayName} size={72} />
        <View className="flex-1 ml-4">
          <AppText variant="title1" numberOfLines={2}>
            {athlete.displayName}
          </AppText>
          {stats ? (
            <AppText variant="body" color="inkSecondary" className="mt-0.5">
              {stats.activityCount} {stats.activityCount === 1 ? 'activity' : 'activities'}
            </AppText>
          ) : null}
          {location ? (
            <AppText variant="label" color="inkSecondary" className="mt-0.5">
              {location}
            </AppText>
          ) : null}
        </View>
      </View>
      {athlete.bio ? (
        <AppText variant="body" className="mt-3">
          {athlete.bio}
        </AppText>
      ) : null}
      <View className="flex-row items-center mt-3">
        <Pressable
          onPress={() => router.push({ pathname: '/athlete/followers', params: { id: athleteId } })}
          accessibilityRole="button"
          hitSlop={8}>
          <AppText variant="body">
            <AppText variant="bodyStrong">{followersCount}</AppText>
            {followersCount === 1 ? ' follower' : ' followers'}
          </AppText>
        </Pressable>
        <AppText variant="body" color="inkTertiary">
          {'  •  '}
        </AppText>
        <Pressable
          onPress={() => router.push({ pathname: '/athlete/following', params: { id: athleteId } })}
          accessibilityRole="button"
          hitSlop={8}>
          <AppText variant="body">
            <AppText variant="bodyStrong">{followingCount}</AppText> following
          </AppText>
        </Pressable>
      </View>
      <View className="flex-row items-center mt-4">
        {isSelf ? (
          <>
            <Button
              label="Edit profile"
              variant="outline"
              className="flex-1"
              onPress={() => router.push('/settings/profile-edit')}
            />
            <Button label="Share profile" variant="outline" className="flex-1 ml-3" onPress={onShare} />
          </>
        ) : (
          <Button
            label={isFollowing ? 'Following' : 'Follow'}
            icon={isFollowing ? 'checkmark' : 'person-add-outline'}
            variant={isFollowing ? 'outline' : 'primary'}
            loading={followPending}
            onPress={onToggleFollow}
            className="flex-1"
          />
        )}
      </View>
    </View>
  );
};

