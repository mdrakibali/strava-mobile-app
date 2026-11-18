import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Image, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MOCK_ATHLETES } from '../../mock/data';

export default function SuggestedAthletesScreen() {
  const router = useRouter();
  const [suggested, setSuggested] = useState(MOCK_ATHLETES);

  const toggleFollow = (id: string) => {
    setSuggested((prev) =>
      prev.map((a) => (a.id === id ? { ...a, isFollowing: !a.isFollowing } : a))
    );
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
          Athletes active in your area and running similar weekly volume:
        </Text>

        {suggested.map((athlete) => (
          <View
            key={athlete.id}
            className="p-4 bg-white rounded-2xl mb-3 border border-gray-100 shadow-sm">
            <View className="flex-row items-center justify-between mb-2">
              <TouchableOpacity
                onPress={() => router.push(`/athlete/${athlete.id}`)}
                className="flex-row items-center flex-1 mr-3">
                <Image source={{ uri: athlete.avatarUrl }} className="w-14 h-14 rounded-full mr-3 bg-gray-100" />
                <View className="flex-1">
                  <Text className="text-sm font-bold text-gray-900">{athlete.displayName}</Text>
                  <Text className="text-xs text-gray-400">@{athlete.username}</Text>
                  <View className="flex-row items-center mt-0.5">
                    <Ionicons name="location-outline" size={11} color="#FC4C02" />
                    <Text className="text-[11px] text-[#FC4C02] font-semibold ml-0.5">
                      {athlete.city} · 8 mutual connections
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
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

