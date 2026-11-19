import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { Alert, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MapStyleKey, StravaMapView } from '../components/map/StravaMapView';
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
  const [mapStyle, setMapStyle] = useState<MapStyleKey>('positron');
  const [beaconToken, setBeaconToken] = useState<string | null>(null);
  const [isBeaconActive, setIsBeaconActive] = useState(false);
  const [previewLocation, setPreviewLocation] = useState<[number, number] | null>(null);
  const lastPingTimeRef = useRef<number>(0);

  // Fetch initial GPS coordinate immediately when opening screen
  useEffect(() => {
    let sub: Location.LocationSubscription | null = null;
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
          sub = await Location.watchPositionAsync(
            { accuracy: Location.Accuracy.High, distanceInterval: 5 },
            (newLoc) => {
              setPreviewLocation([newLoc.coords.longitude, newLoc.coords.latitude]);
            }
          );
        }
      } catch (err) {
        console.warn('Pre-record location error:', err);
      }
    })();
    return () => {
      sub?.remove();
    };
  }, []);

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

  // Format timer into HH:MM:SS
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

  const liveCoords: [number, number][] = activeRecording.routeCoordinates.map(
    (c) => [c.longitude, c.latitude] as [number, number]
  );
  const currentFix: [number, number] =
    liveCoords.length > 0
      ? liveCoords[liveCoords.length - 1]
      : previewLocation || [90.4125, 23.7745];

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

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
      {/* Top Navigation & Status Bar (Turns Yellow when Stopped/Paused) */}
      <View
        className={`px-4 py-3 flex-row items-center justify-between border-b ${
          isPaused && isRecording
            ? 'bg-[#FFC700] border-amber-400'
            : 'bg-white border-gray-100'
        }`}>
        <TouchableOpacity
          onPress={() => {
            if (isRecording) {
              Alert.alert('Recording in Progress', 'Pause or finish your activity to exit, or navigate back while tracking continues in background.', [
                { text: 'Keep Recording', style: 'cancel' },
                { text: 'Discard', style: 'destructive', onPress: handleDiscard },
              ]);
            } else {
              router.back();
            }
          }}
          className="p-1">
          <Ionicons name="chevron-back" size={26} color="#111827" />
        </TouchableOpacity>

        <View className="items-center">
          {isPaused && isRecording ? (
            <Text className="text-[10px] font-black uppercase tracking-widest text-gray-900">
              STOPPED
            </Text>
          ) : (
            <TouchableOpacity
              onPress={() => setShowSportPicker(true)}
              className="flex-row items-center bg-gray-100 px-3 py-1 rounded-full">
              <Text className="text-xs font-black text-gray-900 mr-1">{selectedSport}</Text>
              <Ionicons name="chevron-down" size={12} color="#4B5563" />
            </TouchableOpacity>
          )}
          {/* Big Bold Digital Timer */}
          <Text className="text-3xl font-black text-gray-900 tracking-tight mt-0.5">
            {formatTimerDigits(activeRecording.movingSeconds)}
          </Text>
        </View>

        <TouchableOpacity onPress={() => setShowSettings(true)} className="p-1">
          <Ionicons name="settings-outline" size={24} color="#111827" />
        </TouchableOpacity>
      </View>

      {/* Main Container: Map (Top) + Telemetry HUD (Bottom) */}
      <View className="flex-1 relative bg-stone-100">
        {/* Real Live Map View */}
        <View className="flex-1 w-full relative">
          <StravaMapView
            styleKey={mapStyle}
            centerCoordinate={currentFix}
            userLocation={currentFix}
            routeCoordinates={liveCoords.length >= 2 ? liveCoords : undefined}
            showControls={false}
            showUserLocation={true}
            mode="live-record"
            followUser={true}
            autoFitRoute={false}
            zoomLevel={17}
            className="w-full h-full"
          />

          {/* Floating GPS Signal Status Badge */}
          <View className="absolute top-3 left-4 bg-white/95 px-3 py-1.5 rounded-full border border-gray-200 flex-row items-center shadow-md">
            <View
              className={`w-2.5 h-2.5 rounded-full mr-2 ${
                activeRecording.gpsSignal === 'strong' || activeRecording.gpsSignal === 'good'
                  ? 'bg-emerald-500'
                  : 'bg-amber-500'
              }`}
            />
            <Text className="text-[11px] font-bold text-gray-800">
              {activeRecording.gpsSignal === 'strong'
                ? 'GPS Strong'
                : activeRecording.gpsSignal === 'good'
                ? 'GPS Good'
                : 'Locating GPS...'}
            </Text>
          </View>

          {/* Floating Map Style Selector */}
          <TouchableOpacity
            onPress={() =>
              setMapStyle((prev) =>
                prev === 'positron' ? 'voyager' : prev === 'voyager' ? 'dark' : 'positron'
              )
            }
            className="absolute top-3 right-4 w-10 h-10 bg-white/95 rounded-full items-center justify-center border border-gray-200 shadow-md">
            <Ionicons name="layers-outline" size={20} color="#111827" />
          </TouchableOpacity>

          {/* Floating Recenter / Locate Button */}
          <TouchableOpacity
            onPress={() => {
              if (currentFix) {
                setPreviewLocation([currentFix[0], currentFix[1]]);
              }
            }}
            className="absolute bottom-4 right-4 w-11 h-11 bg-white rounded-full items-center justify-center border border-gray-200 shadow-lg">
            <Ionicons name="locate" size={22} color="#FC4C02" />
          </TouchableOpacity>
        </View>

        {/* Bottom Telemetry HUD Card & Controls */}
        <View className="bg-white px-5 pt-4 pb-6 border-t border-gray-200 shadow-2xl">
          {/* Key Metrics Grid */}
          <View className="flex-row justify-between items-center py-2 border-b border-gray-100 mb-4">
            {/* Metric 1: Distance */}
            <View className="items-center flex-1">
              <Text className="text-3xl font-black text-gray-900">
                {(activeRecording.distanceMeters / 1000).toFixed(2)}
              </Text>
              <Text className="text-[10px] font-black uppercase tracking-wider text-gray-400 mt-0.5">
                Kilometers
              </Text>
            </View>

            <View className="w-[1px] h-10 bg-gray-200" />

            {/* Metric 2: Speed or Pace */}
            <View className="items-center flex-1">
              <Text className="text-3xl font-black text-gray-900">
                {selectedSport === 'Ride' ? speedKmh : currentPaceFormatted}
              </Text>
              <Text className="text-[10px] font-black uppercase tracking-wider text-gray-400 mt-0.5">
                {selectedSport === 'Ride' ? 'Speed (km/h)' : 'Pace (/km)'}
              </Text>
            </View>

            <View className="w-[1px] h-10 bg-gray-200" />

            {/* Metric 3: Heart Rate */}
            <View className="items-center flex-1">
              <View className="flex-row items-center">
                <Text className="text-3xl font-black text-gray-900">
                  {activeRecording.currentHeartRate > 0 ? activeRecording.currentHeartRate : '--'}
                </Text>
                <Ionicons name="heart" size={16} color="#EF4444" style={{ marginLeft: 3 }} />
              </View>
              <Text className="text-[10px] font-black uppercase tracking-wider text-gray-400 mt-0.5">
                Heart Rate
              </Text>
            </View>
          </View>

          {/* Secondary Telemetry: Elevation & Moving Time */}
          <View className="flex-row justify-around mb-5">
            <View className="flex-row items-center">
              <Ionicons name="trending-up" size={14} color="#6B7280" />
              <Text className="text-xs font-bold text-gray-700 ml-1.5">
                {activeRecording.elevationGainMeters} m Elevation
              </Text>
            </View>
            <View className="flex-row items-center">
              <Ionicons name="speedometer-outline" size={14} color="#6B7280" />
              <Text className="text-xs font-bold text-gray-700 ml-1.5">
                Avg: {selectedSport === 'Ride' ? `${(activeRecording.averageSpeedMps * 3.6).toFixed(1)} km/h` : currentPaceFormatted}
              </Text>
            </View>
          </View>

          {/* Primary Action Buttons */}
          {!isRecording ? (
            /* Start Workout Button */
            <TouchableOpacity
              onPress={() => startRecording(selectedSport)}
              className="w-full py-4.5 bg-[#FC4C02] rounded-full flex-row items-center justify-center shadow-lg active:bg-[#E03A00]">
              <Ionicons name="play" size={24} color="#FFFFFF" />
              <Text className="text-lg font-black text-white ml-2 tracking-wide">
                Start {selectedSport}
              </Text>
            </TouchableOpacity>
          ) : !isPaused ? (
            /* Active Recording: Pause Button */
            <TouchableOpacity
              onPress={pauseRecording}
              className="w-full py-4.5 bg-[#FC4C02] rounded-full flex-row items-center justify-center shadow-lg active:bg-[#E03A00]">
              <Ionicons name="pause" size={24} color="#FFFFFF" />
              <Text className="text-lg font-black text-white ml-2 tracking-wide">Pause</Text>
            </TouchableOpacity>
          ) : (
            /* Paused State: Resume (Orange) and Finish (Black) side-by-side */
            <View className="space-y-3">
              <View className="flex-row space-x-3">
                <TouchableOpacity
                  onPress={resumeRecording}
                  className="flex-1 py-4 bg-[#FC4C02] rounded-full flex-row items-center justify-center shadow-md mr-3 active:bg-[#E03A00]">
                  <Ionicons name="play" size={20} color="#FFFFFF" />
                  <Text className="text-base font-black text-white ml-2">Resume</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={handleFinish}
                  className="flex-1 py-4 bg-black rounded-full flex-row items-center justify-center shadow-md active:opacity-80">
                  <Ionicons name="square" size={18} color="#FFFFFF" />
                  <Text className="text-base font-black text-white ml-2">Finish</Text>
                </TouchableOpacity>
              </View>

              {/* Discard Workout Link */}
              <TouchableOpacity onPress={handleDiscard} className="items-center py-1 mt-2">
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
