import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { APP_NAME } from '../../config/app';

interface Props {
  unreadNotificationCount: number;
}

export const HomeHeader: React.FC<Props> = ({ unreadNotificationCount }) => {
  const router = useRouter();

  return (
    <View className="px-5 pt-3 pb-2 bg-white border-b border-gray-100 flex-row items-center justify-between">
      <Text className="text-2xl font-black text-black tracking-tight">{APP_NAME}</Text>
      <View className="flex-row items-center space-x-2">
        <TouchableOpacity onPress={() => router.push('/record')} className="p-2">
          <Ionicons name="add" size={26} color="#1F2937" />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => router.push('/messages')}
          className="p-2"
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="chatbubbles-outline" size={22} color="#1F2937" />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => router.push('/search')} className="p-2">
          <Ionicons name="search-outline" size={22} color="#1F2937" />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => router.push('/notifications')} className="p-2 relative">
          <Ionicons name="notifications-outline" size={22} color="#1F2937" />
          {unreadNotificationCount > 0 ? (
            <View className="absolute top-1.5 right-1.5 w-2 h-2 bg-primary rounded-full" />
          ) : null}
        </TouchableOpacity>
      </View>
    </View>
  );
};
