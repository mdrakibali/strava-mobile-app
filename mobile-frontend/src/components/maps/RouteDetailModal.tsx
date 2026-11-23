import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import React from 'react';
import { Linking, Modal, Pressable, ScrollView, View } from 'react-native';
import { ElevationProfile } from '../../components/activity/ElevationProfile';
import { AppText } from '../../design';
import { kmValue } from '../../lib/format';
import { MapItem } from './mapTypes';

interface RouteDetailModalProps {
  visible: boolean;
  item: MapItem | null;
  onClose: () => void;
  onStartRoute: (item: MapItem) => void;
  onToggleSave: (item: MapItem) => void;
  onExploreNearby?: (item: MapItem) => void;
}

export function RouteDetailModal({
  visible,
  item,
  onClose,
  onStartRoute,
  onToggleSave,
  onExploreNearby,
}: RouteDetailModalProps) {
  if (!item) return null;

  const router = useRouter();
  const isPlace = item.kind === 'place';

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
              <AppText className="text-gray-500 text-xs mt-0.5" numberOfLines={1}>
                {isPlace
                  ? item.placeCategory?.replace(/_/g, ' ').toUpperCase() + ' · OpenStreetMap'
                  : `Created by ${item.creatorName || 'Strava Athlete'}`}
              </AppText>
            </View>
            <View className="flex-row items-center gap-2">
              {!isPlace && (
                <Pressable
                  onPress={() => {
                    onClose();
                    router.push(`/routes/${item.id}`);
                  }}
                  accessibilityRole="button"
                  accessibilityLabel="View full route details"
                  className="px-2.5 py-1.5 rounded-full bg-orange-50 border border-orange-200 flex-row items-center active:bg-orange-100"
                >
                  <Ionicons name="expand-outline" size={14} color="#FC4C02" />
                  <AppText className="text-[#FC4C02] text-xs font-bold ml-1">Full</AppText>
                </Pressable>
              )}
              {!isPlace && (
                <Pressable
                  onPress={() => onToggleSave(item)}
                  accessibilityRole="button"
                  accessibilityLabel="Save route"
                  className="w-10 h-10 rounded-full bg-gray-100 items-center justify-center active:bg-gray-200"
                >
                  <Ionicons
                    name={item.saved ? 'bookmark' : 'bookmark-outline'}
                    size={20}
                    color={item.saved ? '#FC4C02' : '#111827'}
                  />
                </Pressable>
              )}
              <Pressable
                onPress={onClose}
                accessibilityRole="button"
                accessibilityLabel="Close modal"
                className="w-10 h-10 rounded-full bg-gray-100 items-center justify-center active:bg-gray-200"
              >
                <Ionicons name="close" size={20} color="#111827" />
              </Pressable>
            </View>
          </View>

          <ScrollView className="px-5 pt-4">
            {/* Photos if present */}
            {item.photos && item.photos.length > 0 ? (
              <Image
                source={{ uri: item.photos[0] }}
                className="w-full h-44 rounded-2xl bg-gray-100 mb-4"
                contentFit="cover"
              />
            ) : null}

            {isPlace ? (
              <>
                {/* Place Category & Location Card */}
                <View className="bg-emerald-50 rounded-2xl p-4 mb-4 border border-emerald-200">
                  <View className="flex-row items-center justify-between">
                    <View className="flex-row items-center">
                      <Ionicons name="leaf" size={18} color="#10B981" />
                      <AppText className="text-[#10B981] text-xs font-black ml-1.5 uppercase tracking-wider">
                        {item.placeCategory?.replace(/_/g, ' ') || 'Outdoor Space'}
                      </AppText>
                    </View>
                    <View className="px-2 py-0.5 rounded-full bg-white border border-emerald-200">
                      <AppText className="text-[#10B981] text-[10px] font-bold">
                        Verified OSM
                      </AppText>
                    </View>
                  </View>

                  {item.placeAddress ? (
                    <AppText className="text-gray-800 text-sm font-semibold mt-2">
                      {item.placeAddress}
                    </AppText>
                  ) : null}

                  {item.distanceFromMeM != null ? (
                    <View className="flex-row items-center mt-2">
                      <Ionicons name="locate-outline" size={14} color="#059669" />
                      <AppText className="text-emerald-800 text-xs font-bold ml-1">
                        {item.distanceFromMeM < 1000
                          ? `${Math.round(item.distanceFromMeM)} m away from your location`
                          : `${(item.distanceFromMeM / 1000).toFixed(1)} km away from your location`}
                      </AppText>
                    </View>
                  ) : null}
                </View>

                {/* OSM Info & Link */}
                {item.osmUrl ? (
                  <Pressable
                    onPress={() => Linking.openURL(item.osmUrl!)}
                    accessibilityRole="link"
                    className="flex-row items-center justify-between bg-gray-50 rounded-2xl p-4 mb-4 border border-gray-200"
                  >
                    <View className="flex-row items-center">
                      <Ionicons name="globe-outline" size={18} color="#4B5563" />
                      <AppText className="text-gray-700 text-xs font-bold ml-2">
                        View on OpenStreetMap
                      </AppText>
                    </View>
                    <Ionicons name="open-outline" size={16} color="#6B7280" />
                  </Pressable>
                ) : null}
              </>
            ) : (
              <>
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

                {/* Real Elevation Profile */}
                <View className="mb-4">
                  <ElevationProfile
                    samples={item.elevationProfile}
                    distanceMeters={item.distanceMeters}
                    gainMeters={item.elevationGainMeters}
                    height={100}
                  />
                </View>

                {/* Surface Breakdown */}
                <View className="bg-gray-50 rounded-2xl p-4 mb-4 border border-gray-200">
                  <AppText className="text-gray-900 text-xs font-bold uppercase tracking-wider mb-2">
                    Surface type
                  </AppText>
                  <View className="flex-row items-center justify-between">
                    <View className="flex-row items-center">
                      <View className="w-3 h-3 rounded-full bg-primary mr-2" />
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
                {item.description ? (
                  <View className="mb-4">
                    <AppText className="text-gray-900 text-xs font-bold uppercase tracking-wider mb-1">
                      Description
                    </AppText>
                    <AppText className="text-gray-600 text-sm leading-relaxed">
                      {item.description}
                    </AppText>
                  </View>
                ) : null}
              </>
            )}
          </ScrollView>

          {/* Action Button */}
          <View className="px-5 pt-2">
            <Pressable
              onPress={() => onStartRoute(item)}
              accessibilityRole="button"
              accessibilityLabel={isPlace ? `Get directions to ${item.name}` : `Start ${item.name}`}
              className="h-14 rounded-full bg-[#FC4C02] flex-row items-center justify-center shadow-lg active:bg-[#E03A00]"
            >
              <Ionicons name={isPlace ? 'navigate' : 'play'} size={20} color="#FFFFFF" />
              <AppText className="text-white text-base font-black ml-2">
                {isPlace ? 'Get Directions & Start Workout' : 'Start Workout with this Route'}
              </AppText>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}
