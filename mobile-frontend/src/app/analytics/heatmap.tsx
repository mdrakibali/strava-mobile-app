import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MapStyleKey, StravaMapView } from '../../components/map/StravaMapView';
import { useApp } from '../../context/AppContext';

export default function PersonalHeatmapScreen() {
  const router = useRouter();
  const { activities } = useApp();
  const [selectedSport, setSelectedSport] = useState<'All' | 'Run' | 'Ride'>('All');
  const [mapStyle, setMapStyle] = useState<MapStyleKey>('liberty');

  // Filter user activities by sport and aggregate all polyline coordinates
  const filteredActivities = activities.filter((act) => {
    if (selectedSport === 'All') return true;
    return act.sportType === selectedSport;
  });

  const heatmapCoords: [number, number][] = filteredActivities.flatMap((act) => {
    if (!act.routePoints || !Array.isArray(act.routePoints)) return [];
    return act.routePoints.map((p: any) => [p.longitude, p.latitude] as [number, number]);
  });

  // No invented default: with no recorded points the map simply shows the empty state below.
  const centerCoord: [number, number] | undefined = heatmapCoords.length > 0 ? heatmapCoords[0] : undefined;

  return (
    <SafeAreaView className="flex-1 bg-stone-950 justify-between">
      {/* Top Header */}
      <View className="flex-row items-center justify-between px-4 py-3 bg-stone-900 border-b border-stone-800 z-30">
        <TouchableOpacity onPress={() => router.back()} className="p-1">
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text className="text-base font-black text-white">Personal Heatmap</Text>
        <TouchableOpacity
          onPress={() =>
            alert(
              'Your Personal Heatmap aggregates real GPS polylines from your completed workouts stored in Neon PostgreSQL.'
            )
          }
          className="p-1">
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
          {(['liberty', 'positron'] as const).map((style) => (
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

      {/* Interactive Map */}
      <View className="flex-1 w-full bg-stone-900 relative">
        <StravaMapView
          centerCoordinate={centerCoord}
          zoomLevel={13}
          styleKey={mapStyle}
          routeCoordinates={heatmapCoords}
        />

        {heatmapCoords.length === 0 && (
          <View className="absolute inset-0 bg-stone-950/70 items-center justify-center p-6">
            <View className="bg-stone-900 p-6 rounded-3xl border border-stone-800 items-center max-w-xs">
              <Ionicons name="flame-outline" size={40} color="#FC4C02" />
              <Text className="text-base font-black text-white text-center mt-3">
                No Heatmap Data Yet
              </Text>
              <Text className="text-xs text-stone-400 text-center mt-1 mb-4 leading-relaxed">
                Record your outdoor runs or rides to watch your personal heat tracks illuminate the
                globe.
              </Text>
              <TouchableOpacity
                onPress={() => router.push('/record')}
                className="px-5 py-2.5 bg-[#FC4C02] rounded-full">
                <Text className="text-xs font-bold text-white">Record an Activity</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>

      {/* Heatmap Stats Footer */}
      <View className="bg-stone-900 border-t border-stone-800 p-4 flex-row justify-around">
        <View className="items-center">
          <Text className="text-lg font-black text-white">{filteredActivities.length}</Text>
          <Text className="text-[10px] text-stone-400 uppercase font-bold">Activities</Text>
        </View>
        <View className="items-center">
          <Text className="text-lg font-black text-white">
            {(
              filteredActivities.reduce((acc, a) => acc + a.distanceMeters, 0) / 1000
            ).toFixed(1)}{' '}
            km
          </Text>
          <Text className="text-[10px] text-stone-400 uppercase font-bold">Distance</Text>
        </View>
        <View className="items-center">
          <Text className="text-lg font-black text-[#FC4C02]">{heatmapCoords.length}</Text>
          <Text className="text-[10px] text-stone-400 uppercase font-bold">GPS Points</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}
