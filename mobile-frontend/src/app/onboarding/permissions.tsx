import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function PermissionsScreen() {
  const router = useRouter();

  const handleFinish = () => {
    router.replace('/(tabs)');
  };

  return (
    <SafeAreaView className="flex-1 bg-white justify-between p-6">
      <View>
        <TouchableOpacity onPress={() => router.back()} className="mb-4">
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>

        <Text className="text-2xl font-black text-gray-900 mb-2">
          Permissions & Safety
        </Text>
        <Text className="text-xs text-gray-500 mb-6">
          To provide real-time GPS tracking and instant community kudos, Open Strava requires two system permissions:
        </Text>

        <View className="space-y-4 mb-6">
          {/* Location Card */}
          <View className="bg-orange-50/60 p-4 rounded-2xl border border-orange-100 mb-4">
            <View className="flex-row items-center mb-2">
              <View className="w-10 h-10 rounded-xl bg-[#FC4C02] items-center justify-center mr-3">
                <Ionicons name="location" size={22} color="#FFFFFF" />
              </View>
              <View className="flex-1">
                <Text className="text-sm font-black text-gray-900">Background Location</Text>
                <Text className="text-[11px] font-semibold text-[#FC4C02]">Required for GPS Tracking</Text>
              </View>
            </View>
            <Text className="text-xs text-gray-600 leading-4">
              Allows the app to track your route, pace, and elevation accurately even when your phone screen is locked or in your pocket. Your location is NEVER sold.
            </Text>
          </View>

          {/* Notifications Card */}
          <View className="bg-gray-50 p-4 rounded-2xl border border-gray-200 mb-4">
            <View className="flex-row items-center mb-2">
              <View className="w-10 h-10 rounded-xl bg-gray-900 items-center justify-center mr-3">
                <Ionicons name="notifications" size={22} color="#FFFFFF" />
              </View>
              <View className="flex-1">
                <Text className="text-sm font-black text-gray-900">Push Notifications</Text>
                <Text className="text-[11px] font-semibold text-gray-500">Kudos, Comments & Milestones</Text>
              </View>
            </View>
            <Text className="text-xs text-gray-600 leading-4">
              Receive alerts when friends give Kudos, comment on your long runs, or when you complete a monthly challenge.
            </Text>
          </View>

          {/* Privacy Zone Guarantee */}
          <View className="flex-row items-center p-3 bg-green-50 rounded-xl border border-green-200">
            <Ionicons name="shield-checkmark" size={20} color="#16A34A" />
            <Text className="text-[11px] text-green-800 font-semibold ml-2 flex-1">
              Privacy Zones active: Your home and office coordinates will be automatically clipped from public routes.
            </Text>
          </View>
        </View>
      </View>

      <TouchableOpacity
        onPress={handleFinish}
        className="w-full py-4 bg-[#FC4C02] rounded-2xl items-center shadow-md">
        <Text className="text-base font-black text-white">Enable Permissions & Enter</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

