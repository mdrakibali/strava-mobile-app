import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ElevationChart } from '../../components/common/ElevationChart';
import { RouteMapPreview } from '../../components/common/RouteMapPreview';
import { StatBox } from '../../components/common/StatBox';
import { MOCK_ROUTES } from '../../mock/data';

export default function RouteDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const route = MOCK_ROUTES.find((r) => r.id === id) || MOCK_ROUTES[0];
  const [isSaved, setIsSaved] = useState(route.isSaved);

  const distKm = (route.distanceMeters / 1000).toFixed(1);
  const timeHours = (route.estimatedTimeSeconds / 3600).toFixed(1);

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      {/* Top Header */}
      <View className="flex-row items-center justify-between px-4 py-3 bg-white border-b border-gray-200">
        <TouchableOpacity onPress={() => router.back()} className="p-1">
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>
        <Text className="text-base font-black text-gray-900 flex-1 text-center mx-2" numberOfLines={1}>
          {route.name}
        </Text>
        <TouchableOpacity onPress={() => setIsSaved(!isSaved)} className="p-1">
          <Ionicons
            name={isSaved ? 'bookmark' : 'bookmark-outline'}
            size={22}
            color={isSaved ? '#FC4C02' : '#111827'}
          />
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        className="flex-1"
        contentContainerClassName="pb-28">
        {/* Map Preview */}
        <View className="p-4 bg-white border-b border-gray-200">
          <RouteMapPreview height={200} />
          <View className="flex-row justify-between items-center mt-3">
            <View className="flex-row items-center">
              <View className="bg-orange-50 px-2.5 py-1 rounded-full mr-2">
                <Text className="text-xs font-bold text-[#FC4C02]">{route.sportType}</Text>
              </View>
              <View className="bg-gray-100 px-2.5 py-1 rounded-full">
                <Text className="text-xs font-bold text-gray-700">{route.climbCategory}</Text>
              </View>
            </View>
            <Text className="text-xs text-gray-400 font-medium">By {route.authorName}</Text>
          </View>
        </View>

        {/* Stats Grid */}
        <View className="flex-row justify-between bg-white px-4 py-3 border-b border-gray-200">
          <StatBox label="Distance" value={`${distKm} km`} />
          <StatBox label="Elevation Gain" value={`${route.elevationGainMeters} m`} />
          <StatBox label="Est. Moving Time" value={`${timeHours} hrs`} />
        </View>

        {/* Surface Breakdown */}
        <View className="bg-white p-4 border-b border-gray-200 mt-3">
          <Text className="text-sm font-black text-gray-900 mb-2">Surface Composition</Text>
          <View className="h-2.5 bg-gray-100 rounded-full flex-row overflow-hidden mb-2">
            <View style={{ width: `${route.surfacePavedPercent}%` }} className="bg-gray-800" />
            <View style={{ width: `${route.surfaceGravelPercent}%` }} className="bg-amber-600" />
            <View style={{ width: `${route.surfaceDirtPercent}%` }} className="bg-emerald-600" />
          </View>
          <View className="flex-row justify-between">
            <Text className="text-xs font-semibold text-gray-700">● Paved {route.surfacePavedPercent}%</Text>
            <Text className="text-xs font-semibold text-amber-700">● Gravel {route.surfaceGravelPercent}%</Text>
            <Text className="text-xs font-semibold text-emerald-700">● Trail {route.surfaceDirtPercent}%</Text>
          </View>
        </View>

        {/* Elevation Profile */}
        <View className="bg-white p-4 border-b border-gray-200 mt-3">
          <Text className="text-sm font-black text-gray-900 mb-2">Elevation Profile</Text>
          <ElevationChart />
        </View>

        {/* Turn-by-Turn Cue Sheet */}
        <View className="bg-white p-4 border-b border-gray-200 mt-3">
          <Text className="text-sm font-black text-gray-900 mb-3">Cue Sheet ({route.turns.length} turns)</Text>
          {route.turns.map((turn, index) => (
            <View key={turn.id} className="flex-row items-center py-2.5 border-b border-gray-100">
              <View className="w-8 h-8 rounded-full bg-orange-50 items-center justify-center mr-3">
                <Ionicons name={turn.iconName} size={16} color="#FC4C02" />
              </View>
              <View className="flex-1">
                <Text className="text-xs font-bold text-gray-900">{turn.instruction}</Text>
                <Text className="text-[10px] text-gray-400 mt-0.5">
                  {(turn.distanceFromStartMeters / 1000).toFixed(1)} km from start
                </Text>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>

      {/* Bottom Sticky Action Bar */}
      <View className="absolute bottom-0 left-0 right-0 bg-white p-4 border-t border-gray-200 flex-row space-x-3">
        <TouchableOpacity
          onPress={() => router.push('/routes/navigation')}
          className="flex-1 py-3.5 bg-[#FC4C02] rounded-2xl items-center shadow-md mr-2">
          <Text className="text-sm font-black text-white">Start Navigation 🧭</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => alert('Route exported as GPX file')}
          className="px-4 py-3.5 bg-gray-100 rounded-2xl items-center justify-center">
          <Ionicons name="download-outline" size={20} color="#374151" />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

