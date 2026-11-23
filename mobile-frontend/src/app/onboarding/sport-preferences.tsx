import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

const SPORTS = [
  { id: 'Run', label: 'Outdoor Running', icon: 'footsteps-outline' as const },
  { id: 'Ride', label: 'Road & Gravel Cycling', icon: 'bicycle-outline' as const },
  { id: 'Trail', label: 'Trail Running', icon: 'trail-sign-outline' as const },
  { id: 'Hike', label: 'Hiking & Walking', icon: 'walk-outline' as const },
  { id: 'Workout', label: 'Gym & Cross Training', icon: 'barbell-outline' as const },
];

export default function SportPreferencesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
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
    <SafeAreaView style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
      <ScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        showsVerticalScrollIndicator={false}
        style={{ flex: 1 }}
        className="px-6 pt-2 pb-6"
      >
        {/* Navigation Bar */}
        <TouchableOpacity onPress={() => router.back()} className="p-1 mb-4 self-start">
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>

        {/* Heading */}
        <Text className="text-2xl font-black text-gray-900 mb-1.5">What moves you?</Text>
        <Text className="text-xs text-gray-500 mb-6 leading-4">
          Choose your primary activities so we can tailor your feed, routes, and challenges.
        </Text>

        {/* Sports List */}
        <View className="mb-6">
          {SPORTS.map((sport) => {
            const isSelected = selectedSports.includes(sport.id);
            return (
              <TouchableOpacity
                key={sport.id}
                onPress={() => toggleSport(sport.id)}
                activeOpacity={0.8}
                className={`flex-row items-center justify-between p-3.5 rounded-2xl border mb-2.5 ${
                  isSelected ? 'border-[#FC4C02] bg-orange-50/50' : 'border-gray-200 bg-white'
                }`}
              >
                <View className="flex-row items-center">
                  <View
                    className={`w-10 h-10 rounded-xl items-center justify-center mr-3 ${
                      isSelected ? 'bg-[#FC4C02]' : 'bg-gray-100'
                    }`}
                  >
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
        </View>

        {/* Target Frequency */}
        <Text className="text-sm font-black text-gray-900 mb-2">Weekly Workout Goal</Text>
        <View className="flex-row justify-between mb-8">
          {[2, 3, 4, 5, 6].map((days) => (
            <TouchableOpacity
              key={days}
              onPress={() => setWeeklyTarget(days)}
              className={`w-13 h-12 rounded-2xl items-center justify-center border ${
                weeklyTarget === days
                  ? 'border-[#FC4C02] bg-[#FC4C02]'
                  : 'border-gray-200 bg-gray-50'
              }`}
            >
              <Text
                className={`text-sm font-black ${
                  weeklyTarget === days ? 'text-white' : 'text-gray-700'
                }`}
              >
                {days}d
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Bottom Continue Button */}
        <View className="mt-auto pt-4" style={{ paddingBottom: Math.max(insets.bottom, 12) }}>
          <TouchableOpacity
            onPress={() => router.push('/onboarding/profile-setup')}
            activeOpacity={0.85}
            className="w-full py-4 bg-[#FC4C02] rounded-full items-center justify-center shadow-lg"
          >
            <Text className="text-base font-black text-white">Continue</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
