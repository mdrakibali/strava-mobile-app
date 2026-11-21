import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Text, View } from 'react-native';
import { APP_NAME } from '../../config/app';

export const AuthHeader: React.FC = () => {
  return (
    <View className="items-center mt-4 mb-6">
      <View className="w-14 h-14 rounded-2xl bg-[#FC4C02] items-center justify-center mb-2 shadow-lg">
        <Ionicons name="fitness" size={32} color="#FFFFFF" />
      </View>
      <Text className="text-3xl font-black text-black tracking-tight">
        {APP_NAME}
      </Text>
      <Text className="text-xs font-semibold text-gray-500 mt-0.5">
        Open Edition · Unlimited & Free
      </Text>
    </View>
  );
};
