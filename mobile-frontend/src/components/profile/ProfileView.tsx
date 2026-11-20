import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import { RefreshControl, ScrollView, Share, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  AppBar,
  AppText,
  Avatar,
  Button,
  Chip,
  ChipRow,
  color,
  EmptyState,
  ErrorState,
  IconButton,
  MetricRow,
  MetricTile,
  radius,
  SegmentedTabs,
  Skeleton,
  space,
} from '../../design';
import { ActivityView, AthleteSummary, fromProfileActivity, toAthleteSummary } from '../../lib/activityView';
import { formatDuration, formatElevation, kmValue } from '../../lib/format';
import { setFollowing } from '../../lib/social';
import { MVP_SPORTS } from '../../lib/sports';
import { api } from '../../services/api';
import { FeedCard } from '../activity/FeedCard';

/** The profile endpoint returns at most this many recent activities (athlete.repository). */
const RECENT_LIMIT = 10;
const WEEK_MS = 7 * 24 * 3600 * 1000;

interface ProfileData {
  athlete: AthleteSummary & { bio?: string | null };
  followersCount: number;
  followingCount: number;
  isFollowing: boolean;
  activities: ActivityView[];
}

const startOfWeek = (d: Date) => {
  const x = new Date(d);
  const day = (x.getDay() + 6) % 7; // Monday = 0
  x.setHours(0, 0, 0, 0);
  x.setDate(x.getDate() - day);
  return x;
};

/**
 * Profile — "You" tab and other athletes (reference: ScreensDesign 374911 / 374752; research §11–12).
 * Only real numbers: counts come from the API; weekly totals are computed from the activities the
 * API returns and are flagged when that window is incomplete (no invented totals — UI/UX audit X-4).
 */
