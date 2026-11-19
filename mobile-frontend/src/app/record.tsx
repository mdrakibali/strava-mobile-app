import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { Alert, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
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

  const [selectedSport, setSelectedSport] = useState<SportType>(activeRecording.sportType || 'Run');
  const [showSportPicker, setShowSportPicker] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [beaconToken, setBeaconToken] = useState<string | null>(null);
  const [isBeaconActive, setIsBeaconActive] = useState(false);
  const lastPingTimeRef = useRef<number>(0);

  // Periodic Beacon Ping every 5 seconds if Beacon is active
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

  // Format timer into HH:MM:SS or MM:SS
  const formatTimerDigits = (secs: number) => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    const hh = String(h).padStart(2, '0');
    const mm = String(m).padStart(2, '0');
    const ss = String(s).padStart(2, '0');
    return h > 0 ? `${hh}:${mm}:${ss}` : `${mm}:${ss}`;
  };

  const handleDiscard = () => {
    Alert.alert('Discard Activity?', 'This recorded workout data will be permanently cleared.', [
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

  const isPaused = activeRecording.isPaused;
  const isRecording = activeRecording.isRecording;

  // Pace calculations
  const paceSeconds =
    activeRecording.distanceMeters > 50 && activeRecording.movingSeconds > 0
      ? Math.round(activeRecording.movingSeconds / (activeRecording.distanceMeters / 1000))
      : 0;
  const paceM = Math.floor(paceSeconds / 60);
  const paceS = paceSeconds % 60;
  const currentPaceFormatted = paceSeconds > 0 ? `${paceM}:${String(paceS).padStart(2, '0')}` : '-:--';

  const speedKmh = (activeRecording.currentSpeedMps * 3.6).toFixed(1);

  // Approximate calories calculation: ~60 kcal per km run, or time based
  const estimatedCalories = Math.max(
    0,
    Math.round(
      (activeRecording.distanceMeters / 1000) * 65 +
        (activeRecording.movingSeconds / 60) * 4
    )
  );

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
      {/* Top Navigation & Status Bar */}
      <View
        className={`px-4 py-3 flex-row items-center justify-between border-b ${
          isPaused && isRecording
            ? 'bg-[#FFC700] border-amber-400'
            : 'bg-white border-gray-100'
        }`}>
        <TouchableOpacity
          onPress={() => {
            if (isRecording) {
              Alert.alert(
                'Workout in Progress',
                'Pause or finish your workout to exit, or stay on this screen while time continues.',
                [
                  { text: 'Keep Going', style: 'cancel' },
                  { text: 'Discard', style: 'destructive', onPress: handleDiscard },
                ]
              );
            } else {
              router.back();
            }
          }}
          className="p-1">
          <Ionicons name="chevron-back" size={26} color="#111827" />
        </TouchableOpacity>

        <TouchableOpacity
          disabled={isRecording}
          onPress={() => setShowSportPicker(true)}
          className="flex-row items-center bg-gray-100 px-3.5 py-1.5 rounded-full">
          <Ionicons
            name={
              selectedSport === 'Ride'
                ? 'bicycle'
                : selectedSport === 'Workout'
                ? 'barbell'
                : 'fitness'
            }
            size={16}
            color="#FC4C02"
            style={{ marginRight: 6 }}
          />
          <Text className="text-xs font-black text-gray-900 mr-1">{selectedSport}</Text>
          {!isRecording && <Ionicons name="chevron-down" size={12} color="#4B5563" />}
        </TouchableOpacity>

        <TouchableOpacity onPress={() => setShowSettings(true)} className="p-1">
          <Ionicons name="settings-outline" size={24} color="#111827" />
        </TouchableOpacity>
      </View>

      {/* STOPPED Status Banner */}
      {isPaused && isRecording && (
        <View className="bg-[#FFC700] py-1.5 items-center justify-center">
          <Text className="text-xs font-black uppercase tracking-widest text-gray-950">
            PAUSED
          </Text>
        </View>
      )}

      {/* Main Full-Screen Workout Dashboard (NO MAP - Pure Focused Telemetry) */}
      <View className="flex-1 px-6 justify-between py-6 bg-white">
        {/* Top: Massive Digital Time Counter */}
        <View className="items-center justify-center pt-4 pb-2">
          <Text className="text-[12px] font-black uppercase tracking-widest text-gray-400 mb-1">
            TIME
          </Text>
          <Text className="text-6xl font-black text-gray-950 tracking-tight font-mono">
            {formatTimerDigits(activeRecording.movingSeconds)}
          </Text>
        </View>

        {/* Middle Section: Big Primary Workout Metrics */}
        <View className="w-full">
          {/* Distance & Pace / Speed */}
          <View className="flex-row items-center justify-between py-6 border-t border-b border-gray-100">
            {/* Metric 1: Distance */}
            <View className="items-center flex-1">
              <Text className="text-4xl font-black text-gray-950 tracking-tight">
                {(activeRecording.distanceMeters / 1000).toFixed(2)}
              </Text>
              <Text className="text-[11px] font-black uppercase tracking-wider text-gray-400 mt-1">
                KILOMETERS
              </Text>
            </View>

            {/* Vertical Divider */}
            <View className="w-[1px] h-14 bg-gray-200" />

            {/* Metric 2: Pace or Speed */}
            <View className="items-center flex-1">
              <Text className="text-4xl font-black text-gray-950 tracking-tight">
                {selectedSport === 'Ride' ? speedKmh : currentPaceFormatted}
              </Text>
              <Text className="text-[11px] font-black uppercase tracking-wider text-gray-400 mt-1">
                {selectedSport === 'Ride' ? 'SPEED (KM/H)' : 'PACE (/KM)'}
              </Text>
            </View>
          </View>

          {/* Secondary Stats Grid: Elevation, Heart Rate, Calories */}
          <View className="flex-row justify-between items-center pt-6 pb-2">
            {/* Elevation */}
            <View className="items-center flex-1">
              <View className="flex-row items-baseline">
                <Text className="text-2xl font-black text-gray-900">
                  {activeRecording.elevationGainMeters}
                </Text>
                <Text className="text-xs font-bold text-gray-500 ml-1">m</Text>
              </View>
              <Text className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mt-1">
                ELEVATION
              </Text>
            </View>

            {/* Heart Rate */}
            <View className="items-center flex-1">
              <View className="flex-row items-center">
                <Text className="text-2xl font-black text-gray-900">
                  {activeRecording.currentHeartRate > 0 ? activeRecording.currentHeartRate : '--'}
                </Text>
                <Ionicons name="heart" size={14} color="#EF4444" style={{ marginLeft: 4 }} />
              </View>
              <Text className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mt-1">
                HEART RATE
              </Text>
            </View>

            {/* Calories */}
            <View className="items-center flex-1">
              <View className="flex-row items-baseline">
                <Text className="text-2xl font-black text-gray-900">
                  {estimatedCalories}
                </Text>
                <Text className="text-xs font-bold text-gray-500 ml-1">kcal</Text>
              </View>
              <Text className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mt-1">
                CALORIES
              </Text>
            </View>
          </View>
        </View>

        {/* GPS Sensor Status Bar */}
        <View className="flex-row items-center justify-center space-x-2 py-2">
          <View
            className={`w-2.5 h-2.5 rounded-full mr-2 ${
              activeRecording.gpsSignal === 'strong' || activeRecording.gpsSignal === 'good'
                ? 'bg-emerald-500'
                : 'bg-amber-500'
            }`}
          />
          <Text className="text-xs font-bold text-gray-600">
            {activeRecording.gpsSignal === 'strong'
              ? 'GPS Signal Strong'
              : activeRecording.gpsSignal === 'good'
              ? 'GPS Signal Good'
              : 'Acquiring GPS...'}
          </Text>
        </View>

        {/* Bottom Primary Action Controls */}
        <View className="w-full pb-4">
          {!isRecording ? (
            /* Start Workout Button */
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => startRecording(selectedSport)}
              className="w-full py-5 bg-[#FC4C02] rounded-full flex-row items-center justify-center shadow-xl active:bg-[#E03A00]">
              <Ionicons name="play" size={24} color="#FFFFFF" />
              <Text className="text-lg font-black text-white ml-2 tracking-wide uppercase">
                START {selectedSport}
              </Text>
            </TouchableOpacity>
          ) : !isPaused ? (
            /* Active Recording: Pause Button */
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={pauseRecording}
              className="w-full py-5 bg-[#FC4C02] rounded-full flex-row items-center justify-center shadow-xl active:bg-[#E03A00]">
              <Ionicons name="pause" size={24} color="#FFFFFF" />
              <Text className="text-lg font-black text-white ml-2 tracking-wide uppercase">
                PAUSE
              </Text>
            </TouchableOpacity>
          ) : (
            /* Paused State: Resume (Orange) and Finish (Black) side-by-side */
            <View className="space-y-3">
              <View className="flex-row space-x-3">
                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={resumeRecording}
                  className="flex-1 py-4.5 bg-[#FC4C02] rounded-full flex-row items-center justify-center shadow-lg mr-3 active:bg-[#E03A00]">
                  <Ionicons name="play" size={20} color="#FFFFFF" />
                  <Text className="text-base font-black text-white ml-2 uppercase">RESUME</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={handleFinish}
                  className="flex-1 py-4.5 bg-gray-950 rounded-full flex-row items-center justify-center shadow-lg active:bg-gray-800">
                  <Ionicons name="square" size={18} color="#FFFFFF" />
                  <Text className="text-base font-black text-white ml-2 uppercase">FINISH</Text>
                </TouchableOpacity>
              </View>

              {/* Discard Workout Link */}
              <TouchableOpacity onPress={handleDiscard} className="items-center py-2 mt-2">
                <Text className="text-xs font-bold text-red-600">Discard Activity</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>

      {/* Sport Picker & Settings Modals */}
      <SportPickerModal
        visible={showSportPicker}
        onClose={() => setShowSportPicker(false)}
        selectedSport={selectedSport}
        onSelectSport={(s) => setSelectedSport(s)}
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
