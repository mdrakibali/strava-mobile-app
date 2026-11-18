import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  SafeAreaView,
  ScrollView,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

export default function PrivacySettingsScreen() {
  const router = useRouter();

  const [privacyZones, setPrivacyZones] = useState([
    { id: 'pz_1', name: 'Home (House 12, Banani)', radiusMeters: 500, active: true },
    { id: 'pz_2', name: 'Office (Tech Hub, Gulshan)', radiusMeters: 300, active: true },
  ]);

  const [beaconEnabled, setBeaconEnabled] = useState(true);
  const [emergencyPhone, setEmergencyPhone] = useState('+880 1712-345678');
  const [newZoneName, setNewZoneName] = useState('');

  const toggleZone = (id: string) => {
    setPrivacyZones((prev) =>
      prev.map((z) => (z.id === id ? { ...z, active: !z.active } : z))
    );
  };

  const handleAddZone = () => {
    if (newZoneName.trim()) {
      setPrivacyZones((prev) => [
        ...prev,
        { id: `pz_${Date.now()}`, name: newZoneName.trim(), radiusMeters: 500, active: true },
      ]);
      setNewZoneName('');
    }
  };

  const handleDeleteZone = (id: string) => {
    setPrivacyZones((prev) => prev.filter((z) => z.id !== id));
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      {/* Top Header */}
      <View className="flex-row justify-between items-center bg-white px-3 py-2 border-b border-gray-200">
        <TouchableOpacity onPress={() => router.back()} className="p-1">
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>
        <Text className="text-sm font-bold text-gray-900">Privacy & Safety Controls</Text>
        <View className="w-6" />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 60 }}>
        {/* Privacy Zones Section */}
        <View className="bg-white p-4 border-b border-gray-200 mt-2">
          <View className="flex-row items-center gap-2 mb-2">
            <Ionicons name="shield-checkmark" size={20} color="#FC4C02" />
            <Text className="text-base font-bold text-gray-900">Privacy Zones (Start/End Masking)</Text>
          </View>
          <Text className="text-xs text-gray-500 leading-5 mb-4">
            Coordinates inside these zones are clipped server-side before activities are shown publicly.
            Your exact home or workplace location is never exposed in API feeds.
          </Text>

          {/* List of active zones */}
          <View className="gap-2 mb-4">
            {privacyZones.map((zone) => (
              <View
                key={zone.id}
                className="flex-row justify-between items-center p-3 rounded-xl border border-gray-200 bg-gray-50">
                <View className="flex-1 mr-2">
                  <Text className="text-xs font-bold text-gray-900">{zone.name}</Text>
                  <Text className="text-[10px] text-gray-400 mt-0.5">
                    Radius: {zone.radiusMeters}m · {zone.active ? 'Active' : 'Disabled'}
                  </Text>
                </View>

                <View className="flex-row items-center gap-2">
                  <Switch
                    value={zone.active}
                    onValueChange={() => toggleZone(zone.id)}
                    trackColor={{ false: '#E5E7EB', true: '#FC4C02' }}
                  />
                  <TouchableOpacity onPress={() => handleDeleteZone(zone.id)} className="p-1">
                    <Ionicons name="trash-outline" size={18} color="#EF4444" />
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>

          {/* Add New Zone */}
          <View className="flex-row gap-2">
            <TextInput
              className="flex-1 h-10 bg-gray-50 border border-gray-200 rounded-lg px-3 text-xs text-gray-900"
              placeholder="e.g. Partner's House, School..."
              placeholderTextColor="#9CA3AF"
              value={newZoneName}
              onChangeText={setNewZoneName}
            />
            <TouchableOpacity
              className="bg-[#FC4C02] px-3.5 h-10 rounded-lg items-center justify-center"
              onPress={handleAddZone}>
              <Text className="text-xs font-bold text-white">+ Add Zone</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Beacon Live Safety Section */}
        <View className="bg-white p-4 border-y border-gray-200 mt-3">
          <View className="flex-row items-center gap-2 mb-2">
            <Ionicons name="radio" size={20} color="#10B981" />
            <Text className="text-base font-bold text-gray-900">Beacon Live Safety Tracking</Text>
          </View>
          <Text className="text-xs text-gray-500 leading-5 mb-4">
            Strava charges for this, but our app provides Beacon 100% free. Generates a secure spectator
            URL allowing family or friends to follow your live GPS trail and battery in real time.
          </Text>

          <View className="flex-row justify-between items-center bg-gray-50 p-3 rounded-lg border border-gray-200 mb-3">
            <View className="flex-1 mr-3">
              <Text className="text-xs font-bold text-gray-900">Broadcast Beacon During Workouts</Text>
              <Text className="text-[10px] text-gray-400 mt-0.5">
                Automatically activates when you start recording.
              </Text>
            </View>
            <Switch
              value={beaconEnabled}
              onValueChange={setBeaconEnabled}
              trackColor={{ false: '#E5E7EB', true: '#10B981' }}
            />
          </View>

          <View className="gap-1 mb-3">
            <Text className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">
              EMERGENCY CONTACT PHONE / SMS
            </Text>
            <TextInput
              className="bg-gray-50 border border-gray-200 rounded-lg px-3.5 py-2.5 text-xs text-gray-900"
              value={emergencyPhone}
              onChangeText={setEmergencyPhone}
            />
          </View>

          <TouchableOpacity className="bg-gray-100 p-3 rounded-lg border border-gray-200 flex-row items-center justify-center">
            <Ionicons name="link-outline" size={14} color="#374151" />
            <Text className="text-xs font-semibold text-gray-700 ml-1.5">
              Test Spectator Web Link (Demo Token)
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

