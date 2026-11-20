import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
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
  const recording = isRecordingActive(useRecording());


  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: color.ink,
        tabBarInactiveTintColor: color.ink,
        tabBarStyle: {
          backgroundColor: color.surface,
          borderTopWidth: StyleSheet.hairlineWidth,
          borderTopColor: color.border,
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
    <View style={[styles.pill, focused && styles.pillActive]}>
      <Ionicons name={focused ? active : name} size={24} color={focused ? color.brand : color.ink} />
      {badge ? <View style={styles.liveDot} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  pill: { width: 56, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  pillActive: { backgroundColor: color.brandSoft },
  liveDot: {
    position: 'absolute',
    top: 0,
    right: 12,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: color.danger,
    borderWidth: 2,
    borderColor: color.surface,
  },
});
