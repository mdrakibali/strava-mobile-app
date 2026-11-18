import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function CreateClubScreen() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [sportType, setSportType] = useState('All Sports');
  const [city, setCity] = useState('Dhaka');
  const [description, setDescription] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);

  const handleCreate = () => {
    if (!name.trim()) {
      alert('Please enter a club name');
      return;
    }
    alert(`Club "${name}" created successfully!`);
    router.back();
  };

  return (
    <SafeAreaView className="flex-1 bg-white justify-between p-6">
      <ScrollView showsVerticalScrollIndicator={false}>
        <View className="flex-row items-center justify-between mb-4">
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="close" size={24} color="#111827" />
          </TouchableOpacity>
          <Text className="text-base font-black text-gray-900">Create Club</Text>
          <TouchableOpacity onPress={handleCreate}>
            <Text className="text-sm font-black text-[#FC4C02]">Create</Text>
          </TouchableOpacity>
        </View>

        <Text className="text-2xl font-black text-gray-900 mb-2">Build Your Crew 🏃‍♀️🚴</Text>
        <Text className="text-xs text-gray-500 mb-6">
          Clubs bring athletes together with dedicated group feeds, weekly mileage leaderboards, and exclusive group workouts.
        </Text>

        <View className="space-y-4 mb-6">
          <View>
            <Text className="text-xs font-bold text-gray-600 mb-1">Club Name</Text>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="e.g. Sunrise Striders Running Club"
              className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-semibold text-gray-900"
            />
          </View>

          <View>
            <Text className="text-xs font-bold text-gray-600 mb-1">Sport Focus</Text>
            <View className="flex-row flex-wrap gap-2">
              {['All Sports', 'Run', 'Ride', 'Trail Run'].map((sport) => (
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

          <View>
            <Text className="text-xs font-bold text-gray-600 mb-1">City / Region</Text>
            <TextInput
              value={city}
              onChangeText={setCity}
              placeholder="e.g. Dhaka, Bangladesh"
              className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-semibold text-gray-900"
            />
          </View>

          <View>
            <Text className="text-xs font-bold text-gray-600 mb-1">Description & Guidelines</Text>
            <TextInput
              value={description}
              onChangeText={setDescription}
              placeholder="Tell athletes about your club schedule, training philosophy, and pace groups..."
              multiline
              numberOfLines={4}
              className="bg-gray-50 border border-gray-200 rounded-xl p-4 text-sm text-gray-900 h-28"
            />
          </View>

          {/* Privacy Switch */}
          <View className="flex-row items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-200">
            <View className="flex-1 mr-3">
              <Text className="text-sm font-bold text-gray-900">Invite-Only Club</Text>
              <Text className="text-xs text-gray-500">Require admin approval for new athletes to join.</Text>
            </View>
            <TouchableOpacity
              onPress={() => setIsPrivate(!isPrivate)}
              className={`w-12 h-7 rounded-full justify-center px-1 ${
                isPrivate ? 'bg-[#FC4C02]' : 'bg-gray-300'
              }`}>
              <View className={`w-5 h-5 rounded-full bg-white shadow-sm ${isPrivate ? 'self-end' : 'self-start'}`} />
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      <TouchableOpacity
        onPress={handleCreate}
        className="w-full py-4 bg-[#FC4C02] rounded-2xl items-center shadow-md">
        <Text className="text-base font-black text-white">Publish Club</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}
