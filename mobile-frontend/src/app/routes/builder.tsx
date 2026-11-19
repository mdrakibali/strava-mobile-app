import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { Alert, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StravaMapView } from '../../components/map/StravaMapView';
import { api } from '../../services/api';

const generateGeographicLoop = (
  centerLon: number,
  centerLat: number,
  distanceKm: number,
  heading: string
): [number, number][] => {
  const points: [number, number][] = [];
  const radius = (distanceKm / (2 * Math.PI)) * 0.009;
  const offsets: Record<string, number> = {
    North: Math.PI / 2,
    East: 0,
    South: -Math.PI / 2,
    West: Math.PI,
  };
  const baseAngle = offsets[heading] || 0;
  const steps = 16;
  for (let i = 0; i <= steps; i++) {
    const theta = baseAngle + (i / steps) * 2 * Math.PI;
    const lon = centerLon + radius * Math.cos(theta) * 1.15;
    const lat = centerLat + radius * Math.sin(theta);
    points.push([+lon.toFixed(5), +lat.toFixed(5)]);
  }
  return points;
};

export default function RouteBuilderScreen() {
  const router = useRouter();
  const [mode, setMode] = useState<'loop' | 'manual'>('loop');
  const [routeName, setRouteName] = useState('My Custom Loop');
  const [targetDistanceKm, setTargetDistanceKm] = useState(10);
  const [heading, setHeading] = useState<'North' | 'East' | 'South' | 'West'>('North');
  const [manualPoints, setManualPoints] = useState<[number, number][]>([
    [90.4125, 23.7745],
    [90.418, 23.779],
    [90.422, 23.773],
  ]);

  const centerLon = 90.4125;
  const centerLat = 23.7745;

  const activeRouteCoords = useMemo(() => {
    if (mode === 'loop') {
      return generateGeographicLoop(centerLon, centerLat, targetDistanceKm, heading);
    }
    return manualPoints;
  }, [mode, targetDistanceKm, heading, manualPoints]);

  const estimatedClimb = Math.round(targetDistanceKm * 6.5);
  const estimatedTimeMins = Math.round(targetDistanceKm * 5.2);

  const handleMapTap = (coord: [number, number]) => {
    if (mode === 'manual') {
      setManualPoints((prev) => [...prev, coord]);
    }
  };

  const [isSaving, setIsSaving] = useState(false);

  const handleSaveRoute = async () => {
    if (!routeName.trim()) {
      Alert.alert('Route Name Required', 'Please enter a name for your route.');
      return;
    }
    setIsSaving(true);
    try {
      const polylinePoints = activeRouteCoords.map(([lon, lat]) => ({ latitude: lat, longitude: lon }));
      await api.routes.create({
        name: routeName.trim(),
        sportType: 'Run',
        distanceMeters: targetDistanceKm * 1000,
        elevationGainMeters: estimatedClimb,
        estimatedTimeSeconds: estimatedTimeMins * 60,
        polylinePoints,
      });
      Alert.alert('Success', `Route "${routeName}" (${targetDistanceKm} km) saved to database!`);
      router.back();
    } catch (err: any) {
      Alert.alert('Save Failed', err.message || 'Could not save route to database');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-stone-900 justify-between">
      {/* Top Header */}
      <View className="flex-row items-center justify-between px-4 py-3 bg-stone-900 border-b border-stone-800 z-30">
        <TouchableOpacity onPress={() => router.back()} className="p-1">
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text className="text-base font-black text-white">Route Builder</Text>
        <TouchableOpacity onPress={handleSaveRoute} className="p-1">
          <Text className="text-sm font-black text-[#FC4C02]">Save</Text>
        </TouchableOpacity>
      </View>

      {/* Real Full-Screen MapLibre Map with Route Geometry */}
      <View className="flex-1 relative">
        <StravaMapView
          routeCoordinates={activeRouteCoords}
          onMapPress={handleMapTap}
          showControls={true}
          showUserLocation={true}
          className="w-full h-full">
          {/* Floating Telemetry Badge */}
          <View className="absolute top-4 left-4 bg-stone-900/95 rounded-2xl p-3 border border-stone-800 shadow-xl z-20">
            <Text className="text-[10px] uppercase font-bold text-gray-400">Total Route</Text>
            <Text className="text-xl font-black text-white">{targetDistanceKm}.0 km</Text>
            <Text className="text-[10px] font-semibold text-[#FC4C02]">
              +{estimatedClimb}m climb · {estimatedTimeMins} min est.
            </Text>
          </View>
        </StravaMapView>
      </View>

      {/* Bottom Route Config Drawer */}
      <View className="bg-white rounded-t-3xl p-5 shadow-2xl border-t border-gray-100 z-30">
        <View className="w-12 h-1 bg-gray-300 rounded-full self-center mb-3" />

        {/* Route Name Input */}
        <TextInput
          value={routeName}
          onChangeText={setRouteName}
          className="bg-gray-100 rounded-xl px-4 py-2.5 text-sm font-bold text-gray-900 mb-3"
          placeholder="Route Name"
        />

        {/* Mode Selector */}
        <View className="flex-row bg-gray-100 p-1 rounded-xl mb-3">
          <TouchableOpacity
            onPress={() => setMode('loop')}
            className={`flex-1 py-2 flex-row items-center justify-center rounded-lg ${mode === 'loop' ? 'bg-[#FC4C02]' : ''}`}>
            <Ionicons name="sync-outline" size={13} color={mode === 'loop' ? '#FFFFFF' : '#374151'} />
            <Text className={`text-xs font-black ml-1 ${mode === 'loop' ? 'text-white' : 'text-gray-700'}`}>
              Loop Generator
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setMode('manual')}
            className={`flex-1 py-2 flex-row items-center justify-center rounded-lg ${mode === 'manual' ? 'bg-[#FC4C02]' : ''}`}>
            <Ionicons name="pin-outline" size={13} color={mode === 'manual' ? '#FFFFFF' : '#374151'} />
            <Text className={`text-xs font-black ml-1 ${mode === 'manual' ? 'text-white' : 'text-gray-700'}`}>
              Tap to Place ({manualPoints.length} pts)
            </Text>
          </TouchableOpacity>
        </View>

        {mode === 'loop' ? (
          <View>
            {/* Distance Pills */}
            <View className="flex-row justify-between mb-3">
              {[5, 10, 15, 21, 42].map((km) => (
                <TouchableOpacity
                  key={km}
                  onPress={() => setTargetDistanceKm(km)}
                  className={`px-3.5 py-1.5 rounded-xl border ${
                    targetDistanceKm === km
                      ? 'border-[#FC4C02] bg-[#FC4C02]'
                      : 'border-gray-200 bg-gray-50'
                  }`}>
                  <Text className={`text-xs font-bold ${targetDistanceKm === km ? 'text-white' : 'text-gray-700'}`}>
                    {km}k
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Heading Selector */}
            <View className="flex-row justify-between mb-3">
              {(['North', 'East', 'South', 'West'] as const).map((dir) => (
                <TouchableOpacity
                  key={dir}
                  onPress={() => setHeading(dir)}
                  className={`flex-1 py-1.5 items-center mx-1 rounded-xl border ${
                    heading === dir
                      ? 'border-[#FC4C02] bg-orange-50'
                      : 'border-gray-200 bg-gray-50'
                  }`}>
                  <Text className={`text-xs font-bold ${heading === dir ? 'text-[#FC4C02]' : 'text-gray-700'}`}>
                    {dir}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ) : (
          <View className="flex-row justify-between items-center mb-3">
            <Text className="text-xs font-semibold text-gray-500">
              Tap map to place waypoints.
            </Text>
            <View className="flex-row items-center">
              <TouchableOpacity
                onPress={() => {
                  if (manualPoints.length > 1) {
                    setManualPoints((prev) => prev.slice(0, prev.length - 1));
                  }
                }}
                className="px-2.5 py-1 bg-gray-100 rounded-lg mr-2">
                <Text className="text-xs font-bold text-gray-700">Undo</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setManualPoints([manualPoints[0]])}
                className="px-3 py-1 bg-red-50 rounded-lg">
                <Text className="text-xs font-bold text-red-600">Clear</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        <TouchableOpacity
          onPress={handleSaveRoute}
          className="w-full py-3.5 bg-[#FC4C02] rounded-2xl items-center shadow-md">
          <Text className="text-base font-black text-white">Save Route</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
