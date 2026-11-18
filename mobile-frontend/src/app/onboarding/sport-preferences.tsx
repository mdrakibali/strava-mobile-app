import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const SPORTS = [
  { id: 'Run', label: 'Outdoor Running', icon: 'footsteps-outline' as const },
  { id: 'Ride', label: 'Road & Gravel Cycling', icon: 'bicycle-outline' as const },
  { id: 'Trail', label: 'Trail Running', icon: 'trail-sign-outline' as const },
  { id: 'Hike', label: 'Hiking & Walking', icon: 'walk-outline' as const },
  { id: 'Workout', label: 'Gym & Cross Training', icon: 'barbell-outline' as const },
];

export default function SportPreferencesScreen() {
  const router = useRouter();
  const [selectedSports, setSelectedSports] = useState<string[]>(['Run']);
  const [weeklyTarget, setWeeklyTarget] = useState<number>(3);

  const toggleSport = (id: string) => {
    if (selectedSports.includes(id)) {
      if (selectedSports.length > 1) {
        setSelectedSports(selectedSports.filter((s) => s !== id));
      }
    } else {
      setSelectedSports([...selectedSports, id]);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white justify-between p-6">
      <View>
        <TouchableOpacity onPress={() => router.back()} className="mb-4">
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>

        <Text className="text-2xl font-black text-gray-900 mb-2">
          What moves you? 🏃‍♂️🚴‍♀️
        </Text>
        <Text className="text-xs text-gray-500 mb-6">
          Choose your primary activities so we can tailor your feed, routes, and challenges.
        </Text>

        <ScrollView showsVerticalScrollIndicator={false} className="space-y-3 mb-6">
          {SPORTS.map((sport) => {
            const isSelected = selectedSports.includes(sport.id);
            return (
              <TouchableOpacity
                key={sport.id}
                onPress={() => toggleSport(sport.id)}
                className={`flex-row items-center justify-between p-4 rounded-2xl border mb-3 ${
                  isSelected
                    ? 'border-[#FC4C02] bg-orange-50/50'
                    : 'border-gray-200 bg-white'
                }`}>
                <View className="flex-row items-center">
                  <View
                    className={`w-10 h-10 rounded-xl items-center justify-center mr-3 ${
                      isSelected ? 'bg-[#FC4C02]' : 'bg-gray-100'
                    }`}>
                    <Ionicons
                      name={sport.icon}
                      size={20}
                      color={isSelected ? '#FFFFFF' : '#4B5563'}
                    />
                  </View>
                  <Text className="text-sm font-bold text-gray-900">{sport.label}</Text>
                </View>
                {isSelected && <Ionicons name="checkmark-circle" size={22} color="#FC4C02" />}
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        <Text className="text-sm font-black text-gray-900 mb-3">
          Weekly Workout Goal
        </Text>
        <View className="flex-row justify-between mb-4">
          {[2, 3, 4, 5, 6].map((days) => (
            <TouchableOpacity
              key={days}
              onPress={() => setWeeklyTarget(days)}
              className={`w-12 h-12 rounded-2xl items-center justify-center border ${
                weeklyTarget === days
                  ? 'border-[#FC4C02] bg-[#FC4C02]'
                  : 'border-gray-200 bg-gray-50'
              }`}>
              <Text
                className={`text-sm font-black ${
                  weeklyTarget === days ? 'text-white' : 'text-gray-700'
                }`}>
                {days}d
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <TouchableOpacity
        onPress={() => router.push('/onboarding/profile-setup')}
        className="w-full py-4 bg-[#FC4C02] rounded-2xl items-center shadow-md">
        <Text className="text-base font-black text-white">Next: Athlete Profile</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

