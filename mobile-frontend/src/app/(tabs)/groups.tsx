import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useRef, useState } from 'react';
import { Alert, Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
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
  radius,
  Skeleton,
  space,
} from '../../design';
import { kmValue } from '../../lib/format';
import { MVP_SPORTS, sportConfig } from '../../lib/sports';
import { api } from '../../services/api';

type Tab = 'challenges' | 'clubs' | 'events';

interface ChallengeRow {
  id: string;
  title: string;
  description: string | null;
  sportType: string;
  targetMeters: number;
  currentMeters: number;
  daysRemaining: number;
  isJoined: boolean;
  isCompleted: boolean;
}
interface ClubRow {
  id: string;
  name: string;
  sportType: string;
  city: string | null;
  description: string | null;
  avatarUrl: string | null;
  memberCount: number;
  isMember: boolean;
}
interface EventRow {
  id: string;
  title: string;
  clubName: string;
  sportType: string;
  dateFormatted: string;
  timeFormatted: string;
  meetingPoint: string;
  distanceMeters: number;
  attendeesCount: number;
  rsvpStatus: 'GOING' | 'MAYBE' | 'DECLINED' | null;
}

/**
 * Groups tab (reference: strava-screen/group-tap.png): Challenges · Clubs · Events, sport filter,
 * all backed by the existing clubs/challenges/events APIs. Joins and RSVPs are optimistic and
 * rolled back if the server refuses. No hard-coded showcase content.
 */
