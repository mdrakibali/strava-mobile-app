import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { RefreshControl, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useApp } from '../../context/AppContext';
import { AppBar, EmptyState, ErrorState, IconButton, SegmentedTabs, Skeleton } from '../../design';
import { useAthleteProfile, useAthleteStats, useFollowMutation } from '../../hooks/useAthletes';
import {
  ActivityView,
  AthleteSummary,
  fromProfileActivity,
  toAthleteSummary,
} from '../../lib/activityView';
import { shareAthlete } from '../../lib/share';
import { MVP_SPORTS } from '../../lib/sports';
import { AthleteStats } from '../../services/api';
import { ProfileActivitiesTab } from './ProfileActivitiesTab';
import { ProfileHeader } from './ProfileHeader';
import { ProfileProgressTab } from './ProfileProgressTab';
import { computeProgress, computeTotals, RECENT_LIMIT } from './profileStats';

interface ProfileData {
  athlete: AthleteSummary & { bio?: string | null };
  followersCount: number;
  followingCount: number;
  isFollowing: boolean;
  activities: ActivityView[];
  stats: AthleteStats | null;
}

export const ProfileView: React.FC<{ athleteId: string; isSelf: boolean }> = ({
  athleteId,
  isSelf,
}) => {
  const router = useRouter();
  const { currentUser, updateCurrentUser } = useApp();

  const {
    data: profileRes,
    isLoading: profileLoading,
    isError: profileError,
    error: profileErrObj,
    isRefetching,
    refetch,
  } = useAthleteProfile(athleteId);

  const { data: stats } = useAthleteStats(athleteId);
  const followMutation = useFollowMutation();

  const [tab, setTab] = useState<'progress' | 'activities'>('progress');
  const [sportFilter, setSportFilter] = useState<string>('All');
  const [deletedIds, setDeletedIds] = useState<Set<string>>(new Set());

  const data = useMemo<ProfileData | null>(() => {
    if (!profileRes?.athlete) return null;
    const athlete = {
      ...toAthleteSummary(profileRes.athlete),
      bio: profileRes.athlete?.bio ?? null,
    };
    const all = (profileRes.recentActivities || [])
      .filter((row: any) => !deletedIds.has(row.id))
      .map((row: any) => fromProfileActivity(row, athlete));
    return {
      athlete,
      followersCount: Number(profileRes.athlete?.followersCount) || 0,
      followingCount: Number(profileRes.athlete?.followingCount) || 0,
      isFollowing: Boolean(profileRes.athlete?.isFollowing),
      activities: isSelf ? all : all.filter((a: ActivityView) => a.visibility !== 'ONLY_ME'),
      stats: stats ?? null,
    };
  }, [profileRes, stats, isSelf, deletedIds]);

  const status = useMemo<'loading' | 'ready' | 'error' | 'notFound'>(() => {
    if (profileLoading) return 'loading';
    if (profileError) {
      return /not found/i.test(String((profileErrObj as any)?.message)) ? 'notFound' : 'error';
    }
    if (!data) return 'error';
    return 'ready';
  }, [profileLoading, profileError, profileErrObj, data]);

  const onRefresh = () => {
    void refetch();
  };

  const onToggleFollow = async () => {
    if (!data || followMutation.isPending) return;
    const wasFollowing = data.isFollowing;
    try {
      const res = await followMutation.mutateAsync({
        athleteId,
        follow: !wasFollowing,
      });
      if (currentUser?.id && typeof res.followingCount === 'number') {
        updateCurrentUser({ followingCount: res.followingCount });
      }
    } catch {
      // unchanged
    }
  };

  const onShare = () => {
    if (!data) return;
    shareAthlete(athleteId, data.athlete.displayName).catch(() => {});
  };

  const athleteData = data?.athlete;
  const athlete = useMemo(() => {
    if (!athleteData) return null;
    if (!isSelf) return athleteData;
    return {
      ...athleteData,
      displayName: currentUser.displayName || athleteData.displayName,
      avatarUrl: currentUser.avatarUrl ?? athleteData.avatarUrl,
    };
  }, [athleteData, isSelf, currentUser.displayName, currentUser.avatarUrl]);

  const activities = useMemo(() => data?.activities ?? [], [data?.activities]);

  const progress = useMemo(
    () => computeProgress(activities, sportFilter),
    [activities, sportFilter]
  );

  const totals = useMemo(() => computeTotals(activities, sportFilter), [activities, sportFilter]);

  const reconciledStats = useMemo<AthleteStats | null>(() => {
    if (!data?.stats) return null;
    return {
      ...data.stats,
      activityCount: Math.max(data.stats.activityCount ?? 0, activities.length),
    };
  }, [data?.stats, activities.length]);

  const header = (
    <AppBar
      title={isSelf ? 'You' : athlete?.displayName ?? 'Athlete'}
      trailing={
        isSelf ? (
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <IconButton
              icon="search"
              accessibilityLabel="Find athletes"
              onPress={() => router.push('/search')}
            />
            <IconButton
              icon="settings-outline"
              accessibilityLabel="Settings"
              onPress={() => router.push('/settings')}
            />
          </View>
        ) : (
          <IconButton
            icon="share-outline"
            accessibilityLabel="Share profile"
            onPress={onShare}
          />
        )
      }
    />
  );

  if (status === 'loading') {
    return (
      <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: '#F9FAFB' }}>
        {header}
        <View style={{ padding: 16 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
            <Skeleton width={72} height={72} borderRadius={36} />
            <View style={{ marginLeft: 16, flex: 1 }}>
              <Skeleton width="60%" height={20} style={{ marginBottom: 8 }} />
              <Skeleton width="40%" height={14} />
            </View>
          </View>
          <Skeleton width="100%" height={80} style={{ marginBottom: 16 }} />
          <Skeleton width="100%" height={180} />
        </View>
      </SafeAreaView>
    );
  }

  if (status === 'notFound') {
    return (
      <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: '#F9FAFB' }}>
        {header}
        <EmptyState
          icon="person-outline"
          title="Athlete not found"
          description="This profile does not exist or may have been deleted."
        />
      </SafeAreaView>
    );
  }

  if (status === 'error' || !data) {
    return (
      <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: '#F9FAFB' }}>
        {header}
        <ErrorState
          message="Could not load profile. Check your connection."
          onRetry={() => {
            void refetch();
          }}
        />
      </SafeAreaView>
    );
  }

  const maxWeek = Math.max(...progress.weeks.map((w) => w.meters), 1);
  const sportsPresent = MVP_SPORTS.filter(
    (s) =>
      activities.some((a) => a.sportType === s.id) ||
      data.stats?.bySport.some((b) => b.sportType === s.id)
  );

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: '#F9FAFB' }}>
      {header}
      <ScrollView
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={onRefresh} colors={['#FC4C02']} />
        }
        contentContainerStyle={{ paddingBottom: 64 }}
      >
        <ProfileHeader
          athleteId={athleteId}
          athlete={athlete!}
          stats={reconciledStats}
          followersCount={data.followersCount}
          followingCount={data.followingCount}
          isFollowing={data.isFollowing}
          isSelf={isSelf}
          followPending={followMutation.isPending}
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
            activities={activities}
            athleteId={athleteId}
            isSelf={isSelf}
            recentLimit={RECENT_LIMIT}
            onDeleteActivity={(deletedId) => {
              setDeletedIds((prev) => new Set(prev).add(deletedId));
            }}
          />
        )}
      </ScrollView>
    </SafeAreaView>
  );
};
