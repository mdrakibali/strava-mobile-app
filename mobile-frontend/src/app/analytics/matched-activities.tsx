import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ElevationChart } from '../../components/common/ElevationChart';

const MATCHED_EFFORTS = [
  { id: '1', date: 'Nov 18, 2026', time: '38:15', pace: '4:30 /km', gap: '4:24 /km', avgHr: 164, isPr: true },
  { id: '2', date: 'Oct 28, 2026', time: '39:42', pace: '4:40 /km', gap: '4:35 /km', avgHr: 168, isPr: false },
  { id: '3', date: 'Sep 15, 2026', time: '41:10', pace: '4:51 /km', gap: '4:46 /km', avgHr: 162, isPr: false },
  { id: '4', date: 'Aug 04, 2026', time: '42:30', pace: '5:00 /km', gap: '4:55 /km', avgHr: 171, isPr: false },
];

export default function MatchedActivitiesScreen() {
  const router = useRouter();
  const [selectedRoute, setSelectedRoute] = useState('Hatirjheel Sunrise Loop (8.5 km)');

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      {/* Header */}
      <View className="flex-row items-center justify-between px-4 py-3 bg-white border-b border-gray-200">
        <TouchableOpacity onPress={() => router.back()} className="p-1">
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>
        <Text className="text-base font-black text-gray-900">Matched Activities ⏱️</Text>
        <TouchableOpacity onPress={() => alert('Matched activities automatically detects identical GPS trajectories.')} className="p-1">
          <Ionicons name="information-circle-outline" size={22} color="#6B7280" />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} className="p-4" contentContainerClassName="pb-24">
        {/* Route Selector Pill */}
        <View className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm mb-4">
          <Text className="text-xs font-bold text-gray-500 uppercase mb-1">Identified Trajectory</Text>
          <Text className="text-base font-black text-gray-900 mb-2">{selectedRoute}</Text>
          <View className="flex-row items-center bg-orange-50 px-3 py-1.5 rounded-xl border border-orange-100">
            <Ionicons name="trending-up" size={16} color="#FC4C02" />
            <Text className="text-xs font-bold text-[#FC4C02] ml-1.5">
              Pace progression: +30 sec/km faster since August!
            </Text>
          </View>
        </View>

        {/* Elevation Preview */}
        <View className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm mb-4">
          <Text className="text-sm font-black text-gray-900 mb-2">Elevation Profile</Text>
          <ElevationChart />
        </View>

        {/* History Table */}
        <View className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
          <Text className="text-sm font-black text-gray-900 mb-3">Historical Repeat Efforts ({MATCHED_EFFORTS.length})</Text>

          {MATCHED_EFFORTS.map((effort) => (
            <View
              key={effort.id}
              className="flex-row items-center justify-between py-3 border-b border-gray-50">
              <View>
                <View className="flex-row items-center">
                  <Text className="text-xs font-bold text-gray-900 mr-2">{effort.date}</Text>
                  {effort.isPr && (
                    <View className="bg-amber-100 px-1.5 py-0.5 rounded">
                      <Text className="text-[9px] font-black text-amber-700">★ PR</Text>
                    </View>
                  )}
                </View>
                <Text className="text-[11px] text-gray-400 mt-0.5">
                  Avg HR: {effort.avgHr} bpm · GAP: {effort.gap}
                </Text>
              </View>

              <View className="items-end">
                <Text className="text-sm font-black text-gray-900">{effort.time}</Text>
                <Text className="text-xs font-bold text-[#FC4C02]">{effort.pace}</Text>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

