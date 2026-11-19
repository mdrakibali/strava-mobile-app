import { Ionicons } from '@expo/vector-icons';
import { Tabs, useRouter } from 'expo-router';
import React from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../../context/AppContext';

export default function TabLayout() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { activeRecording } = useApp();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#FC4C02',
        tabBarInactiveTintColor: '#9CA3AF',
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopWidth: 1,
          borderTopColor: '#E5E7EB',
          height: 56 + Math.max(insets.bottom, 8),
          paddingBottom: Math.max(insets.bottom, 8),
          paddingTop: 6,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
        },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ focused }) => (
            <Ionicons
              name={focused ? 'home' : 'home-outline'}
              size={22}
              color={focused ? '#FC4C02' : '#9CA3AF'}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="maps"
        options={{
          title: 'Maps',
          tabBarIcon: ({ focused }) => (
            <Ionicons
              name={focused ? 'map' : 'map-outline'}
              size={22}
              color={focused ? '#FC4C02' : '#9CA3AF'}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="record-tab"
        options={{
          title: 'Record',
          tabBarIcon: ({ focused }) => (
            <View className="relative items-center justify-center">
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
                <View className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-red-500 border border-white" />
              )}
            </View>
          ),
        }}
        listeners={{
          tabPress: (e) => {
            e.preventDefault();
            router.push('/record');
          },
        }}
      />

      <Tabs.Screen
        name="groups"
        options={{
          title: 'Groups',
          tabBarIcon: ({ focused }) => (
            <Ionicons
              name={focused ? 'people' : 'people-outline'}
              size={22}
              color={focused ? '#FC4C02' : '#9CA3AF'}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="profile"
        options={{
          title: 'You',
          tabBarIcon: ({ focused }) => (
            <Ionicons
              name={focused ? 'person' : 'person-outline'}
              size={22}
              color={focused ? '#FC4C02' : '#9CA3AF'}
            />
          ),
        }}
      />
    </Tabs>
  );
}
