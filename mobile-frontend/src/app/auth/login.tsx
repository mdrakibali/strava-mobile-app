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
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AuthHeader } from '../../components/auth/AuthHeader';
import { GoogleAuthButton } from '../../components/auth/GoogleAuthButton';
import { useApp } from '../../context/AppContext';
import { loadNativeGoogleSignin } from '../../lib/nativeGoogleSignin';

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

  const handleGoogleSuccess = async (idToken: string) => {
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
    setStatusMessage(authMode === 'login' ? 'Signing you in…' : 'Creating your account…');

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
          
          <AuthHeader />

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
                  <Text className="text-xs font-bold text-gray-700 mb-1.5">Username (Optional)</Text>
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

          <TouchableOpacity
            disabled={isLoading}
            onPress={handleEmailAuth}
            activeOpacity={0.8}
            className="w-full py-4 bg-[#FC4C02] rounded-2xl items-center justify-center shadow-md active:bg-[#E03A00] mb-3">
            <Text className="text-sm font-black text-white tracking-wide">
              {authMode === 'login' ? 'Log in' : 'Create account'}
            </Text>
          </TouchableOpacity>

          <View className="flex-row items-center my-4">
            <View className="flex-1 h-px bg-gray-200" />
            <Text className="px-3 text-xs font-bold text-gray-400">OR</Text>
            <View className="flex-1 h-px bg-gray-200" />
          </View>

          <GoogleAuthButton
            isLoading={isLoading}
            onSuccess={handleGoogleSuccess}
            onStatusChange={setStatusMessage}
            onLoadingChange={setIsLoading}
          />

          {isLoading && (
            <View className="items-center justify-center my-3 py-3 bg-orange-50 border border-orange-200 rounded-2xl">
              <ActivityIndicator size="small" color="#FC4C02" />
              <Text className="text-xs font-bold text-orange-800 mt-2">
                {statusMessage || 'Loading...'}
              </Text>
            </View>
          )}

          <View className="items-center pt-3 pb-2">
            <View className="flex-row items-center">
              <Text className="text-xs font-medium text-gray-500">
                Don't have an athlete account?{' '}
              </Text>
              <TouchableOpacity onPress={() => router.replace('/auth/register')}>
                <Text className="text-xs font-bold text-[#FC4C02]">
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
