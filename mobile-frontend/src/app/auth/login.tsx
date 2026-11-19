import { Ionicons } from '@expo/vector-icons';
import * as Google from 'expo-auth-session/providers/google';
import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useApp } from '../../context/AppContext';

WebBrowser.maybeCompleteAuthSession();

export default function LoginScreen() {
  const router = useRouter();
  const { loginWithGoogle, loginWithDemo } = useApp();
  const [isLoading, setIsLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const googleClientId =
    process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ||
    '923419495380-p8senmhosq66vltjdviijc08dbunhmsd.apps.googleusercontent.com';

  const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
    clientId: googleClientId,
    webClientId: googleClientId,
  });

  useEffect(() => {
    if (response?.type === 'success') {
      const idToken = response.params?.id_token || (response as any).authentication?.idToken;
      if (idToken) {
        handleGoogleToken(idToken);
      }
    } else if (response?.type === 'error') {
      setIsLoading(false);
      setStatusMessage(null);
      Alert.alert('Google Sign-In Error', response.error?.message || 'Authentication was interrupted.');
    }
  }, [response]);

  const handleGoogleToken = async (idToken: string) => {
    setIsLoading(true);
    setStatusMessage('Verifying Google credentials with Edge API...');
    try {
      await loginWithGoogle(idToken);
      router.replace('/(tabs)');
    } catch (err: any) {
      Alert.alert('Login Failed', err.message || 'Could not verify Google ID token with backend');
    } finally {
      setIsLoading(false);
      setStatusMessage(null);
    }
  };

  const handleDemoLogin = async () => {
    setIsLoading(true);
    setStatusMessage('Connecting instant athlete session...');
    try {
      await loginWithDemo();
      router.replace('/(tabs)');
    } catch (err: any) {
      Alert.alert('Demo Login Failed', err.message || 'Could not initialize session');
    } finally {
      setIsLoading(false);
      setStatusMessage(null);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="flex-1 justify-center px-6">
        {/* Logo & Headline */}
        <View className="items-center mb-10">
          <View className="w-20 h-20 rounded-3xl bg-[#FC4C02] items-center justify-center mb-4 shadow-xl">
            <Ionicons name="fitness" size={44} color="#FFFFFF" />
          </View>
          <Text className="text-3xl font-black text-gray-900 tracking-wider">
            OPEN STRAVA
          </Text>
          <Text className="text-xs font-semibold text-gray-400 mt-1 tracking-wide">
            Open-Source · Subscription-Free Athletic Community
          </Text>
        </View>

        {/* Feature Highlights */}
        <View className="bg-gray-50 border border-gray-100 rounded-2xl p-4 mb-8">
          <View className="flex-row items-center mb-2.5">
            <Ionicons name="shield-checkmark" size={16} color="#16A34A" />
            <Text className="text-xs font-bold text-gray-800 ml-2">
              Privacy-First & Secure Google OAuth
            </Text>
          </View>
          <View className="flex-row items-center mb-2.5">
            <Ionicons name="flash" size={16} color="#FC4C02" />
            <Text className="text-xs font-bold text-gray-800 ml-2">
              Edge-Accelerated with Cloudflare Hyperdrive
            </Text>
          </View>
          <View className="flex-row items-center">
            <Ionicons name="infinite" size={16} color="#2563EB" />
            <Text className="text-xs font-bold text-gray-800 ml-2">
              Full Analytics, Segments, Live Beacon — Always Free
            </Text>
          </View>
        </View>

        {/* Status Indicator */}
        {isLoading && (
          <View className="items-center justify-center my-4 py-3 bg-orange-50 border border-orange-100 rounded-2xl">
            <ActivityIndicator size="small" color="#FC4C02" />
            <Text className="text-xs font-bold text-orange-700 mt-2">
              {statusMessage || 'Loading...'}
            </Text>
          </View>
        )}

        {/* Google OAuth One-Click Button */}
        <TouchableOpacity
          disabled={isLoading || !request}
          onPress={() => {
            setIsLoading(true);
            setStatusMessage('Opening Google Authentication...');
            promptAsync().catch((err) => {
              setIsLoading(false);
              setStatusMessage(null);
              Alert.alert('OAuth Error', err.message);
            });
          }}
          className={`flex-row items-center justify-center py-4 px-4 bg-white border border-gray-300 rounded-2xl shadow-sm mb-4 ${
            isLoading || !request ? 'opacity-60' : 'active:bg-gray-50'
          }`}>
          <Ionicons name="logo-google" size={22} color="#EA4335" />
          <Text className="text-base font-bold text-gray-800 ml-3">
            Continue with Google
          </Text>
        </TouchableOpacity>

        {/* Quick Demo Athlete Bypass */}
        <TouchableOpacity
          disabled={isLoading}
          onPress={handleDemoLogin}
          className={`w-full py-3.5 bg-orange-50 border border-orange-200 rounded-2xl flex-row items-center justify-center mb-6 ${
            isLoading ? 'opacity-60' : 'active:bg-orange-100'
          }`}>
          <Ionicons name="flash" size={16} color="#FC4C02" />
          <Text className="text-xs font-black text-[#FC4C02] ml-2">
            Quick Demo Athlete Login (Instant Preview)
          </Text>
        </TouchableOpacity>

        {/* Tour Onboarding Link */}
        <TouchableOpacity
          onPress={() => router.push('/onboarding/welcome')}
          className="flex-row items-center justify-center mt-2">
          <Text className="text-xs font-semibold text-gray-400 mr-1">
            New here? View the Guided App Walkthrough
          </Text>
          <Ionicons name="arrow-forward" size={13} color="#9CA3AF" />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
