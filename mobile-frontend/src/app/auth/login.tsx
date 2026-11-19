import { Ionicons } from '@expo/vector-icons';
import { makeRedirectUri } from 'expo-auth-session';
import * as Google from 'expo-auth-session/providers/google';
import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ImageBackground,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useApp } from '../../context/AppContext';

WebBrowser.maybeCompleteAuthSession();

export default function LoginScreen() {
  console.log('>>> [LOGIN_SCREEN] Rendering LoginScreen');
  const router = useRouter();
  const { loginWithGoogle, loginAsGuest } = useApp();
  const [isLoading, setIsLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [showRedirectHelper, setShowRedirectHelper] = useState(false);

  const googleClientId =
    process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ||
    '923419495380-p8senmhosq66vltjdviijc08dbunhmsd.apps.googleusercontent.com';

  // Standard Expo Go Auth Proxy URI for Google Web Client IDs
  const redirectUri = makeRedirectUri({
    preferLocalhost: false,
  });

  const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
    clientId: googleClientId,
    webClientId: googleClientId,
    redirectUri,
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
      setShowRedirectHelper(true);
      Alert.alert(
        'Google Auth Notice',
        `Google reported an invalid request. Please ensure "${redirectUri}" is added to Authorized redirect URIs in Google Cloud Console, or tap "Continue as Guest" for instant access.`
      );
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

  const handleGuestLogin = async () => {
    setIsLoading(true);
    setStatusMessage('Connecting database session...');
    try {
      await loginAsGuest();
      router.replace('/(tabs)');
    } catch (err: any) {
      Alert.alert('Login Notice', err.message || 'Could not connect. Retrying...');
    } finally {
      setIsLoading(false);
      setStatusMessage(null);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
          style={{ flex: 1 }}
          className="px-6 py-4">
          
          {/* Header Branding */}
          <View className="items-center mt-6 mb-8">
            <View className="w-16 h-16 rounded-2xl bg-[#FC4C02] items-center justify-center mb-3 shadow-lg">
              <Ionicons name="fitness" size={36} color="#FFFFFF" />
            </View>
            <Text className="text-3xl font-black text-black tracking-wider">
              STRAVA
            </Text>
            <Text className="text-xs font-semibold text-gray-500 mt-1">
              Open Edition · Unlimited & Subscription-Free
            </Text>
          </View>

          {/* Value Proposition Cards */}
          <View className="bg-gray-50 border border-gray-200/80 rounded-2xl p-4 mb-6">
            <View className="flex-row items-center mb-3">
              <View className="w-7 h-7 rounded-full bg-emerald-100 items-center justify-center mr-3">
                <Ionicons name="shield-checkmark" size={15} color="#059669" />
              </View>
              <View className="flex-1">
                <Text className="text-xs font-black text-gray-900">Secure Edge Authentication</Text>
                <Text className="text-[11px] text-gray-500">Fast authentication via Cloudflare Workers & Neon DB</Text>
              </View>
            </View>

            <View className="flex-row items-center mb-3">
              <View className="w-7 h-7 rounded-full bg-orange-100 items-center justify-center mr-3">
                <Ionicons name="flame" size={15} color="#FC4C02" />
              </View>
              <View className="flex-1">
                <Text className="text-xs font-black text-gray-900">100% Pro Features Unlocked</Text>
                <Text className="text-[11px] text-gray-500">Heatmaps, 3D terrain, segments, and fitness analytics</Text>
              </View>
            </View>

            <View className="flex-row items-center">
              <View className="w-7 h-7 rounded-full bg-blue-100 items-center justify-center mr-3">
                <Ionicons name="infinite" size={15} color="#2563EB" />
              </View>
              <View className="flex-1">
                <Text className="text-xs font-black text-gray-900">Zero Subscriptions Forever</Text>
                <Text className="text-[11px] text-gray-500">Full athletic tracking without paywalls</Text>
              </View>
            </View>
          </View>

          {/* Loading Indicator */}
          {isLoading && (
            <View className="items-center justify-center my-3 py-3 bg-orange-50 border border-orange-200 rounded-2xl">
              <ActivityIndicator size="small" color="#FC4C02" />
              <Text className="text-xs font-bold text-orange-800 mt-2">
                {statusMessage || 'Loading...'}
              </Text>
            </View>
          )}

          {/* Action Buttons */}
          <View className="space-y-3 mb-6">
            {/* Primary Google Login Button */}
            <TouchableOpacity
              disabled={isLoading}
              onPress={() => {
                setIsLoading(true);
                setStatusMessage('Opening Google Sign-In...');
                promptAsync().catch((err) => {
                  setIsLoading(false);
                  setStatusMessage(null);
                  setShowRedirectHelper(true);
                  Alert.alert('Google Sign-In', err.message);
                });
              }}
              activeOpacity={0.85}
              className="w-full py-4 px-4 bg-white border border-gray-300 rounded-2xl flex-row items-center justify-center shadow-xs mb-3">
              <Ionicons name="logo-google" size={20} color="#EA4335" />
              <Text className="text-sm font-black text-gray-900 ml-3">
                Continue with Google
              </Text>
            </TouchableOpacity>

            {/* Instant Guest / Athlete Access Button */}
            <TouchableOpacity
              disabled={isLoading}
              onPress={handleGuestLogin}
              activeOpacity={0.85}
              className="w-full py-4 px-4 bg-black rounded-2xl flex-row items-center justify-center shadow-sm">
              <Ionicons name="person-circle-outline" size={20} color="#FFFFFF" />
              <Text className="text-sm font-black text-white ml-2">
                Continue as Athlete (Instant Access)
              </Text>
            </TouchableOpacity>
          </View>

          {/* Google Cloud Console Redirect Helper Box */}
          <View className="bg-amber-50 border border-amber-200 rounded-2xl p-3.5 mb-6">
            <View className="flex-row items-center mb-1">
              <Ionicons name="information-circle" size={16} color="#D97706" />
              <Text className="text-xs font-black text-amber-900 ml-1.5">
                Google OAuth Setup Tip
              </Text>
            </View>
            <Text className="text-[11px] text-amber-800 leading-4 mb-2">
              Google shows <Text className="font-bold">"Access blocked: This app's request is invalid"</Text> if the redirect URI is not added in Google Cloud Console.
            </Text>
            <Text className="text-[10px] font-bold text-gray-700 uppercase mb-1">
              Your Redirect URI for Google Console:
            </Text>
            <View className="bg-white p-2 rounded-lg border border-amber-200">
              <Text className="text-[10px] font-mono text-gray-800 select-all" numberOfLines={2}>
                {redirectUri}
              </Text>
            </View>
          </View>

          {/* Onboarding Tour Link */}
          <View className="items-center pb-6">
            <TouchableOpacity
              onPress={() => router.push('/onboarding/welcome')}
              className="flex-row items-center py-2">
              <Text className="text-xs font-bold text-gray-500 mr-1">
                View Guided Onboarding Tour
              </Text>
              <Ionicons name="arrow-forward" size={14} color="#6B7280" />
            </TouchableOpacity>
          </View>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
