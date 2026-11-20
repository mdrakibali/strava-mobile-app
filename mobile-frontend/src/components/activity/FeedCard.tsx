import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { memo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { AppText, Avatar, color, MetricRow, MetricTile, Skeleton, space } from '../../design';
import { ActivityView, avgSpeedOf } from '../../lib/activityView';
import {
  formatActivityDate,
  formatDuration,
  kmValue,
  paceValue,
  speedValue,
} from '../../lib/format';
import { giveKudos } from '../../lib/social';
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
  const [kudos, setKudos] = useState({ has: activity.hasKudos, count: activity.kudosCount });
  const [pending, setPending] = useState(false);

  const open = () => router.push({ pathname: '/activity/[id]', params: { id: activity.id } });

  const onKudos = async () => {
    if (pending || kudos.has) return;
    setPending(true);
    const prev = kudos;
    setKudos({ has: true, count: prev.count + 1 }); // optimistic
    try {
      const res = await giveKudos(activity.id, prev.has);
      setKudos({ has: res.hasKudos, count: res.kudosCount });
    } catch {
      setKudos(prev); // roll back
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
    <View style={styles.card}>
      {showAthlete ? (
        <Pressable
          onPress={() => router.push({ pathname: '/athlete/[id]', params: { id: activity.athlete.id } })}
          accessibilityRole="button"
          accessibilityLabel={`${activity.athlete.displayName}'s profile`}
          style={styles.athleteRow}>
          <Avatar uri={activity.athlete.avatarUrl} name={activity.athlete.displayName} size={40} />
          <View style={styles.athleteText}>
            <AppText variant="title3" numberOfLines={1}>
              {activity.athlete.displayName}
            </AppText>
            <View style={styles.metaRow}>
              <Ionicons name={sport.icon} size={14} color={color.inkTertiary} />
              <AppText variant="caption" color="inkTertiary" numberOfLines={1} style={styles.metaText}>
                {formatActivityDate(activity.startTime)}
                {location ? ` · ${location}` : ''}
              </AppText>
            </View>
          </View>
        </Pressable>
      ) : (
        <View style={[styles.metaRow, styles.padded, { paddingTop: space.lg }]}>
          <Ionicons name={sport.icon} size={14} color={color.inkTertiary} />
          <AppText variant="caption" color="inkTertiary" style={styles.metaText}>
            {formatActivityDate(activity.startTime)}
          </AppText>
        </View>
      )}

      <Pressable onPress={open} accessibilityRole="button" accessibilityLabel={`Open ${activity.title}`}>
        <View style={styles.padded}>
          <AppText variant="title2" style={{ marginTop: space.md }} numberOfLines={2}>
            {activity.title}
          </AppText>
          {isOwn && activity.visibility !== 'PUBLIC' ? (
            <View style={[styles.metaRow, { marginTop: space.xs }]}>
              <Ionicons name={visibility.icon} size={13} color={color.inkSecondary} />
              <AppText variant="caption" color="inkSecondary" style={styles.metaText}>
                {visibility.label}
              </AppText>
            </View>
          ) : null}
          <MetricRow style={{ marginTop: space.md, marginBottom: space.md }}>
            <MetricTile label="Distance" value={kmValue(activity.distanceMeters)} unit="km" />
            <MetricTile label={speedOrPace.label} value={speedOrPace.value} unit={speedOrPace.value === '–' ? undefined : speedOrPace.unit} />
            <MetricTile label="Time" value={formatDuration(activity.movingTimeSeconds)} />
          </MetricRow>
        </View>
        <RoutePreview route={activity.route} height={180} />
      </Pressable>

      <View style={[styles.padded, styles.socialSummary]}>
        <AppText variant="caption" color="inkSecondary">
          {kudos.count > 0 ? `${kudos.count} kudos` : 'No kudos yet'}
          {activity.commentsCount > 0
            ? ` · ${activity.commentsCount} ${activity.commentsCount === 1 ? 'comment' : 'comments'}`
            : ''}
        </AppText>
      </View>

      <View style={styles.actions}>
        {!isOwn ? (
          <Pressable
            onPress={onKudos}
            disabled={pending || kudos.has === true}
            accessibilityRole="button"
            accessibilityLabel={kudos.has ? 'Kudos given' : 'Give kudos'}
            accessibilityState={{ disabled: pending || kudos.has === true, selected: kudos.has === true }}
            style={({ pressed }) => [styles.action, pressed && styles.actionPressed]}>
            <Ionicons
              name={kudos.has ? 'thumbs-up' : 'thumbs-up-outline'}
              size={22}
              color={kudos.has ? color.brand : color.ink}
            />
            <AppText variant="label" color={kudos.has ? 'brandText' : 'ink'} style={styles.actionLabel}>
              {kudos.has ? 'Kudos given' : 'Kudos'}
            </AppText>
          </Pressable>
        ) : null}
        <Pressable
          onPress={open}
          accessibilityRole="button"
          accessibilityLabel="Comment"
          style={({ pressed }) => [styles.action, pressed && styles.actionPressed]}>
          <Ionicons name="chatbubble-outline" size={21} color={color.ink} />
          <AppText variant="label" style={styles.actionLabel}>
            Comment
          </AppText>
        </Pressable>
      </View>
    </View>
  );
});

export const FeedCardSkeleton: React.FC = () => (
  <View style={[styles.card, { paddingBottom: space.lg }]} accessibilityLabel="Loading activity">
    <View style={styles.athleteRow}>
      <Skeleton style={{ width: 40, height: 40, borderRadius: 20 }} />
      <View style={styles.athleteText}>
        <Skeleton style={{ width: '45%', height: 14 }} />
        <Skeleton style={{ width: '65%', height: 12, marginTop: space.sm }} />
      </View>
    </View>
    <View style={styles.padded}>
      <Skeleton style={{ width: '60%', height: 20, marginTop: space.lg }} />
      <View style={{ flexDirection: 'row', marginTop: space.md, gap: space.lg }}>
        <Skeleton style={{ width: 64, height: 34 }} />
        <Skeleton style={{ width: 64, height: 34 }} />
        <Skeleton style={{ width: 64, height: 34 }} />
      </View>
    </View>
    <Skeleton style={{ height: 180, borderRadius: 0, marginTop: space.md }} />
  </View>
);

const styles = StyleSheet.create({
  card: {
    backgroundColor: color.surface,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: color.border,
    marginBottom: space.sm,
  },
  padded: { paddingHorizontal: space.gutter },
  athleteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: space.gutter,
    paddingTop: space.lg,
  },
  athleteText: { flex: 1, marginLeft: space.md },
  metaRow: { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
  metaText: { marginLeft: space.xs, flexShrink: 1 },
  socialSummary: { paddingTop: space.md },
  actions: {
    flexDirection: 'row',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: color.border,
    marginTop: space.md,
  },
  action: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  actionPressed: { backgroundColor: color.canvas },
  actionLabel: { marginLeft: space.sm, fontWeight: '600' },
});
