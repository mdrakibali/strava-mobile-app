import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import React from 'react';
import { Image, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../../context/AppContext';

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const { activeRecording, currentUser } = useApp();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#FC4C02',
        tabBarInactiveTintColor: '#9CA3AF',
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopWidth: 1,
          borderTopColor: '#F3F4F6',
          height: 56 + Math.max(insets.bottom, 8),
          paddingBottom: Math.max(insets.bottom, 8),
          paddingTop: 6,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '700',
        },
      }}>
      {/* 1. Home Feed */}
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ focused }) => (
            <View
              className={`px-3 py-1 rounded-full items-center justify-center ${
                focused ? 'bg-orange-100/60' : ''
              }`}>
              <Ionicons
                name={focused ? 'home' : 'home-outline'}
                size={22}
                color={focused ? '#FC4C02' : '#9CA3AF'}
              />
            </View>
          ),
        }}
      />

      {/* 2. Explore Hub */}
      <Tabs.Screen
        name="maps"
        options={{
          title: 'Explore',
          tabBarIcon: ({ focused }) => (
            <View
              className={`px-3 py-1 rounded-full items-center justify-center ${
                focused ? 'bg-orange-100/60' : ''
              }`}>
              <Ionicons
                name={focused ? 'compass' : 'compass-outline'}
                size={22}
                color={focused ? '#FC4C02' : '#9CA3AF'}
              />
            </View>
          ),
        }}
      />

      {/* 3. Record Cockpit Hub */}
      <Tabs.Screen
        name="record-tab"
        options={{
          title: 'Record',
          tabBarIcon: ({ focused }) => (
            <View
              className={`px-3 py-1 rounded-full items-center justify-center relative ${
                focused ? 'bg-orange-100/60' : ''
              }`}>
              <Ionicons
                name={
                  activeRecording.isRecording
                    ? 'radio-button-on'
                    : focused
                    ? 'radio-button-on'
                    : 'radio-button-off'
                }
                size={24}
                color={
                  activeRecording.isRecording
                    ? '#EF4444'
                    : focused
                    ? '#FC4C02'
                    : '#9CA3AF'
                }
              />
              {activeRecording.isRecording && (
                <View className="absolute top-1 right-2 w-2 h-2 rounded-full bg-red-500 border border-white" />
              )}
            </View>
          ),
        }}
      />

      {/* 4. Groups */}
      <Tabs.Screen
        name="groups"
        options={{
          title: 'Groups',
          tabBarIcon: ({ focused }) => (
            <View
              className={`px-3 py-1 rounded-full items-center justify-center ${
                focused ? 'bg-orange-100/60' : ''
              }`}>
              <Ionicons
                name={focused ? 'grid' : 'grid-outline'}
                size={21}
                color={focused ? '#FC4C02' : '#9CA3AF'}
              />
            </View>
          ),
        }}
      />

      {/* 5. You (Profile with User Avatar Thumbnail) */}
      <Tabs.Screen
        name="profile"
        options={{
          title: 'You',
          tabBarIcon: ({ focused }) => (
            <View
              className={`p-0.5 rounded-full items-center justify-center ${
                focused ? 'border-2 border-[#FC4C02]' : 'border border-gray-200'
              }`}>
              <Image
                source={{
                  uri:
                    currentUser?.avatarUrl ||
                    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400',
                }}
                className="w-5 h-5 rounded-full bg-gray-200"
              />
            </View>
          ),
        }}
      />
    </Tabs>
  );
}
