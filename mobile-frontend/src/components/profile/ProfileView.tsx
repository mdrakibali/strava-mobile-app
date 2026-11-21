import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import { RefreshControl, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useApp } from '../../context/AppContext';
import {
  AppBar,
  EmptyState,
  ErrorState,
  IconButton,
  SegmentedTabs,
  Skeleton,
} from '../../design';
import { reconcileActivity } from '../../lib/activityEdits';
import { ActivityView, AthleteSummary, fromProfileActivity, toAthleteSummary } from '../../lib/activityView';
import { markActivityRemoved, withoutRemoved } from '../../lib/removedActivities';
import { captureFollowEpochs, commitServerFollow, setFollowing, socialStore, useFollow } from '../../lib/social';
import { shareAthlete } from '../../lib/share';
import { MVP_SPORTS } from '../../lib/sports';
import { api, AthleteStats } from '../../services/api';
import { ProfileHeader } from './ProfileHeader';
import { ProfileProgressTab } from './ProfileProgressTab';
import { ProfileActivitiesTab } from './ProfileActivitiesTab';
import { computeProgress, computeTotals, RECENT_LIMIT } from './profileStats';

interface ProfileData {
  athlete: AthleteSummary & { bio?: string | null };
  followersCount: number;
  followingCount: number;
  isFollowing: boolean;
  activities: ActivityView[];
  stats: AthleteStats | null;
}

export const ProfileView: React.FC<{ athleteId: string; isSelf: boolean }> = ({ athleteId, isSelf }) => {
  const router = useRouter();
  const { currentUser, updateCurrentUser } = useApp();
  const [data, setData] = useState<ProfileData | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error' | 'notFound'>('loading');
  const [refreshing, setRefreshing] = useState(false);
  const [tab, setTab] = useState<'progress' | 'activities'>('progress');
  const [sportFilter, setSportFilter] = useState<string>('All');
  const [followPending, setFollowPending] = useState(false);
  const displayedFollowing = useFollow(athleteId, data?.isFollowing ?? false);

  const load = useCallback(async () => {
    const snapshot = captureFollowEpochs();
    const readTick = socialStore.beginRead();
    try {
      const [res, stats] = await Promise.all([
        api.athletes.getProfile(athleteId),
        api.athletes.stats(athleteId).catch(() => null),
      ]);
      const athlete = { ...toAthleteSummary(res.athlete), bio: res.athlete?.bio ?? null };
      const all = withoutRemoved((res.recentActivities || []).map((row: any) => reconcileActivity(fromProfileActivity(row, athlete))));
      const isFollowing = commitServerFollow(athleteId, Boolean(res.athlete?.isFollowing), snapshot);
      setData({
        athlete,
        followersCount: Number(res.athlete?.followersCount) || 0,
        followingCount: Number(res.athlete?.followingCount) || 0,
        isFollowing,
        activities: isSelf ? all : all.filter((a: ActivityView) => a.visibility !== 'ONLY_ME'),
        stats,
      });
      socialStore.seed(all, readTick);
      setStatus('ready');
    } catch (e: any) {
      setStatus(/not found/i.test(String(e?.message)) ? 'notFound' : 'error');
    }
  }, [athleteId, isSelf]);

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
    const wasFollowing = displayedFollowing;
    const want = !wasFollowing;
    try {
      const res = await setFollowing(athleteId, wasFollowing, want);
      setData({
        ...data,
        isFollowing: res.isFollowing,
        followersCount: typeof res.followersCount === 'number' ? res.followersCount : data.followersCount + (res.isFollowing ? 1 : -1),
        stats: data.stats,
      });
      if (currentUser?.id && typeof res.followingCount === 'number') {
        updateCurrentUser({ followingCount: res.followingCount });
      }
    } catch {
      // unchanged
    } finally {
      setFollowPending(false);
    }
  };

  const onShare = () => {
    if (!data) return;
    shareAthlete(athleteId, data.athlete.displayName).catch(() => {});
  };

  const progress = useMemo(() => {
    if (!data) return null;
    return computeProgress(data.activities, data.stats, sportFilter);
  }, [data, sportFilter]);

  const totals = useMemo(() => {
    if (!data?.stats) return null;
    return computeTotals(data.stats, sportFilter);
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
      <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
        {header}
        {status === 'loading' ? (
          <View className="p-4">
            <View className="flex-row items-center">
              <Skeleton className="w-[72px] h-[72px] rounded-full" />
              <View className="flex-1 ml-4">
                <Skeleton className="w-[60%] h-5.5" />
                <Skeleton className="w-[40%] h-3.5 mt-2" />
              </View>
            </View>
            <Skeleton className="h-40 mt-6" />
          </View>
        ) : status === 'notFound' ? (
          <EmptyState icon="person-outline" title="Athlete not found" />
        ) : (
          <ErrorState onRetry={() => { setStatus('loading'); load(); }} />
        )}
      </SafeAreaView>
    );
  }

  const maxWeek = Math.max(...progress.weeks.map((w) => w.meters), 1);
  const sportsPresent = MVP_SPORTS.filter(
    (s) => data.activities.some((a) => a.sportType === s.id) || data.stats?.bySport.some((b) => b.sportType === s.id)
  );

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: '#F9FAFB' }}>
      {header}
      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#FC4C02']} />}
        contentContainerStyle={{ paddingBottom: 64 }}>
        <ProfileHeader
          athleteId={athleteId}
          athlete={data.athlete}
          stats={data.stats}
          followersCount={data.followersCount}
          followingCount={data.followingCount}
          isFollowing={displayedFollowing}
          isSelf={isSelf}
          followPending={followPending}
          onToggleFollow={onToggleFollow}
          onShare={onShare}
        />
        <SegmentedTabs
          items={[
            { key: 'progress', label: 'Progress', icon: 'stats-chart-outline' },
            { key: 'activities', label: 'Activities', icon: 'pulse-outline' },
          ]}
          value={tab}
          onChange={setTab}
        />
        {tab === 'progress' ? (
          <ProfileProgressTab
            sportFilter={sportFilter}
            setSportFilter={setSportFilter}
            sportsPresent={sportsPresent}
            progress={progress}
            maxWeek={maxWeek}
            totals={totals}
            recentLimit={RECENT_LIMIT}
          />
        ) : (
          <ProfileActivitiesTab
            activities={data.activities}
            athleteId={athleteId}
            isSelf={isSelf}
            recentLimit={RECENT_LIMIT}
            onDeleteActivity={(deletedId) => {
              markActivityRemoved(deletedId);
              setData((prev) =>
                prev
                  ? {
                      ...prev,
                      activities: prev.activities.filter((x) => x.id !== deletedId),
                      stats: prev.stats
                        ? { ...prev.stats, activityCount: Math.max(0, prev.stats.activityCount - 1) }
                        : null,
                    }
                  : null
              );
              load();
            }}
          />
        )}
      </ScrollView>
    </SafeAreaView>
  );
};
