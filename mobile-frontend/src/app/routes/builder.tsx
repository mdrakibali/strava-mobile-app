import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { RouteMapPreview } from '../../components/common/RouteMapPreview';

export default function RouteBuilderScreen() {
  const router = useRouter();
  const [mode, setMode] = useState<'loop' | 'manual'>('loop');
  const [routeName, setRouteName] = useState('My Custom Loop');
  const [targetDistanceKm, setTargetDistanceKm] = useState(10);
  const [heading, setHeading] = useState<'North' | 'East' | 'South' | 'West'>('North');
  const [surfacePreference, setSurfacePreference] = useState<'Paved' | 'Gravel' | 'Any'>('Paved');
  const [waypointCount, setWaypointCount] = useState(4);

  const estimatedClimb = Math.round(targetDistanceKm * 6.5);
  const estimatedTimeMins = Math.round(targetDistanceKm * 5.2);

  const handleSaveRoute = () => {
    alert(`Route "${routeName}" (${targetDistanceKm} km) saved to your routes!`);
    router.back();
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      {/* Header */}
      <View className="flex-row items-center justify-between px-4 py-3 bg-white border-b border-gray-200">
        <TouchableOpacity onPress={() => router.back()} className="p-1">
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>
        <Text className="text-base font-black text-gray-900">Route Builder 🗺️</Text>
        <TouchableOpacity onPress={handleSaveRoute} className="p-1">
          <Text className="text-sm font-black text-[#FC4C02]">Save</Text>
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerClassName="pb-24">
        {/* Interactive Map Preview */}
        <View className="p-4 bg-white border-b border-gray-200">
          <RouteMapPreview height={220} />
          <View className="flex-row justify-between items-center mt-3 bg-gray-50 p-3 rounded-xl border border-gray-100">
            <View>
              <Text className="text-[10px] uppercase font-bold text-gray-400">Total Distance</Text>
              <Text className="text-lg font-black text-gray-900">{targetDistanceKm}.0 km</Text>
            </View>
            <View>
              <Text className="text-[10px] uppercase font-bold text-gray-400">Est. Climb</Text>
              <Text className="text-lg font-black text-gray-900">+{estimatedClimb} m</Text>
            </View>
            <View>
              <Text className="text-[10px] uppercase font-bold text-gray-400">Est. Duration</Text>
              <Text className="text-lg font-black text-gray-900">{estimatedTimeMins} min</Text>
            </View>
          </View>
        </View>

        {/* Route Name Input */}
        <View className="bg-white p-4 border-b border-gray-200 mt-3">
          <Text className="text-xs font-bold text-gray-600 mb-1">Route Name</Text>
          <TextInput
            value={routeName}
            onChangeText={setRouteName}
            className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-semibold text-gray-900"
          />
        </View>

        {/* Mode Selector */}
        <View className="flex-row bg-white px-4 py-3 border-b border-gray-200 mt-3">
          <TouchableOpacity
            onPress={() => setMode('loop')}
            className={`flex-1 py-2.5 items-center rounded-xl mr-2 ${
              mode === 'loop' ? 'bg-[#FC4C02]' : 'bg-gray-100'
            }`}>
            <Text className={`text-xs font-black ${mode === 'loop' ? 'text-white' : 'text-gray-700'}`}>
              🔄 Instant Loop Generator
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setMode('manual')}
            className={`flex-1 py-2.5 items-center rounded-xl ml-2 ${
              mode === 'manual' ? 'bg-[#FC4C02]' : 'bg-gray-100'
            }`}>
            <Text className={`text-xs font-black ${mode === 'manual' ? 'text-white' : 'text-gray-700'}`}>
              📍 Custom Waypoints ({waypointCount})
            </Text>
          </TouchableOpacity>
        </View>

        {mode === 'loop' ? (
          <View className="bg-white p-4 border-b border-gray-200 mt-3 space-y-4">
            <Text className="text-xs font-bold text-gray-600 mb-2">Target Loop Distance</Text>
            <View className="flex-row justify-between mb-4">
              {[5, 10, 15, 21, 42].map((km) => (
                <TouchableOpacity
                  key={km}
                  onPress={() => setTargetDistanceKm(km)}
                  className={`px-4 py-2 rounded-xl border ${
                    targetDistanceKm === km
                      ? 'border-[#FC4C02] bg-[#FC4C02]'
                      : 'border-gray-200 bg-gray-50'
                  }`}>
                  <Text className={`text-xs font-bold ${targetDistanceKm === km ? 'text-white' : 'text-gray-700'}`}>
                    {km} km
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text className="text-xs font-bold text-gray-600 mb-2">Heading Direction</Text>
            <View className="flex-row justify-between mb-4">
              {(['North', 'East', 'South', 'West'] as const).map((dir) => (
                <TouchableOpacity
                  key={dir}
                  onPress={() => setHeading(dir)}
                  className={`flex-1 py-2 items-center mx-1 rounded-xl border ${
                    heading === dir
                      ? 'border-[#FC4C02] bg-[#FC4C02]'
                      : 'border-gray-200 bg-gray-50'
                  }`}>
                  <Text className={`text-xs font-bold ${heading === dir ? 'text-white' : 'text-gray-700'}`}>
                    {dir}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text className="text-xs font-bold text-gray-600 mb-2">Surface Preference</Text>
            <View className="flex-row justify-between">
              {(['Paved', 'Gravel', 'Any'] as const).map((surf) => (
                <TouchableOpacity
                  key={surf}
                  onPress={() => setSurfacePreference(surf)}
                  className={`flex-1 py-2 items-center mx-1 rounded-xl border ${
                    surfacePreference === surf
                      ? 'border-[#FC4C02] bg-[#FC4C02]'
                      : 'border-gray-200 bg-gray-50'
                  }`}>
                  <Text className={`text-xs font-bold ${surfacePreference === surf ? 'text-white' : 'text-gray-700'}`}>
                    {surf}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ) : (
          <View className="bg-white p-4 border-b border-gray-200 mt-3">
            <Text className="text-sm font-black text-gray-900 mb-2">Waypoint Path Editor</Text>
            <Text className="text-xs text-gray-500 mb-4">
              Tap anywhere on the map to add road and trail junctions. The router auto-snaps to OSM footpaths.
            </Text>
            <View className="flex-row justify-between">
              <TouchableOpacity
                onPress={() => setWaypointCount(waypointCount + 1)}
                className="flex-1 py-3 bg-orange-50 rounded-xl items-center mr-2 border border-orange-200">
                <Text className="text-xs font-bold text-[#FC4C02]">+ Add Next Waypoint</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setWaypointCount(Math.max(2, waypointCount - 1))}
                className="py-3 px-4 bg-gray-100 rounded-xl items-center">
                <Ionicons name="trash-outline" size={18} color="#EF4444" />
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Action Footer */}
      <View className="absolute bottom-0 left-0 right-0 bg-white p-4 border-t border-gray-200">
        <TouchableOpacity
          onPress={handleSaveRoute}
          className="w-full py-4 bg-[#FC4C02] rounded-2xl items-center shadow-md">
          <Text className="text-base font-black text-white">Save & Follow Route</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

