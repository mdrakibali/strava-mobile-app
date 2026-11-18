import React from 'react';
import { Text, View } from 'react-native';
import { ActivitySplit } from '../../types';

interface ActivitySplitsTableProps {
  splits: ActivitySplit[];
}

export const ActivitySplitsTable: React.FC<ActivitySplitsTableProps> = ({ splits }) => {
  if (!splits || splits.length === 0) return null;

  return (
    <View className="bg-white mt-3 p-4 border-y border-gray-200">
      <Text className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">
        Kilometer Splits
      </Text>
      <View className="flex-row border-b border-gray-200 pb-1.5 mb-1">
        <Text className="flex-[0.8] text-[10px] font-bold text-gray-400">KM</Text>
        <Text className="flex-[1.2] text-[10px] font-bold text-gray-400">PACE</Text>
        <Text className="flex-[1.2] text-[10px] font-bold text-gray-400">ELEV</Text>
        <Text className="flex-[1.2] text-[10px] font-bold text-gray-400">AVG HR</Text>
      </View>

      {splits.map((s) => (
        <View key={s.splitNumber} className="flex-row py-2 border-b border-gray-50">
          <Text className="flex-[0.8] text-xs font-bold text-gray-900">{s.splitNumber}</Text>
          <Text className="flex-[1.2] text-xs font-bold text-[#FC4C02]">{s.paceFormatted}</Text>
          <Text className="flex-[1.2] text-xs text-gray-700">
            {s.elevationDeltaMeters > 0 ? `+${s.elevationDeltaMeters}m` : `${s.elevationDeltaMeters}m`}
          </Text>
          <Text className="flex-[1.2] text-xs text-gray-700">
            {s.averageHeartRate ? `${s.averageHeartRate} bpm` : '--'}
          </Text>
        </View>
      ))}
    </View>
  );
};

