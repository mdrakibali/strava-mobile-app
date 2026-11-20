import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { ElevationProfile } from '../../components/activity/ElevationProfile';
import { VISIBILITY_LABEL } from '../../components/activity/FeedCard';
import { MapView } from '../../components/map/MapView';
import { useApp } from '../../context/AppContext';
import {
  AppBar,
  AppText,
  Avatar,
  Button,
  color,
  Divider,
  EmptyState,
  ErrorState,
  IconButton,
  MetricTile,
  radius,
  SectionTitle,
  Skeleton,
  space,
  TextField,
} from '../../design';
import { ActivityView, avgSpeedOf, CommentView, fromDetailResponse, toAthleteSummary } from '../../lib/activityView';
import { estimateCalories } from '../../lib/calories';
import {
  DASH,
  formatActivityDate,
  formatCalories,
  formatClock,
  formatDistance,
  formatElevation,
  formatPace,
  formatRelative,
  formatSpeed,
} from '../../lib/format';
import { giveKudos } from '../../lib/social';
import { sportConfig } from '../../lib/sports';
import { api } from '../../services/api';

type State =
  | { status: 'loading' }
  | { status: 'notFound' }
  | { status: 'error'; message: string }
  | { status: 'ready'; activity: ActivityView; isOwner: boolean };

/**
 * Activity detail (reference: ScreensDesign 374822 / 374861; research §10).
 * Map first, then a sheet with athlete, title, 2-column stats, splits, elevation, kudos, comments.
 * Never shows a different activity on failure (UI/UX audit X-6).
 */
export default function ActivityDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const { currentUser } = useApp();
  const [fetched, setState] = useState<State>({ status: 'loading' });
  const [reloadKey, setReloadKey] = useState(0);

  // State is only set in promise callbacks; a missing id is derived, not stored.
  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    api.activities.get(id).then(
      (res) => {
        if (cancelled) return;
        if (!res?.activity) setState({ status: 'notFound' });
        else setState({ status: 'ready', activity: fromDetailResponse(res), isOwner: Boolean(res.isOwner) });
      },
      (e: any) => {
        if (cancelled) return;
        const msg = String(e?.message || '');
        if (/not found/i.test(msg)) setState({ status: 'notFound' });
        else setState({ status: 'error', message: msg || 'Check your connection and try again.' });
      }
    );
    return () => {
      cancelled = true;
    };
  }, [id, reloadKey]);

  // Refetch silently when returning to this screen (e.g. after Edit), without a loading flash.
  const firstFocus = useRef(true);
  useFocusEffect(
    useCallback(() => {
      if (firstFocus.current) {
        firstFocus.current = false;
        return;
      }
      setReloadKey((k) => k + 1);
    }, [])
  );

  const state: State = id ? fetched : { status: 'notFound' };
  const retry = () => {
    setState({ status: 'loading' });
    setReloadKey((k) => k + 1);
  };

  if (state.status !== 'ready') {
    return (
      <SafeAreaView style={styles.screen}>
        <AppBar title={state.status === 'loading' ? '' : 'Activity'} />
        {state.status === 'loading' ? (
          <DetailSkeleton />
        ) : state.status === 'notFound' ? (
          <EmptyState
            icon="eye-off-outline"
            title="This activity isn’t available"
            body="It may have been deleted, or its owner made it private."
            primary={{ label: 'Go back', onPress: () => router.back() }}
          />
        ) : (
          <ErrorState message={state.message} onRetry={retry} />
        )}
      </SafeAreaView>
    );
  }

  const { activity, isOwner } = state;

  const confirmDelete = (activityId: string) =>
    Alert.alert('Delete activity?', 'It will be removed for everyone. This can’t be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.activities.remove(activityId);
            router.back();
          } catch (e: any) {
            Alert.alert('Couldn’t delete', e?.message ?? 'Please try again.');
          }
        },
      },
    ]);
  const hasMap = activity.route.length > 1;
  const mapHeight = Math.round(height * 0.42);

  return (
    <View style={styles.screen}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + space.xxxl }} keyboardShouldPersistTaps="handled">
          {hasMap ? (
            <View style={{ height: mapHeight }}>
              <MapView mode="route" route={activity.route} padding={{ top: insets.top, bottom: 24 }} />
            </View>
          ) : (
            <View style={{ height: insets.top + 56 }} />
          )}
          <View style={[styles.sheet, hasMap && styles.sheetOverlap]}>
            <ActivityBody activity={activity} isOwner={isOwner} currentUserId={currentUser.id} currentUserName={currentUser.displayName} currentUserAvatar={currentUser.avatarUrl} />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
      <View style={[styles.backOverlay, { top: insets.top + space.sm }]}>
        <IconButton icon="arrow-back" appearance="floating" accessibilityLabel="Back" onPress={() => router.back()} />
      </View>
      {isOwner ? (
        <View style={[styles.menuOverlay, { top: insets.top + space.sm }]}>
          <IconButton
            icon="ellipsis-vertical"
            appearance="floating"
            accessibilityLabel="Activity options"
            onPress={() =>
              Alert.alert(activity.title, undefined, [
                { text: 'Edit activity', onPress: () => router.push({ pathname: '/activity/edit/[id]', params: { id: activity.id } }) },
                { text: 'Delete activity', style: 'destructive', onPress: () => confirmDelete(activity.id) },
                { text: 'Cancel', style: 'cancel' },
              ])
            }
          />
        </View>
      ) : null}
    </View>
  );
}

