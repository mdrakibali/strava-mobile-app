import { useRouter } from 'expo-router';
import React from 'react';
import { View } from 'react-native';
import { Button, EmptyState, space } from '../../design';
import { ActivityView } from '../../lib/activityView';
import { FeedCard } from '../activity/FeedCard';

interface Props {
  activities: ActivityView[];
  athleteId: string;
  isSelf: boolean;
  recentLimit: number;
  onDeleteActivity: (id: string) => void;
}

export const ProfileActivitiesTab: React.FC<Props> = ({
  activities,
  athleteId,
  isSelf,
  recentLimit,
  onDeleteActivity,
}) => {
  const router = useRouter();

  if (activities.length === 0) {
    return (
      <EmptyState
        icon="footsteps-outline"
        title={isSelf ? 'No activities yet' : 'No activities to show'}
        body={isSelf ? 'Record your first activity and it will appear here.' : undefined}
        primary={isSelf ? { label: 'Record an activity', onPress: () => router.push('/record') } : undefined}
      />
    );
  }

  return (
    <View style={{ paddingTop: space.sm }}>
      {activities.map((a) => (
        <FeedCard
          key={a.id}
          activity={a}
          currentUserId={isSelf ? athleteId : undefined}
          showAthlete={false}
          onDelete={onDeleteActivity}
        />
      ))}
      {activities.length >= recentLimit ? (
        <Button
          label="See all activities"
          variant="secondary"
          onPress={() => router.push({ pathname: '/history/[athleteId]', params: { athleteId } })}
          style={{ margin: space.gutter }}
        />
      ) : null}
    </View>
  );
};

