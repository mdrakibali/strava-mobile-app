import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Modal, Text, TouchableOpacity, View } from 'react-native';
import { useApp } from '../../context/AppContext';

interface HeaderProps {
  title?: string;
  showSearch?: boolean;
  showNotifications?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  title = 'STRAVA',
  showSearch = true,
  showNotifications = true,
}) => {
  const router = useRouter();
  const { unreadNotificationCount } = useApp();
  const [showAddMenu, setShowAddMenu] = useState(false);

  return (
    <View className="h-14 bg-white border-b border-gray-100 flex-row items-center justify-between px-4">
      {/* Brand Header */}
      <View className="flex-row items-center">
        <Text className="text-2xl font-black text-black tracking-tight font-sans">
          {title}
        </Text>
      </View>

      {/* Action Icons matching Screenshot 2: Plus (+), Chat, Search, Bell */}
      <View className="flex-row items-center gap-4">
        {/* Plus / Create Action */}
        <TouchableOpacity
          onPress={() => setShowAddMenu(true)}
          activeOpacity={0.7}
          className="p-1"
          accessibilityLabel="Add Activity">
          <Ionicons name="add" size={26} color="#000000" />
        </TouchableOpacity>

        {/* Community Chat */}
        <TouchableOpacity
          className="p-1 relative"
          onPress={() => router.push('/messages')}
          activeOpacity={0.7}
          accessibilityLabel="Direct Messages">
          <Ionicons name="chatbubble-ellipses-outline" size={22} color="#000000" />
        </TouchableOpacity>

        {/* Global Search */}
        {showSearch && (
          <TouchableOpacity
            className="p-1"
            onPress={() => router.push('/search')}
            activeOpacity={0.7}
            accessibilityLabel="Search Athletes">
            <Ionicons name="search-outline" size={22} color="#000000" />
          </TouchableOpacity>
        )}

        {/* Notifications Bell */}
        {showNotifications && (
          <TouchableOpacity
            className="p-1 relative"
            onPress={() => router.push('/notifications')}
            activeOpacity={0.7}
            accessibilityLabel="Notifications">
            <Ionicons name="notifications-outline" size={22} color="#000000" />
            {unreadNotificationCount > 0 && (
              <View className="absolute top-0 right-0 bg-[#FC4C02] rounded-full min-w-[14px] h-3.5 items-center justify-center px-0.5">
                <Text className="text-white text-[8px] font-black">
                  {unreadNotificationCount > 9 ? '9+' : unreadNotificationCount}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        )}
      </View>

      {/* Quick Action Modal for '+' button */}
      <Modal visible={showAddMenu} transparent animationType="fade" onRequestClose={() => setShowAddMenu(false)}>
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => setShowAddMenu(false)}
          className="flex-1 bg-black/40 justify-start pt-16 px-4">
          <View className="bg-white rounded-2xl p-3 shadow-2xl self-end w-56 border border-gray-100">
            <TouchableOpacity
              onPress={() => {
                setShowAddMenu(false);
                router.push('/record');
              }}
              className="flex-row items-center p-3 rounded-xl active:bg-gray-100">
              <View className="w-8 h-8 rounded-full bg-orange-100 items-center justify-center mr-3">
                <Ionicons name="radio-button-on" size={18} color="#FC4C02" />
              </View>
              <Text className="text-sm font-bold text-gray-900">Record Activity</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                setShowAddMenu(false);
                router.push('/manual-entry');
              }}
              className="flex-row items-center p-3 rounded-xl active:bg-gray-100">
              <View className="w-8 h-8 rounded-full bg-blue-100 items-center justify-center mr-3">
                <Ionicons name="create-outline" size={18} color="#2563EB" />
              </View>
              <Text className="text-sm font-bold text-gray-900">Manual Entry</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                setShowAddMenu(false);
                router.push('/routes/builder');
              }}
              className="flex-row items-center p-3 rounded-xl active:bg-gray-100">
              <View className="w-8 h-8 rounded-full bg-emerald-100 items-center justify-center mr-3">
                <Ionicons name="map-outline" size={18} color="#059669" />
              </View>
              <Text className="text-sm font-bold text-gray-900">Create Route</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                setShowAddMenu(false);
                router.push('/post/create');
              }}
              className="flex-row items-center p-3 rounded-xl active:bg-gray-100">
              <View className="w-8 h-8 rounded-full bg-purple-100 items-center justify-center mr-3">
                <Ionicons name="newspaper-outline" size={18} color="#7C3AED" />
              </View>
              <Text className="text-sm font-bold text-gray-900">Add Post</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};
