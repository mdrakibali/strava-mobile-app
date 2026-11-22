import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import React from 'react';
import { Modal, Pressable, ScrollView, View } from 'react-native';
import { AppText } from '../../design';
import { kmValue } from '../../lib/format';
import { MapItem } from './mapTypes';

interface RouteDetailModalProps {
  visible: boolean;
  item: MapItem | null;
  onClose: () => void;
  onStartRoute: (item: MapItem) => void;
  onToggleSave: (item: MapItem) => void;
}

export function RouteDetailModal({
  visible,
  item,
  onClose,
  onStartRoute,
  onToggleSave,
}: RouteDetailModalProps) {
  if (!item) return null;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View className="flex-1 justify-end bg-black/40">
        <View className="bg-white rounded-t-3xl max-h-[85%] pb-8 pt-3 shadow-2xl">
          {/* Drag Handle */}
          <View className="w-10 h-1 bg-gray-300 rounded-full self-center mb-3" />

          {/* Header Row */}
          <View className="flex-row items-center justify-between px-5 pb-3 border-b border-gray-100">
            <View className="flex-1 mr-3">
              <AppText className="text-gray-900 text-lg font-black" numberOfLines={1}>
                {item.name}
              </AppText>
              <AppText className="text-gray-500 text-xs mt-0.5">
                Created by {item.creatorName || 'Strava Athlete'}
              </AppText>
            </View>
            <View className="flex-row items-center gap-2">
              <Pressable
                onPress={() => onToggleSave(item)}
                className="w-10 h-10 rounded-full bg-gray-100 items-center justify-center active:bg-gray-200">
                <Ionicons
                  name={item.saved ? 'bookmark' : 'bookmark-outline'}
                  size={20}
                  color={item.saved ? '#FC4C02' : '#111827'}
                />
              </Pressable>
              <Pressable
                onPress={onClose}
                className="w-10 h-10 rounded-full bg-gray-100 items-center justify-center active:bg-gray-200">
                <Ionicons name="close" size={20} color="#111827" />
              </Pressable>
            </View>
          </View>

          <ScrollView className="px-5 pt-4">
            {/* Photos */}
            {item.photos && item.photos.length > 0 ? (
              <Image
                source={{ uri: item.photos[0] }}
                className="w-full h-44 rounded-2xl bg-gray-100 mb-4"
                contentFit="cover"
              />
            ) : null}

            {/* Metrics Row */}
            <View className="flex-row items-center justify-between bg-gray-50 rounded-2xl p-4 mb-4 border border-gray-200">
              <View className="items-center flex-1">
                <AppText className="text-gray-900 text-xl font-black">
                  {kmValue(item.distanceMeters)} km
                </AppText>
                <AppText className="text-gray-500 text-[11px] font-bold uppercase mt-0.5">
                  Distance
                </AppText>
              </View>
              <View className="w-[1px] h-8 bg-gray-200" />
              <View className="items-center flex-1">
                <AppText className="text-gray-900 text-xl font-black">
                  {item.elevationGainMeters} m
                </AppText>
                <AppText className="text-gray-500 text-[11px] font-bold uppercase mt-0.5">
                  Elevation
                </AppText>
              </View>
              <View className="w-[1px] h-8 bg-gray-200" />
              <View className="items-center flex-1">
                <AppText className="text-gray-900 text-xl font-black">
                  {item.estTimeText || '45m'}
                </AppText>
                <AppText className="text-gray-500 text-[11px] font-bold uppercase mt-0.5">
                  Est. Time
                </AppText>
              </View>
            </View>

            {/* Surface Breakdown */}
            <View className="bg-gray-50 rounded-2xl p-4 mb-4 border border-gray-200">
              <AppText className="text-gray-900 text-xs font-bold uppercase tracking-wider mb-2">
                Surface type
              </AppText>
              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center">
                  <View className="w-3 h-3 rounded-full bg-[#FC4C02] mr-2" />
                  <AppText className="text-gray-800 text-sm font-semibold">
                    Paved ({item.surfacePercentPaved}%)
                  </AppText>
                </View>
                <View className="flex-row items-center">
                  <View className="w-3 h-3 rounded-full bg-gray-400 mr-2" />
                  <AppText className="text-gray-800 text-sm font-semibold">
                    Unpaved ({100 - item.surfacePercentPaved}%)
                  </AppText>
                </View>
              </View>
            </View>

            {/* Description */}
            <View className="mb-6">
              <AppText className="text-gray-900 text-xs font-bold uppercase tracking-wider mb-1">
                Description
              </AppText>
              <AppText className="text-gray-600 text-sm leading-relaxed">
                {item.description || 'Verified scenic community route in Dhaka.'}
              </AppText>
            </View>
          </ScrollView>

          {/* Action Button */}
          <View className="px-5 pt-2">
            <Pressable
              onPress={() => onStartRoute(item)}
              accessibilityRole="button"
              accessibilityLabel={`Start ${item.name}`}
              className="h-14 rounded-full bg-[#FC4C02] flex-row items-center justify-center shadow-lg active:bg-[#E03A00]">
              <Ionicons name="navigate" size={20} color="#FFFFFF" />
              <AppText className="text-white text-base font-black ml-2">Start Route</AppText>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

