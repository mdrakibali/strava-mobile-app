import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';

interface EmptyStateProps {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  actionLabel,
  onAction,
}) => {
  return (
    <View className="items-center justify-center py-12 px-6 bg-white rounded-2xl border border-gray-100 my-4 shadow-sm">
      <View className="w-16 h-16 rounded-full bg-orange-50 items-center justify-center mb-4">
        <Ionicons name={icon} size={32} color="#FC4C02" />
      </View>
      <Text className="text-lg font-black text-gray-900 text-center mb-1">{title}</Text>
      <Text className="text-xs text-gray-500 text-center leading-5 mb-5 max-w-xs">
        {description}
      </Text>
      {actionLabel && onAction && (
        <TouchableOpacity
          onPress={onAction}
          className="bg-[#FC4C02] px-6 py-2.5 rounded-full shadow-sm">
          <Text className="text-xs font-bold text-white">{actionLabel}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};
