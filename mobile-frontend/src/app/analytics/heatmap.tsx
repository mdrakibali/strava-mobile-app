import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MapStyleKey, StravaMapView } from '../../components/map/StravaMapView';
import { MOCK_ROUTES } from '../../mock/data';

export default function PersonalHeatmapScreen() {
  const router = useRouter();
  const [selectedSport, setSelectedSport] = useState<'All' | 'Run' | 'Ride'>('All');
  const [mapStyle, setMapStyle] = useState<MapStyleKey>('dark');

  // Combine all route points into heat traces
  const heatmapCoords = MOCK_ROUTES.flatMap((r) =>
    r.polylinePoints.map((p) => [p.longitude, p.latitude] as [number, number])
  );

  return (
    <SafeAreaView className="flex-1 bg-stone-950 justify-between">
      {/* Top Header */}
      <View className="flex-row items-center justify-between px-4 py-3 bg-stone-900 border-b border-stone-800 z-30">
        <TouchableOpacity onPress={() => router.back()} className="p-1">
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text className="text-base font-black text-white">Personal Heatmap</Text>
        <TouchableOpacity onPress={() => alert('Cumulative GPS coordinates rendered via vector GPU shaders.')} className="p-1">
          <Ionicons name="information-circle-outline" size={22} color="#9CA3AF" />
        </TouchableOpacity>
      </View>

      {/* Floating Controls Overlay */}
      <View className="px-4 py-2 flex-row justify-between items-center z-20 bg-stone-900/90 border-b border-stone-800">
        {/* Sport Pills */}
        <View className="flex-row">
          {(['All', 'Run', 'Ride'] as const).map((sport) => (
            <TouchableOpacity
              key={sport}
              onPress={() => setSelectedSport(sport)}
              className={`px-3 py-1 rounded-full mr-2 ${
                selectedSport === sport ? 'bg-[#FC4C02]' : 'bg-stone-800'
              }`}>
              <Text className="text-xs font-bold text-white">{sport}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Style Selector */}
        <View className="flex-row bg-stone-800 rounded-full p-0.5">
          {(['dark', 'positron'] as const).map((style) => (
            <TouchableOpacity
              key={style}
              onPress={() => setMapStyle(style)}
              className={`px-3 py-1 rounded-full ${
                mapStyle === style ? 'bg-[#FC4C02]' : 'bg-transparent'
              }`}>
              <Text className="text-[10px] font-black text-white capitalize">{style}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Real Full-Screen MapLibre Heatmap Area */}
      <View className="flex-1 relative">
        <StravaMapView
          styleKey={mapStyle}
          routeCoordinates={heatmapCoords}
          showControls={true}
          showUserLocation={true}
          className="w-full h-full"
        />
      </View>

      {/* Bottom Summary Bar */}
      <View className="p-4 bg-stone-900 border-t border-stone-800 z-30">
        <View className="flex-row justify-between items-center mb-1">
          <Text className="text-xs font-bold text-gray-400">Total Traces Illuminated</Text>
          <Text className="text-sm font-black text-[#FC4C02]">48 Activities · 412.5 km</Text>
        </View>
        <Text className="text-[11px] text-gray-500 leading-4">
          Luminous orange lines indicate frequently traversed routes and segments in Dhaka metropolitan region.
        </Text>
      </View>
    </SafeAreaView>
  );
}
