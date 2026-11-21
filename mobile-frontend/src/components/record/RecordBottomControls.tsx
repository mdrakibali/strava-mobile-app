import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { AppText } from '../../design';
import { SportConfig } from '../../lib/sports';
import { LifecycleStatus } from '../../tracking/shared';

interface RecordBottomControlsProps {
  status: LifecycleStatus;
  sportConfig: SportConfig;
  starting: boolean;
  gpsDisabled: boolean;
  hasPlannedRoute: boolean;
  onOpenSportSheet: () => void;
  onStart: () => void;
  onPause: () => void;
  onResume: () => void;
  onFinish: () => void;
  onOpenRoutes: () => void;
}

export function RecordBottomControls({
  status,
  sportConfig: cfg,
  starting,
  gpsDisabled,
  hasPlannedRoute,
  onOpenSportSheet,
  onStart,
  onPause,
  onResume,
  onFinish,
  onOpenRoutes,
}: RecordBottomControlsProps) {
  const isIdle = status === 'idle' || status === 'preparing';
  const isPaused = status === 'paused';

  if (isIdle) {
    return (
      <View className="py-2 items-center justify-center">
        <Pressable
          onPress={onStart}
          disabled={starting || gpsDisabled}
          accessibilityRole="button"
          accessibilityLabel={`Start ${cfg.label}`}
          className="w-20 h-20 rounded-full bg-[#FC4C02] items-center justify-center shadow-xl active:bg-[#E03A00] border-2 border-orange-400/30">
          <Ionicons name="play" size={38} color="#FFFFFF" className="ml-1" />
        </Pressable>
      </View>
    );
  }

  if (isPaused) {
    // Screenshot 7: Side-by-side Orange Resume and Black Finish buttons
    return (
      <View className="flex-row items-center gap-3 py-1 mx-2">
        <Pressable
          onPress={onResume}
          accessibilityRole="button"
          accessibilityLabel="Resume recording"
          className="flex-1 h-14 rounded-full bg-[#FC4C02] flex-row items-center justify-center shadow-lg active:bg-[#E03A00]">
          <Ionicons name="play" size={24} color="#FFFFFF" />
          <Text style={{ color: '#FFFFFF' }} className="text-base font-black ml-2">Resume</Text>
        </Pressable>
        <Pressable
          onPress={onFinish}
          accessibilityRole="button"
          accessibilityLabel="Finish recording"
          className="flex-1 h-14 rounded-full bg-black flex-row items-center justify-center shadow-lg active:bg-gray-900">
          <Ionicons name="square" size={18} color="#FFFFFF" />
          <Text style={{ color: '#FFFFFF' }} className="text-base font-black ml-2">Finish</Text>
        </Pressable>
      </View>
    );
  }

  // Screenshot 6: Huge Orange Pause Pill
  return (
    <View className="py-1 mx-2">
      <Pressable
        onPress={onPause}
        accessibilityRole="button"
        accessibilityLabel="Pause recording"
        className="h-14 rounded-full bg-[#FC4C02] flex-row items-center justify-center shadow-lg active:bg-[#E03A00]">
        <Ionicons name="pause" size={24} color="#FFFFFF" />
        <Text style={{ color: '#FFFFFF' }} className="text-base font-black ml-2">Pause</Text>
      </Pressable>
    </View>
  );
}
