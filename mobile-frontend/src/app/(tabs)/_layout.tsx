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
        tabBarInactiveTintColor: '#6B7280',
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopWidth: 1,
          borderTopColor: '#E5E7EB',
          height: 60 + Math.max(insets.bottom, 6),
          paddingBottom: Math.max(insets.bottom, 6),
          paddingTop: 6,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '700',
          marginTop: 2,
        },
      }}>
      {/* 1. Home Feed */}
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ focused, color }) => (
            <View style={{ width: 32, height: 32, alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons
                name={focused ? 'home' : 'home-outline'}
                size={24}
                color={focused ? '#FC4C02' : '#6B7280'}
              />
            </View>
          ),
        }}
      />

      {/* 2. Explore / Maps */}
      <Tabs.Screen
        name="maps"
        options={{
          title: 'Explore',
          tabBarIcon: ({ focused, color }) => (
            <View style={{ width: 32, height: 32, alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons
                name={focused ? 'map' : 'map-outline'}
                size={24}
                color={focused ? '#FC4C02' : '#6B7280'}
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
              style={{
                width: 32,
                height: 32,
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative',
              }}>
              <Ionicons
                name={
                  activeRecording.isRecording
                    ? 'radio-button-on'
                    : focused
                    ? 'radio-button-on'
                    : 'radio-button-off'
                }
                size={26}
                color={
                  activeRecording.isRecording
                    ? '#EF4444'
                    : focused
                    ? '#FC4C02'
                    : '#6B7280'
                }
              />
              {activeRecording.isRecording && (
                <View
                  style={{
                    position: 'absolute',
                    top: 2,
                    right: 2,
                    width: 8,
                    height: 8,
                    borderRadius: 4,
                    backgroundColor: '#EF4444',
                    borderWidth: 1.5,
                    borderColor: '#FFFFFF',
                  }}
                />
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
          tabBarIcon: ({ focused, color }) => (
            <View style={{ width: 32, height: 32, alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons
                name={focused ? 'people' : 'people-outline'}
                size={25}
                color={focused ? '#FC4C02' : '#6B7280'}
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
              style={{
                width: 26,
                height: 26,
                borderRadius: 13,
                borderWidth: focused ? 2 : 1,
                borderColor: focused ? '#FC4C02' : '#D1D5DB',
                overflow: 'hidden',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
              <Image
                source={{
                  uri:
                    currentUser?.avatarUrl ||
                    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400',
                }}
                style={{ width: '100%', height: '100%' }}
              />
            </View>
          ),
        }}
      />
    </Tabs>
  );
}
