import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useApp } from '../../context/AppContext';
import { setFollowing, socialStore } from '../../lib/social';
import { api } from '../../services/api';

export default function SuggestedAthletesScreen() {
  const router = useRouter();
  const { currentUser, updateCurrentUser } = useApp();
  const [suggested, setSuggested] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchSuggested = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await api.athletes.search('');
      if (res?.athletes) {
        const mapped = res.athletes
          .filter((a: any) => a.id !== currentUser?.id)
          .map((a: any) => {
            const cached = socialStore.getFollow(a.id);
            return { ...a, isFollowing: cached !== undefined ? cached : Boolean(a.isFollowing) };
          });
        setSuggested(mapped);
      }
    } catch (err) {
      console.warn('Failed to load suggested athletes:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchSuggested();
    }, [fetchSuggested])
  );

  const toggleFollow = async (id: string) => {
    const row = suggested.find((a) => a.id === id);
    if (!row) return;
    const want = !row.isFollowing;
    setSuggested((prev) => prev.map((a) => (a.id === id ? { ...a, isFollowing: want } : a)));
    try {
      const res = await setFollowing(id, row.isFollowing, want);
      setSuggested((prev) => prev.map((a) => (a.id === id ? { ...a, isFollowing: res.isFollowing } : a)));
      if (currentUser?.id) {
        updateCurrentUser({
          followingCount: Math.max(0, (currentUser.followingCount || 0) + (res.isFollowing ? 1 : -1)),
        });
      }
    } catch (err) {
      console.warn('Follow error:', err);
      setSuggested((prev) => prev.map((a) => (a.id === id ? { ...a, isFollowing: row.isFollowing } : a)));
    }
  };

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: '#F9FAFB' }}>
      <View className="flex-row items-center px-4 py-3 bg-white border-b border-gray-200">
        <TouchableOpacity onPress={() => router.back()} className="p-1">
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>
        <Text className="text-base font-black text-gray-900 ml-3">Suggested Athletes</Text>
      </View>

      <View style={{ flex: 1 }}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: 16, paddingBottom: 100, flexGrow: 1 }}>
          <Text className="text-xs font-semibold text-gray-500 mb-3">
            Athletes active in the Kinetix community:
          </Text>

        {isLoading ? (
          <View className="py-12 items-center">
            <ActivityIndicator size="small" color="#FC4C02" />
            <Text className="text-xs text-gray-400 mt-2">Loading suggested athletes...</Text>
          </View>
        ) : suggested.length === 0 ? (
          <View className="bg-white p-8 rounded-2xl border border-gray-200 items-center justify-center mt-4">
            <Ionicons name="people-outline" size={32} color="#D1D5DB" />
            <Text className="text-sm font-bold text-gray-800 mt-2">No suggested athletes yet</Text>
          </View>
        ) : (
          suggested.map((athlete) => {
            const isFollowing = socialStore.getFollow(athlete.id) ?? Boolean(athlete.isFollowing);
            return (
              <View
                key={athlete.id}
                className="p-4 bg-white rounded-2xl mb-3 border border-gray-100 shadow-sm">
                <View className="flex-row items-center justify-between mb-2">
                  <TouchableOpacity
                    onPress={() => router.push(`/athlete/${athlete.id}`)}
                    className="flex-row items-center flex-1 mr-3">
                    <Image
                      source={{ uri: athlete.avatarUrl || undefined }}
                      className="w-14 h-14 rounded-full mr-3 bg-gray-100"
                    />
                    <View className="flex-1">
                      <Text className="text-sm font-bold text-gray-900">{athlete.displayName}</Text>
                      <Text className="text-xs text-gray-400">@{athlete.username || 'athlete'}</Text>
                      <View className="flex-row items-center mt-0.5">
                        <Ionicons name="location-outline" size={11} color="#FC4C02" />
                        <Text className="text-[11px] text-[#FC4C02] font-semibold ml-0.5">
                          {athlete.city || 'Dhaka'} · Community Runner
                        </Text>
                      </View>
                    </View>
                  </TouchableOpacity>

                  <View className="flex-row items-center">
                    <TouchableOpacity
                      onPress={() => router.push({ pathname: '/messages/[id]', params: { id: athlete.id } })}
                      className="w-8 h-8 rounded-full bg-orange-50 items-center justify-center mr-2">
                      <Ionicons name="chatbubble-outline" size={15} color="#FC4C02" />
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={() => toggleFollow(athlete.id)}
                      className={`px-4 py-1.5 rounded-full ${
                        isFollowing ? 'bg-gray-100' : 'bg-[#FC4C02]'
                      }`}>
                      <Text className={`text-xs font-bold ${isFollowing ? 'text-gray-700' : 'text-white'}`}>
                        {isFollowing ? 'Following' : 'Follow +'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {athlete.bio && (
                  <Text className="text-xs text-gray-600 leading-4 mt-1 border-t border-gray-50 pt-2">
                    {athlete.bio}
                  </Text>
                )}
              </View>
            );
          })
        )}
      </ScrollView>
      </View>
    </SafeAreaView>
  );
}
