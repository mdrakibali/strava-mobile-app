import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { AppText } from '../../design';

import { LifecycleStatus } from '../../tracking/shared';

interface RecordOutdoorHudProps {
  status: LifecycleStatus;
  sportLabel: string;
  gpsLabel: string;
  gpsColor: string;
  gpsBg: string;
  time: string;
  secondLabel: string;
  secondValue: string;
  distance: string;
  onExpandPress: () => void;
  onStatusAction?: () => void;
}

export function RecordOutdoorHud({
  status,
  sportLabel,
  gpsLabel,
  gpsColor,
  gpsBg,
  time,
  secondLabel,
  secondValue,
  distance,
  onExpandPress,
  onStatusAction,
}: RecordOutdoorHudProps) {
  const isPaused = status === 'paused';
  const isRecording = status === 'recording';

  return (
    <View className="mx-4 mb-2.5 bg-white rounded-2xl overflow-hidden shadow-xl border border-gray-200">
      {/* Top Banner Row */}
      {isPaused ? (
        // Bright Yellow "Stopped" Banner (Matching user screenshot 7)
        <View className="bg-[#FFCC00] flex-row items-center justify-between px-4 py-2 border-b border-amber-300">
          <View className="w-5" />
          <AppText className="text-black text-sm font-black tracking-wide">
            Stopped
          </AppText>
          <Pressable onPress={onExpandPress} hitSlop={10} accessibilityLabel="Expand metrics">
            <Ionicons name="expand-outline" size={18} color="#000000" />
          </Pressable>
        </View>
      ) : isRecording ? (
        // Recording Sport Title Row with live GPS status indicator
        <View>
          {gpsLabel !== 'GPS Acquired' ? (
            <View
              style={{ backgroundColor: gpsBg }}
              className="flex-row items-center justify-between px-4 py-1.5 border-b border-gray-100">
              <View className="flex-row items-center">
                <Ionicons
                  name={gpsLabel.includes('Lost') ? 'alert-circle' : 'cellular'}
                  size={14}
                  color={gpsColor}
                />
                <Text style={{ color: gpsColor }} className="text-xs font-bold tracking-wider ml-1.5">
                  {gpsLabel}
                </Text>
              </View>
              <Text style={{ color: gpsColor }} className="text-[11px] font-medium">
                {gpsLabel.includes('Lost') ? 'Move to open sky' : 'Tracking active'}
              </Text>
            </View>
          ) : null}
          <View className="flex-row items-center justify-between px-4 py-2 border-b border-gray-100 bg-white">
            <View className="flex-row items-center">
              <View className="w-2 h-2 rounded-full bg-emerald-500 mr-2" />
              <AppText className="text-gray-900 text-sm font-bold">
                {sportLabel}
              </AppText>
            </View>
            <Pressable onPress={onExpandPress} hitSlop={10} accessibilityLabel="Expand metrics">
              <Ionicons name="expand-outline" size={18} color="#111827" />
            </Pressable>
          </View>
        </View>
      ) : (
        // Idle GPS Status Banner (Matching user screenshot 9)
        <Pressable
          onPress={onStatusAction}
          disabled={!onStatusAction}
          className="flex-row items-center justify-between px-4 py-2 border-b border-gray-200 bg-[#0C2340]">
          <View className="flex-row items-center">
            <Ionicons name="cellular" size={14} color="#38BDF8" />
            <Text style={{ color: '#FFFFFF' }} className="text-xs font-bold tracking-wider ml-1.5">
              {gpsLabel}
            </Text>
          </View>
          <Pressable onPress={onExpandPress} hitSlop={10} accessibilityLabel="Expand metrics">
            <Ionicons name="expand-outline" size={18} color="#FFFFFF" />
          </Pressable>
        </Pressable>
      )}

      {/* 3 Telemetry Columns */}
      <View className="flex-row py-3.5 px-3 justify-around items-center bg-white">
        {/* Metric 1: Time */}
        <View className="items-center flex-1">
          <AppText className="text-gray-900 text-2xl font-black">{time}</AppText>
          <AppText className="text-gray-500 text-[11px] font-bold uppercase tracking-wider mt-0.5">
            Time
          </AppText>
        </View>

        <View className="w-[1px] h-8 bg-gray-200" />

        {/* Metric 2: Speed / Pace */}
        <View className="items-center flex-1">
          <AppText className="text-gray-900 text-2xl font-black">{secondValue}</AppText>
          <AppText
            className="text-gray-500 text-[11px] font-bold uppercase tracking-wider mt-0.5"
            numberOfLines={1}>
            {isRecording ? 'Split avg. (/km)' : secondLabel}
          </AppText>
        </View>

        <View className="w-[1px] h-8 bg-gray-200" />

        {/* Metric 3: Distance */}
        <View className="items-center flex-1">
          <AppText className="text-gray-900 text-2xl font-black">{distance}</AppText>
          <AppText className="text-gray-500 text-[11px] font-bold uppercase tracking-wider mt-0.5">
            Distance (km)
          </AppText>
        </View>
      </View>
    </View>
  );
}
