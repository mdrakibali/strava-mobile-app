import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function AddGearScreen() {
  const router = useRouter();
  const [sportType, setSportType] = useState<'Run' | 'Ride'>('Run');
  const [name, setName] = useState('');
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [initialKm, setInitialKm] = useState('0');
  const [maxKm, setMaxKm] = useState('600');
  const [isDefault, setIsDefault] = useState(false);

  const handleSave = () => {
    if (!name.trim()) {
      alert('Please enter a gear nickname');
      return;
    }
    alert(`Gear "${name}" added to your profile!`);
    router.back();
  };

  return (
    <SafeAreaView className="flex-1 bg-white justify-between p-6">
      <ScrollView showsVerticalScrollIndicator={false}>
        <View className="flex-row items-center justify-between mb-4">
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="close" size={24} color="#111827" />
          </TouchableOpacity>
          <Text className="text-base font-black text-gray-900">Add New Gear</Text>
          <TouchableOpacity onPress={handleSave}>
            <Text className="text-sm font-black text-[#FC4C02]">Save</Text>
          </TouchableOpacity>
        </View>

        <Text className="text-2xl font-black text-gray-900 mb-2">Track Mileage & Life 👟</Text>
        <Text className="text-xs text-gray-500 mb-6">
          Track wear and tear on your running shoes or bike components to prevent injury and maintain optimal performance.
        </Text>

        <View className="space-y-4 mb-6">
          {/* Type Selector */}
          <View className="flex-row mb-2">
            <TouchableOpacity
              onPress={() => setSportType('Run')}
              className={`flex-1 py-3 items-center rounded-2xl mr-2 border ${
                sportType === 'Run' ? 'border-[#FC4C02] bg-orange-50' : 'border-gray-200 bg-gray-50'
              }`}>
              <Ionicons name="footsteps-outline" size={22} color={sportType === 'Run' ? '#FC4C02' : '#6B7280'} />
              <Text className={`text-xs font-bold mt-1 ${sportType === 'Run' ? 'text-[#FC4C02]' : 'text-gray-700'}`}>
                Running Shoes
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setSportType('Ride')}
              className={`flex-1 py-3 items-center rounded-2xl ml-2 border ${
                sportType === 'Ride' ? 'border-[#FC4C02] bg-orange-50' : 'border-gray-200 bg-gray-50'
              }`}>
              <Ionicons name="bicycle-outline" size={22} color={sportType === 'Ride' ? '#FC4C02' : '#6B7280'} />
              <Text className={`text-xs font-bold mt-1 ${sportType === 'Ride' ? 'text-[#FC4C02]' : 'text-gray-700'}`}>
                Bicycle / Frame
              </Text>
            </TouchableOpacity>
          </View>

          <View>
            <Text className="text-xs font-bold text-gray-600 mb-1">Nickname</Text>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="e.g. Daily Tempo Road Shoes"
              className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-semibold text-gray-900"
            />
          </View>

          <View className="flex-row space-x-3">
            <View className="flex-1 mr-2">
              <Text className="text-xs font-bold text-gray-600 mb-1">Brand</Text>
              <TextInput
                value={brand}
                onChangeText={setBrand}
                placeholder="e.g. Saucony"
                className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-semibold text-gray-900"
              />
            </View>
            <View className="flex-1 ml-2">
              <Text className="text-xs font-bold text-gray-600 mb-1">Model</Text>
              <TextInput
                value={model}
                onChangeText={setModel}
                placeholder="e.g. Endorphin Speed 4"
                className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-semibold text-gray-900"
              />
            </View>
          </View>

          <View className="flex-row space-x-3">
            <View className="flex-1 mr-2">
              <Text className="text-xs font-bold text-gray-600 mb-1">Starting Distance (km)</Text>
              <TextInput
                value={initialKm}
                onChangeText={setInitialKm}
                keyboardType="numeric"
                className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-semibold text-gray-900"
              />
            </View>
            <View className="flex-1 ml-2">
              <Text className="text-xs font-bold text-gray-600 mb-1">Max Lifespan Alert (km)</Text>
              <TextInput
                value={maxKm}
                onChangeText={setMaxKm}
                keyboardType="numeric"
                className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-semibold text-gray-900"
              />
            </View>
          </View>

          {/* Default Switch */}
          <View className="flex-row items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-200 mt-2">
            <View className="flex-1 mr-3">
              <Text className="text-sm font-bold text-gray-900">Set as Default {sportType}</Text>
              <Text className="text-xs text-gray-500">Automatically assign to new workouts.</Text>
            </View>
            <TouchableOpacity
              onPress={() => setIsDefault(!isDefault)}
              className={`w-12 h-7 rounded-full justify-center px-1 ${
                isDefault ? 'bg-[#FC4C02]' : 'bg-gray-300'
              }`}>
              <View className={`w-5 h-5 rounded-full bg-white shadow-sm ${isDefault ? 'self-end' : 'self-start'}`} />
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      <TouchableOpacity
        onPress={handleSave}
        className="w-full py-4 bg-[#FC4C02] rounded-2xl items-center shadow-md">
        <Text className="text-base font-black text-white">Save Gear</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}
