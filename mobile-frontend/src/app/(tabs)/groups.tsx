import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useRef, useState } from 'react';
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
import { MVP_SPORTS } from '../../lib/sports';
import { api } from '../../services/api';

type Tab = 'challenges' | 'clubs' | 'events';

export default function GroupsScreen() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('challenges');
  const [sport, setSport] = useState<string>('All');
  const [data, setData] = useState<{ challenges: any[]; clubs: any[]; events: any[] } | null>(null);
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
      events: ev.events,
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

  const joinChallenge = async (c: any) => {
    update('challenges', c.id, { isJoined: !c.isJoined });
    try {
      const res = await api.challenges.join(c.id);
      update('challenges', c.id, { isJoined: Boolean(res.isJoined) });
    } catch (e: any) {
      update('challenges', c.id, { isJoined: c.isJoined });
      Alert.alert('Error', e?.message ?? 'Could not update challenge');
    }
  };

  const joinClub = async (c: any) => {
    const want = !c.isMember;
    update('clubs', c.id, { isMember: want, memberCount: c.memberCount + (want ? 1 : -1) });
    try {
      const res = await api.clubs.join(c.id);
      update('clubs', c.id, { isMember: Boolean(res.isMember) });
    } catch (e: any) {
      update('clubs', c.id, { isMember: c.isMember, memberCount: c.memberCount });
      Alert.alert('Error', e?.message ?? 'Could not update membership');
    }
  };

  const rsvp = async (e: any) => {
    const going = e.rsvpStatus === 'GOING';
    update('events', e.id, { rsvpStatus: going ? null : 'GOING', attendeesCount: e.attendeesCount + (going ? -1 : 1) });
    try {
      const res = await api.events.rsvp(e.id, going ? 'DECLINED' : 'GOING');
      update('events', e.id, { rsvpStatus: res.status });
    } catch (err: any) {
      update('events', e.id, { rsvpStatus: e.rsvpStatus, attendeesCount: e.attendeesCount });
      Alert.alert('Error', err?.message ?? 'Could not update RSVP');
    }
  };

  const bySport = <T extends { sportType: string }>(rows: T[]) =>
    sport === 'All' ? rows : rows.filter((r) => r.sportType === sport);

  const create = {
    challenges: '/challenge/create',
    clubs: '/club/create',
    events: '/event/create',
  } as const;

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-[#F7F7F8]">
      {/* Top Header */}
      <View className="px-5 pt-3 pb-2 bg-white flex-row items-center justify-between border-b border-gray-100">
        <Text className="text-3xl font-black text-gray-900 tracking-tight">Groups</Text>
        <View className="flex-row items-center">
          <TouchableOpacity
            onPress={() => router.push('/search')}
            accessibilityLabel="Search"
            className="p-2">
            <Ionicons name="search-outline" size={24} color="#1F2937" />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => router.push(create[tab])}
            accessibilityLabel="Create"
            className="p-2 ml-1">
            <Ionicons name="add" size={28} color="#1F2937" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Tab Navigation */}
      <View className="flex-row bg-white border-b border-gray-200 px-4">
        {(['challenges', 'clubs', 'events'] as Tab[]).map((t) => (
          <TouchableOpacity
            key={t}
            onPress={() => setTab(t)}
            activeOpacity={0.8}
            className="flex-1 py-3 items-center">
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
          <TouchableOpacity
            onPress={() => setSport('All')}
            className={`px-4 py-1.5 rounded-full mr-2 ${sport === 'All' ? 'bg-[#FC4C02]' : 'bg-gray-100'}`}>
            <Text className={`text-xs font-bold ${sport === 'All' ? 'text-white' : 'text-gray-600'}`}>All</Text>
          </TouchableOpacity>
          {MVP_SPORTS.map((s) => (
            <TouchableOpacity
              key={s.id}
              onPress={() => setSport(s.id)}
              className={`flex-row items-center px-3.5 py-1.5 rounded-full mr-2 ${
                sport === s.id ? 'bg-[#FC4C02]' : 'bg-gray-100'
              }`}>
              <Ionicons name={s.icon} size={13} color={sport === s.id ? '#FFFFFF' : '#4B5563'} style={{ marginRight: 5 }} />
              <Text className={`text-xs font-bold ${sport === s.id ? 'text-white' : 'text-gray-700'}`}>{s.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Body List */}
      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#FC4C02']} />}>
        <GroupsTabContent
          tab={tab}
          data={data}
          status={status}
          onRefresh={() => { setStatus('loading'); onRefresh(); }}
          bySport={bySport}
          create={create}
          joinChallenge={joinChallenge}
          joinClub={joinClub}
          rsvp={rsvp}
        />
      </ScrollView>
    </SafeAreaView>
  );
}
