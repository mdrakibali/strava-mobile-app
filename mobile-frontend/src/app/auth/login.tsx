import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);

  const handleSubmit = () => {
    router.replace('/(tabs)');
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View className="flex-1 justify-center px-6">
          {/* Logo & Headline */}
          <View className="items-center mb-8">
            <View className="w-16 h-16 rounded-2xl bg-[#FC4C02] items-center justify-center mb-3 shadow-lg">
              <Ionicons name="fitness" size={36} color="#FFFFFF" />
            </View>
            <Text className="text-2xl font-black text-gray-900 tracking-wider">
              OPEN STRAVA
            </Text>
            <Text className="text-xs text-gray-400 mt-1">
              {isSignUp ? 'Join the community of athletes' : 'Sign in to sync your fitness and feed'}
            </Text>
          </View>

          {/* Google OAuth One-Click Button */}
          <TouchableOpacity
            onPress={handleSubmit}
            className="flex-row items-center justify-center py-3.5 px-4 bg-white border border-gray-300 rounded-2xl shadow-sm mb-4">
            <Ionicons name="logo-google" size={20} color="#EA4335" />
            <Text className="text-sm font-bold text-gray-700 ml-2.5">
              Continue with Google
            </Text>
          </TouchableOpacity>

          <View className="flex-row items-center my-4">
            <View className="flex-1 h-px bg-gray-200" />
            <Text className="mx-3 text-xs text-gray-400 font-semibold uppercase">Or with email</Text>
            <View className="flex-1 h-px bg-gray-200" />
          </View>

          {/* Form */}
          <View className="space-y-3 mb-6">
            <View>
              <Text className="text-xs font-bold text-gray-700 mb-1">Email</Text>
              <TextInput
                value={email}
                onChangeText={setEmail}
                className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900"
                placeholder="athlete@example.com"
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            <View className="mt-3">
              <Text className="text-xs font-bold text-gray-700 mb-1">Password</Text>
              <TextInput
                value={password}
                onChangeText={setPassword}
                className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900"
                placeholder="••••••••"
                secureTextEntry
              />
            </View>
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            onPress={handleSubmit}
            className="w-full py-4 bg-[#FC4C02] rounded-2xl items-center shadow-md mb-4">
            <Text className="text-base font-black text-white">
              {isSignUp ? 'Create Athlete Account' : 'Log In'}
            </Text>
          </TouchableOpacity>

          {/* Quick Demo Athlete Bypass */}
          <TouchableOpacity
            onPress={handleSubmit}
            className="w-full py-3 bg-orange-50 border border-orange-200 rounded-2xl flex-row items-center justify-center mb-6">
            <Ionicons name="flash" size={14} color="#FC4C02" />
            <Text className="text-xs font-black text-[#FC4C02] ml-1.5">
              Quick Demo Athlete Login (Instant Access)
            </Text>
          </TouchableOpacity>

          {/* Toggle Login / SignUp */}
          <View className="flex-row justify-center items-center">
            <Text className="text-xs text-gray-500">
              {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
            </Text>
            <TouchableOpacity onPress={() => setIsSignUp(!isSignUp)}>
              <Text className="text-xs font-bold text-[#FC4C02]">
                {isSignUp ? 'Log In' : 'Sign Up'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Tour Onboarding Link */}
          <TouchableOpacity
            onPress={() => router.push('/onboarding/welcome')}
            className="flex-row items-center justify-center mt-4">
            <Text className="text-[11px] font-semibold text-gray-400 mr-1">
              New here? View the Guided App Walkthrough
            </Text>
            <Ionicons name="arrow-forward" size={12} color="#9CA3AF" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
