import { Ionicons } from '@expo/vector-icons';
import { makeRedirectUri } from 'expo-auth-session';
import * as Google from 'expo-auth-session/providers/google';
import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  TurboModuleRegistry,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useApp } from '../../context/AppContext';

WebBrowser.maybeCompleteAuthSession();

/**
 * Safely probes for native @react-native-google-signin/google-signin TurboModule.
 * TurboModuleRegistry.get returns null safely in Expo Go without throwing Invariant Violation.
 */
const loadNativeGoogleSignin = () => {
  try {
    const isRegistered =
      TurboModuleRegistry &&
      typeof TurboModuleRegistry.get === 'function' &&
      Boolean(TurboModuleRegistry.get('RNGoogleSignin'));

    if (isRegistered) {
      const mod = require('@react-native-google-signin/google-signin');
      if (mod && mod.GoogleSignin) {
        return { GoogleSignin: mod.GoogleSignin, statusCodes: mod.statusCodes || {} };
      }
    }
  } catch (err) {
    console.warn('Native GoogleSignin probe warning:', err);
  }
  return null;
};

export default function LoginScreen() {
  const router = useRouter();
  const { loginWithGoogle, loginWithEmail, registerWithEmail } = useApp();

  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const googleClientId =
    process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ||
    '923419495380-p8senmhosq66vltjdviijc08dbunhmsd.apps.googleusercontent.com';

  // Fallback Google Auth Request for Expo Go environments
  const redirectUri = makeRedirectUri({
    preferLocalhost: false,
  });

  const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
    clientId: googleClientId,
    webClientId: googleClientId,
    redirectUri,
  });

  // Configure native Google Sign-In on mount if native module is compiled into the binary
  useEffect(() => {
    const native = loadNativeGoogleSignin();
    if (native) {
      try {
        native.GoogleSignin.configure({
          webClientId: googleClientId,
          offlineAccess: true,
          scopes: ['profile', 'email'],
        });
      } catch (err) {
        console.warn('Native GoogleSignin configure warning:', err);
      }
    }
  }, [googleClientId]);

  // Handle Expo Go Google Auth response
  useEffect(() => {
    if (response?.type === 'success') {
      const idToken = response.params?.id_token || (response as any).authentication?.idToken;
      if (idToken) {
        handleServerVerification(idToken);
      }
    }
  }, [response]);

  const handleServerVerification = async (idToken: string) => {
    setIsLoading(true);
    setStatusMessage('Authenticating athlete account on Neon DB...');
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

  // Smart Google Sign-In: Native Google Play Services when built natively, Expo Go fallback otherwise
  const handleGoogleSignInPress = async () => {
    const native = loadNativeGoogleSignin();

    if (native) {
      // 1. Native @react-native-google-signin/google-signin flow
      setIsLoading(true);
      setStatusMessage('Connecting to Google Play Services...');
      try {
        await native.GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
        const res = await native.GoogleSignin.signIn();
        const idToken = (res as any).data?.idToken || (res as any).idToken;

        if (idToken) {
          await handleServerVerification(idToken);
        } else {
          Alert.alert('Google Sign-In', 'No ID token received from Google.');
        }
      } catch (error: any) {
        if (error.code === native.statusCodes?.SIGN_IN_CANCELLED) {
          console.log('User cancelled Google Sign-In');
        } else if (error.code === native.statusCodes?.IN_PROGRESS) {
          console.log('Google Sign-In is already running');
        } else if (error.code === native.statusCodes?.PLAY_SERVICES_NOT_AVAILABLE) {
          Alert.alert(
            'Google Play Services',
            'Google Play Services is not available or outdated on this device.'
          );
        } else {
          console.error('Native Google Sign-In Error:', error);
          Alert.alert(
            'Google Sign-In',
            error.message || 'Unable to authenticate with Google. Please try email or dev build.'
          );
        }
      } finally {
        setIsLoading(false);
        setStatusMessage(null);
      }
    } else {
      // 2. Safe Expo Go flow (prevents TurboModule red screen)
      setIsLoading(true);
      setStatusMessage('Opening Google Sign-In in Expo Go...');
      try {
        const result = await promptAsync();
        if (result.type !== 'success') {
          setIsLoading(false);
          setStatusMessage(null);
        }
      } catch (err: any) {
        setIsLoading(false);
        setStatusMessage(null);
        Alert.alert(
          'Google Sign-In Notice',
          'For native Google Play prompt without browser, an Expo Development Build (npx expo run:android) is required. You can also log in directly using Email.'
        );
      }
    }
  };

  const handleEmailAuth = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Required Fields', 'Please enter your email and password.');
      return;
    }

    if (authMode === 'register' && !displayName.trim()) {
      Alert.alert('Required Fields', 'Please enter your athlete name.');
      return;
    }

    setIsLoading(true);
    setStatusMessage(
      authMode === 'login'
        ? 'Logging in to athlete account...'
        : 'Creating your athlete account on Neon DB...'
    );

    try {
      if (authMode === 'login') {
        await loginWithEmail(email.trim(), password);
      } else {
        await registerWithEmail({
          email: email.trim(),
          password,
          displayName: displayName.trim(),
          username: username.trim() || undefined,
        });
      }
      router.replace('/(tabs)');
    } catch (err: any) {
      Alert.alert(
        authMode === 'login' ? 'Authentication Failed' : 'Registration Failed',
        err.message || 'Please check your credentials and try again.'
      );
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
          contentContainerStyle={{ flexGrow: 1, paddingBottom: 50 }}
          showsVerticalScrollIndicator={false}
          style={{ flex: 1 }}
          className="px-6 py-4">
          
          {/* Header Branding */}
          <View className="items-center mt-4 mb-6">
            <View className="w-14 h-14 rounded-2xl bg-[#FC4C02] items-center justify-center mb-2 shadow-lg">
              <Ionicons name="fitness" size={32} color="#FFFFFF" />
            </View>
            <Text className="text-3xl font-black text-black tracking-wider">
              STRAVA
            </Text>
            <Text className="text-xs font-semibold text-gray-500 mt-0.5">
              Open Edition · Unlimited & Free
            </Text>
          </View>

          {/* Mode Switcher Tabs */}
          <View className="flex-row bg-gray-100 p-1 rounded-2xl mb-5">
            <TouchableOpacity
              onPress={() => setAuthMode('login')}
              className={`flex-1 py-2.5 rounded-xl items-center ${
                authMode === 'login' ? 'bg-white shadow-xs' : ''
              }`}>
              <Text
                className={`text-xs font-black ${
                  authMode === 'login' ? 'text-gray-900' : 'text-gray-500'
                }`}>
                Log In
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setAuthMode('register')}
              className={`flex-1 py-2.5 rounded-xl items-center ${
                authMode === 'register' ? 'bg-white shadow-xs' : ''
              }`}>
              <Text
                className={`text-xs font-black ${
                  authMode === 'register' ? 'text-gray-900' : 'text-gray-500'
                }`}>
                Create Account
              </Text>
            </TouchableOpacity>
          </View>

          {/* Form Inputs */}
          <View className="space-y-3.5 mb-5">
            {authMode === 'register' && (
              <>
                <View>
                  <Text className="text-xs font-bold text-gray-700 mb-1.5">Full Name</Text>
                  <TextInput
                    className="w-full h-12 bg-gray-50 border border-gray-200 rounded-2xl px-4 text-sm text-gray-900"
                    placeholder="e.g. Md Rakib Ali"
                    placeholderTextColor="#9CA3AF"
                    value={displayName}
                    onChangeText={setDisplayName}
                    autoCapitalize="words"
                  />
                </View>

                <View>
                  <Text className="text-xs font-bold text-gray-700 mb-1.5">
                    Username (Optional)
                  </Text>
                  <TextInput
                    className="w-full h-12 bg-gray-50 border border-gray-200 rounded-2xl px-4 text-sm text-gray-900"
                    placeholder="e.g. rakib_runner"
                    placeholderTextColor="#9CA3AF"
                    value={username}
                    onChangeText={setUsername}
                    autoCapitalize="none"
                  />
                </View>
              </>
            )}

            <View>
              <Text className="text-xs font-bold text-gray-700 mb-1.5">Email Address</Text>
              <TextInput
                className="w-full h-12 bg-gray-50 border border-gray-200 rounded-2xl px-4 text-sm text-gray-900"
                placeholder="athlete@example.com"
                placeholderTextColor="#9CA3AF"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            <View>
              <Text className="text-xs font-bold text-gray-700 mb-1.5">Password</Text>
              <TextInput
                className="w-full h-12 bg-gray-50 border border-gray-200 rounded-2xl px-4 text-sm text-gray-900"
                placeholder="••••••••"
                placeholderTextColor="#9CA3AF"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
              />
            </View>
          </View>

          {/* Primary Action Button */}
          <TouchableOpacity
            disabled={isLoading}
            onPress={handleEmailAuth}
            activeOpacity={0.8}
            className="w-full py-4 bg-[#FC4C02] rounded-2xl items-center justify-center shadow-md active:bg-[#E03A00] mb-3">
            <Text className="text-sm font-black text-white tracking-wide">
              {authMode === 'login' ? 'Log In to Strava' : 'Complete Registration'}
            </Text>
          </TouchableOpacity>

          {/* Divider */}
          <View className="flex-row items-center my-4">
            <View className="flex-1 h-px bg-gray-200" />
            <Text className="px-3 text-xs font-bold text-gray-400">OR</Text>
            <View className="flex-1 h-px bg-gray-200" />
          </View>

          {/* Google Sign-In Button */}
          <TouchableOpacity
            disabled={isLoading}
            onPress={handleGoogleSignInPress}
            activeOpacity={0.85}
            className="w-full py-3.5 px-4 bg-white border border-gray-300 rounded-2xl flex-row items-center justify-center shadow-xs mb-4">
            <Ionicons name="logo-google" size={18} color="#EA4335" />
            <Text className="text-sm font-bold text-gray-800 ml-2.5">
              Continue with Google
            </Text>
          </TouchableOpacity>

          {/* Loading Indicator */}
          {isLoading && (
            <View className="items-center justify-center my-3 py-3 bg-orange-50 border border-orange-200 rounded-2xl">
              <ActivityIndicator size="small" color="#FC4C02" />
              <Text className="text-xs font-bold text-orange-800 mt-2">
                {statusMessage || 'Loading...'}
              </Text>
            </View>
          )}

          {/* Onboarding Tour Link */}
          <View className="items-center pt-2 pb-4">
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
