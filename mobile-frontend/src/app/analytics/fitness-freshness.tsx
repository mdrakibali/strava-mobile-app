import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Defs, Line, LinearGradient, Path, Stop } from 'react-native-svg';
import { StatBox } from '../../components/common/StatBox';
import { MOCK_FITNESS_TRENDS } from '../../mock/data';

export default function FitnessFreshnessScreen() {
  const router = useRouter();
  const current = MOCK_FITNESS_TRENDS[MOCK_FITNESS_TRENDS.length - 1];

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      {/* Header */}
      <View className="flex-row items-center justify-between px-4 py-3 bg-white border-b border-gray-200">
        <TouchableOpacity onPress={() => router.back()} className="p-1">
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>
        <Text className="text-base font-black text-gray-900">Fitness & Freshness</Text>
        <TouchableOpacity onPress={() => alert('Calculated using Banister/Coggan Impulse-Response Science.')} className="p-1">
          <Ionicons name="information-circle-outline" size={22} color="#6B7280" />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} className="p-4" contentContainerClassName="pb-24">
        {/* Status Interpretation Card */}
        <View className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm mb-4">
          <View className="flex-row items-center justify-between mb-3">
            <View className="flex-row items-center">
              <View className="w-3 h-3 rounded-full bg-emerald-500 mr-2" />
              <Text className="text-sm font-black text-gray-900">Training Status: Optimal / Fresh</Text>
            </View>
            <View className="bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
              <Text className="text-[10px] font-bold text-emerald-700">TSB: +{current.formTsb}</Text>
            </View>
          </View>
          <Text className="text-xs text-gray-600 leading-5">
            Your chronic fitness is elevated while recent fatigue has tapered down. You are in prime condition for a personal record or race effort.
          </Text>
        </View>

        {/* 3 Metric Scores */}
        <View className="flex-row justify-between bg-white p-4 rounded-2xl border border-gray-100 shadow-sm mb-4">
          <StatBox label="Fitness (CTL 42d)" value={`${current.fitnessCtl}`} />
          <StatBox label="Fatigue (ATL 7d)" value={`${current.fatigueAtl}`} />
          <StatBox label="Form (TSB)" value={`+${current.formTsb}`} />
        </View>

        {/* Fitness / Fatigue Trend SVG Chart */}
        <View className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm mb-4">
          <Text className="text-sm font-black text-gray-900 mb-1">30-Day Impulse-Response Trajectory</Text>
          <Text className="text-xs text-gray-400 mb-4">Blue: Fitness (CTL) · Orange: Fatigue (ATL)</Text>

          <View className="h-44 w-full bg-gray-50 rounded-xl overflow-hidden p-2 justify-center">
            <Svg width="100%" height={150} viewBox="0 0 300 150">
              <Defs>
                <LinearGradient id="ctlGrad" x1="0" y1="0" x2="0" y2="1">
                  <Stop offset="0%" stopColor="#2563EB" stopOpacity="0.4" />
                  <Stop offset="100%" stopColor="#2563EB" stopOpacity="0.0" />
                </LinearGradient>
              </Defs>
              <Line x1="10" y1="75" x2="290" y2="75" stroke="#E5E7EB" strokeWidth="1" strokeDasharray="4,4" />
              {/* CTL Path */}
              <Path
                d="M 10 100 Q 80 80 150 70 T 290 50"
                fill="none"
                stroke="#2563EB"
                strokeWidth="3"
              />
              {/* ATL Path */}
              <Path
                d="M 10 110 Q 80 50 150 40 T 290 60"
                fill="none"
                stroke="#FC4C02"
                strokeWidth="2.5"
              />
            </Svg>
          </View>

          <View className="flex-row justify-between mt-3 px-2">
            {MOCK_FITNESS_TRENDS.map((pt, i) => (
              <Text key={i} className="text-[10px] font-semibold text-gray-400">{pt.date}</Text>
            ))}
          </View>
        </View>

        {/* Form Zone Guide */}
        <View className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm space-y-2.5">
          <Text className="text-sm font-black text-gray-900 mb-2">TSB Form Zone Breakdown</Text>
          <View className="flex-row items-center py-1">
            <View className="w-2.5 h-2.5 rounded-full bg-emerald-500 mr-2" />
            <Text className="text-xs text-gray-700 flex-1">
              <Text className="font-bold">+5 to +25 (Fresh / Race Ready):</Text> Peak performance zone.
            </Text>
          </View>
          <View className="flex-row items-center py-1">
            <View className="w-2.5 h-2.5 rounded-full bg-blue-500 mr-2" />
            <Text className="text-xs text-gray-700 flex-1">
              <Text className="font-bold">-10 to +5 (Neutral / Maintenance):</Text> Stable training load.
            </Text>
          </View>
          <View className="flex-row items-center py-1">
            <View className="w-2.5 h-2.5 rounded-full bg-orange-500 mr-2" />
            <Text className="text-xs text-gray-700 flex-1">
              <Text className="font-bold">-10 to -30 (Optimal Overload):</Text> Fitness building zone.
            </Text>
          </View>
          <View className="flex-row items-center py-1">
            <View className="w-2.5 h-2.5 rounded-full bg-red-500 mr-2" />
            <Text className="text-xs text-gray-700 flex-1">
              <Text className="font-bold">&lt; -30 (High Risk):</Text> Elevated fatigue and overtraining risk.
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

