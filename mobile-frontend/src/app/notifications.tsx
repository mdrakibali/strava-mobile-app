import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import {
  FlatList,
  Image,
  SafeAreaView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useApp } from '../context/AppContext';
import { NotificationItem } from '../types';

export default function NotificationsScreen() {
  const router = useRouter();
  const { notifications, markNotificationAsRead, markAllNotificationsAsRead } = useApp();

  const getNotificationIcon = (type: NotificationItem['actionType']) => {
    switch (type) {
      case 'KUDOS':
        return <Ionicons name="thumbs-up" size={14} color="#FC4C02" />;
      case 'COMMENT':
        return <Ionicons name="chatbubble" size={14} color="#3B82F6" />;
      case 'FOLLOW':
        return <Ionicons name="person-add" size={14} color="#10B981" />;
      case 'CHALLENGE_WON':
        return <Ionicons name="trophy" size={14} color="#F59E0B" />;
      default:
        return <Ionicons name="notifications" size={14} color="#FC4C02" />;
    }
  };

  const handleNotificationPress = (item: NotificationItem) => {
    markNotificationAsRead(item.id);
    if (item.targetActivityId) {
      router.push({
        pathname: '/activity/[id]',
        params: { id: item.targetActivityId },
      });
    }
  };

  const renderItem = ({ item }: { item: NotificationItem }) => (
    <TouchableOpacity
      className={`flex-row items-center px-4 py-3 border-b border-gray-100 ${
        !item.isRead ? 'bg-[#FFF2EB]' : 'bg-white'
      }`}
      onPress={() => handleNotificationPress(item)}
      activeOpacity={0.75}>
      <View className="relative mr-3">
        <Image source={{ uri: item.actor.avatarUrl }} className="w-11 h-11 rounded-full bg-gray-100" />
        <View className="absolute -bottom-0.5 -right-0.5 bg-white rounded-full w-5 h-5 items-center justify-center border border-white">
          {getNotificationIcon(item.actionType)}
        </View>
      </View>

      <View className="flex-1">
        <Text className="text-xs text-gray-600 leading-5">
          <Text className="font-bold text-gray-900">{item.actor.displayName} </Text>
          {item.message}
        </Text>
        <Text className="text-[10px] text-gray-400 mt-0.5">{item.timeAgo}</Text>
      </View>

      {!item.isRead && <View className="w-2 h-2 rounded-full bg-[#FC4C02] ml-2" />}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="flex-row justify-between items-center px-4 py-3 border-b border-gray-200">
        <TouchableOpacity onPress={() => router.back()} className="p-1">
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>
        <Text className="text-base font-bold text-gray-900">Notifications</Text>
        <TouchableOpacity onPress={markAllNotificationsAsRead} className="p-1">
          <Text className="text-xs font-semibold text-[#FC4C02]">Mark all read</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={notifications}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={{ paddingVertical: 4 }}
        ListEmptyComponent={
          <View className="items-center justify-center py-20 gap-2">
            <Ionicons name="notifications-off-outline" size={48} color="#9CA3AF" />
            <Text className="text-base font-bold text-gray-900">All caught up!</Text>
            <Text className="text-xs text-gray-400">No new notifications right now.</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}
