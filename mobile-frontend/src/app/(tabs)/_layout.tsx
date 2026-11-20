import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import React from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FEATURES } from '../../config/features';
import { isRecordingActive, useRecording } from '../../tracking/useRecording';

/**
 * MVP bottom navigation: Home · Record · You (ADR-15). Explore and Groups are hidden behind
 * feature flags. The Record tab opens the full-screen recorder directly (reference: Strava's
 * Record tab), instead of an intermediate page that started recording on tap.
 */
export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const recording = isRecordingActive(useRecording());

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#1F2937',
        tabBarInactiveTintColor: '#1F2937',
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopWidth: 1,
          borderTopColor: '#F3F4F6',
          height: 66 + insets.bottom,
          paddingBottom: Math.max(insets.bottom, 6),
          paddingTop: 6,
        },
        tabBarLabelStyle: { fontSize: 12, fontWeight: '600', marginTop: 2 },
      }}>
      <Tabs.Screen name="index" options={{ title: 'Home', tabBarIcon: icon('home-outline', 'home') }} />
      <Tabs.Screen
        name="maps"
        options={{ href: FEATURES.explore ? undefined : null, title: 'Maps', tabBarIcon: icon('map-outline', 'map') }}
      />
      <Tabs.Screen
        name="workout"
        listeners={({ navigation }) => ({
          tabPress: (e) => {
            if (recording) {
              e.preventDefault();
              navigation.navigate('record');
            }
          },
        })}
        options={{
          title: 'Workout',
          tabBarAccessibilityLabel: recording ? 'Workout, recording in progress' : 'Workout',
          tabBarIcon: icon('radio-button-on-outline', 'radio-button-on', recording),
        }}
      />
      <Tabs.Screen
        name="groups"
        options={{ href: FEATURES.groups ? undefined : null, title: 'Groups', tabBarIcon: icon('people-outline', 'people') }}
      />
      <Tabs.Screen name="profile" options={{ title: 'You', tabBarIcon: icon('person-circle-outline', 'person-circle') }} />
      {/* Old route kept for deep links / restored state; forwards to the recorder. */}
      <Tabs.Screen name="record-tab" options={{ href: null }} />
    </Tabs>
  );
}

/** tabBarIcon factory (module scope, named function → stable identity and a display name). */
function icon(name: keyof typeof Ionicons.glyphMap, active: keyof typeof Ionicons.glyphMap, badge = false) {
  return function TabBarIcon({ focused }: { focused: boolean }) {
    return <TabIcon focused={focused} name={name} active={active} badge={badge} />;
  };
}

/** Strava-style tab icon: inside a soft pill when active, orange when active (reference home-tab.png). */
function TabIcon({ focused, name, active, badge }: { focused: boolean; name: keyof typeof Ionicons.glyphMap; active: keyof typeof Ionicons.glyphMap; badge: boolean }) {
  return (
    <View className={`w-14 h-7.5 rounded-full items-center justify-center ${focused ? 'bg-[#FFF2EB]' : ''}`}>
      <Ionicons name={focused ? active : name} size={24} color={focused ? '#FC4C02' : '#1F2937'} />
      {badge ? <View className="absolute top-0 right-3 w-2.5 h-2.5 rounded-full bg-red-600 border-2 border-white" /> : null}
    </View>
  );
}
