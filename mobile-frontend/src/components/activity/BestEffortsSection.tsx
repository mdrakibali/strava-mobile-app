import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Text, View } from 'react-native';
import { MOCK_BEST_EFFORTS } from '../../mock/data';

interface BestEffortsSectionProps {
  title?: string;
  limit?: number;
}

export const BestEffortsSection: React.FC<BestEffortsSectionProps> = ({
  title = 'Best Efforts & Personal Records',
  limit,
}) => {
  const items = limit ? MOCK_BEST_EFFORTS.slice(0, limit) : MOCK_BEST_EFFORTS;

  return (
    <View className="bg-white mt-3 p-4 border-y border-gray-200">
      <View className="flex-row items-center justify-between mb-3">
        <View className="flex-row items-center">
          <Ionicons name="ribbon-outline" size={16} color="#FC4C02" />
          <Text className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1.5">
            {title}
          </Text>
        </View>
        <Text className="text-[10px] font-bold text-[#FC4C02]">All-Time PRs</Text>
      </View>

      <View className="space-y-2">
        {items.map((item) => (
          <View
            key={item.id}
            className="flex-row items-center justify-between p-3 rounded-xl bg-gray-50 border border-gray-100 mb-2">
            <View className="flex-row items-center">
              <View className="w-8 h-8 rounded-full bg-amber-50 items-center justify-center mr-2.5 border border-amber-200">
                <Ionicons name="trophy" size={14} color="#D97706" />
              </View>
              <View>
                <Text className="text-xs font-black text-gray-900">{item.distanceLabel}</Text>
                <Text className="text-[10px] text-gray-400">{item.dateAchieved}</Text>
              </View>
            </View>

            <View className="items-end">
              <View className="flex-row items-center">
                <Text className="text-sm font-black text-gray-900 mr-1.5">{item.timeFormatted}</Text>
                {item.isRecentPr && (
                  <View className="bg-amber-100 px-1.5 py-0.5 rounded">
                    <Text className="text-[9px] font-black text-amber-800">NEW PR</Text>
                  </View>
                )}
              </View>
              <Text className="text-[10px] text-gray-400">{item.paceFormatted}</Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
};
