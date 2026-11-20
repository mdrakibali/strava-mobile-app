import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useRef, useState } from 'react';
import { Alert, Pressable, RefreshControl, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Avatar } from '../../design';
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
 * Groups tab (reference: strava-screen/group-tap.png).
 * Clean NativeWind Tailwind styling matching Strava's Groups screen.
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

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-[#F7F7F8]">
      {/* Top Header */}
      <View className="px-5 pt-3 pb-2 bg-white flex-row items-center justify-between">
        <Text className="text-3xl font-black text-gray-900 tracking-tight">Groups</Text>
        <View className="flex-row items-center space-x-3">
          <TouchableOpacity onPress={() => router.push('/messages')} className="p-2">
            <Ionicons name="chatbubbles-outline" size={22} color="#1F2937" />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.push('/search')} className="p-2">
            <Ionicons name="search-outline" size={22} color="#1F2937" />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.push(create[tab])} className="p-2">
            <Ionicons name="add" size={26} color="#1F2937" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Tab Navigation (Challenges / Clubs / Events) */}
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
              <Ionicons
                name={s.icon}
                size={13}
                color={sport === s.id ? '#FFFFFF' : '#4B5563'}
                style={{ marginRight: 5 }}
              />
              <Text className={`text-xs font-bold ${sport === s.id ? 'text-white' : 'text-gray-700'}`}>
                {s.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Body List */}
      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#FC4C02']} />}>
        {status === 'loading' ? (
          <View className="py-8 items-center justify-center">
            <Text className="text-xs font-semibold text-gray-400">Loading {tab}…</Text>
          </View>
        ) : status === 'error' || !data ? (
          <View className="py-12 items-center justify-center bg-white rounded-3xl p-6 border border-gray-200">
            <Text className="text-sm font-bold text-gray-700 text-center mb-3">
              Couldn’t load groups. Check your connection.
            </Text>
            <TouchableOpacity
              onPress={() => {
                setStatus('loading');
                onRefresh();
              }}
              className="px-5 py-2.5 bg-[#FC4C02] rounded-full">
              <Text className="text-xs font-bold text-white">Retry</Text>
            </TouchableOpacity>
          </View>
        ) : tab === 'challenges' ? (
          bySport(data.challenges).length === 0 ? (
            <View className="bg-white rounded-3xl p-6 items-center border border-gray-200">
              <Ionicons name="trophy-outline" size={40} color="#9CA3AF" />
              <Text className="text-base font-bold text-gray-800 mt-2">No Challenges</Text>
              <Text className="text-xs text-gray-500 mt-1 mb-4 text-center">
                Create a challenge and invite athletes to join.
              </Text>
              <TouchableOpacity
                onPress={() => router.push(create.challenges)}
                className="px-5 py-2.5 bg-[#FC4C02] rounded-full">
                <Text className="text-xs font-bold text-white">Create Challenge</Text>
              </TouchableOpacity>
            </View>
          ) : (
            bySport(data.challenges).map((c) => {
              const pct = c.targetMeters > 0 ? Math.min(1, c.currentMeters / c.targetMeters) : 0;
              return (
                <View key={c.id} className="bg-white rounded-3xl p-5 mb-4 border border-gray-200/80 shadow-xs">
                  <View className="flex-row items-center mb-2">
                    <View className="w-11 h-11 rounded-2xl bg-amber-50 border border-amber-200 items-center justify-center mr-3">
                      <Ionicons name={sportConfig(c.sportType).icon} size={22} color="#D97706" />
                    </View>
                    <View className="flex-1">
                      <Text className="text-base font-black text-gray-900">{c.title}</Text>
                      <Text className="text-xs text-gray-500 mt-0.5">
                        {kmValue(c.targetMeters)} km {sportConfig(c.sportType).label.toLowerCase()} · {c.daysRemaining} days left
                      </Text>
                    </View>
                  </View>
                  {c.description ? (
                    <Text className="text-xs text-gray-600 mt-2 leading-relaxed" numberOfLines={2}>
                      {c.description}
                    </Text>
                  ) : null}
                  {c.isJoined ? (
                    <View className="mt-3">
                      <View className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                        <View style={{ width: `${pct * 100}%` }} className="h-full bg-[#FC4C02] rounded-full" />
                      </View>
                      <Text className="text-[11px] font-semibold text-gray-500 mt-1.5">
                        {c.isCompleted ? 'Completed 🎉' : `${kmValue(c.currentMeters)} of ${kmValue(c.targetMeters)} km`}
                      </Text>
                    </View>
                  ) : null}
                  <TouchableOpacity
                    onPress={() => joinChallenge(c)}
                    activeOpacity={0.85}
                    className={`w-full py-3 rounded-full mt-4 items-center justify-center ${
                      c.isJoined ? 'bg-gray-100' : 'bg-[#FC4C02]'
                    }`}>
                    <Text className={`text-xs font-black ${c.isJoined ? 'text-gray-700' : 'text-white'}`}>
                      {c.isJoined ? 'Joined' : 'Join'}
                    </Text>
                  </TouchableOpacity>
                </View>
              );
            })
          )
        ) : tab === 'clubs' ? (
          bySport(data.clubs).length === 0 ? (
            <View className="bg-white rounded-3xl p-6 items-center border border-gray-200">
              <Ionicons name="people-outline" size={40} color="#9CA3AF" />
              <Text className="text-base font-bold text-gray-800 mt-2">No Clubs Yet</Text>
              <Text className="text-xs text-gray-500 mt-1 mb-4 text-center">
                Start a club for your running or cycling group.
              </Text>
              <TouchableOpacity
                onPress={() => router.push(create.clubs)}
                className="px-5 py-2.5 bg-[#FC4C02] rounded-full">
                <Text className="text-xs font-bold text-white">Create Club</Text>
              </TouchableOpacity>
            </View>
          ) : (
            bySport(data.clubs).map((c) => (
              <View key={c.id} className="bg-white rounded-3xl p-4 mb-3 border border-gray-200/80 shadow-xs flex-row items-center">
                <Avatar uri={c.avatarUrl} name={c.name} size={48} />
                <View className="flex-1 ml-3.5">
                  <Text className="text-sm font-bold text-gray-900">{c.name}</Text>
                  <Text className="text-xs text-gray-500 mt-0.5">
                    {sportConfig(c.sportType).label} · {c.memberCount} {c.memberCount === 1 ? 'member' : 'members'}
                    {c.city ? ` · ${c.city}` : ''}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => joinClub(c)}
                  className={`px-4 py-2 rounded-full ${c.isMember ? 'bg-gray-100' : 'bg-[#FC4C02]'}`}>
                  <Text className={`text-xs font-bold ${c.isMember ? 'text-gray-700' : 'text-white'}`}>
                    {c.isMember ? 'Joined' : 'Join'}
                  </Text>
                </TouchableOpacity>
              </View>
            ))
          )
        ) : (
          bySport(data.events).length === 0 ? (
            <View className="bg-white rounded-3xl p-6 items-center border border-gray-200">
              <Ionicons name="calendar-outline" size={40} color="#9CA3AF" />
              <Text className="text-base font-bold text-gray-800 mt-2">No Upcoming Events</Text>
              <Text className="text-xs text-gray-500 mt-1 mb-4 text-center">
                Plan a group run or ride.
              </Text>
              <TouchableOpacity
                onPress={() => router.push(create.events)}
                className="px-5 py-2.5 bg-[#FC4C02] rounded-full">
                <Text className="text-xs font-bold text-white">Create Event</Text>
              </TouchableOpacity>
            </View>
          ) : (
            bySport(data.events).map((e) => (
              <View key={e.id} className="bg-white rounded-3xl p-5 mb-4 border border-gray-200/80 shadow-xs">
                <Text className="text-xs font-bold text-[#FC4C02] tracking-wide">
                  {e.dateFormatted} · {e.timeFormatted}
                </Text>
                <Text className="text-lg font-black text-gray-900 mt-1">{e.title}</Text>
                <Text className="text-xs text-gray-500 mt-0.5">
                  {e.clubName} · {sportConfig(e.sportType).label}
                  {e.distanceMeters ? ` · ${kmValue(e.distanceMeters)} km` : ''}
                </Text>
                <View className="flex-row items-center mt-3 pt-3 border-t border-gray-100">
                  <Ionicons name="location-outline" size={15} color="#6B7280" />
                  <Text className="text-xs text-gray-600 ml-1.5 flex-1" numberOfLines={1}>
                    {e.meetingPoint}
                  </Text>
                  <Text className="text-xs font-medium text-gray-500">{e.attendeesCount} going</Text>
                </View>
                <TouchableOpacity
                  onPress={() => rsvp(e)}
                  className={`w-full py-3 rounded-full mt-3.5 items-center justify-center ${
                    e.rsvpStatus === 'GOING' ? 'bg-gray-100' : 'bg-[#FC4C02]'
                  }`}>
                  <Text className={`text-xs font-black ${e.rsvpStatus === 'GOING' ? 'text-gray-700' : 'text-white'}`}>
                    {e.rsvpStatus === 'GOING' ? 'Going ✓' : 'RSVP'}
                  </Text>
                </TouchableOpacity>
              </View>
            ))
          )
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
