import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Alert, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StravaMapView } from '../components/map/StravaMapView';
import { RecordSettingsModal } from '../components/record/RecordSettingsModal';
import { SportPickerModal } from '../components/record/SportPickerModal';
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
    toggleSimulation,
  } = useApp();

  const [selectedSport, setSelectedSport] = useState<SportType>(activeRecording.sportType || 'Run');
  const [mapExpanded, setMapExpanded] = useState(false);
  const [showSportPicker, setShowSportPicker] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [lapCount, setLapCount] = useState(1);

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const formatPace = () => {
    if (activeRecording.distanceMeters <= 10 || activeRecording.currentSpeedMps <= 0.2) {
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

  const liveCoords = activeRecording.routeCoordinates.map(
    (c) => [c.longitude, c.latitude] as [number, number]
  );
  const centerCoord =
    liveCoords.length > 0 ? liveCoords[liveCoords.length - 1] : ([90.4125, 23.7745] as [number, number]);

  const getGpsStatusDisplay = () => {
    if (activeRecording.isSimulated) {
      return { label: 'DEV SIMULATION MODE', color: 'bg-amber-500' };
    }
    if (activeRecording.isAutoPaused && activeRecording.isRecording) {
      return { label: 'AUTO-PAUSED', color: 'bg-orange-500' };
    }
    switch (activeRecording.gpsSignal) {
      case 'strong':
        return { label: `GPS LOCKED (±${activeRecording.accuracyMeters || 3}m)`, color: 'bg-emerald-500' };
      case 'good':
        return { label: `GPS ACTIVE (±${activeRecording.accuracyMeters || 8}m)`, color: 'bg-emerald-400' };
      case 'denied':
        return { label: 'LOCATION PERMISSION DENIED', color: 'bg-red-500' };
      case 'disabled':
        return { label: 'LOCATION SERVICES OFF', color: 'bg-red-500' };
      default:
        return { label: 'SEARCHING GPS...', color: 'bg-amber-400' };
    }
  };

  const gpsStatus = getGpsStatusDisplay();

  return (
    <View className="flex-1 bg-stone-900 relative">
      {/* Real Full-Screen MapLibre Map Behind HUD */}
      <StravaMapView
        styleKey="positron"
        centerCoordinate={centerCoord}
        routeCoordinates={liveCoords.length > 0 ? liveCoords : undefined}
        showControls={false}
        showUserLocation={true}
        className="w-full h-full">
        {/* Top Floating Strava Navigation Bar */}
        <SafeAreaView className="absolute top-0 left-0 right-0 z-30 px-4 pt-2">
          <View className="flex-row items-center justify-between bg-stone-900/90 rounded-2xl p-3 border border-stone-800 shadow-xl">
            <TouchableOpacity onPress={() => router.back()} className="p-1">
              <Text className="text-sm font-bold text-gray-300">Close</Text>
            </TouchableOpacity>

            {/* Sport Picker Trigger — Strava style "Run ▾" */}
            <TouchableOpacity
              onPress={() => setShowSportPicker(true)}
              className="flex-row items-center bg-stone-800 px-3.5 py-1.5 rounded-full border border-stone-700">
              <Ionicons name="fitness-outline" size={14} color="#FC4C02" />
              <Text className="text-sm font-black text-white ml-1.5">{selectedSport}</Text>
              <Ionicons name="chevron-down" size={14} color="#9CA3AF" className="ml-1" />
            </TouchableOpacity>

            {/* Settings Gear */}
            <TouchableOpacity onPress={() => setShowSettings(true)} className="p-1">
              <Ionicons name="settings-outline" size={20} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          {/* Dynamic GPS Signal / Auto-Pause Status Pill */}
          <TouchableOpacity
            onPress={() => setShowSettings(true)}
            className="self-center mt-2 flex-row items-center bg-stone-900/90 px-3.5 py-1.5 rounded-full border border-stone-800 shadow-md">
            <View className={`w-2 h-2 rounded-full ${gpsStatus.color} mr-1.5 animate-pulse`} />
            <Text className="text-[10px] font-black text-white tracking-wider">
              {gpsStatus.label}
            </Text>
          </TouchableOpacity>
        </SafeAreaView>

        {/* Athletic Performance Telemetry HUD */}
        {!mapExpanded && (
          <View className="absolute bottom-32 left-4 right-4 bg-stone-900/95 rounded-3xl p-5 border border-stone-800 shadow-2xl z-30">
            <View className="flex-row justify-between items-baseline mb-4 pb-3 border-b border-stone-800">
              <View>
                <Text className="text-[10px] uppercase font-black text-gray-400 tracking-wider">
                  Moving Time
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

            <View className="flex-row justify-between">
              <View>
                <Text className="text-[10px] uppercase font-bold text-gray-400">
                  {selectedSport === 'Ride' ? 'Speed' : 'Pace'}
                </Text>
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

              {activeRecording.isRecording && (
                <View>
                  <Text className="text-[10px] uppercase font-bold text-orange-400">Lap</Text>
                  <Text className="text-lg font-black text-orange-400">#{lapCount}</Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* Bottom Tactile Action Controls */}
        <SafeAreaView className="absolute bottom-4 left-0 right-0 z-40 px-6">
          {!activeRecording.isRecording ? (
            <TouchableOpacity
              onPress={() => startRecording(selectedSport)}
              className="w-full py-5 bg-[#FC4C02] rounded-3xl items-center justify-center shadow-2xl border-2 border-orange-400">
              <Text className="text-xl font-black text-white uppercase tracking-wider">
                Start {selectedSport}
              </Text>
            </TouchableOpacity>
          ) : !activeRecording.isPaused ? (
            <View className="flex-row items-center">
              <TouchableOpacity
                onPress={() => {
                  setLapCount((prev) => prev + 1);
                  Alert.alert('Lap Logged', `Lap ${lapCount} marked successfully.`);
                }}
                className="w-20 py-4 bg-stone-800 rounded-3xl items-center justify-center border border-stone-700 shadow-xl mr-3">
                <Ionicons name="flag" size={18} color="#FC4C02" />
                <Text className="text-[10px] font-black text-white uppercase mt-0.5">
                  Lap {lapCount}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={pauseRecording}
                className="flex-1 py-4 bg-amber-500 rounded-3xl items-center justify-center shadow-2xl border-2 border-amber-300">
                <Text className="text-lg font-black text-white uppercase tracking-wider">
                  Pause Workout
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View className="flex-row justify-between space-x-3">
              <TouchableOpacity
                onPress={handleDiscard}
                className="w-16 h-16 rounded-2xl bg-stone-800 border border-stone-700 items-center justify-center mr-2">
                <Ionicons name="trash-outline" size={24} color="#EF4444" />
                <Text className="text-[8px] font-bold text-red-400 mt-0.5">Discard</Text>
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

      <SportPickerModal
        visible={showSportPicker}
        onClose={() => setShowSportPicker(false)}
        selectedSport={selectedSport}
        onSelectSport={setSelectedSport}
      />

      <RecordSettingsModal
        visible={showSettings}
        onClose={() => setShowSettings(false)}
        isSimulated={activeRecording.isSimulated}
        onToggleSimulation={toggleSimulation}
      />
    </View>
  );
}
