import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { RouteMapPreview } from '../../components/common/RouteMapPreview';

export default function PersonalHeatmapScreen() {
  const router = useRouter();
  const [selectedSport, setSelectedSport] = useState<'All' | 'Run' | 'Ride'>('All');
  const [mapStyle, setMapStyle] = useState<'Dark' | 'Satellite' | 'Positron'>('Dark');

  return (
    <SafeAreaView className="flex-1 bg-gray-950 justify-between">
      {/* Top Header */}
      <View className="flex-row items-center justify-between px-4 py-3 bg-gray-900 border-b border-gray-800">
        <TouchableOpacity onPress={() => router.back()} className="p-1">
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text className="text-base font-black text-white">Personal Heatmap 🔥</Text>
        <TouchableOpacity onPress={() => alert('Heatmap renders your cumulative GPS traces via WebGL.')} className="p-1">
          <Ionicons name="layers-outline" size={22} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {/* Floating Controls Overlay */}
      <View className="px-4 py-2 flex-row justify-between items-center z-10 bg-gray-900/80">
        {/* Sport Pills */}
        <View className="flex-row space-x-2">
          {(['All', 'Run', 'Ride'] as const).map((sport) => (
            <TouchableOpacity
              key={sport}
              onPress={() => setSelectedSport(sport)}
              className={`px-3 py-1 rounded-full mr-2 ${
                selectedSport === sport ? 'bg-[#FC4C02]' : 'bg-gray-800'
              }`}>
              <Text className="text-xs font-bold text-white">{sport}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Style Selector */}
        <View className="flex-row bg-gray-800 rounded-full p-0.5">
          {(['Dark', 'Positron'] as const).map((style) => (
            <TouchableOpacity
              key={style}
              onPress={() => setMapStyle(style)}
              className={`px-2.5 py-1 rounded-full ${
                mapStyle === style ? 'bg-gray-700' : 'bg-transparent'
              }`}>
              <Text className="text-[10px] font-bold text-gray-300">{style}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Heatmap Area */}
      <View className="flex-1 mx-4 my-2 rounded-3xl overflow-hidden border border-gray-800">
        <RouteMapPreview height={440} />
      </View>

      {/* Bottom Summary Bar */}
      <View className="p-4 bg-gray-900 border-t border-gray-800">
        <View className="flex-row justify-between items-center mb-2">
          <Text className="text-xs font-bold text-gray-400">Total Traces Rendered</Text>
          <Text className="text-sm font-black text-[#FC4C02]">48 Workouts · 412 km</Text>
        </View>
        <Text className="text-[11px] text-gray-500 leading-4">
          Luminous lines indicate frequently traversed routes and segments in Dhaka metropolitan region.
        </Text>
      </View>
    </SafeAreaView>
  );
}

