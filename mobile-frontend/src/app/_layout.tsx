import { Ionicons } from '@expo/vector-icons';
import { useFonts } from 'expo-font';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Colors } from '../constants/theme';
import { AppProvider, useApp } from '../context/AppContext';
import '../global.css';

function NavigationRoot() {
  const { isAuthenticated, isAuthLoading } = useApp();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (isAuthLoading) return;

    const inAuthGroup = segments[0] === 'auth';
    const inOnboarding = segments[0] === 'onboarding';

    if (!isAuthenticated && !inAuthGroup && !inOnboarding) {
      router.replace('/auth/login');
    } else if (isAuthenticated && inAuthGroup) {
      router.replace('/(tabs)');
    }
  }, [isAuthenticated, isAuthLoading, segments]);

  if (isAuthLoading) {
    return (
      <View className="flex-1 bg-white items-center justify-center">
        <ActivityIndicator size="large" color="#FC4C02" />
      </View>
    );
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: Colors.background },
      }}>
      {/* Root Entrypoint */}
      <Stack.Screen name="index" options={{ headerShown: false }} />

      {/* Auth Screen */}
      <Stack.Screen name="auth/login" options={{ animation: 'fade' }} />

      {/* Onboarding Screens */}
      <Stack.Screen name="onboarding/welcome" options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="onboarding/sport-preferences" options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="onboarding/profile-setup" options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="onboarding/permissions" options={{ animation: 'slide_from_right' }} />

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
        name="settings/profile-edit"
        options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
      />
      <Stack.Screen
        name="settings/report"
        options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
      />
    </Stack>
  );
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    ...Ionicons.font,
  });

  if (!fontsLoaded) {
    return (
      <View style={{ flex: 1, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color="#FC4C02" />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <AppProvider>
        <StatusBar style="dark" />
        <NavigationRoot />
      </AppProvider>
    </SafeAreaProvider>
  );
}
