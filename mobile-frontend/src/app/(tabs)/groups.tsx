import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GroupsTabContent } from '../../components/groups/GroupsTabContent';
import { useApp } from '../../context/AppContext';
import { groupStore, useGroupRevision } from '../../lib/groupStore';
import { MVP_SPORTS } from '../../lib/sports';
import { api } from '../../services/api';

type Tab = 'challenges' | 'clubs' | 'events';

export default function GroupsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ tab?: Tab }>();
  const { refreshFeed } = useApp();
  const [tab, setTab] = useState<Tab>(params.tab || 'challenges');
  const [sport, setSport] = useState<string>('All');
  const [data, setData] = useState<{ challenges: any[]; clubs: any[]; events: any[] } | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [refreshing, setRefreshing] = useState(false);
  const loadedAt = useRef(0);
  const revision = useGroupRevision();

  useEffect(() => {
    if (params.tab && (params.tab === 'challenges' || params.tab === 'clubs' || params.tab === 'events')) {
      setTab(params.tab);
    }
  }, [params.tab]);

  const load = useCallback(async () => {
    const readTick = groupStore.beginRead();
    const [ch, cl, ev] = await Promise.all([
      api.challenges.list().catch(() => ({ challenges: [] })),
      api.clubs.list().catch(() => ({ clubs: [] })),
      api.events.list().catch(() => ({ events: [] })),
    ]);

    const challenges = (ch.challenges || []).map((c: any) => ({
      id: c.id,
      title: c.title,
      description: c.description ?? null,
      sportType: c.sportType,
      targetMeters: Number(c.targetMeters) || 0,
      currentMeters: Number(c.currentMeters) || 0,
      daysRemaining: Number(c.daysRemaining) || 0,
      isJoined: Boolean(c.isJoined),
      isCompleted: Boolean(c.isCompleted),
      participantsCount: Number(c.participantsCount) || 0,
    }));

    const clubs = (cl.clubs || []).map((c: any) => ({
      id: c.id,
      name: c.name,
      sportType: c.sportType,
      city: c.city ?? null,
      description: c.description ?? null,
      avatarUrl: c.avatarUrl ?? null,
      memberCount: Number(c.memberCount ?? c.membersCount) || 0,
      isMember: Boolean(c.isMember),
    }));

    const events = (ev.events || []).map((e: any) => ({
      ...e,
      attendeesCount: Number(e.attendeesCount) || 0,
    }));

    groupStore.seedChallenges(challenges, readTick);
    groupStore.seedClubs(clubs, readTick);
    groupStore.seedEvents(events, readTick);

    setData({
      challenges,
      clubs,
      events,
    });
    loadedAt.current = Date.now();
  }, []);

  useFocusEffect(
    useCallback(() => {
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
      await Promise.all([load(), refreshFeed().catch(() => {})]);
      setStatus('ready');
    } catch {
      if (!data) setStatus('error');
    } finally {
      setRefreshing(false);
    }
  };

  const joinChallenge = async (c: any) => {
    try {
      await groupStore.joinChallenge(c.id, !c.isJoined, c);
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'Could not update challenge');
    }
  };

  const joinClub = async (c: any) => {
    const want = !c.isMember;
    try {
      await groupStore.joinClub(c.id, want, c);
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'Could not update membership');
    }
  };

  const rsvp = async (e: any) => {
    const going = e.rsvpStatus === 'GOING';
    try {
      await groupStore.rsvpEvent(e.id, going ? 'DECLINED' : 'GOING', e);
    } catch (err: any) {
      Alert.alert('Error', err?.message ?? 'Could not update RSVP');
    }
  };

  const activeData = useMemo(() => {
    if (!data) return null;
    return {
      challenges: (data.challenges || [])
        .filter((c) => !groupStore.isRemoved(c.id))
        .map((c) => {
          const s = groupStore.getChallenge(c.id);
          return s ? { ...c, ...s } : c;
        }),
      clubs: (data.clubs || [])
        .filter((c) => !groupStore.isRemoved(c.id))
        .map((c) => {
          const s = groupStore.getClub(c.id);
          return s ? { ...c, ...s } : c;
        }),
      events: (data.events || [])
        .filter((e) => !groupStore.isRemoved(e.id))
        .map((e) => {
          const s = groupStore.getEvent(e.id);
          return s ? { ...e, ...s } : e;
        }),
    };
  }, [data, revision]);

  const bySport = <T extends { sportType: string }>(rows: T[]) =>
    sport === 'All' ? rows : rows.filter((r) => r.sportType?.toLowerCase() === sport.toLowerCase());

  const create = {
    challenges: '/challenge/create',
    clubs: '/club/create',
    events: '/event/create',
  } as const;

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: '#F7F7F8' }}>
      {/* Top Header */}
      <View style={{ backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#F3F4F6' }} className="px-5 pt-3 pb-2 flex-row items-center justify-between">
        <Text className="text-3xl font-black text-gray-900 tracking-tight">Groups</Text>
        <View className="flex-row items-center">
          <TouchableOpacity onPress={() => router.push('/search')} accessibilityLabel="Search" className="p-2">
            <Ionicons name="search-outline" size={24} color="#1F2937" />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.push(create[tab])} accessibilityLabel="Create" className="p-2 ml-1">
            <Ionicons name="add" size={28} color="#1F2937" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Tab Navigation */}
      <View className="flex-row bg-white border-b border-gray-200 px-4">
        {(['challenges', 'clubs', 'events'] as Tab[]).map((t) => (
          <TouchableOpacity key={t} onPress={() => setTab(t)} activeOpacity={0.8} className="flex-1 py-3 items-center">
            <Text className={`text-sm font-bold ${tab === t ? 'text-gray-900' : 'text-gray-400'}`}>
              {t === 'challenges' ? 'Challenges' : t === 'clubs' ? 'Clubs' : 'Events'}
            </Text>
            {tab === t ? <View className="h-0.5 w-12 bg-[#FC4C02] mt-2 rounded-full" /> : <View className="h-0.5 mt-2" />}
          </TouchableOpacity>
        ))}
      </View>

      {/* Horizontal Sport Filter Chips */}
      <View className="py-2.5 px-4 bg-white border-b border-gray-100">
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row">
          <TouchableOpacity onPress={() => setSport('All')} className={`px-4 py-1.5 rounded-full mr-2 ${sport === 'All' ? 'bg-[#FC4C02]' : 'bg-gray-100'}`}>
            <Text className={`text-xs font-bold ${sport === 'All' ? 'text-white' : 'text-gray-600'}`}>All</Text>
          </TouchableOpacity>
          {MVP_SPORTS.map((s) => (
            <TouchableOpacity key={s.id} onPress={() => setSport(s.id)} className={`flex-row items-center px-3.5 py-1.5 rounded-full mr-2 ${sport === s.id ? 'bg-[#FC4C02]' : 'bg-gray-100'}`}>
              <Ionicons name={s.icon} size={13} color={sport === s.id ? '#FFFFFF' : '#4B5563'} style={{ marginRight: 5 }} />
              <Text className={`text-xs font-bold ${sport === s.id ? 'text-white' : 'text-gray-700'}`}>{s.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Body List */}
      <View style={{ flex: 1 }}>
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: 16, paddingBottom: 60, flexGrow: 1 }}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#FC4C02']} />}>
          <GroupsTabContent
            tab={tab}
            data={activeData}
            status={status}
            onRefresh={() => { setStatus('loading'); onRefresh(); }}
            bySport={bySport}
            create={create}
            joinChallenge={joinChallenge}
            joinClub={joinClub}
            rsvp={rsvp}
          />
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}