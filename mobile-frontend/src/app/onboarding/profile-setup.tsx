import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

export default function ProfileSetupScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('rakib.runner');
  const [city, setCity] = useState('');
  const [weightKg, setWeightKg] = useState('68');
  const [heightCm, setHeightCm] = useState('175');
  const [maxHr, setMaxHr] = useState('188');

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={{ flexGrow: 1 }}
          showsVerticalScrollIndicator={false}
          style={{ flex: 1 }}
          className="px-6 pt-2 pb-6">
          
          <TouchableOpacity onPress={() => router.back()} className="p-1 mb-3 self-start">
            <Ionicons name="arrow-back" size={24} color="#111827" />
          </TouchableOpacity>

          <Text className="text-2xl font-black text-gray-900 mb-1">
            Setup Athlete Profile
          </Text>
          <Text className="text-xs text-gray-500 mb-5 leading-4">
            Your metrics calculate accurate calorie burn, power estimation, and cardiovascular Relative Effort.
          </Text>

          {/* Avatar Icon */}
          <View className="items-center mb-5">
            <View className="w-18 h-18 rounded-full bg-orange-100 items-center justify-center border-2 border-[#FC4C02] mb-2">
              <Ionicons name="person" size={36} color="#FC4C02" />
            </View>
            <TouchableOpacity className="bg-gray-100 px-3 py-1 rounded-full">
              <Text className="text-[11px] font-bold text-gray-600">Change Avatar</Text>
            </TouchableOpacity>
          </View>

          {/* Form Fields */}
          <View className="space-y-3.5 mb-6">
            <View>
              <Text className="text-xs font-bold text-gray-600 mb-1">Display Name</Text>
              <TextInput
                value={displayName}
                onChangeText={setDisplayName}
                className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-semibold text-gray-900"
                placeholder="Your name"
              />
            </View>

            <View>
              <Text className="text-xs font-bold text-gray-600 mb-1">Athlete Handle</Text>
              <TextInput
                value={username}
                onChangeText={setUsername}
                className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-semibold text-gray-900"
                placeholder="@username"
                autoCapitalize="none"
              />
            </View>

            <View>
              <Text className="text-xs font-bold text-gray-600 mb-1">City / Region</Text>
              <TextInput
                value={city}
                onChangeText={setCity}
                className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-semibold text-gray-900"
                placeholder="e.g. London, UK"
              />
            </View>

            <View className="flex-row space-x-3">
              <View className="flex-1 mr-2">
                <Text className="text-xs font-bold text-gray-600 mb-1">Weight (kg)</Text>
                <TextInput
                  value={weightKg}
                  onChangeText={setWeightKg}
                  keyboardType="numeric"
                  className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-semibold text-gray-900"
                />
              </View>

              <View className="flex-1 ml-2">
                <Text className="text-xs font-bold text-gray-600 mb-1">Height (cm)</Text>
                <TextInput
                  value={heightCm}
                  onChangeText={setHeightCm}
                  keyboardType="numeric"
                  className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-semibold text-gray-900"
                />
              </View>
            </View>

            <View>
              <Text className="text-xs font-bold text-gray-600 mb-1">Estimated Max Heart Rate (bpm)</Text>
              <TextInput
                value={maxHr}
                onChangeText={setMaxHr}
                keyboardType="numeric"
                className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-semibold text-gray-900"
              />
            </View>
          </View>

          {/* Continue Button */}
          <View className="mt-auto pt-4" style={{ paddingBottom: Math.max(insets.bottom, 12) }}>
            <TouchableOpacity
              onPress={() => router.push('/onboarding/permissions')}
              activeOpacity={0.85}
              className="w-full py-4 bg-primary rounded-full items-center justify-center shadow-lg">
              <Text className="text-base font-black text-white">Next: Permissions</Text>
            </TouchableOpacity>
          </View>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
