import React from 'react';
import { View } from 'react-native';

export const SkeletonCard: React.FC = () => {
  return (
    <View className="bg-white rounded-2xl p-4 mb-3 border border-gray-100 shadow-sm animate-pulse">
      {/* Header Avatar & Name Skeleton */}
      <View className="flex-row items-center mb-3">
        <View className="w-10 h-10 rounded-full bg-gray-200 mr-3" />
        <View className="flex-1 space-y-2">
          <View className="w-32 h-3.5 bg-gray-200 rounded" />
          <View className="w-20 h-2.5 bg-gray-100 rounded mt-1" />
        </View>
      </View>

      {/* Title */}
      <View className="w-48 h-4 bg-gray-200 rounded mb-3" />

      {/* Stats Grid */}
      <View className="flex-row justify-between mb-4 bg-gray-50 p-3 rounded-xl">
        <View className="w-16 h-8 bg-gray-200 rounded" />
        <View className="w-16 h-8 bg-gray-200 rounded" />
        <View className="w-16 h-8 bg-gray-200 rounded" />
      </View>

      {/* Map Box */}
      <View className="w-full h-36 bg-gray-200 rounded-xl" />
    </View>
  );
};

