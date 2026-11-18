import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Alert, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { RouteMapPreview } from '../../components/common/RouteMapPreview';

export default function RouteNavigationScreen() {
  const router = useRouter();
  const [distanceRemainingMeters, setDistanceRemainingMeters] = useState(6400);
  const [distanceToTurnMeters, setDistanceToTurnMeters] = useState(180);
  const [currentSpeedKmh, setCurrentSpeedKmh] = useState(12.4);
  const [audioEnabled, setAudioEnabled] = useState(true);

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
    <SafeAreaView className="flex-1 bg-gray-900 justify-between">
      {/* Top Turn-by-Turn Banner */}
      <View className="bg-gray-800 p-4 m-4 rounded-3xl border border-gray-700 shadow-xl">
        <View className="flex-row items-center justify-between mb-2">
          <View className="flex-row items-center">
            <View className="w-12 h-12 rounded-2xl bg-[#FC4C02] items-center justify-center mr-3">
              <Ionicons name="arrow-forward" size={26} color="#FFFFFF" />
            </View>
            <View>
              <Text className="text-xl font-black text-white">In {distanceToTurnMeters}m</Text>
              <Text className="text-xs font-semibold text-gray-300">Turn Right onto Hatirjheel Promenade</Text>
            </View>
          </View>
          <TouchableOpacity
            onPress={() => setAudioEnabled(!audioEnabled)}
            className="w-10 h-10 rounded-full bg-gray-700 items-center justify-center">
            <Ionicons
              name={audioEnabled ? 'volume-high' : 'volume-mute'}
              size={18}
              color={audioEnabled ? '#FC4C02' : '#9CA3AF'}
            />
          </TouchableOpacity>
        </View>

        <View className="flex-row items-center pt-2 border-t border-gray-700 justify-between">
          <Text className="text-[11px] font-bold text-emerald-400">● On Course (GPS Locked ±3m)</Text>
          <Text className="text-[11px] font-bold text-gray-400">Next: Continue 1.2 km</Text>
        </View>
      </View>

      {/* Live Navigation Map */}
      <View className="flex-1 mx-4 rounded-3xl overflow-hidden border border-gray-800">
        <RouteMapPreview height={340} />
      </View>

      {/* Bottom Telemetry HUD */}
      <View className="bg-gray-800 p-4 m-4 rounded-3xl border border-gray-700">
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
          className="w-full py-3 bg-red-600/90 rounded-2xl items-center shadow-md">
          <Text className="text-sm font-black text-white">End Navigation</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

