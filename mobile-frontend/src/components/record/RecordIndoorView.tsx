import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText } from '../../design';

interface RecordIndoorViewProps {
  status: 'idle' | 'preparing' | 'recording' | 'paused';
  time: string;
  heartRate?: number | string | null;
  onBack: () => void;
  onSettings: () => void;
  onStart: () => void;
  onPause: () => void;
  onResume: () => void;
  onFinish: () => void;
}

export function RecordIndoorView({
  status,
  time,
  heartRate,
  onBack,
  onSettings,
  onStart,
  onPause,
  onResume,
  onFinish,
}: RecordIndoorViewProps) {
  const insets = useSafeAreaInsets();
  const isPaused = status === 'paused';
  const isIdle = status === 'idle' || status === 'preparing';

  return (
    <View className="flex-1 bg-white justify-between">
      {/* Top Header */}
      {isPaused ? (
        // Stopped Yellow Header (Screenshot 5)
        <View
          style={{ paddingTop: Math.max(insets.top, 16) }}
          className="bg-[#FFCC00] pb-4 px-4 shadow-sm">
          <AppText className="text-black text-center text-sm font-bold mb-1">
            Stopped
          </AppText>
          <View className="flex-row items-center justify-between">
            <Pressable
              onPress={onBack}
              hitSlop={12}
              className="w-10 h-10 items-center justify-center active:opacity-60"
              accessibilityLabel="Back">
              <Ionicons name="chevron-back" size={28} color="#000000" />
            </Pressable>

            <AppText className="text-black text-5xl font-black tracking-tight">
              {time}
            </AppText>

            <Pressable
              onPress={onSettings}
              hitSlop={12}
              className="w-10 h-10 items-center justify-center active:opacity-60"
              accessibilityLabel="Settings">
              <Ionicons name="settings-outline" size={26} color="#000000" />
            </Pressable>
          </View>
        </View>
      ) : (
        // Active / Idle White Header (Screenshot 4)
        <View
          style={{ paddingTop: Math.max(insets.top, 16) }}
          className="bg-white pb-4 px-4 flex-row items-center justify-between">
          <Pressable
            onPress={onBack}
            hitSlop={12}
            className="w-10 h-10 items-center justify-center active:opacity-60"
            accessibilityLabel="Back">
            <Ionicons name="chevron-back" size={28} color="#000000" />
          </Pressable>

          <AppText className="text-black text-5xl font-black tracking-tight">
            {time}
          </AppText>

          <Pressable
            onPress={onSettings}
            hitSlop={12}
            className="w-10 h-10 items-center justify-center active:opacity-60"
            accessibilityLabel="Settings">
            <Ionicons name="settings-outline" size={26} color="#000000" />
          </Pressable>
        </View>
      )}

      {/* Middle Sensor Display: Heart Rate (Screenshot 4 & 5) */}
      <View className="items-center justify-center my-auto">
        <AppText className="text-black text-4xl font-black tracking-widest mb-3">
          {heartRate ?? '— —'}
        </AppText>
        <Ionicons name="heart" size={26} color="#EF4444" />
      </View>

      {/* Bottom Controls */}
      <View
        style={{ paddingBottom: Math.max(insets.bottom, 16) + 12 }}
        className="bg-white px-5 pt-3 border-t border-gray-100 shadow-xl">
        <View className="self-center w-10 h-1 rounded-full bg-gray-300 mb-4" />

        {isIdle ? (
          <Pressable
            onPress={onStart}
            accessibilityRole="button"
            accessibilityLabel="Start Workout"
            className="h-14 rounded-full bg-[#FC4C02] flex-row items-center justify-center shadow-lg active:bg-[#E03A00]">
            <Ionicons name="play" size={24} color="#FFFFFF" />
            <AppText className="text-white text-base font-black ml-2">Start Workout</AppText>
          </Pressable>
        ) : isPaused ? (
          <View className="flex-row items-center gap-3">
            <Pressable
              onPress={onResume}
              accessibilityRole="button"
              accessibilityLabel="Resume Workout"
              className="flex-1 h-14 rounded-full bg-[#FC4C02] flex-row items-center justify-center shadow-lg active:bg-[#E03A00]">
              <Ionicons name="play" size={24} color="#FFFFFF" />
              <AppText className="text-white text-base font-black ml-2">Resume</AppText>
            </Pressable>
            <Pressable
              onPress={onFinish}
              accessibilityRole="button"
              accessibilityLabel="Finish Workout"
              className="flex-1 h-14 rounded-full bg-black flex-row items-center justify-center shadow-lg active:bg-gray-900">
              <Ionicons name="square" size={18} color="#FFFFFF" />
              <AppText className="text-white text-base font-black ml-2">Finish</AppText>
            </Pressable>
          </View>
        ) : (
          <Pressable
            onPress={onPause}
            accessibilityRole="button"
            accessibilityLabel="Pause Workout"
            className="h-14 rounded-full bg-[#FC4C02] flex-row items-center justify-center shadow-lg active:bg-[#E03A00]">
            <Ionicons name="pause" size={24} color="#FFFFFF" />
            <AppText className="text-white text-base font-black ml-2">Pause</AppText>
          </Pressable>
        )}
      </View>
    </View>
  );
}
