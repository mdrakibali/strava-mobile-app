import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  SafeAreaView,
  ScrollView,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { api } from '../../services/api';

export default function PrivacySettingsScreen() {
  const router = useRouter();

  const [privacyZones, setPrivacyZones] = useState<any[]>([]);
  const [isLoadingZones, setIsLoadingZones] = useState(true);
  const [beaconEnabled, setBeaconEnabled] = useState(true);
  const [emergencyPhone, setEmergencyPhone] = useState('+880 1712-345678');
  const [newZoneName, setNewZoneName] = useState('');
  const [isAddingZone, setIsAddingZone] = useState(false);
  const [spectatorUrl, setSpectatorUrl] = useState<string | null>(null);

  const fetchPrivacyZones = async () => {
    setIsLoadingZones(true);
    try {
      const res = await api.privacyZones.list();
      if (res?.privacyZones) {
        setPrivacyZones(res.privacyZones);
      }
    } catch (err) {
      console.warn('Failed to load privacy zones:', err);
    } finally {
      setIsLoadingZones(false);
    }
  };

  useEffect(() => {
    fetchPrivacyZones();
  }, []);

  const handleAddZone = async () => {
    if (!newZoneName.trim()) {
      Alert.alert('Missing Field', 'Please enter a name for the privacy zone');
      return;
    }

    setIsAddingZone(true);
    try {
      // Default to Banani / Dhaka coords for demo or current GPS coords
      const res = await api.privacyZones.create({
        name: newZoneName.trim(),
        latitude: 23.7808,
        longitude: 90.4200,
        radiusMeters: 500,
      });

      if (res?.privacyZone) {
        setPrivacyZones((prev) => [...prev, res.privacyZone]);
      }
      setNewZoneName('');
      Alert.alert('Privacy Zone Saved', 'Any activity starting or ending within 500m will be clipped automatically.');
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Could not create privacy zone');
    } finally {
      setIsAddingZone(false);
    }
  };

  const handleDeleteZone = (id: string) => {
    Alert.alert('Delete Privacy Zone?', 'Activities will no longer mask coordinates around this location.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          setPrivacyZones((prev) => prev.filter((z) => z.id !== id));
          try {
            await api.privacyZones.delete(id);
          } catch (err) {
            console.warn('Failed to delete privacy zone:', err);
          }
        },
      },
    ]);
  };

  const handleTestBeacon = async () => {
    try {
      const res = await api.beacon.start('Run');
      if (res?.token) {
        const url = `https://open-strava-backend.rakib2020-tkg.workers.dev/api/v1/beacon/${res.token}`;
        setSpectatorUrl(url);
        Alert.alert(
          'Live Beacon Generated!',
          `Live spectator link created:\n${url}\n\nFamily/friends can open this link to track your live position in real-time.`
        );
      }
    } catch (err: any) {
      Alert.alert('Beacon Error', err.message || 'Could not start live beacon');
    }
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
          {isLoadingZones ? (
            <View className="py-6 items-center">
              <ActivityIndicator size="small" color="#FC4C02" />
              <Text className="text-xs text-gray-400 mt-2">Loading privacy zones...</Text>
            </View>
          ) : privacyZones.length === 0 ? (
            <View className="bg-gray-50 p-4 rounded-xl border border-gray-200 mb-4 items-center">
              <Text className="text-xs text-gray-500 italic">
                No privacy zones added yet. Add your home or office below to mask your location.
              </Text>
            </View>
          ) : (
            <View className="gap-2 mb-4">
              {privacyZones.map((zone) => (
                <View
                  key={zone.id}
                  className="flex-row justify-between items-center p-3 rounded-xl border border-gray-200 bg-gray-50">
                  <View className="flex-1 mr-2">
                    <Text className="text-xs font-bold text-gray-900">{zone.name}</Text>
                    <Text className="text-[10px] text-gray-400 mt-0.5">
                      Radius: {zone.radiusMeters || 500}m · {zone.isActive !== false ? 'Active' : 'Disabled'}
                    </Text>
                  </View>

                  <View className="flex-row items-center gap-2">
                    <TouchableOpacity onPress={() => handleDeleteZone(zone.id)} className="p-1">
                      <Ionicons name="trash-outline" size={18} color="#EF4444" />
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          )}

          {/* Add New Zone */}
          <View className="flex-row gap-2">
            <TextInput
              className="flex-1 h-10 bg-gray-50 border border-gray-200 rounded-lg px-3 text-xs text-gray-900"
              placeholder="e.g. Home (House 12, Banani), Office..."
              placeholderTextColor="#9CA3AF"
              value={newZoneName}
              onChangeText={setNewZoneName}
            />
            <TouchableOpacity
              disabled={isAddingZone}
              className={`bg-[#FC4C02] px-3.5 h-10 rounded-lg items-center justify-center ${
                isAddingZone ? 'opacity-60' : ''
              }`}
              onPress={handleAddZone}>
              {isAddingZone ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text className="text-xs font-bold text-white">+ Add Zone</Text>
              )}
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

          <TouchableOpacity
            onPress={handleTestBeacon}
            className="bg-gray-100 p-3 rounded-lg border border-gray-200 flex-row items-center justify-center">
            <Ionicons name="link-outline" size={14} color="#374151" />
            <Text className="text-xs font-semibold text-gray-700 ml-1.5">
              Test Spectator Web Link (Generate Live Token)
            </Text>
          </TouchableOpacity>

          {spectatorUrl && (
            <View className="mt-3 p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
              <Text className="text-[11px] font-bold text-emerald-800 mb-1">Active Spectator URL:</Text>
              <Text className="text-[10px] text-emerald-700 font-mono select-all" numberOfLines={2}>
                {spectatorUrl}
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
