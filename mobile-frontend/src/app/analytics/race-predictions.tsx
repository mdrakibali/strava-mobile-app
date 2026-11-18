import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MOCK_RACE_PREDICTIONS } from '../../mock/data';

export default function RacePredictionsScreen() {
  const router = useRouter();

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      {/* Header */}
      <View className="flex-row items-center justify-between px-4 py-3 bg-white border-b border-gray-200">
        <TouchableOpacity onPress={() => router.back()} className="p-1">
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>
        <Text className="text-base font-black text-gray-900">Race Predictor 🏁</Text>
        <TouchableOpacity onPress={() => alert('Predicted using Riegel Power Law and your last 8 weeks of VO2 & aerobic volume.')} className="p-1">
          <Ionicons name="information-circle-outline" size={22} color="#6B7280" />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} className="p-4" contentContainerClassName="pb-24">
        {/* Intro Card */}
        <View className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm mb-4">
          <Text className="text-sm font-black text-gray-900 mb-1">Algorithmic Race Projections</Text>
          <Text className="text-xs text-gray-500 leading-4">
            Projections are continuously updated based on your recent training volume (42.5 km/wk avg) and interval best efforts.
          </Text>
        </View>

        {/* Prediction Cards */}
        {MOCK_RACE_PREDICTIONS.map((race) => (
          <View
            key={race.distanceLabel}
            className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm mb-3">
            <View className="flex-row items-center justify-between mb-2">
              <View className="flex-row items-center">
                <View className="w-10 h-10 rounded-xl bg-orange-50 items-center justify-center mr-3">
                  <Ionicons name="trophy-outline" size={20} color="#FC4C02" />
                </View>
                <View>
                  <Text className="text-base font-black text-gray-900">{race.distanceLabel}</Text>
                  <Text className="text-xs text-gray-400 font-semibold">{race.predictedPaceFormatted}</Text>
                </View>
              </View>

              <View className="items-end">
                <Text className="text-xl font-black text-[#FC4C02]">{race.predictedTimeFormatted}</Text>
                <View className="bg-emerald-50 px-2 py-0.5 rounded-full mt-0.5">
                  <Text className="text-[10px] font-bold text-emerald-700">{race.confidenceScorePercent}% Confidence</Text>
                </View>
              </View>
            </View>

            {/* Confidence Bar */}
            <View className="h-1.5 bg-gray-100 rounded-full overflow-hidden mt-1">
              <View
                style={{ width: `${race.confidenceScorePercent}%` }}
                className="h-full bg-emerald-500 rounded-full"
              />
            </View>
          </View>
        ))}

        {/* Training Advice */}
        <View className="bg-orange-50 p-4 rounded-2xl border border-orange-200 mt-2">
          <View className="flex-row items-center mb-1">
            <Ionicons name="bulb-outline" size={18} color="#FC4C02" />
            <Text className="text-xs font-black text-[#FC4C02] ml-1.5">Coach Recommendation</Text>
          </View>
          <Text className="text-xs text-gray-700 leading-4">
            To improve your Marathon projection below 3:15:00, increase your Sunday long run progression to 24–28 km while maintaining 80% aerobic Zone 2 effort.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