const ActivityBody: React.FC<{
  activity: ActivityView;
  isOwner: boolean;
  currentUserId: string;
  currentUserName: string;
  currentUserAvatar?: string;
}> = ({ activity, isOwner, currentUserId, currentUserName, currentUserAvatar }) => {
  const router = useRouter();
  const sport = sportConfig(activity.sportType);
  const [kudos, setKudos] = useState({ has: activity.hasKudos, count: activity.kudosCount });
  const [kudosPending, setKudosPending] = useState(false);
  const [comments, setComments] = useState<CommentView[]>(activity.comments);
  const [draft, setDraft] = useState('');
  const [posting, setPosting] = useState(false);
  const [commentError, setCommentError] = useState<string | null>(null);

  const avgSpeed = avgSpeedOf(activity);
  const calories =
    activity.calories ?? estimateCalories(activity.sportType, activity.distanceMeters, activity.movingTimeSeconds);

  const stats: { label: string; value: string }[] = [
    { label: 'Distance', value: formatDistance(activity.distanceMeters) },
    { label: 'Moving time', value: formatClock(activity.movingTimeSeconds) },
    sport.primaryMetric === 'speed'
      ? { label: 'Avg speed', value: formatSpeed(avgSpeed) }
      : { label: 'Avg pace', value: formatPace(activity.distanceMeters, activity.movingTimeSeconds) },
    { label: 'Elevation gain', value: formatElevation(activity.elevationGainMeters) },
    { label: 'Elapsed time', value: formatClock(activity.elapsedTimeSeconds) },
    { label: 'Calories (est.)', value: formatCalories(calories) },
  ];
  if (sport.primaryMetric === 'speed' && activity.maxSpeedMps) {
    stats.push({ label: 'Max speed', value: formatSpeed(activity.maxSpeedMps) });
  }

  const onKudos = async () => {
    if (kudosPending || kudos.has) return;
    const prev = kudos;
    setKudosPending(true);
    setKudos({ has: true, count: prev.count + 1 });
    try {
      const res = await giveKudos(activity.id, prev.has);
      setKudos({ has: res.hasKudos, count: res.kudosCount });
    } catch {
      setKudos(prev);
    } finally {
      setKudosPending(false);
    }
  };

  const onPostComment = async () => {
    const content = draft.trim();
    if (!content || posting) return;
    setPosting(true);
    setCommentError(null);
    try {
      const res = await api.activities.addComment(activity.id, content);
      const c = res?.comment;
      setComments((prev) => [
        ...prev,
        {
          id: String(c?.id ?? `local_${Date.now()}`),
          content,
          createdAt: c?.createdAt ?? new Date().toISOString(),
          author: toAthleteSummary({ id: currentUserId, displayName: currentUserName, avatarUrl: currentUserAvatar }),
        },
      ]);
      setDraft('');
    } catch (e: any) {
      setCommentError(e?.message || 'Couldn’t post your comment. Try again.');
    } finally {
      setPosting(false);
    }
  };

  const visibility = VISIBILITY_LABEL[activity.visibility] ?? VISIBILITY_LABEL.PUBLIC;

  return (
    <View>
      <Pressable
        onPress={() => router.push({ pathname: '/athlete/[id]', params: { id: activity.athlete.id } })}
        accessibilityRole="button"
        accessibilityLabel={`${activity.athlete.displayName}'s profile`}
        style={styles.athleteRow}>
        <Avatar uri={activity.athlete.avatarUrl} name={activity.athlete.displayName} size={48} />
        <View style={{ flex: 1, marginLeft: space.md }}>
          <AppText variant="title3">{activity.athlete.displayName}</AppText>
          <View style={styles.meta}>
            <Ionicons name={sport.icon} size={14} color={color.inkTertiary} />
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
        <View style={[styles.meta, { marginTop: space.xs }]}>
          <Ionicons name={visibility.icon} size={14} color={color.inkSecondary} />
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

      <View style={styles.grid}>
        {stats.map((s) => (
          <View key={s.label} style={styles.gridCell}>
            <MetricTile label={s.label} value={s.value} size="L" align="center" />
          </View>
        ))}
      </View>

      {sport.primaryMetric === 'pace' && activity.splits.length > 0 ? (
        <View style={styles.section}>
          <SectionTitle title="Splits" />
          <View style={styles.splitHeader}>
            <AppText variant="label" color="inkSecondary" style={styles.splitKm}>Km</AppText>
            <AppText variant="label" color="inkSecondary" style={styles.splitPace}>Pace</AppText>
            <AppText variant="label" color="inkSecondary" style={styles.splitElev}>Elev</AppText>
          </View>
          {activity.splits.map((s) => (
            <View key={s.index} style={styles.splitRow}>
              <AppText variant="bodyStrong" style={styles.splitKm}>{s.index}</AppText>
              <AppText variant="bodyStrong" style={[styles.splitPace, { fontVariant: ['tabular-nums'] }]}>
                {s.pace ? `${s.pace} /km` : DASH}
              </AppText>
              <AppText variant="body" color="inkSecondary" style={styles.splitElev}>
                {s.elevationDeltaMeters == null ? DASH : `${s.elevationDeltaMeters > 0 ? '+' : ''}${Math.round(s.elevationDeltaMeters)} m`}
              </AppText>
            </View>
          ))}
        </View>
      ) : null}

      {activity.elevationProfile.length > 1 ? (
        <View style={styles.section}>
          <SectionTitle title="Elevation" />
          <ElevationProfile samples={activity.elevationProfile} />
        </View>
      ) : null}

      <View style={styles.section}>
        <View style={styles.kudosRow}>
          <Ionicons name="thumbs-up" size={18} color={kudos.count > 0 ? color.brand : color.inkTertiary} />
          <AppText variant="bodyStrong" style={{ flex: 1, marginLeft: space.sm }}>
            {kudos.count > 0 ? `${kudos.count} gave kudos` : 'No kudos yet'}
          </AppText>
          {!isOwner ? (
            <Button
              label={kudos.has ? 'Kudos given' : 'Give kudos'}
              icon={kudos.has ? 'thumbs-up' : 'thumbs-up-outline'}
              size="sm"
              variant={kudos.has ? 'secondary' : 'primary'}
              disabled={kudos.has === true}
              loading={kudosPending}
              onPress={onKudos}
            />
          ) : null}
        </View>
      </View>

      <View style={styles.section}>
        <SectionTitle title={comments.length > 0 ? `Comments (${comments.length})` : 'Comments'} />
        {comments.length === 0 ? (
          <AppText variant="body" color="inkSecondary">
            No comments yet.
          </AppText>
        ) : (
          comments.map((c, i) => (
            <View key={c.id}>
              {i > 0 ? <Divider inset={48} /> : null}
              <View style={styles.comment}>
                <Avatar uri={c.author.avatarUrl} name={c.author.displayName} size={32} />
                <View style={{ flex: 1, marginLeft: space.md }}>
                  <View style={styles.meta}>
                    <AppText variant="bodyStrong" style={{ flexShrink: 1 }}>{c.author.displayName}</AppText>
                    <AppText variant="caption" color="inkTertiary" style={{ marginLeft: space.sm }}>
                      {formatRelative(c.createdAt)}
                    </AppText>
                  </View>
                  <AppText variant="body" style={{ marginTop: 2 }}>{c.content}</AppText>
                </View>
              </View>
            </View>
          ))
        )}
        <View style={styles.composer}>
          <View style={{ flex: 1 }}>
            <TextField
              value={draft}
              onChangeText={setDraft}
              placeholder="Add a comment"
              accessibilityLabel="Add a comment"
              maxLength={1000}
              multiline
              style={{ minHeight: 48, paddingTop: 12 }}
            />
          </View>
          <Button label="Post" size="md" onPress={onPostComment} loading={posting} disabled={!draft.trim()} style={{ marginLeft: space.sm }} />
        </View>
        {commentError ? (
          <View style={{ marginTop: space.sm }}>
            <ErrorState compact message={commentError} />
          </View>
        ) : null}
      </View>
    </View>
  );
};

const DetailSkeleton: React.FC = () => (
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

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.surface },
  sheet: { backgroundColor: color.surface, padding: space.gutter, paddingTop: space.xl },
  sheetOverlap: { marginTop: -radius.lg, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg },
  backOverlay: { position: 'absolute', left: space.gutter },
  menuOverlay: { position: 'absolute', right: space.gutter },
  athleteRow: { flexDirection: 'row', alignItems: 'center' },
  meta: { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: space.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: color.border,
    paddingVertical: space.sm,
  },
  gridCell: { width: '50%', paddingVertical: space.md },
  section: {
    marginTop: space.xl,
    paddingTop: space.xl,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: color.border,
  },
  splitHeader: { flexDirection: 'row', paddingBottom: space.sm },
  splitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 40,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: color.border,
  },
  splitKm: { width: 48 },
  splitPace: { flex: 1 },
  splitElev: { width: 80, textAlign: 'right' },
  kudosRow: { flexDirection: 'row', alignItems: 'center' },
  comment: { flexDirection: 'row', paddingVertical: space.md },
  composer: { flexDirection: 'row', alignItems: 'flex-end', marginTop: space.md },
});
