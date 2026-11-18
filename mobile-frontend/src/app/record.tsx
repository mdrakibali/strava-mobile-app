import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  Alert,
  SafeAreaView,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { RouteMapPreview } from '../components/common/RouteMapPreview';
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
  const [autoPause, setAutoPause] = useState(true);

  const formatTime = (secs: number) => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    if (h > 0) {
      return `${h}:${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
    }
    return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const formatPace = () => {
    if (activeRecording.distanceMeters <= 50 || activeRecording.currentSpeedMps <= 0.1) {
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

  const handleStart = () => {
    startRecording(selectedSport);
  };

  const handleFinish = () => {
    finishRecording();
    router.push('/save-activity');
  };

  const handleDiscard = () => {
    Alert.alert('Discard Workout?', 'Are you sure you want to discard this recorded activity?', [
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

  const handleClose = () => {
    if (activeRecording.isRecording) {
      Alert.alert(
        'Recording Active',
        'Your workout is currently recording. Do you want to pause and minimize or discard?',
        [
          { text: 'Keep Recording', style: 'cancel' },
          {
            text: 'Minimize',
            onPress: () => router.back(),
          },
        ]
      );
    } else {
      router.back();
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      {/* Top Header */}
      <View className="flex-row justify-between items-center px-4 py-3 border-b border-gray-200">
        <TouchableOpacity className="p-1" onPress={handleClose}>
          <Ionicons name="close" size={24} color="#111827" />
        </TouchableOpacity>

        <View className="flex-row bg-gray-100 rounded-full p-1 gap-1">
          {(['Run', 'Ride', 'Hike', 'Walk'] as SportType[]).map((sport) => (
            <TouchableOpacity
              key={sport}
              className={`px-3 py-1 rounded-full ${
                selectedSport === sport ? 'bg-[#FC4C02]' : ''
              }`}
              onPress={() => !activeRecording.isRecording && setSelectedSport(sport)}>
              <Text
                className={`text-xs font-bold ${
                  selectedSport === sport ? 'text-white' : 'text-gray-600'
                }`}>
                {sport}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity className="p-1">
          <Ionicons name="cog-outline" size={22} color="#111827" />
        </TouchableOpacity>
      </View>

      {/* Cockpit Digital Metrics */}
      <View className="p-4">
        {/* Main Distance */}
        <View className="items-center mb-4">
          <Text className="text-xs font-bold text-gray-400 tracking-widest mb-1">
            DISTANCE (KM)
          </Text>
          <Text className="text-7xl font-black text-gray-900 font-mono">
            {(activeRecording.distanceMeters / 1000).toFixed(2)}
          </Text>
        </View>

        <View className="flex-row justify-between mb-3 border-t border-gray-100 pt-3">
          <View className="flex-1 items-center">
            <Text className="text-xs font-bold text-gray-400 tracking-wider mb-1">TIME</Text>
            <Text className="text-3xl font-black text-gray-900 font-mono">
              {formatTime(activeRecording.movingSeconds)}
            </Text>
          </View>

          <View className="flex-1 items-center">
            <Text className="text-xs font-bold text-gray-400 tracking-wider mb-1">
              {selectedSport === 'Ride' ? 'SPEED' : 'CURRENT PACE'}
            </Text>
            <Text className="text-3xl font-black text-gray-900 font-mono">
              {formatPace()}
            </Text>
          </View>
        </View>

        <View className="flex-row justify-between mb-2 border-t border-gray-100 pt-3">
          <View className="flex-1 items-center">
            <Text className="text-xs font-bold text-gray-400 tracking-wider mb-1">ELEV GAIN</Text>
            <Text className="text-2xl font-black text-gray-900 font-mono">
              +{activeRecording.elevationGainMeters} m
            </Text>
          </View>

          <View className="flex-1 items-center">
            <Text className="text-xs font-bold text-gray-400 tracking-wider mb-1">HEART RATE</Text>
            <View className="flex-row items-center">
              <Ionicons name="heart" size={18} color="#EF4444" />
              <Text className="text-2xl font-black text-gray-900 font-mono ml-1">
                {activeRecording.currentHeartRate > 0 ? `${activeRecording.currentHeartRate}` : '--'}
              </Text>
            </View>
          </View>
        </View>
      </View>

      {/* Mini-Map Trail Preview */}
      <View className="px-4 my-2">
        <RouteMapPreview height={140} points={activeRecording.routeCoordinates} />
      </View>

      {/* Auto-Pause Toggle */}
      <View className="flex-row justify-between items-center px-6 py-2">
        <Text className="text-xs text-gray-600 font-medium">
          Smart Auto-Pause (Threshold &lt; 0.8 m/s)
        </Text>
        <Switch
          value={autoPause}
          onValueChange={setAutoPause}
          trackColor={{ false: '#E5E7EB', true: '#FC4C02' }}
        />
      </View>

      {/* Tactile Control Buttons */}
      <View className="mt-auto p-6 pb-10">
        {!activeRecording.isRecording ? (
          <TouchableOpacity
            className="bg-[#FC4C02] h-14 rounded-full items-center justify-center shadow-lg"
            onPress={handleStart}
            activeOpacity={0.85}>
            <Text className="text-base font-black text-white tracking-wider">
              START {selectedSport.toUpperCase()}
            </Text>
          </TouchableOpacity>
        ) : (
          <View className="flex-row justify-between items-center gap-3">
            {activeRecording.isPaused ? (
              <>
                <TouchableOpacity
                  className="flex-[2] h-14 rounded-full bg-emerald-500 items-center justify-center flex-row gap-2"
                  onPress={resumeRecording}>
                  <Ionicons name="play" size={24} color="#FFFFFF" />
                  <Text className="text-base font-black text-white">RESUME</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  className="flex-[2] h-14 rounded-full bg-[#FC4C02] items-center justify-center flex-row gap-2"
                  onPress={handleFinish}>
                  <Ionicons name="flag" size={22} color="#FFFFFF" />
                  <Text className="text-base font-black text-white">FINISH</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  className="w-14 h-14 rounded-full bg-red-100 border border-red-300 items-center justify-center"
                  onPress={handleDiscard}>
                  <Ionicons name="trash-outline" size={22} color="#EF4444" />
                </TouchableOpacity>
              </>
            ) : (
              <TouchableOpacity
                className="flex-1 h-14 rounded-full bg-amber-500 items-center justify-center flex-row gap-2"
                onPress={pauseRecording}>
                <Ionicons name="pause" size={26} color="#FFFFFF" />
                <Text className="text-base font-black text-white">PAUSE</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}
