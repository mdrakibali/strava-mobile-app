import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Alert, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StravaMapView } from '../../components/map/StravaMapView';
import { MOCK_ROUTES } from '../../mock/data';

export default function RouteNavigationScreen() {
  const router = useRouter();
  const [distanceRemainingMeters, setDistanceRemainingMeters] = useState(6400);
  const [distanceToTurnMeters, setDistanceToTurnMeters] = useState(180);
  const [currentSpeedKmh, setCurrentSpeedKmh] = useState(12.4);
  const [audioEnabled, setAudioEnabled] = useState(true);

  const route = MOCK_ROUTES[0];
  const routeCoords = route.polylinePoints.map((p) => [p.longitude, p.latitude] as [number, number]);

  // Simulation of turn countdown
  useEffect(() => {
    const interval = setInterval(() => {
      setDistanceToTurnMeters((prev) => (prev > 10 ? prev - 5 : 250));
      setDistanceRemainingMeters((prev) => Math.max(0, prev - 5));
      setCurrentSpeedKmh((prev) => +(12.0 + Math.random() * 1.5).toFixed(1));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleEndNavigation = () => {
    Alert.alert(
      'End Route Navigation?',
      'Are you sure you want to stop turn-by-turn guidance?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'End', style: 'destructive', onPress: () => router.back() },
      ]
    );
  };

  const distKm = (distanceRemainingMeters / 1000).toFixed(1);
  const estMins = Math.round((distanceRemainingMeters / 1000) * 4.8);

  return (
    <View className="flex-1 bg-stone-950 relative">
      {/* Real Full-Screen MapLibre Navigation Map */}
      <StravaMapView
        styleKey="positron"
        routeCoordinates={routeCoords}
        showControls={false}
        showUserLocation={true}
        className="w-full h-full">
        {/* Top Floating Turn-by-Turn Guidance Banner */}
        <SafeAreaView className="absolute top-2 left-4 right-4 z-30">
          <View className="bg-stone-900/95 p-4 rounded-3xl border border-stone-800 shadow-2xl">
            <View className="flex-row items-center justify-between mb-2">
              <View className="flex-row items-center flex-1 mr-2">
                <View className="w-12 h-12 rounded-2xl bg-[#FC4C02] items-center justify-center mr-3 shadow-md">
                  <Ionicons name="arrow-forward" size={26} color="#FFFFFF" />
                </View>
                <View className="flex-1">
                  <Text className="text-xl font-black text-white">In {distanceToTurnMeters}m</Text>
                  <Text className="text-xs font-semibold text-gray-300" numberOfLines={1}>
                    Turn Right onto Hatirjheel Promenade
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                onPress={() => setAudioEnabled(!audioEnabled)}
                className="w-10 h-10 rounded-full bg-stone-800 items-center justify-center border border-stone-700">
                <Ionicons
                  name={audioEnabled ? 'volume-high' : 'volume-mute'}
                  size={18}
                  color={audioEnabled ? '#FC4C02' : '#9CA3AF'}
                />
              </TouchableOpacity>
            </View>

            <View className="flex-row items-center pt-2.5 border-t border-stone-800 justify-between">
              <View className="flex-row items-center">
                <View className="w-2 h-2 rounded-full bg-emerald-400 mr-1.5 animate-pulse" />
                <Text className="text-[11px] font-bold text-emerald-400">On Course (±3m)</Text>
              </View>
              <Text className="text-[11px] font-bold text-gray-400">Next: Continue 1.2 km</Text>
            </View>
          </View>
        </SafeAreaView>

        {/* Bottom Floating Telemetry HUD */}
        <SafeAreaView className="absolute bottom-4 left-4 right-4 z-30">
          <View className="bg-stone-900/95 p-4 rounded-3xl border border-stone-800 shadow-2xl">
            <View className="flex-row justify-around mb-4">
              <View className="items-center">
                <Text className="text-[10px] uppercase font-bold text-gray-400">Speed</Text>
                <Text className="text-2xl font-black text-white">{currentSpeedKmh}</Text>
                <Text className="text-[10px] text-gray-400">km/h</Text>
              </View>

              <View className="items-center">
                <Text className="text-[10px] uppercase font-bold text-gray-400">Remaining</Text>
                <Text className="text-2xl font-black text-[#FC4C02]">{distKm}</Text>
                <Text className="text-[10px] text-gray-400">km</Text>
              </View>

              <View className="items-center">
                <Text className="text-[10px] uppercase font-bold text-gray-400">Est. Time</Text>
                <Text className="text-2xl font-black text-white">{estMins}</Text>
                <Text className="text-[10px] text-gray-400">min</Text>
              </View>
            </View>

            <TouchableOpacity
              onPress={handleEndNavigation}
              className="w-full py-3.5 bg-red-600 rounded-2xl items-center shadow-md">
              <Text className="text-sm font-black text-white">End Navigation</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </StravaMapView>
    </View>
  );
}
