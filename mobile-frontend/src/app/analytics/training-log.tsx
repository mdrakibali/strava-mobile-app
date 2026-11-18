import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatBox } from '../../components/common/StatBox';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export default function TrainingLogScreen() {
  const router = useRouter();
  const [selectedSport, setSelectedSport] = useState<'All' | 'Run' | 'Ride'>('All');

  // Realistic sample weeks
  const WEEKS = [
    {
      weekLabel: 'Nov 17 - Nov 23 (Current Week)',
      totalDistanceKm: '38.4',
      totalTime: '3h 15m',
      totalElevMeters: '420',
      workouts: [
        { day: 'Mon', type: 'Rest', title: 'Rest Day', distance: '-' },
        { day: 'Tue', type: 'Run', title: 'Track 6x800m', distance: '8.2 km', pace: '4:15/km' },
        { day: 'Wed', type: 'Run', title: 'Aerobic Base', distance: '6.0 km', pace: '5:20/km' },
        { day: 'Thu', type: 'Ride', title: 'Cadence Drills', distance: '24.2 km', pace: '29 km/h' },
        { day: 'Fri', type: 'Rest', title: 'Mobility & Foam Roll', distance: '-' },
        { day: 'Sat', type: 'Run', title: 'Long Run Progression', distance: '16.0 km', pace: '5:05/km' },
        { day: 'Sun', type: 'Rest', title: 'Recovery Walk', distance: '-' },
      ],
    },
    {
      weekLabel: 'Nov 10 - Nov 16',
      totalDistanceKm: '42.1',
      totalTime: '3h 48m',
      totalElevMeters: '560',
      workouts: [
        { day: 'Mon', type: 'Rest', title: 'Rest Day', distance: '-' },
        { day: 'Tue', type: 'Run', title: 'Lactate Threshold', distance: '9.0 km', pace: '4:22/km' },
        { day: 'Wed', type: 'Ride', title: 'Rolling Hills', distance: '22.0 km', pace: '27 km/h' },
        { day: 'Thu', type: 'Run', title: 'Easy Recovery', distance: '5.1 km', pace: '5:35/km' },
        { day: 'Fri', type: 'Rest', title: 'Rest', distance: '-' },
        { day: 'Sat', type: 'Run', title: 'Hatirjheel Saturday 10k', distance: '10.0 km', pace: '4:45/km' },
        { day: 'Sun', type: 'Run', title: 'Sunday Strides', distance: '16.0 km', pace: '5:10/km' },
      ],
    },
  ];

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      {/* Top Header */}
      <View className="flex-row items-center justify-between px-4 py-3 bg-white border-b border-gray-200">
        <TouchableOpacity onPress={() => router.back()} className="p-1">
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>
        <Text className="text-base font-black text-gray-900">Training Log</Text>
        <TouchableOpacity onPress={() => router.push('/analytics/goals')} className="p-1">
          <Ionicons name="flag-outline" size={20} color="#FC4C02" />
        </TouchableOpacity>
      </View>

      {/* Sport Filter */}
      <View className="flex-row bg-white px-4 py-2.5 border-b border-gray-200">
        {(['All', 'Run', 'Ride'] as const).map((sport) => (
          <TouchableOpacity
            key={sport}
            onPress={() => setSelectedSport(sport)}
            className={`px-4 py-1.5 rounded-full mr-2 ${
              selectedSport === sport ? 'bg-[#FC4C02]' : 'bg-gray-100'
            }`}>
            <Text className={`text-xs font-bold ${selectedSport === sport ? 'text-white' : 'text-gray-700'}`}>
              {sport}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView showsVerticalScrollIndicator={false} className="p-4" contentContainerClassName="pb-24">
        {WEEKS.map((week, wIndex) => (
          <View key={wIndex} className="bg-white rounded-2xl p-4 mb-4 border border-gray-100 shadow-sm">
            <View className="flex-row justify-between items-center mb-3">
              <Text className="text-sm font-black text-gray-900">{week.weekLabel}</Text>
              <View className="bg-orange-50 px-2 py-0.5 rounded-md">
                <Text className="text-[10px] font-black text-[#FC4C02]">{week.totalDistanceKm} km Total</Text>
              </View>
            </View>

            <View className="flex-row justify-between bg-gray-50 p-2.5 rounded-xl mb-3">
              <StatBox label="Distance" value={`${week.totalDistanceKm} km`} />
              <StatBox label="Moving Time" value={week.totalTime} />
              <StatBox label="Elevation" value={`+${week.totalElevMeters} m`} />
            </View>

            {/* Daily Rows */}
            {week.workouts.map((w, dIndex) => (
              <View
                key={dIndex}
                className="flex-row items-center justify-between py-2 border-b border-gray-50">
                <View className="flex-row items-center flex-1 mr-2">
                  <View
                    className={`w-9 h-7 rounded-md items-center justify-center mr-2.5 ${
                      w.type === 'Rest' ? 'bg-gray-100' : 'bg-orange-100'
                    }`}>
                    <Text
                      className={`text-[10px] font-black ${
                        w.type === 'Rest' ? 'text-gray-500' : 'text-[#FC4C02]'
                      }`}>
                      {w.day}
                    </Text>
                  </View>
                  <View className="flex-1">
                    <Text className="text-xs font-bold text-gray-900" numberOfLines={1}>
                      {w.title}
                    </Text>
                    {w.pace && <Text className="text-[10px] text-gray-400">{w.pace}</Text>}
                  </View>
                </View>
                <Text
                  className={`text-xs font-black ${
                    w.distance === '-' ? 'text-gray-300' : 'text-gray-800'
                  }`}>
                  {w.distance}
                </Text>
              </View>
            ))}
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

