import { Redirect } from 'expo-router';
import React from 'react';
import { ActivityIndicator, View } from 'react-native';
import { useApp } from '../context/AppContext';

export default function Index() {
  const { isAuthenticated, isAuthLoading } = useApp();

  console.log('>>> [INDEX_SCREEN]', { isAuthenticated, isAuthLoading });

  if (isAuthLoading) {
    return (
      <View className="flex-1 bg-white items-center justify-center">
        <ActivityIndicator size="large" color="#FC4C02" />
      </View>
    );
  }

  if (isAuthenticated) {
    console.log('>>> [INDEX] Redirecting to /(tabs)');
    return <Redirect href="/(tabs)" />;
  }

  console.log('>>> [INDEX] Redirecting to /auth/login');
  return <Redirect href="/auth/login" />;
}
