import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  Alert,
  Image,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useApp } from '../../context/AppContext';

export default function ProfileEditScreen() {
  const router = useRouter();
  const { currentUser } = useApp();

  const [displayName, setDisplayName] = useState(currentUser.displayName || '');
  const [bio, setBio] = useState(currentUser.bio || '');
  const [city, setCity] = useState(currentUser.city || 'Dhaka');
  const [country, setCountry] = useState(currentUser.country || 'Bangladesh');
  const [weightKg, setWeightKg] = useState('68');
  const [maxHr, setMaxHr] = useState('188');

  const handleSave = () => {
    Alert.alert('Profile Updated', 'Your athlete profile details have been updated successfully!', [
      { text: 'OK', onPress: () => router.back() },
    ]);
  };

  return (
    <SafeAreaView className="flex-1 bg-white justify-between p-6">
      <ScrollView showsVerticalScrollIndicator={false}>
        <View className="flex-row items-center justify-between mb-4">
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="close" size={24} color="#111827" />
          </TouchableOpacity>
          <Text className="text-base font-black text-gray-900">Edit Profile</Text>
          <TouchableOpacity onPress={handleSave}>
            <Text className="text-sm font-black text-[#FC4C02]">Save</Text>
          </TouchableOpacity>
        </View>

        {/* Avatar Section */}
        <View className="items-center mb-6">
          <Image
            source={{ uri: currentUser.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400' }}
            className="w-20 h-20 rounded-full border-2 border-[#FC4C02] mb-2 bg-gray-100"
          />
          <TouchableOpacity
            onPress={() => Alert.alert('Avatar', 'Google profile avatar is linked automatically.')}
            className="bg-gray-100 px-3 py-1 rounded-full">
            <Text className="text-xs font-bold text-gray-600">Google Linked Photo</Text>
          </TouchableOpacity>
        </View>

        <View className="space-y-4 mb-6">
          <View>
            <Text className="text-xs font-bold text-gray-600 mb-1">Display Name</Text>
            <TextInput
              value={displayName}
              onChangeText={setDisplayName}
              className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-semibold text-gray-900"
            />
          </View>

          <View>
            <Text className="text-xs font-bold text-gray-600 mb-1">Athlete Bio</Text>
            <TextInput
              value={bio}
              onChangeText={setBio}
              multiline
              numberOfLines={3}
              className="bg-gray-50 border border-gray-200 rounded-xl p-3 text-sm text-gray-900 h-20"
            />
          </View>

          <View className="flex-row space-x-3">
            <View className="flex-1 mr-2">
              <Text className="text-xs font-bold text-gray-600 mb-1">City</Text>
              <TextInput
                value={city}
                onChangeText={setCity}
                className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-semibold text-gray-900"
              />
            </View>
            <View className="flex-1 ml-2">
              <Text className="text-xs font-bold text-gray-600 mb-1">Country</Text>
              <TextInput
                value={country}
                onChangeText={setCountry}
                className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-semibold text-gray-900"
              />
            </View>
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
              <Text className="text-xs font-bold text-gray-600 mb-1">Max HR (bpm)</Text>
              <TextInput
                value={maxHr}
                onChangeText={setMaxHr}
                keyboardType="numeric"
                className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-semibold text-gray-900"
              />
            </View>
          </View>
        </View>
      </ScrollView>

      <TouchableOpacity
        onPress={handleSave}
        className="w-full py-4 bg-[#FC4C02] rounded-2xl items-center shadow-md">
        <Text className="text-base font-black text-white">Save Changes</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}
