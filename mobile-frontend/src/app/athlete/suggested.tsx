import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '../../services/api';

export default function SuggestedAthletesScreen() {
  const router = useRouter();
  const [suggested, setSuggested] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const fetchSuggested = async () => {
      setIsLoading(true);
      try {
        const res = await api.athletes.search('');
        if (isMounted && res?.athletes) {
          setSuggested(res.athletes);
        }
      } catch (err) {
        console.warn('Failed to load suggested athletes:', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    fetchSuggested();
    return () => {
      isMounted = false;
    };
  }, []);

  const toggleFollow = async (id: string) => {
    const row = suggested.find((a) => a.id === id);
    const want = !row?.isFollowing;
    setSuggested((prev) => prev.map((a) => (a.id === id ? { ...a, isFollowing: want } : a)));
    try {
      // idempotent PUT/DELETE: a double tap can't flip the state twice
      const res = await (want ? api.athletes.follow(id) : api.athletes.unfollow(id));
      setSuggested((prev) => prev.map((a) => (a.id === id ? { ...a, isFollowing: res.isFollowing } : a)));
    } catch (err) {
      console.warn('Follow error:', err);
      setSuggested((prev) => prev.map((a) => (a.id === id ? { ...a, isFollowing: !want } : a)));
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <View className="flex-row items-center px-4 py-3 bg-white border-b border-gray-200">
        <TouchableOpacity onPress={() => router.back()} className="p-1">
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>
        <Text className="text-base font-black text-gray-900 ml-3">Suggested Athletes</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} className="p-4" contentContainerClassName="pb-20">
        <Text className="text-xs font-semibold text-gray-500 mb-3">
          Athletes active in the Open Strava community:
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
          suggested.map((athlete) => (
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

                <TouchableOpacity
                  onPress={() => toggleFollow(athlete.id)}
                  className={`px-4 py-1.5 rounded-full ${
                    athlete.isFollowing ? 'bg-gray-100' : 'bg-[#FC4C02]'
                  }`}>
                  <Text className={`text-xs font-bold ${athlete.isFollowing ? 'text-gray-700' : 'text-white'}`}>
                    {athlete.isFollowing ? 'Following' : 'Follow +'}
                  </Text>
                </TouchableOpacity>
              </View>

              {athlete.bio && (
                <Text className="text-xs text-gray-600 leading-4 mt-1 border-t border-gray-50 pt-2">
                  {athlete.bio}
                </Text>
              )}
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
