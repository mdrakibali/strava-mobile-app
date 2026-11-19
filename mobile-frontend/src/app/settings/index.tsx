import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Alert, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useApp } from '../../context/AppContext';

export default function SettingsHubScreen() {
  const router = useRouter();
  const { logout } = useApp();
  const [unitSystem, setUnitSystem] = useState<'metric' | 'imperial'>('metric');

  const handleLogout = () => {
    Alert.alert(
      'Log Out of Open Strava?',
      'Your recorded workouts and saved routes are safely synced.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Log Out',
          style: 'destructive',
          onPress: async () => {
            await logout();
            router.replace('/auth/login');
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F9FAFB' }}>
      {/* Header */}
      <View className="flex-row items-center px-4 py-3 bg-white border-b border-gray-200">
        <TouchableOpacity onPress={() => router.back()} className="p-1">
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>
        <Text className="text-base font-black text-gray-900 ml-3">Settings & Preferences</Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        style={{ flex: 1 }}
        className="p-4"
        contentContainerStyle={{ paddingBottom: 110 }}>
        {/* Profile & Account Section */}
        <Text className="text-xs font-bold text-gray-500 uppercase mb-2">Athlete Profile</Text>
        <View className="bg-white rounded-2xl border border-gray-100 shadow-sm mb-4 overflow-hidden">
          <TouchableOpacity
            onPress={() => router.push('/settings/profile-edit')}
            className="flex-row items-center justify-between p-4 border-b border-gray-50">
            <View className="flex-row items-center">
              <Ionicons name="person-outline" size={20} color="#4B5563" />
              <Text className="text-sm font-bold text-gray-900 ml-3">Edit Profile & Bio</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => router.push('/gear')}
            className="flex-row items-center justify-between p-4">
            <View className="flex-row items-center">
              <Ionicons name="footsteps-outline" size={20} color="#4B5563" />
              <Text className="text-sm font-bold text-gray-900 ml-3">My Gear & Shoes</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
          </TouchableOpacity>
        </View>

        {/* GPS, Tracking & Audio */}
        <Text className="text-xs font-bold text-gray-500 uppercase mb-2">Tracking & Sensors</Text>
        <View className="bg-white rounded-2xl border border-gray-100 shadow-sm mb-4 overflow-hidden">
          <TouchableOpacity
            onPress={() => router.push('/settings/gps')}
            className="flex-row items-center justify-between p-4 border-b border-gray-50">
            <View className="flex-row items-center">
              <Ionicons name="navigate-outline" size={20} color="#4B5563" />
              <Text className="text-sm font-bold text-gray-900 ml-3">GPS Accuracy & Audio Cues</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
          </TouchableOpacity>

          {/* Units Toggle */}
          <View className="flex-row items-center justify-between p-4">
            <View className="flex-row items-center">
              <Ionicons name="speedometer-outline" size={20} color="#4B5563" />
              <Text className="text-sm font-bold text-gray-900 ml-3">Units of Measurement</Text>
            </View>
            <View className="flex-row bg-gray-100 rounded-lg p-0.5">
              <TouchableOpacity
                onPress={() => setUnitSystem('metric')}
                className={`px-3 py-1 rounded-md ${unitSystem === 'metric' ? 'bg-[#FC4C02]' : 'bg-transparent'}`}>
                <Text className={`text-xs font-bold ${unitSystem === 'metric' ? 'text-white' : 'text-gray-600'}`}>
                  km / m
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setUnitSystem('imperial')}
                className={`px-3 py-1 rounded-md ${unitSystem === 'imperial' ? 'bg-[#FC4C02]' : 'bg-transparent'}`}>
                <Text className={`text-xs font-bold ${unitSystem === 'imperial' ? 'text-white' : 'text-gray-600'}`}>
                  mi / ft
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Privacy & Safety */}
        <Text className="text-xs font-bold text-gray-500 uppercase mb-2">Privacy & Safety</Text>
        <View className="bg-white rounded-2xl border border-gray-100 shadow-sm mb-4 overflow-hidden">
          <TouchableOpacity
            onPress={() => router.push('/settings/privacy')}
            className="flex-row items-center justify-between p-4 border-b border-gray-50">
            <View className="flex-row items-center">
              <Ionicons name="shield-checkmark-outline" size={20} color="#4B5563" />
              <Text className="text-sm font-bold text-gray-900 ml-3">Privacy Zones & Beacon</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => router.push('/settings/blocked-users')}
            className="flex-row items-center justify-between p-4">
            <View className="flex-row items-center">
              <Ionicons name="ban-outline" size={20} color="#4B5563" />
              <Text className="text-sm font-bold text-gray-900 ml-3">Blocked Athletes</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
          </TouchableOpacity>
        </View>

        {/* Data & Notifications */}
        <Text className="text-xs font-bold text-gray-500 uppercase mb-2">Data & System</Text>
        <View className="bg-white rounded-2xl border border-gray-100 shadow-sm mb-4 overflow-hidden">
          <TouchableOpacity
            onPress={() => router.push('/settings/notifications')}
            className="flex-row items-center justify-between p-4 border-b border-gray-50">
            <View className="flex-row items-center">
              <Ionicons name="notifications-outline" size={20} color="#4B5563" />
              <Text className="text-sm font-bold text-gray-900 ml-3">Push Notification Settings</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => router.push('/settings/data-export')}
            className="flex-row items-center justify-between p-4 border-b border-gray-50">
            <View className="flex-row items-center">
              <Ionicons name="cloud-download-outline" size={20} color="#4B5563" />
              <Text className="text-sm font-bold text-gray-900 ml-3">Export Workouts (GPX / FIT)</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => router.push('/settings/import-gpx')}
            className="flex-row items-center justify-between p-4 border-b border-gray-50">
            <View className="flex-row items-center">
              <Ionicons name="cloud-upload-outline" size={20} color="#4B5563" />
              <Text className="text-sm font-bold text-gray-900 ml-3">Import GPX / FIT File</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => router.push('/onboarding/welcome')}
            className="flex-row items-center justify-between p-4">
            <View className="flex-row items-center">
              <Ionicons name="compass-outline" size={20} color="#4B5563" />
              <Text className="text-sm font-bold text-gray-900 ml-3">Product Onboarding Walkthrough</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
          </TouchableOpacity>
        </View>

        {/* Logout Button */}
        <TouchableOpacity
          onPress={handleLogout}
          className="w-full py-4 bg-red-50 border border-red-200 rounded-2xl items-center shadow-sm">
          <Text className="text-sm font-black text-red-600">Log Out</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

