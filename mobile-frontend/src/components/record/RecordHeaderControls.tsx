import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, View } from 'react-native';
import { AppText } from '../../design';

interface RecordHeaderControlsProps {
  topInset: number;
  isIdle: boolean;
  following: boolean;
  pitch: number;
  onBack: () => void;
  onOpenHeatmap: () => void;
  onOpenSettings: () => void;
  onOpenLayers: () => void;
  onTogglePitch: () => void;
  onRecenter: () => void;
}

export function RecordHeaderControls({
  topInset,
  isIdle,
  following,
  pitch,
  onBack,
  onOpenHeatmap,
  onOpenSettings,
  onOpenLayers,
  onTogglePitch,
  onRecenter,
}: RecordHeaderControlsProps) {
  return (
    <>
      {/* Top Header Row */}
      <View
        style={{ top: topInset + 8 }}
        className="absolute left-4 right-4 flex-row items-center justify-between z-20"
        pointerEvents="box-none">
        <Pressable
          onPress={onBack}
          accessibilityLabel="Back"
          className="w-11 h-11 rounded-full bg-white border border-gray-200 shadow-md items-center justify-center active:bg-gray-50">
          <Ionicons name="chevron-back" size={24} color="#111827" />
        </Pressable>

        {isIdle ? (
          <Pressable
            onPress={onOpenHeatmap}
            accessibilityLabel="Heatmap"
            className="flex-row items-center bg-black/90 px-3.5 py-1.5 rounded-full border border-gray-700 shadow-xl">
            <View className="w-5 h-5 rounded-full bg-[#FC4C02] items-center justify-center mr-1.5 shadow-sm">
              <Ionicons name="flame" size={12} color="#FFFFFF" />
            </View>
            <View>
              <AppText className="text-white text-[11px] font-bold">See what's popular</AppText>
              <AppText className="text-gray-300 text-[9px]">Tap to add weekly Heatmap</AppText>
            </View>
          </Pressable>
        ) : null}

        <Pressable
          onPress={onOpenSettings}
          accessibilityLabel="Settings"
          className="w-11 h-11 rounded-full bg-white border border-gray-200 shadow-md items-center justify-center active:bg-gray-50">
          <Ionicons name="settings-outline" size={20} color="#111827" />
        </Pressable>
      </View>

      {/* Right Map Tools */}
      <View
        style={{ top: topInset + 72 }}
        className="absolute right-4 items-center gap-2.5 z-20"
        pointerEvents="box-none">
        <Pressable
          onPress={onOpenLayers}
          accessibilityLabel="Layers"
          className="w-11 h-11 rounded-full bg-white border border-gray-200 items-center justify-center shadow-md active:bg-gray-50 relative">
          <Ionicons name="layers-outline" size={20} color="#111827" />
          <View className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-black items-center justify-center border border-white">
            <AppText className="text-white text-[9px] font-black">2</AppText>
          </View>
        </Pressable>

        <Pressable
          onPress={onTogglePitch}
          accessibilityLabel="3D"
          className={`w-11 h-11 rounded-full border items-center justify-center shadow-md active:bg-gray-50 ${
            pitch > 0 ? 'bg-orange-50 border-[#FC4C02]' : 'bg-white border-gray-200'
          }`}>
          <AppText className={`text-xs font-black ${pitch > 0 ? 'text-[#FC4C02]' : 'text-gray-900'}`}>
            3D
          </AppText>
        </Pressable>

        <Pressable
          onPress={onRecenter}
          accessibilityLabel="Recenter"
          className={`w-11 h-11 rounded-full border items-center justify-center shadow-md active:bg-gray-50 ${
            following ? 'bg-white border-gray-200' : 'bg-[#FC4C02] border-[#FC4C02]'
          }`}>
          <Ionicons name="locate-outline" size={20} color={following ? '#111827' : '#FFFFFF'} />
        </Pressable>
      </View>
    </>
  );
}
