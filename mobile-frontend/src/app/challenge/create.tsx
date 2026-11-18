import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function CreateChallengeScreen() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [sportType, setSportType] = useState('Run');
  const [targetKm, setTargetKm] = useState('100');
  const [duration, setDuration] = useState('1 Month');
  const [description, setDescription] = useState('');

  const handleCreate = () => {
    if (!title.trim()) {
      alert('Please enter a challenge title');
      return;
    }
    alert(`Challenge "${title}" created and open for athletes!`);
    router.back();
  };

  return (
    <SafeAreaView className="flex-1 bg-white justify-between p-6">
      <ScrollView showsVerticalScrollIndicator={false}>
        <View className="flex-row items-center justify-between mb-4">
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="close" size={24} color="#111827" />
          </TouchableOpacity>
          <Text className="text-base font-black text-gray-900">Create Challenge</Text>
          <TouchableOpacity onPress={handleCreate}>
            <Text className="text-sm font-black text-[#FC4C02]">Create</Text>
          </TouchableOpacity>
        </View>

        <Text className="text-2xl font-black text-gray-900 mb-2">Launch a Challenge</Text>
        <Text className="text-xs text-gray-500 mb-6">
          Set a collective distance or elevation goal for your friends and club members to conquer together.
        </Text>

        <View className="space-y-4 mb-6">
          <View>
            <Text className="text-xs font-bold text-gray-600 mb-1">Challenge Title</Text>
            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder="e.g. December 100k Winter Base Challenge"
              className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-semibold text-gray-900"
            />
          </View>

          <View>
            <Text className="text-xs font-bold text-gray-600 mb-1">Sport Type</Text>
            <View className="flex-row gap-2">
              {['Run', 'Ride', 'Trail Run', 'Walk'].map((sport) => (
                <TouchableOpacity
                  key={sport}
                  onPress={() => setSportType(sport)}
                  className={`px-4 py-2 rounded-xl border ${
                    sportType === sport
                      ? 'border-[#FC4C02] bg-[#FC4C02]'
                      : 'border-gray-200 bg-gray-50'
                  }`}>
                  <Text className={`text-xs font-bold ${sportType === sport ? 'text-white' : 'text-gray-700'}`}>
                    {sport}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View className="flex-row space-x-3">
            <View className="flex-1 mr-2">
              <Text className="text-xs font-bold text-gray-600 mb-1">Target Distance (km)</Text>
              <TextInput
                value={targetKm}
                onChangeText={setTargetKm}
                keyboardType="numeric"
                className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-semibold text-gray-900"
              />
            </View>
            <View className="flex-1 ml-2">
              <Text className="text-xs font-bold text-gray-600 mb-1">Timeframe</Text>
              <TextInput
                value={duration}
                onChangeText={setDuration}
                className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-semibold text-gray-900"
              />
            </View>
          </View>

          <View>
            <Text className="text-xs font-bold text-gray-600 mb-1">Description & Motivation</Text>
            <TextInput
              value={description}
              onChangeText={setDescription}
              placeholder="Describe the challenge rules, milestone tips, and inspiration..."
              multiline
              numberOfLines={4}
              className="bg-gray-50 border border-gray-200 rounded-xl p-4 text-sm text-gray-900 h-28"
            />
          </View>
        </View>
      </ScrollView>

      <TouchableOpacity
        onPress={handleCreate}
        className="w-full py-4 bg-[#FC4C02] rounded-2xl items-center shadow-md">
        <Text className="text-base font-black text-white">Publish Challenge</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

