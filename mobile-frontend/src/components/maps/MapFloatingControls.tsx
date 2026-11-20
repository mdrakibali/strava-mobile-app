import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, View } from 'react-native';
import { AppText } from '../../design';

interface MapFloatingControlsProps {
  topOffset: number;
  pitch: number;
  onTogglePitch: () => void;
  onOpenLayers: () => void;
  onRecenter: () => void;
  onCreateRoute: () => void;
}

export function MapFloatingControls({
  topOffset,
  pitch,
  onTogglePitch,
  onOpenLayers,
  onRecenter,
  onCreateRoute,
}: MapFloatingControlsProps) {
  return (
    <>
      {/* Right Circular Controls Stack */}
      <View
        style={{ top: topOffset }}
        className="absolute right-4 items-center gap-2.5 z-20"
        pointerEvents="box-none">
        {/* Compass Button */}
        <Pressable
          onPress={onRecenter}
          accessibilityRole="button"
          accessibilityLabel="Compass North"
          className="w-11 h-11 rounded-full bg-white border border-gray-200 items-center justify-center shadow-md active:bg-gray-50">
          <Ionicons name="compass-outline" size={22} color="#DC2626" />
        </Pressable>

        {/* Map Layers (with badge 2) */}
        <Pressable
          onPress={onOpenLayers}
          accessibilityRole="button"
          accessibilityLabel="Map Layers"
          className="w-11 h-11 rounded-full bg-white border border-gray-200 items-center justify-center shadow-md active:bg-gray-50 relative">
          <Ionicons name="layers-outline" size={20} color="#111827" />
          <View className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-black items-center justify-center border border-white">
            <AppText className="text-white text-[9px] font-black">2</AppText>
          </View>
        </Pressable>

        {/* 3D Tilt Toggle */}
        <Pressable
          onPress={onTogglePitch}
          accessibilityRole="button"
          accessibilityLabel="Toggle 3D View"
          className={`w-11 h-11 rounded-full border items-center justify-center shadow-md active:bg-gray-50 ${
            pitch > 0 ? 'bg-orange-50 border-[#FC4C02]' : 'bg-white border-gray-200'
          }`}>
          <AppText
            className={`text-xs font-black ${
              pitch > 0 ? 'text-[#FC4C02]' : 'text-gray-900'
            }`}>
            3D
          </AppText>
        </Pressable>

        {/* Locate Crosshair */}
        <Pressable
          onPress={onRecenter}
          accessibilityRole="button"
          accessibilityLabel="Recenter on my location"
          className="w-11 h-11 rounded-full bg-white border border-gray-200 items-center justify-center shadow-md active:bg-gray-50">
          <Ionicons name="locate-outline" size={20} color="#111827" />
        </Pressable>
      </View>

      {/* Floating "+ Create Route" Button */}
      <View className="absolute right-4 bottom-44 z-20" pointerEvents="box-none">
        <Pressable
          onPress={onCreateRoute}
          accessibilityRole="button"
          accessibilityLabel="Create Route"
          className="flex-row items-center bg-white px-4 py-2.5 rounded-full border border-gray-200 shadow-md active:bg-gray-50">
          <Ionicons name="create-outline" size={16} color="#111827" />
          <AppText className="text-gray-900 text-xs font-bold ml-1.5">
            Create Route
          </AppText>
        </Pressable>
      </View>
    </>
  );
}

