import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

export default function LoginScreen() {
  const router = useRouter();
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('rakib.runner@example.com');
  const [password, setPassword] = useState('••••••••');

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
              Free-Tier Athletic Tracking & Social Community
            </Text>
          </View>

          {/* Form */}
          <View className="gap-3 mb-6">
            <View className="gap-1">
              <Text className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                EMAIL ADDRESS
              </Text>
              <TextInput
                className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900"
                placeholder="athlete@example.com"
                placeholderTextColor="#9CA3AF"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            <View className="gap-1">
              <Text className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                PASSWORD
              </Text>
              <TextInput
                className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900"
                placeholder="••••••••"
                placeholderTextColor="#9CA3AF"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
              />
            </View>

            <TouchableOpacity
              className="bg-[#FC4C02] h-12 rounded-xl items-center justify-center shadow-md mt-2"
              onPress={handleSubmit}
              activeOpacity={0.85}>
              <Text className="text-sm font-bold text-white tracking-wider">
                {isRegister ? 'CREATE ATHLETE ACCOUNT' : 'LOG IN'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              className="bg-gray-100 h-12 rounded-xl items-center justify-center border border-gray-200 mt-1"
              onPress={handleSubmit}
              activeOpacity={0.75}>
              <Text className="text-xs font-semibold text-gray-700">
                Continue as Guest / Demo Athlete →
              </Text>
            </TouchableOpacity>
          </View>

          {/* Toggle between Login and Register */}
          <TouchableOpacity
            className="items-center"
            onPress={() => setIsRegister(!isRegister)}>
            <Text className="text-xs text-gray-500">
              {isRegister ? 'Already have an account? ' : "Don't have an account? "}
              <Text className="font-bold text-[#FC4C02]">
                {isRegister ? 'Log In' : 'Sign Up Free'}
              </Text>
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
