import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Image, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MOCK_ATHLETES } from '../../mock/data';

export default function FollowingScreen() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [following, setFollowing] = useState(MOCK_ATHLETES.filter((a) => a.isFollowing));

  const filtered = following.filter(
    (a) =>
      a.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const toggleUnfollow = (id: string) => {
    setFollowing((prev) => prev.filter((a) => a.id !== id));
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <View className="flex-row items-center px-4 py-3 bg-white border-b border-gray-200">
        <TouchableOpacity onPress={() => router.back()} className="p-1">
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>
        <Text className="text-base font-black text-gray-900 ml-3">Following ({following.length})</Text>
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

      <ScrollView showsVerticalScrollIndicator={false} className="p-4">
        {filtered.map((athlete) => (
          <View
            key={athlete.id}
            className="flex-row items-center justify-between p-3 bg-white rounded-2xl mb-2.5 border border-gray-100 shadow-sm">
            <TouchableOpacity
              onPress={() => router.push(`/athlete/${athlete.id}`)}
              className="flex-row items-center flex-1 mr-3">
              <Image source={{ uri: athlete.avatarUrl }} className="w-12 h-12 rounded-full mr-3 bg-gray-100" />
              <View className="flex-1">
                <Text className="text-sm font-bold text-gray-900">{athlete.displayName}</Text>
                <Text className="text-xs text-gray-400">@{athlete.username}</Text>
                <Text className="text-[10px] text-gray-400">📍 {athlete.city}</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => toggleUnfollow(athlete.id)}
              className="px-4 py-1.5 rounded-full bg-gray-100">
              <Text className="text-xs font-bold text-gray-700">Unfollow</Text>
            </TouchableOpacity>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