export const ProfileView: React.FC<{ athleteId: string; isSelf: boolean }> = ({ athleteId, isSelf }) => {
  const router = useRouter();
  const [data, setData] = useState<ProfileData | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error' | 'notFound'>('loading');
  const [refreshing, setRefreshing] = useState(false);
  const [tab, setTab] = useState<'progress' | 'activities'>('progress');
  const [sportFilter, setSportFilter] = useState<string>('All');
  const [followPending, setFollowPending] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await api.athletes.getProfile(athleteId);
      const athlete = { ...toAthleteSummary(res.athlete), bio: res.athlete?.bio ?? null };
      const all = (res.recentActivities || []).map((row: any) => fromProfileActivity(row, athlete));
      setData({
        athlete,
        followersCount: Number(res.athlete?.followersCount) || 0,
        followingCount: Number(res.athlete?.followingCount) || 0,
        isFollowing: Boolean(res.athlete?.isFollowing),
        // Defence in depth only — the server must not return these (technical audit PRIV-03).
        activities: isSelf ? all : all.filter((a: ActivityView) => a.visibility !== 'ONLY_ME'),
      });
      setStatus('ready');
    } catch (e: any) {
      setStatus(/not found/i.test(String(e?.message)) ? 'notFound' : 'error');
    }
  }, [athleteId, isSelf]);

  // Reload on focus so a just-saved activity / edited profile shows up.
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const onToggleFollow = async () => {
    if (!data || followPending) return;
    setFollowPending(true);
    const want = !data.isFollowing;
    try {
      const res = await setFollowing(athleteId, data.isFollowing, want);
      setData({
        ...data,
        isFollowing: res.isFollowing,
        followersCount: res.followersCount ?? data.followersCount + (res.isFollowing ? 1 : -1),
      });
    } catch {
      // state unchanged; button re-enables
    } finally {
      setFollowPending(false);
    }
  };

  const onShare = () => {
    if (!data) return;
    Share.share({ message: `${data.athlete.displayName} is recording activities — find them by searching “${data.athlete.displayName}” in the app.` }).catch(() => {});
  };

  const progress = useMemo(() => {
    if (!data) return null;
    const list = data.activities.filter((a) => sportFilter === 'All' || a.sportType === sportFilter);
    const now = new Date();
    const thisWeekStart = startOfWeek(now).getTime();
    const windowStart = thisWeekStart - 11 * WEEK_MS;
    const oldest = data.activities.length
      ? Math.min(...data.activities.map((a) => new Date(a.startTime).getTime()))
      : Infinity;
    const truncated = data.activities.length >= RECENT_LIMIT;
    const weekComplete = !truncated || oldest < thisWeekStart;
    const windowComplete = !truncated || oldest < windowStart;

    const weeks = Array.from({ length: 12 }, (_, i) => ({ start: windowStart + i * WEEK_MS, meters: 0 }));
    let week = { meters: 0, seconds: 0, elev: 0 };
    for (const a of list) {
      const t = new Date(a.startTime).getTime();
      if (t >= thisWeekStart) {
        week = {
          meters: week.meters + a.distanceMeters,
          seconds: week.seconds + a.movingTimeSeconds,
          elev: week.elev + (a.elevationGainMeters ?? 0),
        };
      }
      const idx = Math.floor((t - windowStart) / WEEK_MS);
      if (idx >= 0 && idx < 12) weeks[idx].meters += a.distanceMeters;
    }
    return { week, weeks, weekComplete, windowComplete };
  }, [data, sportFilter]);

  const header = isSelf ? (
    <AppBar
      title="You"
      large
      leading="none"
      right={
        <>
          <IconButton icon="search-outline" accessibilityLabel="Find athletes" onPress={() => router.push('/search')} />
          <IconButton icon="settings-outline" accessibilityLabel="Settings" onPress={() => router.push('/settings')} />
        </>
      }
    />
  ) : (
    <AppBar title={data?.athlete.displayName ?? ''} />
  );

  if (status !== 'ready' || !data || !progress) {
    return (
      <SafeAreaView edges={['top']} style={styles.screen}>
        {header}
        {status === 'loading' ? (
          <View style={{ padding: space.gutter }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Skeleton style={{ width: 72, height: 72, borderRadius: 36 }} />
              <View style={{ flex: 1, marginLeft: space.lg }}>
                <Skeleton style={{ width: '60%', height: 22 }} />
                <Skeleton style={{ width: '40%', height: 14, marginTop: space.sm }} />
              </View>
            </View>
            <Skeleton style={{ height: 160, marginTop: space.xl }} />
          </View>
        ) : status === 'notFound' ? (
          <EmptyState icon="person-outline" title="Athlete not found" />
        ) : (
          <ErrorState onRetry={() => { setStatus('loading'); load(); }} />
        )}
      </SafeAreaView>
    );
  }

  const location = [data.athlete.city, data.athlete.country].filter(Boolean).join(', ');
  const maxWeek = Math.max(...progress.weeks.map((w) => w.meters), 1);
  const sportsPresent = MVP_SPORTS.filter((s) => data.activities.some((a) => a.sportType === s.id));

  return (
    <SafeAreaView edges={['top']} style={styles.screen}>
      {header}
      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[color.brand]} />}
        contentContainerStyle={{ paddingBottom: space.xxxl }}>
        <View style={styles.identity}>
          <View style={styles.identityRow}>
            <Avatar uri={data.athlete.avatarUrl} name={data.athlete.displayName} size={72} />
            <View style={{ flex: 1, marginLeft: space.lg }}>
              <AppText variant="title1" numberOfLines={2}>{data.athlete.displayName}</AppText>
              {location ? (
                <AppText variant="label" color="inkSecondary" style={{ marginTop: 2 }}>{location}</AppText>
              ) : null}
            </View>
          </View>
          {data.athlete.bio ? (
            <AppText variant="body" style={{ marginTop: space.md }}>{data.athlete.bio}</AppText>
          ) : null}
          <AppText variant="body" style={{ marginTop: space.md }}>
            <AppText variant="bodyStrong">{data.followersCount}</AppText>
            {data.followersCount === 1 ? ' follower' : ' followers'}
            {'  •  '}
            <AppText variant="bodyStrong">{data.followingCount}</AppText> following
          </AppText>
          <View style={[styles.row, { marginTop: space.lg }]}>
            {isSelf ? (
              <>
                <Button label="Edit profile" variant="outline" style={{ flex: 1 }} onPress={() => router.push('/settings/profile-edit')} />
                <Button label="Share profile" variant="outline" style={{ flex: 1, marginLeft: space.md }} onPress={onShare} />
              </>
            ) : (
              <Button
                label={data.isFollowing ? 'Following' : 'Follow'}
                icon={data.isFollowing ? 'checkmark' : 'person-add-outline'}
                variant={data.isFollowing ? 'outline' : 'primary'}
                loading={followPending}
                onPress={onToggleFollow}
                style={{ flex: 1 }}
              />
            )}
          </View>
        </View>

        <SegmentedTabs
          items={[
            { key: 'progress', label: 'Progress', icon: 'stats-chart-outline' },
            { key: 'activities', label: 'Activities', icon: 'pulse-outline' },
          ]}
          value={tab}
          onChange={setTab}
        />

        {tab === 'progress' ? (
          <View style={styles.card}>
            <ChipRow>
              <Chip label="All sports" selected={sportFilter === 'All'} onPress={() => setSportFilter('All')} />
              {sportsPresent.map((s) => (
                <Chip key={s.id} label={s.label} icon={s.icon} selected={sportFilter === s.id} onPress={() => setSportFilter(s.id)} />
              ))}
            </ChipRow>
            <AppText variant="title2" style={{ marginTop: space.xl }}>This week</AppText>
            <MetricRow style={{ marginTop: space.md }}>
              <MetricTile label="Distance" value={kmValue(progress.week.meters)} unit="km" size="L" />
              <MetricTile label="Time" value={formatDuration(progress.week.seconds)} size="L" />
              <MetricTile label="Elev gain" value={formatElevation(progress.week.elev)} size="L" />
            </MetricRow>
            {!progress.weekComplete ? (
              <AppText variant="caption" color="inkTertiary" style={{ marginTop: space.sm }}>
                Includes only the {RECENT_LIMIT} most recent activities.
              </AppText>
            ) : null}

            <AppText variant="title3" style={{ marginTop: space.xl }}>Past 12 weeks · distance</AppText>
            <View style={styles.chart} accessible accessibilityLabel="Weekly distance for the past 12 weeks">
              {progress.weeks.map((w, i) => (
                <View key={w.start} style={styles.barSlot}>
                  <View
                    style={[
                      styles.bar,
                      { height: `${Math.max(w.meters > 0 ? 6 : 2, (w.meters / maxWeek) * 100)}%` },
                      i === 11 ? { backgroundColor: color.brand } : null,
                    ]}
                  />
                </View>
              ))}
            </View>
            <View style={[styles.row, { justifyContent: 'space-between', marginTop: space.xs }]}>
              <AppText variant="caption" color="inkTertiary">
                {new Date(progress.weeks[0].start).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </AppText>
              <AppText variant="caption" color="inkTertiary">This week</AppText>
            </View>
            {!progress.windowComplete ? (
              <AppText variant="caption" color="inkTertiary" style={{ marginTop: space.sm }}>
                Older weeks may be incomplete — only the {RECENT_LIMIT} most recent activities are loaded.
              </AppText>
            ) : null}
          </View>
        ) : data.activities.length === 0 ? (
          <EmptyState
            icon="footsteps-outline"
            title={isSelf ? 'No activities yet' : 'No activities to show'}
            body={isSelf ? 'Record your first activity and it will appear here.' : undefined}
            primary={isSelf ? { label: 'Record an activity', onPress: () => router.push('/record') } : undefined}
          />
        ) : (
          <View style={{ paddingTop: space.sm }}>
            {data.activities.map((a) => (
              <FeedCard key={a.id} activity={a} currentUserId={isSelf ? athleteId : undefined} showAthlete={false} />
            ))}
            {data.activities.length >= RECENT_LIMIT ? (
              <View style={styles.note}>
                <Ionicons name="information-circle-outline" size={18} color={color.inkTertiary} />
                <AppText variant="caption" color="inkTertiary" style={{ marginLeft: space.sm, flex: 1 }}>
                  Showing the {RECENT_LIMIT} most recent activities.
                </AppText>
              </View>
            ) : null}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.canvas },
  row: { flexDirection: 'row', alignItems: 'center' },
  identity: { backgroundColor: color.surface, padding: space.gutter },
  identityRow: { flexDirection: 'row', alignItems: 'center' },
  card: {
    backgroundColor: color.surface,
    margin: space.gutter,
    padding: space.gutter,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: color.border,
  },
  chart: { height: 96, flexDirection: 'row', alignItems: 'flex-end', marginTop: space.md },
  barSlot: { flex: 1, height: '100%', justifyContent: 'flex-end', paddingHorizontal: 3 },
  bar: { backgroundColor: color.borderStrong, borderTopLeftRadius: 3, borderTopRightRadius: 3 },
  note: { flexDirection: 'row', alignItems: 'center', padding: space.gutter },
});
