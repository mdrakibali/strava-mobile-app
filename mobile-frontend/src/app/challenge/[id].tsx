import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Image, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatBox } from '../../components/common/StatBox';
import { MOCK_ATHLETES, MOCK_CHALLENGES } from '../../mock/data';

export default function ChallengeDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const challenge = MOCK_CHALLENGES.find((c) => c.id === id) || MOCK_CHALLENGES[0];
  const [isJoined, setIsJoined] = useState(challenge.isJoined);

  const targetKm = challenge.targetMeters / 1000;
  const currentKm = challenge.currentMeters / 1000;
  const progressPercent = Math.min(100, Math.round((currentKm / targetKm) * 100));

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      {/* Header */}
      <View className="flex-row items-center justify-between px-4 py-3 bg-white border-b border-gray-200">
        <TouchableOpacity onPress={() => router.back()} className="p-1">
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>
        <Text className="text-base font-black text-gray-900 flex-1 text-center mx-2" numberOfLines={1}>
          {challenge.title}
        </Text>
        <TouchableOpacity onPress={() => alert('Challenge shared!')} className="p-1">
          <Ionicons name="share-social-outline" size={22} color="#111827" />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerClassName="pb-28">
        {/* Badge & Title */}
        <View className="bg-white p-6 items-center border-b border-gray-200">
          <Image
            source={{ uri: challenge.badgeUrl }}
            className="w-28 h-28 rounded-full border-4 border-orange-100 bg-orange-50 mb-3"
          />
          <Text className="text-xl font-black text-gray-900 text-center mb-1">{challenge.title}</Text>
          <View className="flex-row items-center mb-3">
            <Ionicons name="time-outline" size={13} color="#EA580C" />
            <Text className="text-xs font-semibold text-orange-600 ml-1">
              {challenge.daysRemaining} days remaining in November
            </Text>
          </View>
          <Text className="text-xs text-gray-600 text-center max-w-sm leading-5">
            {challenge.description}
          </Text>
        </View>

        {/* Challenge Progress */}
        <View className="bg-white p-4 border-b border-gray-200 mt-3">
          <View className="flex-row justify-between items-center mb-2">
            <Text className="text-sm font-black text-gray-900">Your Progress</Text>
            <Text className="text-xs font-black text-[#FC4C02]">{progressPercent}%</Text>
          </View>
          <View className="h-3 bg-gray-100 rounded-full overflow-hidden mb-2">
            <View className="h-full bg-[#FC4C02] rounded-full" style={{ width: `${progressPercent}%` }} />
          </View>
          <View className="flex-row justify-between">
            <Text className="text-xs font-bold text-gray-700">{currentKm.toFixed(1)} km completed</Text>
            <Text className="text-xs font-semibold text-gray-400">Target: {targetKm.toFixed(0)} km</Text>
          </View>
        </View>

        {/* Challenge Stats */}
        <View className="flex-row justify-between bg-white px-4 py-3 border-b border-gray-200 mt-3">
          <StatBox label="Sport" value={challenge.sportType} />
          <StatBox label="Participants" value="4,820" />
          <StatBox label="Reward" value="Profile Trophy" />
        </View>

        {/* Rules & Eligibility */}
        <View className="bg-white p-4 border-b border-gray-200 mt-3 space-y-2">
          <Text className="text-sm font-black text-gray-900 mb-2">Official Challenge Rules</Text>
          <View className="flex-row items-center mb-1">
            <Ionicons name="checkmark-circle" size={16} color="#16A34A" />
            <Text className="text-xs text-gray-700 ml-2">Qualifying activities: GPS-verified {challenge.sportType}.</Text>
          </View>
          <View className="flex-row items-center mb-1">
            <Ionicons name="checkmark-circle" size={16} color="#16A34A" />
            <Text className="text-xs text-gray-700 ml-2">Virtual and manual entries do not count toward milestone progress.</Text>
          </View>
          <View className="flex-row items-center">
            <Ionicons name="checkmark-circle" size={16} color="#16A34A" />
            <Text className="text-xs text-gray-700 ml-2">Digital achievement trophy automatically unlocks upon completion.</Text>
          </View>
        </View>

        {/* Participant Leaderboard */}
        <View className="bg-white p-4 border-b border-gray-200 mt-3">
          <Text className="text-sm font-black text-gray-900 mb-3">Participant Leaderboard</Text>
          {MOCK_ATHLETES.map((athlete, index) => (
            <View key={athlete.id} className="flex-row items-center justify-between py-2.5 border-b border-gray-100">
              <View className="flex-row items-center flex-1 mr-3">
                <Text className="text-xs font-black text-gray-400 w-6">#{index + 1}</Text>
                <Image source={{ uri: athlete.avatarUrl }} className="w-9 h-9 rounded-full mr-2.5 bg-gray-100" />
                <View className="flex-1">
                  <Text className="text-xs font-bold text-gray-900">{athlete.displayName}</Text>
                  <Text className="text-[10px] text-gray-400">@{athlete.username}</Text>
                </View>
              </View>
              <Text className="text-xs font-black text-[#FC4C02]">
                {(targetKm * (0.95 - index * 0.15)).toFixed(1)} km
              </Text>
            </View>
          ))}
        </View>
      </ScrollView>

      {/* Action Footer */}
      <View className="absolute bottom-0 left-0 right-0 bg-white p-4 border-t border-gray-200">
        <TouchableOpacity
          onPress={() => setIsJoined(!isJoined)}
          className={`w-full py-4 rounded-2xl items-center shadow-md ${
            isJoined ? 'bg-gray-100' : 'bg-[#FC4C02]'
          }`}>
          <Text className={`text-base font-black ${isJoined ? 'text-gray-800' : 'text-white'}`}>
            {isJoined ? 'Leave Challenge' : 'Join Challenge Now'}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

