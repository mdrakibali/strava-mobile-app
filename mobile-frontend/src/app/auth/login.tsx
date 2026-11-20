import { Ionicons } from '@expo/vector-icons';
import { APP_NAME } from '../../config/app';
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
import { useApp } from '../../context/AppContext';


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
    '123496427764-00sln89ecf8mlo19n1fuqkevgfqsvje7.apps.googleusercontent.com';

  // Configure native Google Sign-In on mount if native module is compiled into the binary
  useEffect(() => {
    const native = loadNativeGoogleSignin();
    if (native) {
      try {
        native.GoogleSignin.configure({
          // The ID token's audience is this WEB client id; the backend verifies exactly that
          // audience. The Android OAuth client (package + SHA-1) must exist in the same Google
          // Cloud project — see docs/STRAVA_FINAL_QA_REPORT.md §Google Sign-In setup.
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
    setStatusMessage('Signing you in…');
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

  /**
   * Native Google Sign-In (Google Play Services / Credential Manager) → Google ID token →
   * POST /auth/google, where the backend verifies the token signature, issuer, audience and
   * expiry against Google's JWKS before issuing our session JWT. No browser fallback: the
   * Expo Go web flow doesn't work for this setup, so Expo Go users are told to use the dev build.
   */
  const handleGoogleSignInPress = async () => {
    const native = loadNativeGoogleSignin();
    if (!native) {
      Alert.alert('Google Sign-In', 'Google Sign-In needs the app’s development or release build (it is not available in Expo Go). You can sign in with email meanwhile.');
      return;
    }
    setIsLoading(true);
    setStatusMessage('Opening Google…');
    try {
      await native.GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      const res: any = await native.GoogleSignin.signIn();
      // v13+ returns { type: 'cancelled' } instead of throwing when the user backs out.
      if (res?.type === 'cancelled') return;
      const idToken = res?.data?.idToken ?? res?.idToken;
      if (!idToken) {
        Alert.alert('Google Sign-In', 'Google did not return an ID token. Check the OAuth client configuration (web client ID).');
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
        // Status 10 = this build's package name / SHA-1 is not registered for the OAuth client.
        Alert.alert('Google Sign-In not configured', 'This app build is not registered with Google (package name / SHA-1). See the setup notes in the QA report.');
      } else {
        Alert.alert('Google Sign-In', error?.message || 'Unable to sign in with Google. Please try again or use email.');
      }
    } finally {
      setIsLoading(false);
      setStatusMessage(null);
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
        ? 'Signing you in…'
        : 'Creating your account…'
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
            <View className="w-14 h-14 rounded-2xl bg-[#F25C19] items-center justify-center mb-2 shadow-lg">
              <Ionicons name="fitness" size={32} color="#FFFFFF" />
            </View>
            <Text className="text-3xl font-black text-black tracking-tight">
              {APP_NAME}
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
                    placeholder="Your name"
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
            className="w-full py-4 bg-[#F25C19] rounded-2xl items-center justify-center shadow-md active:bg-[#E03A00] mb-3">
            <Text className="text-sm font-black text-white tracking-wide">
              {authMode === 'login' ? 'Log in' : 'Create account'}
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

          {/* Switch to Register */}
          <View className="items-center pt-3 pb-2">
            <View className="flex-row items-center">
              <Text className="text-xs font-medium text-gray-500">
                Don't have an athlete account?{' '}
              </Text>
              <TouchableOpacity onPress={() => router.replace('/auth/register')}>
                <Text className="text-xs font-bold text-[#F25C19]">
                  Create Account
                </Text>
              </TouchableOpacity>
            </View>
          </View>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
