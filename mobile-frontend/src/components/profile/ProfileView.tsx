import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
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
import { setFollowing, socialStore } from '../../lib/social';
import { shareAthlete } from '../../lib/share';
import { MVP_SPORTS } from '../../lib/sports';
import { api, AthleteStats } from '../../services/api';
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
  /** Server totals over every activity the viewer may see (policy-aware). */
  stats: AthleteStats | null;
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
      const [res, stats] = await Promise.all([
        api.athletes.getProfile(athleteId),
        api.athletes.stats(athleteId).catch(() => null),
      ]);
      const athlete = { ...toAthleteSummary(res.athlete), bio: res.athlete?.bio ?? null };
      const all = (res.recentActivities || []).map((row: any) => fromProfileActivity(row, athlete));
      setData({
        athlete,
        followersCount: Number(res.athlete?.followersCount) || 0,
        followingCount: Number(res.athlete?.followingCount) || 0,
        isFollowing: Boolean(res.athlete?.isFollowing),
        // Defence in depth only — the server must not return these (technical audit PRIV-03).
        activities: isSelf ? all : all.filter((a: ActivityView) => a.visibility !== 'ONLY_ME'),
        stats,
      });
      socialStore.seed(all);
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
        stats: data.stats,
      });
    } catch {
      // state unchanged; button re-enables
    } finally {
      setFollowPending(false);
    }
  };

  const onShare = () => {
    if (!data) return;
    shareAthlete(athleteId, data.athlete.displayName).catch(() => {});
  };

  // Weekly numbers come from the server's 12-week buckets (all visible activities, not just the
  // 10 most recent). Falls back to the recent list only if the stats call failed.
  const progress = useMemo(() => {
    if (!data) return null;
    const match = (sport: string) => sportFilter === 'All' || sport === sportFilter;
    if (data.stats) {
      const weeks = data.stats.weeks.map((w) => {
        let meters = 0, seconds = 0, elev = 0;
        for (const [sport, v] of Object.entries(w.bySport)) {
          if (!match(sport)) continue;
          meters += v.distance;
          seconds += v.moving;
          elev += v.elevation;
        }
        return { start: new Date(w.weekStart).getTime(), meters, seconds, elev };
      });
      const cur = weeks[weeks.length - 1];
      return { week: { meters: cur.meters, seconds: cur.seconds, elev: cur.elev }, weeks, weekComplete: true, windowComplete: true };
    }
    const list = data.activities.filter((a) => match(a.sportType));
    const thisWeekStart = startOfWeek(new Date()).getTime();
    const windowStart = thisWeekStart - 11 * WEEK_MS;
    const weeks = Array.from({ length: 12 }, (_, i) => ({ start: windowStart + i * WEEK_MS, meters: 0, seconds: 0, elev: 0 }));
    let week = { meters: 0, seconds: 0, elev: 0 };
    for (const a of list) {
      const t = new Date(a.startTime).getTime();
      if (t >= thisWeekStart) week = { meters: week.meters + a.distanceMeters, seconds: week.seconds + a.movingTimeSeconds, elev: week.elev + (a.elevationGainMeters ?? 0) };
      const idx = Math.floor((t - windowStart) / WEEK_MS);
      if (idx >= 0 && idx < 12) weeks[idx].meters += a.distanceMeters;
    }
    const truncated = data.activities.length >= RECENT_LIMIT;
    return { week, weeks, weekComplete: !truncated, windowComplete: !truncated };
  }, [data, sportFilter]);

  const totals = useMemo(() => {
    if (!data?.stats) return null;
    const rows = data.stats.bySport.filter((b) => sportFilter === 'All' || b.sportType === sportFilter);
    const sum = (k: 'yearToDate' | 'allTime') =>
      rows.reduce(
        (acc, r) => ({
          count: acc.count + r[k].count,
          distanceMeters: acc.distanceMeters + r[k].distanceMeters,
          movingTimeSeconds: acc.movingTimeSeconds + r[k].movingTimeSeconds,
          elevationGainMeters: acc.elevationGainMeters + r[k].elevationGainMeters,
        }),
        { count: 0, distanceMeters: 0, movingTimeSeconds: 0, elevationGainMeters: 0 }
      );
    return { ytd: sum('yearToDate'), all: sum('allTime') };
  }, [data, sportFilter]);

  const header = isSelf ? (
    <AppBar
      title="You"
      large
      leading="none"
      right={
        <>
          <IconButton icon="add" accessibilityLabel="Record an activity" onPress={() => router.push('/record')} />
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
  const sportsPresent = MVP_SPORTS.filter(
    (s) => data.activities.some((a) => a.sportType === s.id) || data.stats?.bySport.some((b) => b.sportType === s.id)
  );

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
              {data.stats ? (
                <AppText variant="body" color="inkSecondary" style={{ marginTop: 2 }}>
                  {data.stats.activityCount} {data.stats.activityCount === 1 ? 'activity' : 'activities'}
                </AppText>
              ) : null}
              {location ? (
                <AppText variant="label" color="inkSecondary" style={{ marginTop: 2 }}>{location}</AppText>
              ) : null}
            </View>
          </View>
          {data.athlete.bio ? (
            <AppText variant="body" style={{ marginTop: space.md }}>{data.athlete.bio}</AppText>
          ) : null}
          <View style={[styles.row, { marginTop: space.md }]}>
            <Pressable
              onPress={() => router.push({ pathname: '/athlete/followers', params: { id: athleteId } })}
              accessibilityRole="button"
              hitSlop={8}>
              <AppText variant="body">
                <AppText variant="bodyStrong">{data.followersCount}</AppText>
                {data.followersCount === 1 ? ' follower' : ' followers'}
              </AppText>
            </Pressable>
            <AppText variant="body" color="inkTertiary">{'  •  '}</AppText>
            <Pressable
              onPress={() => router.push({ pathname: '/athlete/following', params: { id: athleteId } })}
              accessibilityRole="button"
              hitSlop={8}>
              <AppText variant="body">
                <AppText variant="bodyStrong">{data.followingCount}</AppText> following
              </AppText>
            </Pressable>
          </View>
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
            {totals ? (
              <View style={{ marginTop: space.xl }}>
                <AppText variant="title3">This year</AppText>
                <MetricRow style={{ marginTop: space.sm }}>
                  <MetricTile label="Activities" value={String(totals.ytd.count)} />
                  <MetricTile label="Distance" value={kmValue(totals.ytd.distanceMeters)} unit="km" />
                  <MetricTile label="Time" value={formatDuration(totals.ytd.movingTimeSeconds)} />
                  <MetricTile label="Elev gain" value={formatElevation(totals.ytd.elevationGainMeters)} />
                </MetricRow>
                <AppText variant="title3" style={{ marginTop: space.lg }}>All time</AppText>
                <MetricRow style={{ marginTop: space.sm }}>
                  <MetricTile label="Activities" value={String(totals.all.count)} />
                  <MetricTile label="Distance" value={kmValue(totals.all.distanceMeters)} unit="km" />
                  <MetricTile label="Time" value={formatDuration(totals.all.movingTimeSeconds)} />
                  <MetricTile label="Elev gain" value={formatElevation(totals.all.elevationGainMeters)} />
                </MetricRow>
              </View>
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
              <Button
                label="See all activities"
                variant="secondary"
                onPress={() => router.push({ pathname: '/history/[athleteId]', params: { athleteId } })}
                style={{ margin: space.gutter }}
              />
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
