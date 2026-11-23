import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, RefreshControl, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GroupsTabContent } from '../../components/groups/GroupsTabContent';
import { useApp } from '../../context/AppContext';
import {
  useChallenges,
  useClubs,
  useEvents,
  useRsvpEvent,
  useToggleJoinChallenge,
  useToggleJoinClub,
} from '../../hooks/useGroups';
import { MVP_SPORTS } from '../../lib/sports';

type Tab = 'challenges' | 'clubs' | 'events';

export default function GroupsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ tab?: Tab }>();
  const { refreshFeed } = useApp();
  const [tab, setTab] = useState<Tab>(params.tab || 'challenges');
  const [prevTabParam, setPrevTabParam] = useState(params.tab);
  if (params.tab !== prevTabParam) {
    setPrevTabParam(params.tab);
    if (params.tab === 'challenges' || params.tab === 'clubs' || params.tab === 'events') {
      setTab(params.tab);
    }
  }
  const [sport, setSport] = useState<string>('All');
  const [refreshing, setRefreshing] = useState(false);

  const {
    data: challenges = [],
    isLoading: loadingCh,
    isError: errorCh,
    refetch: refetchCh,
  } = useChallenges();

  const {
    data: clubs = [],
    isLoading: loadingCl,
    isError: errorCl,
    refetch: refetchCl,
  } = useClubs();

  const {
    data: events = [],
    isLoading: loadingEv,
    isError: errorEv,
    refetch: refetchEv,
  } = useEvents();

  const { mutate: toggleChallenge } = useToggleJoinChallenge();
  const { mutate: toggleClub } = useToggleJoinClub();
  const { mutate: rsvpEvent } = useRsvpEvent();

  const status: 'loading' | 'ready' | 'error' =
    loadingCh || loadingCl || loadingEv
      ? 'loading'
      : errorCh || errorCl || errorEv
        ? 'error'
        : 'ready';

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([refetchCh(), refetchCl(), refetchEv(), refreshFeed().catch(() => {})]);
    } finally {
      setRefreshing(false);
    }
  };

  const joinChallenge = (c: any) => {
    toggleChallenge(
      { id: c.id, join: !c.isJoined },
      {
        onError: (e: any) => {
          Alert.alert('Error', e?.message ?? 'Could not update challenge');
        },
      }
    );
  };

  const joinClub = (c: any) => {
    toggleClub(
      { id: c.id, join: !c.isMember },
      {
        onError: (e: any) => {
          Alert.alert('Error', e?.message ?? 'Could not update membership');
        },
      }
    );
  };

  const rsvp = (e: any) => {
    const going = e.rsvpStatus === 'GOING';
    rsvpEvent(
      { id: e.id, status: going ? 'DECLINED' : 'GOING' },
      {
        onError: (err: any) => {
          Alert.alert('Error', err?.message ?? 'Could not update RSVP');
        },
      }
    );
  };

  const activeData = useMemo(() => {
    return {
      challenges,
      clubs,
      events,
    };
  }, [challenges, clubs, events]);

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
      <View
        style={{ backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#F3F4F6' }}
        className="px-5 pt-3 pb-2 flex-row items-center justify-between"
      >
        <Text className="text-3xl font-black text-gray-900 tracking-tight">Groups</Text>
        <View className="flex-row items-center">
          <TouchableOpacity
            onPress={() => router.push('/search')}
            accessibilityLabel="Search"
            className="p-2"
          >
            <Ionicons name="search-outline" size={24} color="#1F2937" />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => router.push(create[tab])}
            accessibilityLabel="Create"
            className="p-2 ml-1"
          >
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
            className="flex-1 py-3 items-center"
          >
            <Text className={`text-sm font-bold ${tab === t ? 'text-gray-900' : 'text-gray-400'}`}>
              {t === 'challenges' ? 'Challenges' : t === 'clubs' ? 'Clubs' : 'Events'}
            </Text>
            {tab === t ? (
              <View className="h-0.5 w-12 bg-[#FC4C02] mt-2 rounded-full" />
            ) : (
              <View className="h-0.5 mt-2" />
            )}
          </TouchableOpacity>
        ))}
      </View>

      {/* Horizontal Sport Filter Chips */}
      <View className="py-2.5 px-4 bg-white border-b border-gray-100">
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row">
          <TouchableOpacity
            onPress={() => setSport('All')}
            className={`px-4 py-1.5 rounded-full mr-2 ${sport === 'All' ? 'bg-[#FC4C02]' : 'bg-gray-100'}`}
          >
            <Text
              className={`text-xs font-bold ${sport === 'All' ? 'text-white' : 'text-gray-600'}`}
            >
              All
            </Text>
          </TouchableOpacity>
          {MVP_SPORTS.map((s) => (
            <TouchableOpacity
              key={s.id}
              onPress={() => setSport(s.id)}
              className={`flex-row items-center px-3.5 py-1.5 rounded-full mr-2 ${sport === s.id ? 'bg-[#FC4C02]' : 'bg-gray-100'}`}
            >
              <Ionicons
                name={s.icon}
                size={13}
                color={sport === s.id ? '#FFFFFF' : '#4B5563'}
                style={{ marginRight: 5 }}
              />
              <Text
                className={`text-xs font-bold ${sport === s.id ? 'text-white' : 'text-gray-700'}`}
              >
                {s.label}
              </Text>
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
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#FC4C02']} />
          }
        >
          <GroupsTabContent
            tab={tab}
            data={activeData}
            status={status}
            onRefresh={onRefresh}
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
