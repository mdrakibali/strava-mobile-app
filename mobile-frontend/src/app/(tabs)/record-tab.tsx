import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
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
