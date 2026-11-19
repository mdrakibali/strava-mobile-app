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
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useApp } from '../../context/AppContext';

WebBrowser.maybeCompleteAuthSession();

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
  const [showGoogleGuide, setShowGoogleGuide] = useState(false);

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
      setShowGoogleGuide(true);
      Alert.alert(
        'Google Auth Notice',
        `Google reported an invalid request. Please ensure the exact redirect URI is added to Authorized redirect URIs in Google Cloud Console.`
      );
    }
  }, [response]);

  const handleGoogleToken = async (idToken: string) => {
    setIsLoading(true);
    setStatusMessage('Authenticating with Google & Edge DB...');
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
    setStatusMessage(authMode === 'login' ? 'Logging in to athlete account...' : 'Creating your athlete account on Neon DB...');

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
              Open Edition · Unlimited & Subscription-Free
            </Text>
          </View>

          {/* Mode Switcher Tabs */}
          <View className="flex-row bg-gray-100 p-1 rounded-2xl mb-5">
            <TouchableOpacity
              onPress={() => setAuthMode('login')}
              className={`flex-1 py-2.5 rounded-xl items-center ${
                authMode === 'login' ? 'bg-white shadow-xs' : ''
              }`}>
              <Text className={`text-xs font-black ${authMode === 'login' ? 'text-gray-900' : 'text-gray-500'}`}>
                Log In
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setAuthMode('register')}
              className={`flex-1 py-2.5 rounded-xl items-center ${
                authMode === 'register' ? 'bg-white shadow-xs' : ''
              }`}>
              <Text className={`text-xs font-black ${authMode === 'register' ? 'text-gray-900' : 'text-gray-500'}`}>
                Create Account
              </Text>
            </TouchableOpacity>
          </View>

          {/* Input Form */}
          <View className="space-y-3 mb-5">
            {authMode === 'register' && (
              <>
                <View className="mb-3">
                  <Text className="text-xs font-bold text-gray-700 mb-1">Athlete Name</Text>
                  <TextInput
                    value={displayName}
                    onChangeText={setDisplayName}
                    placeholder="e.g. Md Rakib Ali"
                    placeholderTextColor="#9CA3AF"
                    className="bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3.5 text-sm font-semibold text-gray-900"
                  />
                </View>

                <View className="mb-3">
                  <Text className="text-xs font-bold text-gray-700 mb-1">Username (Optional)</Text>
                  <TextInput
                    value={username}
                    onChangeText={setUsername}
                    placeholder="e.g. rakib_runner"
                    autoCapitalize="none"
                    placeholderTextColor="#9CA3AF"
                    className="bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3.5 text-sm font-semibold text-gray-900"
                  />
                </View>
              </>
            )}

            <View className="mb-3">
              <Text className="text-xs font-bold text-gray-700 mb-1">Email Address</Text>
              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder="athlete@example.com"
                autoCapitalize="none"
                keyboardType="email-address"
                placeholderTextColor="#9CA3AF"
                className="bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3.5 text-sm font-semibold text-gray-900"
              />
            </View>

            <View className="mb-4">
              <Text className="text-xs font-bold text-gray-700 mb-1">Password</Text>
              <TextInput
                value={password}
                onChangeText={setPassword}
                placeholder="At least 6 characters"
                secureTextEntry
                placeholderTextColor="#9CA3AF"
                className="bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3.5 text-sm font-semibold text-gray-900"
              />
            </View>

            {/* Submit Email Button */}
            <TouchableOpacity
              disabled={isLoading}
              onPress={handleEmailAuth}
              activeOpacity={0.85}
              className="w-full py-4 bg-[#FC4C02] rounded-2xl items-center justify-center shadow-md">
              <Text className="text-sm font-black text-white">
                {authMode === 'login' ? 'Log In to Account' : 'Create Athlete Profile'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Divider */}
          <View className="flex-row items-center my-4">
            <View className="flex-1 h-px bg-gray-200" />
            <Text className="px-3 text-xs font-bold text-gray-400">OR</Text>
            <View className="flex-1 h-px bg-gray-200" />
          </View>

          {/* Google Sign-In Button */}
          <TouchableOpacity
            disabled={isLoading}
            onPress={() => {
              setIsLoading(true);
              setStatusMessage('Opening Google Sign-In...');
              promptAsync().catch((err) => {
                setIsLoading(false);
                setStatusMessage(null);
                setShowGoogleGuide(true);
                Alert.alert('Google Sign-In', err.message);
              });
            }}
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

          {/* Google Cloud Console Setup Helper Card */}
          <TouchableOpacity
            onPress={() => setShowGoogleGuide(!showGoogleGuide)}
            className="flex-row items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-2xl mb-4">
            <View className="flex-row items-center flex-1 mr-2">
              <Ionicons name="information-circle" size={18} color="#2563EB" />
              <Text className="text-xs font-bold text-blue-900 ml-2">
                Google Console Setup Instructions
              </Text>
            </View>
            <Ionicons name={showGoogleGuide ? 'chevron-up' : 'chevron-down'} size={16} color="#2563EB" />
          </TouchableOpacity>

          {showGoogleGuide && (
            <View className="bg-stone-900 text-white p-4 rounded-2xl mb-5 space-y-3">
              <Text className="text-xs font-bold text-amber-400 mb-1">
                Google Cloud Console Settings:
              </Text>

              <View className="mb-2">
                <Text className="text-[10px] font-bold text-gray-400 uppercase">
                  1. Authorised JavaScript origins:
                </Text>
                <Text className="text-[11px] font-mono text-emerald-400 bg-stone-800 p-1.5 rounded mt-0.5">
                  https://auth.expo.io
                </Text>
                <Text className="text-[11px] font-mono text-emerald-400 bg-stone-800 p-1.5 rounded mt-0.5">
                  http://localhost:8081
                </Text>
              </View>

              <View className="mb-2">
                <Text className="text-[10px] font-bold text-gray-400 uppercase">
                  2. Authorised redirect URIs:
                </Text>
                <Text className="text-[11px] font-mono text-emerald-400 bg-stone-800 p-1.5 rounded mt-0.5">
                  https://auth.expo.io/@anonymous/mobile-frontend
                </Text>
                <Text className="text-[11px] font-mono text-emerald-400 bg-stone-800 p-1.5 rounded mt-0.5">
                  {redirectUri}
                </Text>
              </View>

              <Text className="text-[10px] text-gray-300 leading-4">
                Note: Google Web Client IDs strictly reject non-HTTPS custom schemes. Ensure both entries above are saved in your Google Cloud Console Credentials.
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
