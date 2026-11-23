import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText, MetricTile } from '../../design';
import { DASH, formatClock, formatElevation } from '../../lib/format';
import { SportConfig } from '../../lib/sports';
import { LifecycleStatus } from '../../tracking/shared';
import { RecordBottomControls } from './RecordBottomControls';

interface RecordStatsFullscreenProps {
  sportConfig: SportConfig;
  time: string;
  secondLabel: string;
  secondValue: string;
  distance: string;
  movingTimeS: number;
  currentLabel: string;
  currentValue: string;
  elevGainM: number | null;
  calories: number | null;
  gpsLabel: string;
  gpsColor: string;
  gpsBg: string;
  trackingMode?: 'idle' | 'background' | 'foreground_only';
  status: LifecycleStatus;
  starting: boolean;
  gpsDisabled: boolean;
  hasPlannedRoute: boolean;
  onClose: () => void;
  onOpenSportSheet: () => void;
  onStart: () => void;
  onPause: () => void;
  onResume: () => void;
  onFinish: () => void;
  onOpenRoutes: () => void;
  onStatusAction?: () => void;
}

export function RecordStatsFullscreen({
  sportConfig: cfg,
  time,
  secondLabel,
  secondValue,
  distance,
  movingTimeS,
  currentLabel,
  currentValue,
  elevGainM,
  calories,
  gpsLabel,
  gpsColor,
  gpsBg,
  trackingMode,
  status,
  starting,
  gpsDisabled,
  hasPlannedRoute,
  onClose,
  onOpenSportSheet,
  onStart,
  onPause,
  onResume,
  onFinish,
  onOpenRoutes,
  onStatusAction,
}: RecordStatsFullscreenProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={{ paddingTop: insets.top }} className="flex-1 bg-white">
      {/* Top Header */}
      <View className="flex-row items-center px-4 h-14 justify-between border-b border-gray-100">
        <Pressable
          onPress={onClose}
          className="w-10 h-10 rounded-full bg-gray-100 items-center justify-center active:bg-gray-200"
        >
          <Ionicons name="chevron-down" size={24} color="#111827" />
        </Pressable>
        <AppText className="text-gray-900 text-base font-black uppercase tracking-wider">
          {cfg.label}
        </AppText>
        <Pressable
          onPress={onClose}
          className="w-10 h-10 rounded-full bg-gray-100 items-center justify-center active:bg-gray-200"
        >
          <Ionicons name="map-outline" size={20} color="#111827" />
        </Pressable>
      </View>

      {/* GPS Status Banner */}
      <Pressable
        onPress={onStatusAction}
        disabled={!onStatusAction}
        className="mx-4 mt-3 py-2 px-4 rounded-xl flex-row items-center justify-center bg-gray-100 border border-gray-200"
      >
        <Ionicons name="cellular" size={14} color={gpsColor} />
        <Text
          style={{ color: gpsColor }}
          className="text-xs font-black uppercase tracking-wider ml-1.5"
        >
          {gpsLabel}
        </Text>
      </Pressable>

      {trackingMode === 'foreground_only' ? (
        <View className="mx-4 mt-2 py-2 px-4 rounded-xl flex-row items-center justify-center bg-amber-50 border border-amber-200">
          <Ionicons name="warning-outline" size={14} color="#D97706" />
          <Text className="text-xs font-bold text-amber-800 ml-1.5">
            Foreground only · Keep app open to record
          </Text>
        </View>
      ) : null}

      {/* Grid of Display Metrics */}
      <View className="flex-1 justify-evenly px-5">
        <MetricTile label="Time" value={time} size="display" align="center" />
        <MetricTile label={secondLabel} value={secondValue} size="display" align="center" />
        <MetricTile label="Distance (km)" value={distance} size="display" align="center" />

        <View className="flex-row items-center mt-3">
          <MetricTile
            label="Moving time"
            value={formatClock(movingTimeS)}
            size="L"
            align="center"
            className="flex-1"
          />
          <MetricTile
            label={currentLabel}
            value={currentValue}
            size="L"
            align="center"
            className="flex-1"
          />
        </View>

        <View className="flex-row items-center mt-3">
          <MetricTile
            label="Elevation gain"
            value={formatElevation(elevGainM)}
            size="L"
            align="center"
            className="flex-1"
          />
          <MetricTile
            label="Calories (est.)"
            value={calories ? String(calories) : DASH}
            size="L"
            align="center"
            className="flex-1"
          />
        </View>
      </View>

      {/* Bottom Controls */}
      <View
        style={{ paddingBottom: Math.max(insets.bottom, 16) + 8 }}
        className="bg-white rounded-t-3xl px-5 pt-3 border-t border-gray-100 shadow-xl"
      >
        <View className="self-center w-10 h-1 rounded-full bg-gray-300 mb-3" />
        <RecordBottomControls
          status={status}
          sportConfig={cfg}
          starting={starting}
          gpsDisabled={gpsDisabled}
          hasPlannedRoute={hasPlannedRoute}
          onOpenSportSheet={onOpenSportSheet}
          onStart={onStart}
          onPause={onPause}
          onResume={onResume}
          onFinish={onFinish}
          onOpenRoutes={onOpenRoutes}
        />
      </View>
    </View>
  );
}
