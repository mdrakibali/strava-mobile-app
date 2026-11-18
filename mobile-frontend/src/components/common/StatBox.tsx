import React from 'react';
import { Text, View } from 'react-native';

interface StatBoxProps {
  label: string;
  value: string;
  unit?: string;
  highlight?: boolean;
  highlightColor?: string;
}

export const StatBox: React.FC<StatBoxProps> = ({
  label,
  value,
  unit,
  highlight = false,
  highlightColor,
}) => {
  return (
    <View className="flex-1 min-w-[70px]">
      <Text className="text-[11px] text-gray-400 font-medium uppercase tracking-wider mb-0.5">
        {label}
      </Text>
      <View className="flex-row items-baseline">
        <Text
          className={`text-xl font-black ${
            highlight ? (highlightColor ? `text-[${highlightColor}]` : 'text-[#FC4C02]') : 'text-gray-900'
          }`}
          style={highlightColor ? { color: highlightColor } : undefined}>
          {value}
        </Text>
        {unit && <Text className="text-xs text-gray-500 font-medium ml-1">{unit}</Text>}
      </View>
    </View>
  );
};
