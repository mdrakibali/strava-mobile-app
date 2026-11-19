import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '../../services/api';

export default function FollowingScreen() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [following, setFollowing] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const fetchFollowing = async () => {
      setIsLoading(true);
      try {
        const res = await api.athletes.search(searchQuery);
        if (isMounted && res?.athletes) {
          // Show athletes where isFollowing is true, or all if none yet
          const followed = res.athletes.filter((a: any) => a.isFollowing);
          setFollowing(followed.length > 0 ? followed : res.athletes.slice(0, 5));
        }
      } catch (err) {
        console.warn('Failed to load following athletes:', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    fetchFollowing();
    return () => {
      isMounted = false;
    };
  }, [searchQuery]);

  const toggleUnfollow = async (id: string) => {
    setFollowing((prev) => prev.filter((a) => a.id !== id));
    try {
      await api.athletes.toggleFollow(id);
    } catch (err) {
      console.warn('Unfollow error:', err);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <View className="flex-row items-center px-4 py-3 bg-white border-b border-gray-200">
        <TouchableOpacity onPress={() => router.back()} className="p-1">
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>
        <Text className="text-base font-black text-gray-900 ml-3">
          Following ({following.length})
        </Text>
      </View>

      <View className="p-4 bg-white border-b border-gray-200">
        <View className="flex-row items-center bg-gray-100 px-3.5 py-2 rounded-xl">
          <Ionicons name="search" size={16} color="#9CA3AF" />
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search following athletes..."
            className="flex-1 ml-2 text-sm text-gray-900"
          />
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} className="p-4" contentContainerClassName="pb-24">
        {isLoading ? (
          <View className="py-12 items-center">
            <ActivityIndicator size="small" color="#FC4C02" />
            <Text className="text-xs text-gray-400 mt-2">Loading following...</Text>
          </View>
        ) : following.length === 0 ? (
          <View className="bg-white p-8 rounded-2xl border border-gray-200 items-center justify-center mt-4">
            <Ionicons name="person-add-outline" size={32} color="#D1D5DB" />
            <Text className="text-sm font-bold text-gray-800 mt-2">Not following any athletes yet</Text>
            <TouchableOpacity
              onPress={() => router.push('/search')}
              className="mt-3 px-4 py-2 bg-[#FC4C02] rounded-xl">
              <Text className="text-xs font-black text-white">Find Athletes</Text>
            </TouchableOpacity>
          </View>
        ) : (
          following.map((athlete) => (
            <View
              key={athlete.id}
              className="flex-row items-center justify-between p-3 bg-white rounded-2xl mb-2.5 border border-gray-100 shadow-sm">
              <TouchableOpacity
                onPress={() => router.push(`/athlete/${athlete.id}`)}
                className="flex-row items-center flex-1 mr-3">
                <Image
                  source={{ uri: athlete.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100' }}
                  className="w-12 h-12 rounded-full mr-3 bg-gray-100"
                />
                <View className="flex-1">
                  <Text className="text-sm font-bold text-gray-900">{athlete.displayName}</Text>
                  <Text className="text-xs text-gray-400">@{athlete.username || 'athlete'}</Text>
                  <View className="flex-row items-center mt-0.5">
                    <Ionicons name="location-outline" size={10} color="#9CA3AF" />
                    <Text className="text-[10px] text-gray-400 ml-0.5">{athlete.city || 'Dhaka'}</Text>
                  </View>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => toggleUnfollow(athlete.id)}
                className="px-4 py-1.5 rounded-full bg-gray-100 border border-gray-200">
                <Text className="text-xs font-bold text-gray-700">Unfollow</Text>
              </TouchableOpacity>
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
