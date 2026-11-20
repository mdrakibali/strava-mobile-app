import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { memo, useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';
import { AppText, Avatar, color, MetricRow, MetricTile, Skeleton, space } from '../../design';
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
    <View style={styles.card}>
      {showAthlete ? (
        <View style={styles.athleteRow}>
          <Pressable
            onPress={() => router.push({ pathname: '/athlete/[id]', params: { id: activity.athlete.id } })}
            accessibilityRole="button"
            accessibilityLabel={`${activity.athlete.displayName}'s profile`}
            style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
            <Avatar uri={activity.athlete.avatarUrl} name={activity.athlete.displayName} size={40} />
            <View style={styles.athleteText}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <AppText variant="title3" numberOfLines={1}>
                  {activity.athlete.displayName}
                </AppText>
              </View>
              <View style={styles.metaRow}>
                <Ionicons name={sport.icon} size={14} color={color.inkTertiary} />
                <AppText variant="caption" color="inkTertiary" numberOfLines={1} style={styles.metaText}>
                  {formatActivityDate(activity.startTime)}
                  {location ? ` · ${location}` : ''}
                </AppText>
              </View>
            </View>
          </Pressable>
          <Pressable
            hitSlop={12}
            onPress={() => shareActivity(activity)}
            accessibilityRole="button"
            accessibilityLabel="Activity options"
            style={{ padding: 4 }}>
            <Ionicons name="ellipsis-horizontal" size={20} color={color.inkSecondary} />
          </Pressable>
        </View>
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
          {activity.description ? (
            <AppText variant="body" color="inkSecondary" numberOfLines={2} style={{ marginTop: space.xs }}>
              {activity.description}
            </AppText>
          ) : null}
          <MetricRow style={{ marginTop: space.md, marginBottom: space.md }}>
            <MetricTile label="Distance" value={kmValue(activity.distanceMeters)} unit="km" />
            <MetricTile label={speedOrPace.label} value={speedOrPace.value} unit={speedOrPace.value === '–' ? undefined : speedOrPace.unit} />
            <MetricTile label="Time" value={formatDuration(activity.movingTimeSeconds)} />
          </MetricRow>
        </View>
        <RoutePreview route={activity.route} height={240} />
      </Pressable>

      <View style={[styles.padded, styles.socialSummary]}>
        <Pressable onPress={openKudos} disabled={social.kudosCount === 0} accessibilityRole="button" hitSlop={8}>
          <AppText variant="caption" color="inkSecondary">
            {social.kudosCount > 0 ? `${social.kudosCount} gave kudos` : isOwn ? 'No kudos yet' : 'Be the first to give kudos'}
          </AppText>
        </Pressable>
        {social.commentsCount > 0 ? (
          <Pressable onPress={openComments} accessibilityRole="button" hitSlop={8}>
            <AppText variant="caption" color="inkSecondary">
              {social.commentsCount} {social.commentsCount === 1 ? 'comment' : 'comments'}
            </AppText>
          </Pressable>
        ) : null}
      </View>

      <View style={styles.actions}>
        <Pressable
          onPress={onKudos}
          disabled={pending}
          accessibilityRole="button"
          accessibilityLabel={isOwn ? 'See who gave kudos' : social.hasKudos ? 'Remove kudos' : 'Give kudos'}
          accessibilityState={{ selected: social.hasKudos === true, busy: pending }}
          style={({ pressed }) => [styles.action, pressed && styles.actionPressed]}>
          <Ionicons
            name={social.hasKudos ? 'thumbs-up' : 'thumbs-up-outline'}
            size={24}
            color={social.hasKudos ? color.brand : color.ink}
          />
        </Pressable>
        <Pressable
          onPress={openComments}
          accessibilityRole="button"
          accessibilityLabel="Comment"
          style={({ pressed }) => [styles.action, pressed && styles.actionPressed]}>
          <Ionicons name="chatbox-ellipses-outline" size={24} color={color.ink} />
        </Pressable>
        {activity.visibility !== 'ONLY_ME' ? (
          <Pressable
            onPress={() => shareActivity(activity)}
            accessibilityRole="button"
            accessibilityLabel="Share activity"
            style={({ pressed }) => [styles.action, pressed && styles.actionPressed]}>
            <Ionicons name="share-social-outline" size={24} color={color.ink} />
          </Pressable>
        ) : null}
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
  socialSummary: { paddingTop: space.md, flexDirection: 'row', justifyContent: 'space-between' },
  actions: {
    flexDirection: 'row',
    marginTop: space.xs,
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
