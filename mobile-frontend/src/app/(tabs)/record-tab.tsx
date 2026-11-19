import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Image, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SportPickerModal } from '../../components/record/SportPickerModal';
import { useApp } from '../../context/AppContext';
import { SportType } from '../../types';

export default function WorkoutTabScreen() {
  const router = useRouter();
  const { startRecording } = useApp();
  const [showMoreSports, setShowMoreSports] = useState(false);

  const handleStartSport = (sport: SportType) => {
    startRecording(sport);
    router.push('/record');
  };

  const primarySports: {
    sport: SportType;
    label: string;
    icon: keyof typeof Ionicons.glyphMap;
  }[] = [
    { sport: 'Workout', label: 'Workout', icon: 'barbell-outline' },
    { sport: 'Run', label: 'Run', icon: 'footsteps-outline' },
    { sport: 'Ride', label: 'Ride', icon: 'bicycle-outline' },
  ];

  const strengthSeries = [
    {
      id: 'str_1',
      title: 'Full Body Activation',
      duration: '22 mins',
      level: 'Beginner',
      imageUrl: 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?w=500',
    },
    {
      id: 'str_2',
      title: 'Runner Core & Balance',
      duration: '18 mins',
      level: 'Intermediate',
      imageUrl: 'https://images.unsplash.com/photo-1541534741688-6078c6bfb5c5?w=500',
    },
    {
      id: 'str_3',
      title: 'Leg Power & Stamina',
      duration: '30 mins',
      level: 'All Levels',
      imageUrl: 'https://images.unsplash.com/photo-1574680096145-d05b474e2155?w=500',
    },
  ];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
      {/* Header */}
      <View className="px-5 pt-3 pb-2">
        <Text className="text-3xl font-black text-gray-900 tracking-tight">Workout</Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        style={{ flex: 1 }}
        className="px-5"
        contentContainerStyle={{ paddingBottom: 110 }}>
        {/* Primary Sport Cards */}
        <View className="space-y-4 my-2">
          {primarySports.map((item) => (
            <View
              key={item.sport}
              className="bg-white border border-gray-100 rounded-3xl p-5 shadow-sm mb-3">
              <View className="flex-row items-center justify-between mb-4">
                <View className="flex-row items-center">
                  <View className="w-10 h-10 rounded-2xl bg-gray-50 items-center justify-center mr-3">
                    <Ionicons name={item.icon} size={22} color="#111827" />
                  </View>
                  <Text className="text-xl font-black text-gray-900">{item.label}</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
              </View>

              {/* Big Strava Orange Start Button */}
              <TouchableOpacity
                onPress={() => handleStartSport(item.sport)}
                className="w-full py-4 bg-[#FC4C02] rounded-2xl flex-row items-center justify-center shadow-md active:bg-[#E03A00]">
                <Ionicons name="play" size={20} color="#FFFFFF" />
                <Text className="text-base font-black text-white ml-2 tracking-wide">Start</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>

        {/* More Sports Button */}
        <TouchableOpacity
          onPress={() => setShowMoreSports(true)}
          className="w-full py-3.5 border border-gray-200 rounded-2xl items-center justify-center mb-8 bg-gray-50/50">
          <Text className="text-sm font-bold text-gray-800">More sports</Text>
        </TouchableOpacity>

        {/* Strength Intro Series Section */}
        <View className="mb-4">
          <TouchableOpacity
            onPress={() => router.push('/analytics/training-plans')}
            className="flex-row items-center justify-between mb-1.5">
            <View className="flex-row items-center">
              <View className="w-5 h-5 rounded bg-orange-100 items-center justify-center mr-2">
                <Ionicons name="flame" size={14} color="#FC4C02" />
              </View>
              <Text className="text-base font-black text-gray-900">Strength intro series</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
          </TouchableOpacity>
          <Text className="text-xs text-gray-500 leading-4 mb-4">
            Build the foundations of strength training across 4 easy-to-follow workouts, gaining
            confidence and momentum with every session.
          </Text>

          {/* Training Series Cards */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row">
            {strengthSeries.map((item) => (
              <TouchableOpacity
                key={item.id}
                onPress={() => router.push('/analytics/training-plans')}
                className="mr-3 bg-white rounded-3xl border border-gray-100 overflow-hidden shadow-sm w-60">
                <Image source={{ uri: item.imageUrl }} className="w-full h-32 bg-gray-200" />
                <View className="p-3.5">
                  <View className="flex-row items-center justify-between mb-1">
                    <Text className="text-[10px] font-bold text-[#FC4C02] uppercase tracking-wider">
                      {item.level}
                    </Text>
                    <View className="bg-emerald-50 px-2 py-0.5 rounded-full">
                      <Text className="text-[9px] font-bold text-emerald-600">FREE IN OPEN STRAVA</Text>
                    </View>
                  </View>
                  <Text className="text-sm font-black text-gray-900 mb-1" numberOfLines={1}>
                    {item.title}
                  </Text>
                  <View className="flex-row items-center">
                    <Ionicons name="time-outline" size={12} color="#9CA3AF" />
                    <Text className="text-xs text-gray-400 ml-1">{item.duration}</Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </ScrollView>

      {/* Sport Picker Modal */}
      <SportPickerModal
        visible={showMoreSports}
        selectedSport="Workout"
        onSelectSport={(sport: SportType) => {
          setShowMoreSports(false);
          handleStartSport(sport);
        }}
        onClose={() => setShowMoreSports(false)}
      />
    </SafeAreaView>
  );
}
