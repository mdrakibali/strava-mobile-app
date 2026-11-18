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
          {/* Main Tabs */}
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />

          {/* Fullscreen Modals */}
          <Stack.Screen
            name="record"
            options={{ presentation: 'fullScreenModal', animation: 'slide_from_bottom' }}
          />
          <Stack.Screen
            name="routes/navigation"
            options={{ presentation: 'fullScreenModal', animation: 'slide_from_bottom' }}
          />
          <Stack.Screen
            name="analytics/heatmap"
            options={{ presentation: 'fullScreenModal', animation: 'fade' }}
          />

          {/* Slide-from-bottom Modals */}
          <Stack.Screen
            name="save-activity"
            options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
          />
          <Stack.Screen
            name="notifications"
            options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
          />
          <Stack.Screen
            name="search"
            options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
          />
          <Stack.Screen
            name="club/create"
            options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
          />
          <Stack.Screen
            name="event/create"
            options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
          />
          <Stack.Screen
            name="challenge/create"
            options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
          />
          <Stack.Screen
            name="gear/add"
            options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
          />
          <Stack.Screen
            name="settings/profile-edit"
            options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
          />
          <Stack.Screen
            name="settings/report"
            options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
          />

          {/* Fade Transitions */}
          <Stack.Screen name="auth/login" options={{ animation: 'fade' }} />
          <Stack.Screen name="onboarding/welcome" options={{ animation: 'fade' }} />
        </Stack>
      </AppProvider>
    </SafeAreaProvider>
  );
}
