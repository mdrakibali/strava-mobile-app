import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
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
import { APP_NAME } from '../../config/app';
import { useApp } from '../../context/AppContext';

/**
 * Safely probes for native @react-native-google-signin/google-signin TurboModule.
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

export default function RegisterScreen() {
  const router = useRouter();
  const { registerWithEmail, loginWithGoogle } = useApp();

  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const googleClientId =
    process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ||
    '123496427764-733qtd6vqvlpc2uj1m9nvpg17g4qg48k.apps.googleusercontent.com';

  useEffect(() => {
    const native = loadNativeGoogleSignin();
    if (native) {
      try {
        native.GoogleSignin.configure({
          webClientId: googleClientId,
          offlineAccess: false,
          scopes: ['profile', 'email'],
        });
      } catch (err) {
        console.warn('Native GoogleSignin configure warning:', err);
      }
    }
  }, [googleClientId]);

  const handleServerVerification = async (idToken: string) => {
    setIsLoading(true);
    setStatusMessage('Creating your account…');
    try {
      await loginWithGoogle(idToken);
      router.replace('/(tabs)');
    } catch (err: any) {
      Alert.alert('Registration Failed', err.message || 'Could not verify Google account with backend');
    } finally {
      setIsLoading(false);
      setStatusMessage(null);
    }
  };

  const handleGoogleSignInPress = async () => {
    const native = loadNativeGoogleSignin();
    if (!native) {
      Alert.alert(
        'Google Sign-In',
        'Google Sign-In needs the app’s development or release build (it is not available in Expo Go). You can sign up with email meanwhile.'
      );
      return;
    }
    setIsLoading(true);
    setStatusMessage('Connecting to Google…');
    try {
      await native.GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      const res: any = await native.GoogleSignin.signIn();
      if (res?.type === 'cancelled') return;
      const idToken = res?.data?.idToken ?? res?.idToken;
      if (!idToken) {
        Alert.alert('Google Sign-In', 'Google did not return an ID token. Check the OAuth client configuration.');
        return;
      }
      await handleServerVerification(idToken);
    } catch (error: any) {
      const codes = native.statusCodes ?? {};
      if (error?.code === codes.SIGN_IN_CANCELLED) return;
      if (error?.code === codes.IN_PROGRESS) return;
      if (error?.code === codes.PLAY_SERVICES_NOT_AVAILABLE) {
        Alert.alert('Google Play Services', 'Google Play Services is not available or needs an update on this device.');
      } else if (String(error?.code) === '10' || /DEVELOPER_ERROR/i.test(String(error?.message))) {
        Alert.alert(
          'Google Sign-In Configuration Error',
          'Google returned DEVELOPER_ERROR (Code 10). Make sure you have created a "Web application" OAuth Client ID in Google Cloud Console and set it as webClientId (do not use the "Android" Client ID here).'
        );
      } else {
        Alert.alert('Google Sign-In', error?.message || 'Unable to sign in with Google. Please use email.');
      }
    } finally {
      setIsLoading(false);
      setStatusMessage(null);
    }
  };

  const handleRegister = async () => {
    if (!displayName.trim() || !email.trim() || !password.trim()) {
      Alert.alert('Required Fields', 'Please enter your name, email, and password.');
      return;
    }

    if (password.length < 6) {
      Alert.alert('Password Too Short', 'Password must be at least 6 characters.');
      return;
    }

    setIsLoading(true);
    setStatusMessage('Creating your athlete account…');

    try {
      await registerWithEmail({
        email: email.trim(),
        password,
        displayName: displayName.trim(),
        username: username.trim() || undefined,
      });
      router.replace('/(tabs)');
    } catch (err: any) {
      Alert.alert('Registration Failed', err.message || 'Please check your details and try again.');
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
          <View className="items-center mt-4 mb-6">
            <View className="w-14 h-14 rounded-2xl bg-[#F25C19] items-center justify-center mb-2 shadow-lg">
              <Ionicons name="fitness" size={32} color="#FFFFFF" />
            </View>
            <Text className="text-3xl font-black text-black tracking-tight">
              {APP_NAME}
            </Text>
            <Text className="text-sm font-semibold text-gray-500 mt-1">
              Create your athlete profile
            </Text>
          </View>

          {/* Form Inputs */}
          <View className="space-y-3.5 mb-5">
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
              <Text className="text-xs font-bold text-gray-700 mb-1.5">Password (Min. 6 chars)</Text>
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
            onPress={handleRegister}
            activeOpacity={0.8}
            className="w-full py-4 bg-[#F25C19] rounded-2xl items-center justify-center shadow-md active:bg-[#E03A00] mb-3">
            <Text className="text-sm font-black text-white tracking-wide">
              Create Account
            </Text>
          </TouchableOpacity>

          {/* Divider */}
          <View className="flex-row items-center my-3">
            <View className="flex-1 h-px bg-gray-200" />
            <Text className="px-3 text-xs font-bold text-gray-400">OR</Text>
            <View className="flex-1 h-px bg-gray-200" />
          </View>

          {/* Google Sign-In Button */}
          <TouchableOpacity
            disabled={isLoading}
            onPress={handleGoogleSignInPress}
            activeOpacity={0.85}
            className="w-full py-3.5 px-4 bg-white border border-gray-300 rounded-2xl flex-row items-center justify-center shadow-xs mb-5">
            <Ionicons name="logo-google" size={18} color="#EA4335" />
            <Text className="text-sm font-bold text-gray-800 ml-2.5">
              Continue with Google
            </Text>
          </TouchableOpacity>

          {/* Loading Indicator */}
          {isLoading && (
            <View className="items-center justify-center my-2 py-3 bg-orange-50 border border-orange-200 rounded-2xl">
              <ActivityIndicator size="small" color="#FC4C02" />
              <Text className="text-xs font-bold text-orange-800 mt-2">
                {statusMessage || 'Loading...'}
              </Text>
            </View>
          )}

          {/* Switch to Login */}
          <View className="items-center pt-3 pb-2">
            <View className="flex-row items-center">
              <Text className="text-xs font-medium text-gray-500">
                Already have an account?{' '}
              </Text>
              <TouchableOpacity onPress={() => router.replace('/auth/login')}>
                <Text className="text-xs font-bold text-[#F25C19]">
                  Log In
                </Text>
              </TouchableOpacity>
            </View>
          </View>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

