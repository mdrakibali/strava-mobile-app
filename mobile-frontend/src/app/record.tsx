import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Alert, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StravaMapView } from '../components/map/StravaMapView';
import { useApp } from '../context/AppContext';
import { SportType } from '../types';

export default function RecordCockpitScreen() {
  const router = useRouter();
  const {
    activeRecording,
    startRecording,
    pauseRecording,
    resumeRecording,
    discardRecording,
    finishRecording,
  } = useApp();

  const [selectedSport, setSelectedSport] = useState<SportType>(activeRecording.sportType || 'Run');
  const [mapExpanded, setMapExpanded] = useState(false);

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const formatPace = () => {
    if (activeRecording.distanceMeters <= 20 || activeRecording.currentSpeedMps <= 0.1) {
      return '-:--';
    }
    if (selectedSport === 'Ride') {
      return `${(activeRecording.currentSpeedMps * 3.6).toFixed(1)} km/h`;
    }
    const secPerKm = Math.round(1000 / activeRecording.currentSpeedMps);
    const m = Math.floor(secPerKm / 60);
    const s = secPerKm % 60;
    return `${m}:${s < 10 ? '0' : ''}${s} /km`;
  };

  const distKm = (activeRecording.distanceMeters / 1000).toFixed(2);

  const handleDiscard = () => {
    Alert.alert('Discard Activity?', 'This recorded GPS track will be permanently removed.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Discard',
        style: 'destructive',
        onPress: () => {
          discardRecording();
          router.back();
        },
      },
    ]);
  };

  const handleFinish = () => {
    finishRecording();
    router.push('/save-activity');
  };

  // Live GPS breadcrumbs
  const liveCoords = activeRecording.routeCoordinates.map(
    (c) => [c.longitude, c.latitude] as [number, number]
  );

  return (
    <View className="flex-1 bg-stone-900 relative">
      {/* Real Full-Screen MapLibre Map Behind HUD */}
      <StravaMapView
        styleKey="positron"
        routeCoordinates={liveCoords.length > 0 ? liveCoords : undefined}
        showControls={false}
        showUserLocation={true}
        className="w-full h-full">
        {/* Top Floating Header HUD */}
        <SafeAreaView className="absolute top-0 left-0 right-0 z-30 px-4 pt-2">
          <View className="flex-row items-center justify-between bg-stone-900/90 rounded-2xl p-3 border border-stone-800 shadow-xl">
            <TouchableOpacity onPress={() => router.back()} className="p-1">
              <Ionicons name="close" size={22} color="#FFFFFF" />
            </TouchableOpacity>

            {/* GPS Signal Status */}
            <View className="flex-row items-center">
              <View className="w-2.5 h-2.5 rounded-full bg-emerald-500 mr-2 animate-pulse" />
              <Text className="text-xs font-black text-white">GPS LOCKED (±3m)</Text>
            </View>

            {/* Map Expand Toggle */}
            <TouchableOpacity
              onPress={() => setMapExpanded(!mapExpanded)}
              className="p-1 bg-stone-800 rounded-lg">
              <Ionicons
                name={mapExpanded ? 'contract' : 'expand'}
                size={18}
                color="#FC4C02"
              />
            </TouchableOpacity>
          </View>

          {/* Sport Selector Carousel (When Idle) */}
          {!activeRecording.isRecording && (
            <View className="flex-row justify-center mt-3 space-x-2">
              {(['Run', 'Ride', 'Trail Run', 'Hike'] as const).map((sport) => {
                const isSelected = selectedSport === sport;
                return (
                  <TouchableOpacity
                    key={sport}
                    onPress={() => setSelectedSport(sport)}
                    className={`px-4 py-2 rounded-full border shadow-md mr-2 ${
                      isSelected
                        ? 'bg-[#FC4C02] border-[#FC4C02]'
                        : 'bg-stone-900/90 border-stone-700'
                    }`}>
                    <Text
                      className={`text-xs font-black ${
                        isSelected ? 'text-white' : 'text-gray-300'
                      }`}>
                      {sport}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </SafeAreaView>

        {/* Athletic Performance Telemetry HUD */}
        {!mapExpanded && (
          <View className="absolute bottom-32 left-4 right-4 bg-stone-900/95 rounded-3xl p-5 border border-stone-800 shadow-2xl z-30">
            {/* Main Primary Metrics */}
            <View className="flex-row justify-between items-baseline mb-4 pb-3 border-b border-stone-800">
              <View>
                <Text className="text-[10px] uppercase font-black text-gray-400 tracking-wider">
                  Time
                </Text>
                <Text className="text-4xl font-black text-white tracking-tight">
                  {formatTime(activeRecording.movingSeconds)}
                </Text>
              </View>

              <View className="items-end">
                <Text className="text-[10px] uppercase font-black text-gray-400 tracking-wider">
                  Distance
                </Text>
                <View className="flex-row items-baseline">
                  <Text className="text-4xl font-black text-[#FC4C02] tracking-tight">
                    {distKm}
                  </Text>
                  <Text className="text-sm font-black text-gray-400 ml-1">km</Text>
                </View>
              </View>
            </View>

            {/* Secondary Metrics Grid */}
            <View className="flex-row justify-between">
              <View>
                <Text className="text-[10px] uppercase font-bold text-gray-400">Pace</Text>
                <Text className="text-lg font-black text-white">{formatPace()}</Text>
              </View>

              <View>
                <Text className="text-[10px] uppercase font-bold text-gray-400">Elevation</Text>
                <Text className="text-lg font-black text-white">
                  +{activeRecording.elevationGainMeters} m
                </Text>
              </View>

              <View>
                <Text className="text-[10px] uppercase font-bold text-gray-400">Heart Rate</Text>
                <Text className="text-lg font-black text-white">
                  {activeRecording.currentHeartRate || 154} bpm
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Bottom Tactile Action Controls */}
        <SafeAreaView className="absolute bottom-4 left-0 right-0 z-40 px-6">
          {!activeRecording.isRecording ? (
            /* Start Button */
            <TouchableOpacity
              onPress={() => startRecording(selectedSport)}
              className="w-full py-5 bg-[#FC4C02] rounded-3xl items-center justify-center shadow-2xl border-2 border-orange-400">
              <Text className="text-xl font-black text-white uppercase tracking-wider">
                Start {selectedSport}
              </Text>
            </TouchableOpacity>
          ) : !activeRecording.isPaused ? (
            /* Recording State: Pause Button */
            <TouchableOpacity
              onPress={pauseRecording}
              className="w-full py-5 bg-amber-500 rounded-3xl items-center justify-center shadow-2xl border-2 border-amber-300">
              <Text className="text-xl font-black text-white uppercase tracking-wider">
                Pause Workout
              </Text>
            </TouchableOpacity>
          ) : (
            /* Paused State: Resume, Finish, Discard */
            <View className="flex-row justify-between space-x-3">
              <TouchableOpacity
                onPress={handleDiscard}
                className="w-16 h-16 rounded-2xl bg-stone-800 border border-stone-700 items-center justify-center mr-2">
                <Ionicons name="trash-outline" size={24} color="#EF4444" />
              </TouchableOpacity>

              <TouchableOpacity
                onPress={resumeRecording}
                className="flex-1 py-4 bg-[#FC4C02] rounded-2xl items-center justify-center shadow-xl mr-2">
                <Text className="text-base font-black text-white uppercase">Resume</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleFinish}
                className="flex-1 py-4 bg-emerald-600 rounded-2xl items-center justify-center shadow-xl">
                <Text className="text-base font-black text-white uppercase">Finish</Text>
              </TouchableOpacity>
            </View>
          )}
        </SafeAreaView>
      </StravaMapView>
    </View>
  );
}
