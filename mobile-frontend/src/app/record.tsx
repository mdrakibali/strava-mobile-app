import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { Alert, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StravaMapView } from '../components/map/StravaMapView';
import { RecordSettingsModal } from '../components/record/RecordSettingsModal';
import { SportPickerModal } from '../components/record/SportPickerModal';
import { useApp } from '../context/AppContext';
import { api } from '../services/api';
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

  const [selectedSport, setSelectedSport] = useState<SportType>(activeRecording.sportType || 'Workout');
  const [showSportPicker, setShowSportPicker] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [viewMode, setViewMode] = useState<'cockpit' | 'map'>('cockpit');
  const [beaconToken, setBeaconToken] = useState<string | null>(null);
  const [isBeaconActive, setIsBeaconActive] = useState(false);
  const [previewLocation, setPreviewLocation] = useState<[number, number] | null>(null);
  const lastPingTimeRef = useRef<number>(0);

  // Pre-fetch device GPS location
  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const loc = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
          }).catch(() => null);
          if (loc) {
            setPreviewLocation([loc.coords.longitude, loc.coords.latitude]);
          }
        }
      } catch (err) {
        console.warn('Pre-record location error:', err);
      }
    })();
  }, []);

  // Auto-start beacon if enabled when recording begins
  useEffect(() => {
    if (activeRecording.isRecording && !beaconToken && isBeaconActive) {
      api.beacon
        .start(selectedSport)
        .then((res) => {
          if (res?.token) {
            setBeaconToken(res.token);
          }
        })
        .catch(console.warn);
    }
  }, [activeRecording.isRecording, isBeaconActive, beaconToken, selectedSport]);

  // Periodic Beacon Ping every 5 seconds
  useEffect(() => {
    if (
      activeRecording.isRecording &&
      !activeRecording.isPaused &&
      beaconToken &&
      activeRecording.routeCoordinates.length > 0
    ) {
      const now = Date.now();
      if (now - lastPingTimeRef.current >= 5000) {
        lastPingTimeRef.current = now;
        const last = activeRecording.routeCoordinates[activeRecording.routeCoordinates.length - 1];
        api.beacon
          .ping(beaconToken, {
            latitude: last.latitude,
            longitude: last.longitude,
            speedMps: activeRecording.currentSpeedMps,
          })
          .catch(console.warn);
      }
    }
  }, [activeRecording.routeCoordinates, activeRecording.isRecording, activeRecording.isPaused, beaconToken]);

  // Timer formatted as HH:MM:SS
  const formatTimerDigits = (secs: number) => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    const hh = String(h).padStart(2, '0');
    const mm = String(m).padStart(2, '0');
    const ss = String(s).padStart(2, '0');
    return `${hh}:${mm}:${ss}`;
  };

  const handleDiscard = () => {
    Alert.alert('Discard Activity?', 'This recorded GPS track will be permanently removed.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Discard',
        style: 'destructive',
        onPress: () => {
          if (beaconToken) {
            api.beacon.stop(beaconToken).catch(console.warn);
            setBeaconToken(null);
          }
          discardRecording();
          router.back();
        },
      },
    ]);
  };

  const handleFinish = () => {
    if (beaconToken) {
      api.beacon.stop(beaconToken).catch(console.warn);
      setBeaconToken(null);
    }
    finishRecording();
    router.push('/save-activity');
  };

  const liveCoords = activeRecording.routeCoordinates.map(
    (c) => [c.longitude, c.latitude] as [number, number]
  );
  const currentFix =
    liveCoords.length > 0 ? liveCoords[liveCoords.length - 1] : previewLocation;
  const centerCoord =
    currentFix || ([90.4125, 23.7745] as [number, number]);

  // Cockpit View (Matches Strava Screenshot 7 & 8)
  if (viewMode === 'cockpit') {
    const isPaused = activeRecording.isPaused;
    const isRecording = activeRecording.isRecording;

    return (
      <SafeAreaView className="flex-1 bg-white justify-between">
        {/* Top Header Bar (Yellow if Paused/Stopped matching Screenshot 8) */}
        <View
          className={`px-5 py-4 ${
            isPaused && isRecording ? 'bg-[#FFC700]' : 'bg-white'
          }`}>
          {isPaused && isRecording && (
            <Text className="text-center text-xs font-black text-gray-900 uppercase tracking-widest mb-1">
              Stopped
            </Text>
          )}

          <View className="flex-row items-center justify-between">
            <TouchableOpacity onPress={() => router.back()} className="p-1">
              <Ionicons name="chevron-back" size={28} color="#111827" />
            </TouchableOpacity>

            {/* Giant Bold Digital Timer */}
            <Text className="text-5xl font-black text-gray-900 tracking-tight">
              {formatTimerDigits(activeRecording.movingSeconds)}
            </Text>

            <TouchableOpacity onPress={() => setShowSettings(true)} className="p-1">
              <Ionicons name="settings-outline" size={24} color="#111827" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Center: Live Heart Rate or Telemetry (Matches Screenshot 7 & 8) */}
        <View className="items-center justify-center py-12">
          <Text className="text-6xl font-black text-gray-900 mb-2">
            {activeRecording.currentHeartRate > 0 ? activeRecording.currentHeartRate : '— —'}
          </Text>
          <Ionicons name="heart" size={26} color="#EF4444" />
          <Text className="text-xs font-bold text-gray-400 mt-2 uppercase tracking-widest">
            {activeRecording.currentHeartRate > 0 ? 'BPM' : 'Heart Rate'}
          </Text>

          {/* Quick Metrics (Distance & Speed/Pace) */}
          <View className="flex-row justify-around w-full px-8 mt-10">
            <View className="items-center">
              <Text className="text-2xl font-black text-gray-900">
                {(activeRecording.distanceMeters / 1000).toFixed(2)}
              </Text>
              <Text className="text-[11px] font-bold text-gray-400 uppercase">Kilometers</Text>
            </View>
            <View className="items-center">
              <Text className="text-2xl font-black text-gray-900">
                {activeRecording.currentSpeedMps > 0.5
                  ? `${(1000 / activeRecording.currentSpeedMps / 60).toFixed(1)}`
                  : '-:--'}
              </Text>
              <Text className="text-[11px] font-bold text-gray-400 uppercase">Avg Pace</Text>
            </View>
          </View>
        </View>

        {/* Bottom Drawer & Buttons */}
        <View className="px-5 pb-6">
          {/* Drawer Handle (Tapping switches to Map view) */}
          <TouchableOpacity
            onPress={() => setViewMode('map')}
            className="items-center justify-center py-2 mb-3">
            <View className="w-12 h-1.5 bg-gray-300 rounded-full mb-1" />
            <Text className="text-[11px] font-bold text-gray-400">View Map Track</Text>
          </TouchableOpacity>

          {/* Action Buttons */}
          {!isRecording ? (
            <TouchableOpacity
              onPress={() => startRecording(selectedSport)}
              className="w-full py-4.5 bg-[#FC4C02] rounded-full items-center justify-center shadow-lg active:bg-[#E03A00]">
              <Text className="text-lg font-black text-white tracking-wide">
                Start {selectedSport}
              </Text>
            </TouchableOpacity>
          ) : !isPaused ? (
            /* Screenshot 7: Full-Width Orange Pause Button */
            <TouchableOpacity
              onPress={pauseRecording}
              className="w-full py-4.5 bg-[#FC4C02] rounded-full flex-row items-center justify-center shadow-lg active:bg-[#E03A00]">
              <Ionicons name="pause" size={22} color="#FFFFFF" />
              <Text className="text-lg font-black text-white ml-2 tracking-wide">Pause</Text>
            </TouchableOpacity>
          ) : (
            /* Screenshot 8: Resume (Orange) and Finish (Black) Buttons side-by-side */
            <View className="flex-row space-x-3">
              <TouchableOpacity
                onPress={resumeRecording}
                className="flex-1 py-4.5 bg-[#FC4C02] rounded-full flex-row items-center justify-center shadow-md mr-3 active:bg-[#E03A00]">
                <Ionicons name="play" size={20} color="#FFFFFF" />
                <Text className="text-base font-black text-white ml-2">Resume</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleFinish}
                className="flex-1 py-4.5 bg-black rounded-full flex-row items-center justify-center shadow-md active:opacity-80">
                <Ionicons name="square" size={18} color="#FFFFFF" />
                <Text className="text-base font-black text-white ml-2">Finish</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Settings & Sport Modals */}
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
          beacon={isBeaconActive}
          onToggleBeacon={setIsBeaconActive}
        />
      </SafeAreaView>
    );
  }

  // Full Map View
  return (
    <View className="flex-1 bg-stone-900 relative">
      <StravaMapView
        styleKey="positron"
        centerCoordinate={centerCoord}
        userLocation={centerCoord}
        routeCoordinates={liveCoords.length > 0 ? liveCoords : undefined}
        showControls={false}
        showUserLocation={true}
        className="w-full h-full">
        {/* Top HUD */}
        <SafeAreaView className="absolute top-0 left-0 right-0 z-30 px-4 pt-2">
          <View className="flex-row items-center justify-between bg-white/95 rounded-2xl p-3 border border-gray-100 shadow-xl">
            <TouchableOpacity onPress={() => setViewMode('cockpit')} className="p-1">
              <Text className="text-sm font-bold text-gray-800">Timer</Text>
            </TouchableOpacity>
            <Text className="text-base font-black text-gray-900">
              {formatTimerDigits(activeRecording.movingSeconds)}
            </Text>
            <TouchableOpacity onPress={() => setShowSettings(true)} className="p-1">
              <Ionicons name="settings-outline" size={20} color="#111827" />
            </TouchableOpacity>
          </View>
        </SafeAreaView>

        {/* Bottom Floating Bar */}
        <SafeAreaView className="absolute bottom-4 left-0 right-0 z-40 px-6">
          <TouchableOpacity
            onPress={() => setViewMode('cockpit')}
            className="w-full py-4 bg-[#FC4C02] rounded-full items-center justify-center shadow-xl">
            <Text className="text-base font-black text-white">Back to Cockpit</Text>
          </TouchableOpacity>
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
        beacon={isBeaconActive}
        onToggleBeacon={setIsBeaconActive}
      />
    </View>
  );
}
