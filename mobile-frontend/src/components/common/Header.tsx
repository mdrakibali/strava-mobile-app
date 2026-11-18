import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { useApp } from '../../context/AppContext';

interface HeaderProps {
  title?: string;
  showSearch?: boolean;
  showNotifications?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  title = 'OPEN STRAVA',
  showSearch = true,
  showNotifications = true,
}) => {
  const router = useRouter();
  const { unreadNotificationCount } = useApp();

  return (
    <View className="h-14 bg-white border-b border-gray-200 flex-row items-center justify-between px-4">
      <View className="flex-row items-center">
        <Text className="text-xl font-extrabold text-[#FC4C02] tracking-wider">
          {title}
        </Text>
      </View>

      <View className="flex-row items-center gap-3">
        {showSearch && (
          <TouchableOpacity
            className="w-9 h-9 rounded-full items-center justify-center bg-gray-100"
            onPress={() => router.push('/search')}
            activeOpacity={0.7}
            accessibilityLabel="Search Athletes">
            <Ionicons name="search-outline" size={20} color="#111827" />
          </TouchableOpacity>
        )}

        {showNotifications && (
          <TouchableOpacity
            className="w-9 h-9 rounded-full items-center justify-center bg-gray-100 relative"
            onPress={() => router.push('/notifications')}
            activeOpacity={0.7}
            accessibilityLabel="Notifications">
            <Ionicons name="notifications-outline" size={20} color="#111827" />
            {unreadNotificationCount > 0 && (
              <View className="absolute top-1 right-1 bg-[#FC4C02] rounded-full min-w-[16px] h-4 items-center justify-center px-1">
                <Text className="text-white text-[9px] font-bold">
                  {unreadNotificationCount > 9 ? '9+' : unreadNotificationCount}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};
