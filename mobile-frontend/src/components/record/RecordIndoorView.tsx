import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText } from '../../design';
import { LifecycleStatus } from '../../tracking/shared';

interface RecordIndoorViewProps {
  status: LifecycleStatus;
  time: string;
  sportLabel?: string;
  calories?: number;
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
  sportLabel = 'Workout',
  calories = 0,
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
        <View
          style={{ paddingTop: Math.max(insets.top, 16) }}
          className="bg-[#FFCC00] pb-4 px-4 shadow-sm"
        >
          <AppText className="text-black text-center text-sm font-bold mb-1">Stopped</AppText>
          <View className="flex-row items-center justify-between">
            <Pressable
              onPress={onBack}
              hitSlop={12}
              className="w-10 h-10 items-center justify-center active:opacity-60"
              accessibilityLabel="Back"
            >
              <Ionicons name="chevron-back" size={28} color="#000000" />
            </Pressable>
            <AppText className="text-black text-5xl font-black tracking-tight">{time}</AppText>
            <Pressable
              onPress={onSettings}
              hitSlop={12}
              className="w-10 h-10 items-center justify-center active:opacity-60"
              accessibilityLabel="Settings"
            >
              <Ionicons name="settings-outline" size={26} color="#000000" />
            </Pressable>
          </View>
        </View>
      ) : (
        <View
          style={{ paddingTop: Math.max(insets.top, 16) }}
          className="bg-white pb-4 px-4 flex-row items-center justify-between"
        >
          <Pressable
            onPress={onBack}
            hitSlop={12}
            className="w-10 h-10 items-center justify-center active:opacity-60"
            accessibilityLabel="Back"
          >
            <Ionicons name="chevron-back" size={28} color="#000000" />
          </Pressable>
          <AppText className="text-black text-5xl font-black tracking-tight">{time}</AppText>
          <Pressable
            onPress={onSettings}
            hitSlop={12}
            className="w-10 h-10 items-center justify-center active:opacity-60"
            accessibilityLabel="Settings"
          >
            <Ionicons name="settings-outline" size={26} color="#000000" />
          </Pressable>
        </View>
      )}

      {/* Middle Structured Fitness Metrics */}
      <View className="my-auto px-5">
        <View className="self-center flex-row items-center bg-orange-50 px-4 py-1.5 rounded-full border border-orange-200 mb-6">
          <Ionicons name="fitness" size={16} color="#FC4C02" />
          <Text className="text-xs font-bold text-[#FC4C02] ml-1.5">{sportLabel}</Text>
        </View>

        <View className="flex-row gap-3 mb-4">
          <View className="flex-1 bg-gray-50 border border-gray-200 rounded-3xl p-4 shadow-sm items-center">
            <View className="flex-row items-center">
              <Ionicons name="flame" size={18} color="#FC4C02" />
              <Text className="text-[11px] font-bold text-gray-500 uppercase tracking-wider ml-1">
                Est. Calories
              </Text>
            </View>
            <Text className="text-3xl font-black text-gray-900 mt-2 font-mono">
              {calories > 0 ? calories : '0'}
            </Text>
            <Text className="text-xs font-bold text-gray-400 mt-0.5">kcal</Text>
          </View>

          <View className="flex-1 bg-gray-50 border border-gray-200 rounded-3xl p-4 shadow-sm items-center">
            <View className="flex-row items-center">
              <Ionicons name="heart" size={18} color="#EF4444" />
              <Text className="text-[11px] font-bold text-gray-500 uppercase tracking-wider ml-1">
                Heart Rate
              </Text>
            </View>
            <Text className="text-3xl font-black text-gray-900 mt-2 font-mono">
              {heartRate ?? '— —'}
            </Text>
            <Text className="text-xs font-bold text-gray-400 mt-0.5">bpm</Text>
          </View>
        </View>

        {isPaused ? (
          <View className="p-4 rounded-2xl bg-amber-50 border border-amber-200">
            <Text className="text-xs font-bold text-amber-900">Workout Paused</Text>
            <Text className="text-[11px] text-amber-700 mt-0.5">
              Tap Resume to continue tracking or Finish to save this activity.
            </Text>
          </View>
        ) : isIdle ? (
          <View className="p-4 rounded-2xl bg-blue-50 border border-blue-200">
            <Text className="text-xs font-bold text-blue-900">Ready to Start</Text>
            <Text className="text-[11px] text-blue-700 mt-0.5">
              Tap Start Workout below when you are ready to begin your workout.
            </Text>
          </View>
        ) : (
          <View className="p-4 rounded-2xl bg-gray-50 border border-gray-200">
            <Text className="text-xs font-bold text-gray-900">Indoor Session Active</Text>
            <Text className="text-[11px] text-gray-500 mt-0.5">
              Continuous timer tracking your workout. Calories calculated in real time.
            </Text>
          </View>
        )}
      </View>

      {/* Bottom Controls */}
      <View
        style={{ paddingBottom: Math.max(insets.bottom, 16) + 12 }}
        className="bg-white px-5 pt-3 border-t border-gray-100 shadow-xl"
      >
        <View className="self-center w-10 h-1 rounded-full bg-gray-300 mb-4" />
        {isIdle ? (
          <Pressable
            onPress={onStart}
            accessibilityRole="button"
            accessibilityLabel="Start Workout"
            className="h-14 rounded-full bg-[#FC4C02] flex-row items-center justify-center shadow-lg active:bg-[#E03A00]"
          >
            <Ionicons name="play" size={24} color="#FFFFFF" />
            <Text style={{ color: '#FFFFFF' }} className="text-base font-black ml-2">
              Start Workout
            </Text>
          </Pressable>
        ) : isPaused ? (
          <View className="flex-row items-center gap-3">
            <Pressable
              onPress={onResume}
              accessibilityRole="button"
              accessibilityLabel="Resume Workout"
              className="flex-1 h-14 rounded-full bg-[#FC4C02] flex-row items-center justify-center shadow-lg active:bg-[#E03A00]"
            >
              <Ionicons name="play" size={24} color="#FFFFFF" />
              <Text style={{ color: '#FFFFFF' }} className="text-base font-black ml-2">
                Resume
              </Text>
            </Pressable>
            <Pressable
              onPress={onFinish}
              accessibilityRole="button"
              accessibilityLabel="Finish Workout"
              className="flex-1 h-14 rounded-full bg-black flex-row items-center justify-center shadow-lg active:bg-gray-900"
            >
              <Ionicons name="square" size={18} color="#FFFFFF" />
              <Text style={{ color: '#FFFFFF' }} className="text-base font-black ml-2">
                Finish
              </Text>
            </Pressable>
          </View>
        ) : (
          <Pressable
            onPress={onPause}
            accessibilityRole="button"
            accessibilityLabel="Pause Workout"
            className="h-14 rounded-full bg-[#FC4C02] flex-row items-center justify-center shadow-lg active:bg-[#E03A00]"
          >
            <Ionicons name="pause" size={24} color="#FFFFFF" />
            <Text style={{ color: '#FFFFFF' }} className="text-base font-black ml-2">
              Pause
            </Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}
