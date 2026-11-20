import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
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
import { setKudos, socialStore, useSocial } from '../../lib/social';
import { shareActivity } from '../../lib/share';
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
        else {
          const activity = fromDetailResponse(res);
          socialStore.seed([{ id: activity.id, hasKudos: activity.hasKudos, kudosCount: activity.kudosCount, commentsCount: activity.commentsCount }]);
          setState({ status: 'ready', activity, isOwner: Boolean(res.isOwner) });
        }
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
      <SafeAreaView className="flex-1 bg-white">
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
    <View className="flex-1 bg-white">
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 64 }} keyboardShouldPersistTaps="handled">
          {hasMap ? (
            <View style={{ height: mapHeight }}>
              <MapView mode="route" route={activity.route} padding={{ top: insets.top, bottom: 24 }} />
            </View>
          ) : (
            <View style={{ height: insets.top + 56 }} />
          )}
          <View className={`bg-white p-4 pt-6 ${hasMap ? '-mt-5 rounded-t-3xl' : ''}`}>
            <ActivityBody activity={activity} isOwner={isOwner} currentUserId={currentUser.id} currentUserName={currentUser.displayName} currentUserAvatar={currentUser.avatarUrl} />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
      <View style={{ top: insets.top + 8 }} className="absolute left-4">
        <IconButton icon="arrow-back" appearance="floating" accessibilityLabel="Back" onPress={() => router.back()} />
      </View>
      {isOwner ? (
        <View style={{ top: insets.top + 8 }} className="absolute right-4">
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
  const social = useSocial(activity.id, {
    hasKudos: activity.hasKudos,
    kudosCount: activity.kudosCount,
    commentsCount: activity.commentsCount,
  });
  const [kudosPending, setKudosPending] = useState(false);
  const [comments, setComments] = useState<CommentView[]>(activity.comments);
  const [editing, setEditing] = useState<{ id: string; text: string } | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);
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

  const onCommentMenu = (c: CommentView) => {
    const mine = c.author.id === currentUserId;
    const buttons: any[] = [];
    if (mine) buttons.push({ text: 'Edit', onPress: () => setEditing({ id: c.id, text: c.content }) });
    if (mine || isOwner)
      buttons.push({
        text: 'Delete',
        style: 'destructive',
        onPress: () =>
          Alert.alert('Delete comment?', undefined, [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Delete',
              style: 'destructive',
              onPress: async () => {
                try {
                  const res = await api.activities.deleteComment(activity.id, c.id);
                  setComments((prev) => prev.filter((x) => x.id !== c.id));
                  socialStore.patch(activity.id, { commentsCount: res.commentsCount });
                } catch (e: any) {
                  Alert.alert('Couldn’t delete', e?.message ?? 'Please try again.');
                }
              },
            },
          ]),
      });
    if (!buttons.length) return;
    buttons.push({ text: 'Cancel', style: 'cancel' });
    Alert.alert('Comment', undefined, buttons);
  };

  const onSaveEdit = async () => {
    if (!editing || !editing.text.trim() || savingEdit) return;
    setSavingEdit(true);
    try {
      const res = await api.activities.editComment(activity.id, editing.id, editing.text.trim());
      setComments((prev) =>
        prev.map((x) => (x.id === editing.id ? { ...x, content: res.comment.content, updatedAt: res.comment.updatedAt } : x))
      );
      setEditing(null);
    } catch (e: any) {
      Alert.alert('Couldn’t save', e?.message ?? 'Please try again.');
    } finally {
      setSavingEdit(false);
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
          updatedAt: null,
          author: toAthleteSummary({ id: currentUserId, displayName: currentUserName, avatarUrl: currentUserAvatar }),
        },
      ]);
      setDraft('');
      socialStore.patch(activity.id, { commentsCount: social.commentsCount + 1 });
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
        className="flex-row items-center">
        <Avatar uri={activity.athlete.avatarUrl} name={activity.athlete.displayName} size={48} />
        <View style={{ flex: 1, marginLeft: space.md }}>
          <AppText variant="title3">{activity.athlete.displayName}</AppText>
          <View className="flex-row items-center mt-0.5">
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
        <View className="flex-row items-center mt-1">
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

      <View className="flex-row flex-wrap mt-4 border-y border-gray-100 py-2">
        {stats.map((s) => (
          <View key={s.label} className="w-1/2 py-3">
            <MetricTile label={s.label} value={s.value} size="L" align="center" />
          </View>
        ))}
      </View>

      {sport.primaryMetric === 'pace' && activity.splits.length > 0 ? (
        <View className="mt-6 pt-6 border-t border-gray-100">
          <SectionTitle title="Splits" />
          <View className="flex-row pb-2">
            <AppText variant="label" color="inkSecondary" style={{ width: 48 }}>Km</AppText>
            <AppText variant="label" color="inkSecondary" style={{ flex: 1 }}>Pace</AppText>
            <AppText variant="label" color="inkSecondary" style={{ width: 80, textAlign: 'right' }}>Elev</AppText>
          </View>
          {activity.splits.map((s) => (
            <View key={s.index} className="flex-row items-center min-h-[40px] border-t border-gray-100">
              <AppText variant="bodyStrong" style={{ width: 48 }}>{s.index}</AppText>
              <AppText variant="bodyStrong" style={[{ flex: 1 }, { fontVariant: ['tabular-nums'] }]}>
                {s.pace ? `${s.pace} /km` : DASH}
              </AppText>
              <AppText variant="body" color="inkSecondary" style={{ width: 80, textAlign: 'right' }}>
                {s.elevationDeltaMeters == null ? DASH : `${s.elevationDeltaMeters > 0 ? '+' : ''}${Math.round(s.elevationDeltaMeters)} m`}
              </AppText>
            </View>
          ))}
        </View>
      ) : null}

      {activity.elevationProfile.length > 1 ? (
        <View className="mt-6 pt-6 border-t border-gray-100">
          <SectionTitle title="Elevation" />
          <ElevationProfile samples={activity.elevationProfile} />
        </View>
      ) : null}

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
            accessibilityLabel={isOwner ? 'See who gave kudos' : social.hasKudos ? 'Remove kudos' : 'Give kudos'}
            accessibilityState={{ selected: social.hasKudos === true, busy: kudosPending }}
            className="flex-1 flex-row items-center justify-center min-h-[52px] active:bg-gray-50">
            <Ionicons name={social.hasKudos ? 'thumbs-up' : 'thumbs-up-outline'} size={24} color={social.hasKudos ? color.brand : color.ink} />
            <AppText variant="label" style={{ marginLeft: space.sm, fontWeight: '600' }} color={social.hasKudos ? 'brandText' : 'ink'}>
              {isOwner ? 'Kudos' : social.hasKudos ? 'Kudos given' : 'Give kudos'}
            </AppText>
          </Pressable>
          {activity.visibility !== 'ONLY_ME' ? (
            <Pressable
              onPress={() => shareActivity(activity)}
              accessibilityRole="button"
              accessibilityLabel="Share activity"
              className="flex-1 flex-row items-center justify-center min-h-[52px] active:bg-gray-50">
              <Ionicons name="share-social-outline" size={24} color={color.ink} />
              <AppText variant="label" style={{ marginLeft: space.sm, fontWeight: '600' }}>Share</AppText>
            </Pressable>
          ) : null}
        </View>
      </View>

      <View className="mt-6 pt-6 border-t border-gray-100">
        <SectionTitle title={comments.length > 0 ? `Comments (${comments.length})` : 'Comments'} />
        {comments.length === 0 ? (
          <AppText variant="body" color="inkSecondary">
            No comments yet.
          </AppText>
        ) : (
          comments.map((c, i) => (
            <View key={c.id}>
              {i > 0 ? <Divider inset={48} /> : null}
              <View className="flex-row items-start py-3">
                <Avatar uri={c.author.avatarUrl} name={c.author.displayName} size={32} />
                <View style={{ flex: 1, marginLeft: space.md }}>
                  <View className="flex-row items-center">
                    <AppText variant="bodyStrong" style={{ flexShrink: 1 }}>{c.author.displayName}</AppText>
                    <AppText variant="caption" color="inkTertiary" style={{ marginLeft: space.sm }}>
                      {formatRelative(c.createdAt)}
                    </AppText>
                  </View>
                  {editing?.id === c.id ? (
                    <View style={{ marginTop: space.xs }}>
                      <TextField
                        value={editing.text}
                        onChangeText={(t) => setEditing({ id: c.id, text: t })}
                        accessibilityLabel="Edit comment"
                        maxLength={1000}
                        multiline
                      />
                      <View className="flex-row items-center mt-2 justify-end">
                        <Button label="Cancel" variant="ghost" size="sm" onPress={() => setEditing(null)} />
                        <Button label="Save" size="sm" loading={savingEdit} disabled={!editing.text.trim()} onPress={onSaveEdit} style={{ marginLeft: space.sm }} />
                      </View>
                    </View>
                  ) : (
                    <AppText variant="body" style={{ marginTop: 2 }}>
                      {c.content}
                      {c.updatedAt ? <AppText variant="caption" color="inkTertiary">  (edited)</AppText> : null}
                    </AppText>
                  )}
                </View>
                {(c.author.id === currentUserId || isOwner) && editing?.id !== c.id ? (
                  <IconButton icon="ellipsis-horizontal" size={36} accessibilityLabel="Comment options" onPress={() => onCommentMenu(c)} />
                ) : null}
              </View>
            </View>
          ))
        )}
        <View className="flex-row items-end mt-3">
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
