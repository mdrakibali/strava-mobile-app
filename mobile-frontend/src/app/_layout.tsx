import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Colors } from '../constants/theme';
import { AppProvider } from '../context/AppContext';
import '../global.css';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AppProvider>
        <StatusBar style="dark" />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: Colors.background },
          }}>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen
            name="record"
            options={{
              presentation: 'fullScreenModal',
              headerShown: false,
              animation: 'slide_from_bottom',
            }}
          />
          <Stack.Screen
            name="save-activity"
            options={{
              presentation: 'modal',
              headerShown: false,
              animation: 'slide_from_bottom',
            }}
          />
          <Stack.Screen
            name="activity/[id]"
            options={{
              headerShown: false,
              animation: 'slide_from_right',
            }}
          />
          <Stack.Screen
            name="notifications"
            options={{
              presentation: 'modal',
              headerShown: false,
              animation: 'slide_from_bottom',
            }}
          />
          <Stack.Screen
            name="search"
            options={{
              presentation: 'modal',
              headerShown: false,
              animation: 'slide_from_bottom',
            }}
          />
          <Stack.Screen name="segment/[id]" options={{ headerShown: false, animation: 'slide_from_right' }} />
          <Stack.Screen name="club/[id]" options={{ headerShown: false, animation: 'slide_from_right' }} />
          <Stack.Screen name="club/create" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
          <Stack.Screen name="club/members" options={{ headerShown: false, animation: 'slide_from_right' }} />
          <Stack.Screen name="event/[id]" options={{ headerShown: false, animation: 'slide_from_right' }} />
          <Stack.Screen name="event/create" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
          <Stack.Screen name="challenge/[id]" options={{ headerShown: false, animation: 'slide_from_right' }} />
          <Stack.Screen name="challenge/create" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />

          <Stack.Screen name="routes/[id]" options={{ headerShown: false, animation: 'slide_from_right' }} />
          <Stack.Screen name="routes/builder" options={{ headerShown: false, animation: 'slide_from_right' }} />
          <Stack.Screen
            name="routes/navigation"
            options={{ presentation: 'fullScreenModal', animation: 'slide_from_bottom' }}
          />

          <Stack.Screen name="athlete/[id]" options={{ headerShown: false, animation: 'slide_from_right' }} />
          <Stack.Screen name="athlete/followers" options={{ headerShown: false, animation: 'slide_from_right' }} />
          <Stack.Screen name="athlete/following" options={{ headerShown: false, animation: 'slide_from_right' }} />
          <Stack.Screen name="athlete/suggested" options={{ headerShown: false, animation: 'slide_from_right' }} />

          <Stack.Screen name="analytics/training-log" options={{ headerShown: false, animation: 'slide_from_right' }} />
          <Stack.Screen name="analytics/fitness-freshness" options={{ headerShown: false, animation: 'slide_from_right' }} />
          <Stack.Screen name="analytics/relative-effort" options={{ headerShown: false, animation: 'slide_from_right' }} />
          <Stack.Screen name="analytics/matched-activities" options={{ headerShown: false, animation: 'slide_from_right' }} />
          <Stack.Screen name="analytics/goals" options={{ headerShown: false, animation: 'slide_from_right' }} />
          <Stack.Screen name="analytics/training-plans" options={{ headerShown: false, animation: 'slide_from_right' }} />
          <Stack.Screen name="analytics/race-predictions" options={{ headerShown: false, animation: 'slide_from_right' }} />
          <Stack.Screen name="analytics/heatmap" options={{ presentation: 'fullScreenModal', animation: 'fade' }} />

          <Stack.Screen name="gear/index" options={{ headerShown: false, animation: 'slide_from_right' }} />
          <Stack.Screen name="gear/add" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />

          <Stack.Screen name="settings/index" options={{ headerShown: false, animation: 'slide_from_right' }} />
          <Stack.Screen name="settings/profile-edit" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
          <Stack.Screen name="settings/gps" options={{ headerShown: false, animation: 'slide_from_right' }} />
          <Stack.Screen name="settings/notifications" options={{ headerShown: false, animation: 'slide_from_right' }} />
          <Stack.Screen name="settings/privacy" options={{ headerShown: false, animation: 'slide_from_right' }} />
          <Stack.Screen name="settings/data-export" options={{ headerShown: false, animation: 'slide_from_right' }} />
          <Stack.Screen name="settings/import-gpx" options={{ headerShown: false, animation: 'slide_from_right' }} />
          <Stack.Screen name="settings/blocked-users" options={{ headerShown: false, animation: 'slide_from_right' }} />
          <Stack.Screen name="settings/report" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />

          <Stack.Screen name="onboarding/welcome" options={{ headerShown: false, animation: 'fade' }} />
          <Stack.Screen name="onboarding/sport-preferences" options={{ headerShown: false, animation: 'slide_from_right' }} />
          <Stack.Screen name="onboarding/profile-setup" options={{ headerShown: false, animation: 'slide_from_right' }} />
          <Stack.Screen name="onboarding/permissions" options={{ headerShown: false, animation: 'slide_from_right' }} />

          <Stack.Screen name="auth/login" options={{ headerShown: false, animation: 'fade' }} />
          <Stack.Screen
            name="routes/navigation"
            options={{ presentation: 'fullScreenModal', animation: 'slide_from_bottom' }}
          />

          <Stack.Screen name="athlete/[id]" options={{ headerShown: false, animation: 'slide_from_right' }} />
          <Stack.Screen name="athlete/followers" options={{ headerShown: false, animation: 'slide_from_right' }} />
          <Stack.Screen name="athlete/following" options={{ headerShown: false, animation: 'slide_from_right' }} />
          <Stack.Screen name="athlete/suggested" options={{ headerShown: false, animation: 'slide_from_right' }} />

          <Stack.Screen name="analytics/training-log" options={{ headerShown: false, animation: 'slide_from_right' }} />
          <Stack.Screen name="analytics/fitness-freshness" options={{ headerShown: false, animation: 'slide_from_right' }} />
          <Stack.Screen name="analytics/relative-effort" options={{ headerShown: false, animation: 'slide_from_right' }} />
          <Stack.Screen name="analytics/matched-activities" options={{ headerShown: false, animation: 'slide_from_right' }} />
          <Stack.Screen name="analytics/goals" options={{ headerShown: false, animation: 'slide_from_right' }} />
          <Stack.Screen name="analytics/training-plans" options={{ headerShown: false, animation: 'slide_from_right' }} />
          <Stack.Screen name="analytics/race-predictions" options={{ headerShown: false, animation: 'slide_from_right' }} />
          <Stack.Screen name="analytics/heatmap" options={{ presentation: 'fullScreenModal', animation: 'fade' }} />

          <Stack.Screen name="gear/index" options={{ headerShown: false, animation: 'slide_from_right' }} />
          <Stack.Screen name="gear/add" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />

          <Stack.Screen name="settings/index" options={{ headerShown: false, animation: 'slide_from_right' }} />
          <Stack.Screen name="settings/profile-edit" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
          <Stack.Screen name="settings/gps" options={{ headerShown: false, animation: 'slide_from_right' }} />
          <Stack.Screen name="settings/notifications" options={{ headerShown: false, animation: 'slide_from_right' }} />
          <Stack.Screen name="settings/privacy" options={{ headerShown: false, animation: 'slide_from_right' }} />
          <Stack.Screen name="settings/data-export" options={{ headerShown: false, animation: 'slide_from_right' }} />
          <Stack.Screen name="settings/import-gpx" options={{ headerShown: false, animation: 'slide_from_right' }} />
          <Stack.Screen name="settings/blocked-users" options={{ headerShown: false, animation: 'slide_from_right' }} />
          <Stack.Screen name="settings/report" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />

          <Stack.Screen name="onboarding/welcome" options={{ headerShown: false, animation: 'fade' }} />
          <Stack.Screen name="onboarding/sport-preferences" options={{ headerShown: false, animation: 'slide_from_right' }} />
          <Stack.Screen name="onboarding/profile-setup" options={{ headerShown: false, animation: 'slide_from_right' }} />
          <Stack.Screen name="onboarding/permissions" options={{ headerShown: false, animation: 'slide_from_right' }} />

          <Stack.Screen name="auth/login" options={{ headerShown: false, animation: 'fade' }} />
        </Stack>
      </AppProvider>
    </SafeAreaProvider>
  );
}
