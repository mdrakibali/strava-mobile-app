import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { Image, Text, TouchableOpacity, View } from 'react-native';
import { Challenge } from '../../types';

interface ChallengesListProps {
  challenges: Challenge[];
  onToggleJoin: (challengeId: string) => void;
}

export const ChallengesList: React.FC<ChallengesListProps> = ({ challenges, onToggleJoin }) => {
  const router = useRouter();

  return (
    <View className="space-y-3">
      {challenges.map((challenge) => {
        const targetKm = challenge.targetMeters / 1000;
        const currentKm = challenge.currentMeters / 1000;
        const progressPercent = Math.min(100, Math.round((currentKm / targetKm) * 100));

        return (
          <TouchableOpacity
            key={challenge.id}
            activeOpacity={0.85}
            onPress={() => router.push(`/challenge/${challenge.id}`)}
            className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm mb-3">
            <View className="flex-row items-center mb-3">
              <Image
                source={{ uri: challenge.badgeUrl }}
                className="w-14 h-14 rounded-full mr-3 bg-gray-50 border border-gray-100"
              />
              <View className="flex-1">
                <Text className="text-base font-black text-gray-900 leading-5" numberOfLines={1}>
                  {challenge.title}
                </Text>
                <View className="flex-row items-center mt-1">
                  <View className="bg-gray-100 px-2 py-0.5 rounded-full mr-2">
                    <Text className="text-[10px] font-bold text-gray-600">{challenge.sportType}</Text>
                  </View>
                  <Text className="text-xs text-orange-600 font-semibold">
                    ⏱ {challenge.daysRemaining} days left
                  </Text>
                </View>
              </View>
            </View>

            <Text className="text-xs text-gray-600 mb-3 leading-4">{challenge.description}</Text>

            {challenge.isJoined && (
              <View className="mb-3">
                <View className="flex-row justify-between mb-1">
                  <Text className="text-xs font-bold text-gray-700">
                    {currentKm.toFixed(1)} / {targetKm.toFixed(0)} km
                  </Text>
                  <Text className="text-xs font-bold text-[#FC4C02]">{progressPercent}%</Text>
                </View>
                <View className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <View
                    className="h-full bg-[#FC4C02] rounded-full"
                    style={{ width: `${progressPercent}%` }}
                  />
                </View>
              </View>
            )}

            <View className="flex-row justify-between items-center pt-2 border-t border-gray-100">
              <Text className="text-[11px] font-semibold text-gray-400">
                Reward: Official Profile Trophy
              </Text>
              <TouchableOpacity
                onPress={() => onToggleJoin(challenge.id)}
                className={`px-4 py-1.5 rounded-full ${
                  challenge.isJoined ? 'bg-gray-100' : 'bg-[#FC4C02]'
                }`}>
                <Text
                  className={`text-xs font-bold ${
                    challenge.isJoined ? 'text-gray-700' : 'text-white'
                  }`}>
                  {challenge.isJoined ? 'Joined' : 'Join Challenge'}
                </Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        );
      })}

      <TouchableOpacity
        onPress={() => router.push('/challenge/create')}
        className="w-full py-3.5 bg-orange-50 border border-orange-200 rounded-xl items-center justify-center flex-row">
        <Ionicons name="trophy-outline" size={18} color="#FC4C02" />
        <Text className="text-sm font-bold text-[#FC4C02] ml-1.5">Create a Community Challenge</Text>
      </TouchableOpacity>
    </View>
  );
};