export default function GroupsScreen() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('challenges');
  const [sport, setSport] = useState<string>('All');
  const [data, setData] = useState<{ challenges: ChallengeRow[]; clubs: ClubRow[]; events: EventRow[] } | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [refreshing, setRefreshing] = useState(false);
  const loadedAt = useRef(0);

  const load = useCallback(async () => {
    const [ch, cl, ev] = await Promise.all([api.challenges.list(), api.clubs.list(), api.events.list()]);
    setData({
      challenges: ch.challenges.map((c: any) => ({
        id: c.id,
        title: c.title,
        description: c.description ?? null,
        sportType: c.sportType,
        targetMeters: Number(c.targetMeters) || 0,
        currentMeters: Number(c.currentMeters) || 0,
        daysRemaining: Number(c.daysRemaining) || 0,
        isJoined: Boolean(c.isJoined),
        isCompleted: Boolean(c.isCompleted),
      })),
      clubs: cl.clubs.map((c: any) => ({
        id: c.id,
        name: c.name,
        sportType: c.sportType,
        city: c.city ?? null,
        description: c.description ?? null,
        avatarUrl: c.avatarUrl ?? null,
        memberCount: Number(c.memberCount) || 0,
        isMember: Boolean(c.isMember),
      })),
      events: ev.events as EventRow[],
    });
    loadedAt.current = Date.now();
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (loadedAt.current && Date.now() - loadedAt.current < 10_000) return;
      let cancelled = false;
      load().then(
        () => !cancelled && setStatus('ready'),
        () => !cancelled && setStatus((s) => (s === 'ready' ? s : 'error'))
      );
      return () => {
        cancelled = true;
      };
    }, [load])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await load();
      setStatus('ready');
    } catch {
      if (!data) setStatus('error');
    } finally {
      setRefreshing(false);
    }
  };

  const update = <K extends Tab>(key: K, id: string, patch: Partial<any>) =>
    setData((d) => (d ? { ...d, [key]: (d[key] as any[]).map((x) => (x.id === id ? { ...x, ...patch } : x)) } : d));

  const joinChallenge = async (c: ChallengeRow) => {
    update('challenges', c.id, { isJoined: !c.isJoined });
    try {
      const res = await api.challenges.join(c.id);
      update('challenges', c.id, { isJoined: Boolean(res.isJoined) });
    } catch (e: any) {
      update('challenges', c.id, { isJoined: c.isJoined });
      Alert.alert('Couldn’t update challenge', e?.message ?? 'Please try again.');
    }
  };

  const joinClub = async (c: ClubRow) => {
    const want = !c.isMember;
    update('clubs', c.id, { isMember: want, memberCount: c.memberCount + (want ? 1 : -1) });
    try {
      const res = await api.clubs.join(c.id);
      update('clubs', c.id, { isMember: Boolean(res.isMember) });
    } catch (e: any) {
      update('clubs', c.id, { isMember: c.isMember, memberCount: c.memberCount });
      Alert.alert('Couldn’t update membership', e?.message ?? 'Please try again.');
    }
  };

  const rsvp = async (e: EventRow) => {
    const going = e.rsvpStatus === 'GOING';
    update('events', e.id, { rsvpStatus: going ? null : 'GOING', attendeesCount: e.attendeesCount + (going ? -1 : 1) });
    try {
      const res = await api.events.rsvp(e.id, going ? 'DECLINED' : 'GOING');
      update('events', e.id, { rsvpStatus: res.status });
    } catch (err: any) {
      update('events', e.id, { rsvpStatus: e.rsvpStatus, attendeesCount: e.attendeesCount });
      Alert.alert('Couldn’t update RSVP', err?.message ?? 'Please try again.');
    }
  };

  const bySport = <T extends { sportType: string }>(rows: T[]) => (sport === 'All' ? rows : rows.filter((r) => r.sportType === sport));
  const create = { challenges: '/challenge/create', clubs: '/club/create', events: '/event/create' } as const;

  let body: React.ReactNode;
  if (status === 'loading') {
    body = (
      <View style={{ padding: space.gutter }}>
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} style={{ height: 120, marginBottom: space.md, borderRadius: radius.lg }} />
        ))}
      </View>
    );
  } else if (status === 'error' || !data) {
    body = <ErrorState message="We couldn’t load groups. Check your connection and try again." onRetry={() => { setStatus('loading'); onRefresh(); }} />;
  } else if (tab === 'challenges') {
    const rows = bySport(data.challenges);
    body = rows.length === 0 ? (
      <EmptyState icon="trophy-outline" title="No challenges" body="Create one and invite friends to join." primary={{ label: 'Create challenge', onPress: () => router.push(create.challenges) }} />
    ) : (
      rows.map((c) => {
        const pct = c.targetMeters > 0 ? Math.min(1, c.currentMeters / c.targetMeters) : 0;
        return (
          <Pressable key={c.id} onPress={() => router.push({ pathname: '/challenge/[id]', params: { id: c.id } })} style={styles.card} accessibilityRole="button">
            <View style={styles.row}>
              <View style={styles.badge}>
                <Ionicons name={sportConfig(c.sportType).icon} size={22} color={color.brandText} />
              </View>
              <View style={{ flex: 1, marginLeft: space.md }}>
                <AppText variant="title3">{c.title}</AppText>
                <AppText variant="label" color="inkSecondary">
                  {kmValue(c.targetMeters)} km {sportConfig(c.sportType).label.toLowerCase()} · {c.daysRemaining} days left
                </AppText>
              </View>
            </View>
            {c.description ? <AppText variant="body" color="inkSecondary" style={{ marginTop: space.sm }} numberOfLines={2}>{c.description}</AppText> : null}
            {c.isJoined ? (
              <View style={{ marginTop: space.md }}>
                <View style={styles.track}><View style={[styles.fill, { width: `${pct * 100}%` }]} /></View>
                <AppText variant="caption" color="inkSecondary" style={{ marginTop: space.xs }}>
                  {c.isCompleted ? 'Completed 🎉' : `${kmValue(c.currentMeters)} of ${kmValue(c.targetMeters)} km`}
                </AppText>
              </View>
            ) : null}
            <Button label={c.isJoined ? 'Joined' : 'Join'} variant={c.isJoined ? 'secondary' : 'primary'} size="md" fullWidth onPress={() => joinChallenge(c)} style={{ marginTop: space.md }} />
          </Pressable>
        );
      })
    );
  } else if (tab === 'clubs') {
    const rows = bySport(data.clubs);
    body = rows.length === 0 ? (
      <EmptyState icon="people-outline" title="No clubs yet" body="Start a club for your running or riding group." primary={{ label: 'Create club', onPress: () => router.push(create.clubs) }} />
    ) : (
      rows.map((c) => (
        <Pressable key={c.id} onPress={() => router.push({ pathname: '/club/[id]', params: { id: c.id } })} style={styles.card} accessibilityRole="button">
          <View style={styles.row}>
            <Avatar uri={c.avatarUrl} name={c.name} size={48} />
            <View style={{ flex: 1, marginLeft: space.md }}>
              <AppText variant="title3">{c.name}</AppText>
              <AppText variant="label" color="inkSecondary">
                {sportConfig(c.sportType).label} · {c.memberCount} {c.memberCount === 1 ? 'member' : 'members'}
                {c.city ? ` · ${c.city}` : ''}
              </AppText>
            </View>
            <Button label={c.isMember ? 'Joined' : 'Join'} size="sm" variant={c.isMember ? 'secondary' : 'primary'} onPress={() => joinClub(c)} />
          </View>
        </Pressable>
      ))
    );
  } else {
    const rows = bySport(data.events);
    body = rows.length === 0 ? (
      <EmptyState icon="calendar-outline" title="No upcoming events" body="Plan a group run or ride." primary={{ label: 'Create event', onPress: () => router.push(create.events) }} />
    ) : (
      rows.map((e) => (
        <Pressable key={e.id} onPress={() => router.push({ pathname: '/event/[id]', params: { id: e.id } })} style={styles.card} accessibilityRole="button">
          <AppText variant="label" color="brandText" style={{ fontWeight: '700' }}>
            {e.dateFormatted} · {e.timeFormatted}
          </AppText>
          <AppText variant="title3" style={{ marginTop: 2 }}>{e.title}</AppText>
          <AppText variant="label" color="inkSecondary">
            {e.clubName} · {sportConfig(e.sportType).label}
            {e.distanceMeters ? ` · ${kmValue(e.distanceMeters)} km` : ''}
          </AppText>
          <View style={[styles.row, { marginTop: space.sm }]}>
            <Ionicons name="location-outline" size={16} color={color.inkSecondary} />
            <AppText variant="label" color="inkSecondary" style={{ marginLeft: space.xs, flex: 1 }} numberOfLines={1}>{e.meetingPoint}</AppText>
            <AppText variant="label" color="inkSecondary">{e.attendeesCount} going</AppText>
          </View>
          <Button label={e.rsvpStatus === 'GOING' ? 'Going ✓' : 'RSVP'} size="md" fullWidth variant={e.rsvpStatus === 'GOING' ? 'secondary' : 'primary'} onPress={() => rsvp(e)} style={{ marginTop: space.md }} />
        </Pressable>
      ))
    );
  }

  return (
    <SafeAreaView edges={['top']} style={styles.screen}>
      <AppBar
        title="Groups"
        large
        leading="none"
        right={
          <>
            <IconButton icon="chatbubbles-outline" accessibilityLabel="Messages" onPress={() => router.push('/messages')} />
            <IconButton icon="search-outline" accessibilityLabel="Find athletes" onPress={() => router.push('/search')} />
            <IconButton icon="add" accessibilityLabel={`Create ${tab.slice(0, -1)}`} onPress={() => router.push(create[tab])} />
          </>
        }
      />
      <View style={styles.tabs}>
        {(['challenges', 'clubs', 'events'] as Tab[]).map((t) => (
          <Pressable key={t} onPress={() => setTab(t)} style={styles.tab} accessibilityRole="tab" accessibilityState={{ selected: tab === t }}>
            <AppText variant="bodyStrong" color={tab === t ? 'ink' : 'inkSecondary'}>
              {t === 'challenges' ? 'Challenges' : t === 'clubs' ? 'Clubs' : 'Events'}
            </AppText>
            <View style={[styles.underline, tab === t && { backgroundColor: color.brand }]} />
          </Pressable>
        ))}
      </View>
      <View style={styles.chips}>
        <ChipRow>
          <Chip label="All" selected={sport === 'All'} onPress={() => setSport('All')} />
          {MVP_SPORTS.map((s) => (
            <Chip key={s.id} label={s.label} icon={s.icon} selected={sport === s.id} onPress={() => setSport(s.id)} />
          ))}
        </ChipRow>
      </View>
      <ScrollView
        contentContainerStyle={{ padding: space.gutter, paddingBottom: space.xxxl, flexGrow: 1 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[color.brand]} />}>
        {body}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.canvas },
  tabs: { flexDirection: 'row', backgroundColor: color.surface, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: color.border },
  tab: { flex: 1, alignItems: 'center', paddingTop: space.md },
  underline: { height: 3, width: '60%', marginTop: space.sm, borderRadius: 2, backgroundColor: 'transparent' },
  chips: { backgroundColor: color.surface, paddingVertical: space.sm },
  card: { backgroundColor: color.surface, borderRadius: radius.lg, padding: space.gutter, marginBottom: space.md },
  row: { flexDirection: 'row', alignItems: 'center' },
  badge: { width: 44, height: 44, borderRadius: 22, backgroundColor: color.brandSoft, alignItems: 'center', justifyContent: 'center' },
  track: { height: 8, borderRadius: 4, backgroundColor: color.canvas, overflow: 'hidden' },
  fill: { height: 8, backgroundColor: color.brand },
});
