import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Text, View } from 'react-native';

interface HeartRateIntensityCardProps {
  averageHeartRate?: number;
  maxHeartRate?: number;
  calories?: number;
}

export const HeartRateIntensityCard: React.FC<HeartRateIntensityCardProps> = ({
  averageHeartRate = 154,
  maxHeartRate = 178,
  calories = 680,
}) => {
  return (
    <View className="bg-white mt-3 p-4 border-y border-gray-200">
      <Text className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">
        Heart Rate & Aerobic Load
      </Text>
      <View className="flex-row justify-between">
        <View className="flex-row items-center">
          <Ionicons name="heart" size={18} color="#EF4444" />
          <View className="ml-1.5">
            <Text className="text-sm font-black text-gray-900">{averageHeartRate} bpm</Text>
            <Text className="text-[10px] text-gray-400">Avg Heart Rate</Text>
          </View>
        </View>

        <View className="flex-row items-center">
          <Ionicons name="pulse" size={18} color="#F59E0B" />
          <View className="ml-1.5">
            <Text className="text-sm font-black text-gray-900">{maxHeartRate} bpm</Text>
            <Text className="text-[10px] text-gray-400">Max Heart Rate</Text>
          </View>
        </View>

        <View className="flex-row items-center">
          <Ionicons name="flame" size={18} color="#FC4C02" />
          <View className="ml-1.5">
            <Text className="text-sm font-black text-gray-900">{calories}</Text>
            <Text className="text-[10px] text-gray-400">Calories</Text>
          </View>
        </View>
      </View>
    </View>
  );
};
