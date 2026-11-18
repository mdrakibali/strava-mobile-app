import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function ProfileSetupScreen() {
  const router = useRouter();
  const [displayName, setDisplayName] = useState('Rakib Ahmed');
  const [username, setUsername] = useState('rakib.runner');
  const [city, setCity] = useState('Dhaka');
  const [weightKg, setWeightKg] = useState('68');
  const [heightCm, setHeightCm] = useState('175');
  const [maxHr, setMaxHr] = useState('188');

  return (
    <SafeAreaView className="flex-1 bg-white justify-between p-6">
      <ScrollView showsVerticalScrollIndicator={false}>
        <TouchableOpacity onPress={() => router.back()} className="mb-4">
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>

        <Text className="text-2xl font-black text-gray-900 mb-2">
          Setup Athlete Profile
        </Text>
        <Text className="text-xs text-gray-500 mb-6">
          Your metrics calculate accurate calorie burn, power estimation, and cardiovascular Relative Effort.
        </Text>

        <View className="items-center mb-6">
          <View className="w-20 h-20 rounded-full bg-orange-100 items-center justify-center border-2 border-[#FC4C02] mb-2">
            <Ionicons name="person" size={40} color="#FC4C02" />
          </View>
          <TouchableOpacity className="bg-gray-100 px-3 py-1 rounded-full">
            <Text className="text-[11px] font-bold text-gray-600">Change Avatar</Text>
          </TouchableOpacity>
        </View>

        <View className="space-y-4 mb-6">
          <View>
            <Text className="text-xs font-bold text-gray-600 mb-1">Display Name</Text>
            <TextInput
              value={displayName}
              onChangeText={setDisplayName}
              className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-semibold text-gray-900"
              placeholder="e.g. John Doe"
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
            <Text className="text-[10px] text-gray-400 mt-1">Formula default: 220 minus age.</Text>
          </View>
        </View>
      </ScrollView>

      <TouchableOpacity
        onPress={() => router.push('/onboarding/permissions')}
        className="w-full py-4 bg-[#FC4C02] rounded-2xl items-center shadow-md mt-4">
        <Text className="text-base font-black text-white">Next: Permissions & Privacy</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

