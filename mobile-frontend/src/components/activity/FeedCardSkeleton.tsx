import React from 'react';
import { View } from 'react-native';
import { Skeleton } from '../../design';

export const FeedCardSkeleton: React.FC = () => (
  <View className="bg-white border-y border-gray-100 mb-2 pb-4" accessibilityLabel="Loading activity">
    <View className="flex-row items-center px-4 pt-4">
      <Skeleton className="w-10 h-10 rounded-full" />
      <View className="flex-1 ml-3">
        <Skeleton className="w-[45%] h-3.5" />
        <Skeleton className="w-[65%] h-3 mt-2" />
      </View>
    </View>
    <View className="px-4">
      <Skeleton className="w-[60%] h-5 mt-4" />
      <View className="flex-row mt-3 gap-4">
        <Skeleton className="w-16 h-8.5" />
        <Skeleton className="w-16 h-8.5" />
        <Skeleton className="w-16 h-8.5" />
      </View>
    </View>
    <Skeleton className="h-44 rounded-none mt-3" />
  </View>
);

