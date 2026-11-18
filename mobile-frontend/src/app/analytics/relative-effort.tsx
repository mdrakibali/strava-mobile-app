import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatBox } from '../../components/common/StatBox';

export default function RelativeEffortScreen() {
  const router = useRouter();

  const currentScore = 184;
  const targetMin = 150;
  const targetMax = 220;

  const DAILY_EFFORTS = [
    { day: 'Mon', score: 0 },
    { day: 'Tue', score: 48 },
    { day: 'Wed', score: 28 },
    { day: 'Thu', score: 35 },
    { day: 'Fri', score: 0 },
    { day: 'Sat', score: 73 },
    { day: 'Sun', score: 0 },
  ];

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      {/* Header */}
      <View className="flex-row items-center justify-between px-4 py-3 bg-white border-b border-gray-200">
        <TouchableOpacity onPress={() => router.back()} className="p-1">
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>
        <Text className="text-base font-black text-gray-900">Relative Effort ⚡</Text>
        <TouchableOpacity onPress={() => alert('Based on TRIMP 5-zone cardiovascular load modeling.')} className="p-1">
          <Ionicons name="information-circle-outline" size={22} color="#6B7280" />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} className="p-4" contentContainerClassName="pb-24">
        {/* Weekly Suffer Score Card */}
        <View className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm mb-4">
          <View className="flex-row items-center justify-between mb-2">
            <Text className="text-xs font-bold text-gray-500 uppercase">Weekly Cardiovascular Load</Text>
            <View className="bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
              <Text className="text-[10px] font-bold text-emerald-700">✓ In Target Range</Text>
            </View>
          </View>
          <Text className="text-3xl font-black text-gray-900 mb-1">{currentScore}</Text>
          <Text className="text-xs text-gray-500 mb-4">
            Suggested weekly training band: <Text className="font-bold text-gray-800">{targetMin} – {targetMax}</Text>
          </Text>

          {/* Target Range Progress Bar */}
          <View className="h-3 bg-gray-100 rounded-full overflow-hidden relative mb-2">
            <View className="h-full bg-orange-400 rounded-full w-[75%]" />
          </View>
          <View className="flex-row justify-between">
            <Text className="text-[10px] text-gray-400">Below ({targetMin})</Text>
            <Text className="text-[10px] font-bold text-emerald-600">Optimal ({targetMin}–{targetMax})</Text>
            <Text className="text-[10px] text-gray-400">Overreach (&gt;{targetMax})</Text>
          </View>
        </View>

        {/* Daily Breakdown */}
        <View className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm mb-4">
          <Text className="text-sm font-black text-gray-900 mb-4">Daily Relative Effort Distribution</Text>
          <View className="flex-row justify-between items-end h-32 pt-4 px-2">
            {DAILY_EFFORTS.map((item, index) => {
              const heightPercent = item.score > 0 ? Math.min(100, Math.round((item.score / 80) * 100)) : 4;
              return (
                <View key={index} className="items-center flex-1">
                  <Text className="text-[10px] font-bold text-gray-400 mb-1">
                    {item.score > 0 ? item.score : ''}
                  </Text>
                  <View
                    style={{ height: `${heightPercent}%` }}
                    className={`w-6 rounded-t-lg ${item.score > 0 ? 'bg-[#FC4C02]' : 'bg-gray-100'}`}
                  />
                  <Text className="text-[10px] font-bold text-gray-600 mt-2">{item.day}</Text>
                </View>
              );
            })}
          </View>
        </View>

        {/* Heart Rate Zone Contribution */}
        <View className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
          <Text className="text-sm font-black text-gray-900 mb-3">Heart Rate Zone Multipliers</Text>
          <View className="space-y-2">
            <View className="flex-row justify-between items-center py-1">
              <Text className="text-xs text-gray-600">Zone 1 Recovery (&lt;120 bpm)</Text>
              <Text className="text-xs font-bold text-gray-800">1.0x TRIMP Weight</Text>
            </View>
            <View className="flex-row justify-between items-center py-1">
              <Text className="text-xs text-gray-600">Zone 2 Aerobic Base (120–145 bpm)</Text>
              <Text className="text-xs font-bold text-gray-800">1.5x TRIMP Weight</Text>
            </View>
            <View className="flex-row justify-between items-center py-1">
              <Text className="text-xs text-gray-600">Zone 3 Tempo (145–165 bpm)</Text>
              <Text className="text-xs font-bold text-gray-800">2.2x TRIMP Weight</Text>
            </View>
            <View className="flex-row justify-between items-center py-1">
              <Text className="text-xs text-gray-600">Zone 4 Lactate Threshold (165–178 bpm)</Text>
              <Text className="text-xs font-bold text-[#FC4C02]">3.8x TRIMP Weight</Text>
            </View>
            <View className="flex-row justify-between items-center py-1">
              <Text className="text-xs text-gray-600">Zone 5 Neuromuscular (&gt;178 bpm)</Text>
              <Text className="text-xs font-bold text-red-600">5.5x TRIMP Weight</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

