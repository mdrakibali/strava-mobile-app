import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useApp } from '../../context/AppContext';
import { api } from '../../services/api';

export default function ClubDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { clubs, currentUser } = useApp();
  const [activeSubTab, setActiveSubTab] = useState<'LEADERBOARD' | 'ABOUT'>('LEADERBOARD');
  const [isLoading, setIsLoading] = useState(false);
  const [joining, setJoining] = useState(false);
  const [serverClub, setServerClub] = useState<any>(null);
  const [weeklyLeaderboard, setWeeklyLeaderboard] = useState<any[]>([]);

  const localClub = clubs.find((c) => c.id === id) || clubs[0];
  const club = serverClub || localClub;

  useEffect(() => {
    let isMounted = true;
    if (!id) return;

    const fetchClubDetail = async () => {
      setIsLoading(true);
      try {
        const res = await api.clubs.get(id);
        if (isMounted && res) {
          if (res.club) {
            setServerClub({
              id: res.club.id,
              name: res.club.name,
              sportType: res.club.sportType,
              city: res.club.city || '',
              description: res.club.description || '',
              avatarUrl: res.club.avatarUrl,
              bannerUrl: res.club.bannerUrl,
              memberCount: res.club.membersCount ?? res.club.memberCount ?? 0,
              isMember: Boolean(res.club.isMember),
            });
          }
          if (res.weeklyLeaderboard) {
            setWeeklyLeaderboard(res.weeklyLeaderboard);
          }
        }
      } catch (err) {
        console.warn('Failed to fetch club detail from API:', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    fetchClubDetail();
    return () => {
      isMounted = false;
    };
  }, [id]);

  if (!club) {
    return (
      <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color="#FC4C02" />
        <Text style={{ fontSize: 12, color: '#9CA3AF', marginTop: 8 }}>Loading club details...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: '#F9FAFB' }}>
      {/* Top Header */}
      <View style={{ backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#E5E7EB' }} className="flex-row justify-between items-center px-3 py-2">
        <TouchableOpacity onPress={() => router.back()} className="p-1">
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>
        <Text className="text-sm font-bold text-gray-900" numberOfLines={1}>
          {club.name}
        </Text>
        <TouchableOpacity className="p-1">
          <Ionicons name="share-social-outline" size={22} color="#111827" />
        </TouchableOpacity>
      </View>

      <View style={{ flex: 1 }}>
        <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 60, flexGrow: 1 }}>
          {/* Banner & Club Meta */}
          <Image source={{ uri: club.bannerUrl }} className="w-full h-32 bg-gray-100" />
          <View className="bg-white p-4 border-b border-gray-200">
            <View className="flex-row items-center -mt-10 mb-2">
              <Image source={{ uri: club.avatarUrl }} className="w-16 h-16 rounded-full border-2 border-white bg-gray-100 mr-3" />
              <View className="flex-1 pt-6">
                <Text className="text-lg font-bold text-gray-900">{club.name}</Text>
                <TouchableOpacity onPress={() => router.push({ pathname: '/club/members', params: { id: club.id } })}>
                  <Text className="text-xs text-[#FC4C02] font-semibold mt-0.5">
                    {club.sportType} · {club.city} · {club.memberCount} Athletes →
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            <Text className="text-xs text-gray-600 leading-5 mb-3">{club.description}</Text>

            <TouchableOpacity
              disabled={joining}
              className={`py-3 rounded-xl items-center border ${
                club.isMember ? 'bg-white border-gray-300' : 'bg-[#FC4C02] border-[#FC4C02]'
              }`}
              onPress={async () => {
                if (joining) return;
                const before = { isMember: Boolean(club.isMember), memberCount: Number(club.memberCount) || 0 };
                const want = !before.isMember;
                setJoining(true);
                setServerClub((prev: any) => ({
                  ...(prev || club),
                  isMember: want,
                  memberCount: Math.max(0, before.memberCount + (want ? 1 : -1)),
                }));
                try {
                  const res = await api.clubs.join(club.id);
                  setServerClub((prev: any) => ({
                    ...(prev || club),
                    isMember: Boolean(res.isMember),
                    memberCount: typeof res.membersCount === 'number' ? res.membersCount : prev?.memberCount,
                  }));
                } catch (e: any) {
                  setServerClub((prev: any) => ({ ...(prev || club), ...before }));
                  Alert.alert('Couldn’t update membership', e?.message ?? 'Please try again.');
                } finally {
                  setJoining(false);
                }
              }}>
              <Text className={`text-sm font-bold ${club.isMember ? 'text-gray-900' : 'text-white'}`}>
                {club.isMember ? 'Joined (Tap to Leave)' : 'Join Club'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Sub-Tabs Switcher */}
          <View className="flex-row bg-white mt-2 border-b border-gray-200">
            <TouchableOpacity
              className={`flex-1 py-3 items-center border-b-2 ${
                activeSubTab === 'LEADERBOARD' ? 'border-[#FC4C02]' : 'border-transparent'
              }`}
              onPress={() => setActiveSubTab('LEADERBOARD')}>
              <Text className={`text-xs font-bold ${activeSubTab === 'LEADERBOARD' ? 'text-[#FC4C02]' : 'text-gray-500'}`}>
                Weekly Leaderboard
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              className={`flex-1 py-3 items-center border-b-2 ${
                activeSubTab === 'ABOUT' ? 'border-[#FC4C02]' : 'border-transparent'
              }`}
              onPress={() => setActiveSubTab('ABOUT')}>
              <Text className={`text-xs font-bold ${activeSubTab === 'ABOUT' ? 'text-[#FC4C02]' : 'text-gray-500'}`}>
                About & Guidelines
              </Text>
            </TouchableOpacity>
          </View>

          {activeSubTab === 'LEADERBOARD' ? (
            <View className="p-4 gap-2">
              <Text className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">
                Top Mileage This Week (Mon – Sun)
              </Text>

              {isLoading ? (
                <View className="py-8 items-center">
                  <ActivityIndicator size="small" color="#FC4C02" />
                  <Text className="text-xs text-gray-400 mt-2">Computing weekly mileage...</Text>
                </View>
              ) : weeklyLeaderboard.length === 0 ? (
                <View className="bg-white p-6 rounded-2xl border border-gray-200 items-center justify-center">
                  <Ionicons name="trophy-outline" size={32} color="#D1D5DB" />
                  <Text className="text-sm font-bold text-gray-800 mt-2">No activities yet this week</Text>
                  <Text className="text-xs text-gray-400 text-center mt-1">
                    Be the first club member to log a run or ride this week!
                  </Text>
                </View>
              ) : (
                weeklyLeaderboard.map((row, index) => {
                  const rank = index + 1;
                  const isYou = row.athleteId === currentUser?.id;
                  const distKm = (Number(row.distanceMeters || 0) / 1000).toFixed(1);

                  return (
                    <TouchableOpacity
                      key={row.athleteId || index}
                      onPress={() => router.push(`/athlete/${row.athleteId}`)}
                      className={`flex-row items-center p-3 rounded-xl border bg-white ${
                        isYou ? 'border-[#FC4C02] bg-[#FFF2EB]' : 'border-gray-200'
                      }`}>
                      <Text
                        className={`w-6 font-black text-center text-xs ${
                          rank === 1 ? 'text-amber-500' : rank === 2 ? 'text-gray-400' : rank === 3 ? 'text-amber-700' : 'text-gray-500'
                        }`}>
                        #{rank}
                      </Text>

                      <Image source={{ uri: row.avatarUrl || undefined }} className="w-9 h-9 rounded-full mx-2 bg-gray-100" />

                      <View className="flex-1">
                        <Text className={`text-xs font-bold ${isYou ? 'text-[#FC4C02]' : 'text-gray-900'}`}>
                          {row.displayName} {isYou ? '(You)' : ''}
                        </Text>
                        <Text className="text-[10px] text-gray-400">{row.activitiesCount || 0} workouts logged</Text>
                      </View>

                      <Text className="text-sm font-black text-gray-900 font-mono">{distKm} km</Text>
                    </TouchableOpacity>
                  );
                })
              )}
              <TouchableOpacity
                onPress={() => router.push({ pathname: '/club/members', params: { id: club.id } })}
                className="mt-3 py-3 rounded-xl border border-gray-200 bg-white items-center active:bg-gray-50">
                <Text className="text-xs font-bold text-gray-800">View all club members</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View className="p-4 gap-3 bg-white mt-2 border-y border-gray-200">
              <Text className="text-sm font-bold text-gray-900">Club Etiquette & Guidelines</Text>
              <Text className="text-xs text-gray-600 leading-5">
                1. All fitness levels and paces are welcome!{'\n'}
                2. Respect fellow athletes during group runs and peloton rides.{'\n'}
                3. Share kudos and cheer on your club teammates!{'\n'}
                4. Track honestly using verified GPS workouts.
              </Text>
            </View>
          )}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}