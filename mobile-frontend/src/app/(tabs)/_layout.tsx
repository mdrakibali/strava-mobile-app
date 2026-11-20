import { Ionicons } from '@expo/vector-icons';
import { Tabs, useRouter } from 'expo-router';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FEATURES } from '../../config/features';
import { isRecordingActive, useRecording } from '../../tracking/useRecording';
import { color } from '../../design/tokens';

/**
 * MVP bottom navigation: Home · Record · You (ADR-15). Explore and Groups are hidden behind
 * feature flags. The Record tab opens the full-screen recorder directly (reference: Strava's
 * Record tab), instead of an intermediate page that started recording on tap.
 */
export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const recording = isRecordingActive(useRecording());

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: color.ink,
        tabBarInactiveTintColor: color.inkTertiary,
        tabBarStyle: {
          backgroundColor: color.surface,
          borderTopWidth: StyleSheet.hairlineWidth,
          borderTopColor: color.border,
          height: 60 + insets.bottom,
          paddingBottom: Math.max(insets.bottom, 6),
          paddingTop: 6,
        },
        tabBarLabelStyle: { fontSize: 12, fontWeight: '600' },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ focused }) => (
            <Ionicons name={focused ? 'home' : 'home-outline'} size={24} color={focused ? color.brand : color.inkTertiary} />
          ),
        }}
      />
      <Tabs.Screen
        name="maps"
        options={{
          href: FEATURES.explore ? undefined : null,
          title: 'Maps',
          tabBarIcon: ({ focused }) => (
            <Ionicons name={focused ? 'map' : 'map-outline'} size={24} color={focused ? color.ink : color.inkTertiary} />
          ),
        }}
      />
      <Tabs.Screen
        name="record-tab"
        options={{
          title: 'Record',
          tabBarAccessibilityLabel: recording ? 'Record, recording in progress' : 'Record',
          tabBarIcon: () => (
            <View>
              <Ionicons name="radio-button-on" size={26} color={recording ? color.brand : color.inkTertiary} />
              {recording ? <View style={styles.liveDot} /> : null}
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
          href: FEATURES.groups ? undefined : null,
          title: 'Groups',
          tabBarIcon: ({ focused }) => (
            <Ionicons name={focused ? 'people' : 'people-outline'} size={24} color={focused ? color.ink : color.inkTertiary} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'You',
          tabBarIcon: ({ focused }) => (
            <Ionicons name={focused ? 'person-circle' : 'person-circle-outline'} size={26} color={focused ? color.brand : color.inkTertiary} />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  liveDot: {
    position: 'absolute',
    top: -1,
    right: -3,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: color.danger,
    borderWidth: 2,
    borderColor: color.surface,
  },
});
