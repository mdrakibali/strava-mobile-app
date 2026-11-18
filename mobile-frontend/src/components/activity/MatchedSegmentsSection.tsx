import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { MOCK_SEGMENTS } from '../../mock/data';

export const MatchedSegmentsSection: React.FC = () => {
  const router = useRouter();

  return (
    <View className="bg-white mt-3 p-4 border-y border-gray-200">
      <View className="flex-row items-center justify-between mb-3">
        <Text className="text-xs font-bold text-gray-500 uppercase tracking-wider">
          Matched Segments & Best Efforts
        </Text>
        <Text className="text-[10px] font-bold text-[#FC4C02]">3 Matched</Text>
      </View>

      <View className="space-y-2">
        {MOCK_SEGMENTS.slice(0, 2).map((seg, idx) => (
          <TouchableOpacity
            key={seg.id}
            onPress={() => router.push(`/segment/${seg.id}`)}
            className="flex-row items-center justify-between p-3 rounded-xl bg-gray-50 border border-gray-100 mb-2">
            <View className="flex-1 mr-2">
              <View className="flex-row items-center">
                <Ionicons name="trophy" size={14} color="#F59E0B" />
                <Text className="text-xs font-bold text-gray-900 ml-1.5" numberOfLines={1}>
                  {seg.name}
                </Text>
              </View>
              <Text className="text-[10px] text-gray-500 mt-0.5">
                {(seg.distanceMeters / 1000).toFixed(2)} km · {seg.averageGradePercent}% avg grade
              </Text>
            </View>

            <View className="items-end">
              <Text className="text-xs font-black text-gray-900">{seg.komTimeFormatted}</Text>
              <View className="bg-amber-100 px-1.5 py-0.5 rounded flex-row items-center mt-0.5">
                <Text className="text-[9px] font-black text-amber-800">
                  {idx === 0 ? 'PR (Rank 1)' : 'Rank 2'}
                </Text>
              </View>
            </View>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

