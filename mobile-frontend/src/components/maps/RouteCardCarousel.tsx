import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import React, { RefObject } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Linking,
  Pressable,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { AppText } from '../../design';
import { kmValue } from '../../lib/format';
import { sportConfig } from '../../lib/sports';
import { MapItem, MapSource } from './mapTypes';

interface RouteCardCarouselProps {
  listRef: RefObject<FlatList<MapItem> | null>;
  items: MapItem[];
  selectedIndex: number;
  loading: boolean;
  source?: MapSource;
  hasActiveFilter?: boolean;
  locationStatus?: 'checking' | 'permission_denied' | 'services_off' | 'no_fix' | 'ready';
  nearbyStatus?: 'idle' | 'loading' | 'ready' | 'empty' | 'error';
  nearbyError?: string | null;
  onRetryNearby?: () => void;
  onRetryLocation?: () => void;
  onSelect: (index: number) => void;
  onOpenDetail: (item: MapItem) => void;
  onToggleSave: (item: MapItem) => void;
}

const getPlaceCategoryConfig = (category?: string) => {
  switch (category) {
    case 'park':
    case 'garden':
    case 'green_space':
      return { label: 'Park & Green Space', icon: 'leaf-outline' as const, color: '#10B981', bg: 'bg-emerald-50', border: 'border-emerald-200' };
    case 'playground':
      return { label: 'Playground', icon: 'happy-outline' as const, color: '#F59E0B', bg: 'bg-amber-50', border: 'border-amber-200' };
    case 'sports_ground':
      return { label: 'Sports Ground', icon: 'fitness-outline' as const, color: '#3B82F6', bg: 'bg-blue-50', border: 'border-blue-200' };
    case 'stadium':
      return { label: 'Stadium', icon: 'trophy-outline' as const, color: '#8B5CF6', bg: 'bg-purple-50', border: 'border-purple-200' };
    case 'track':
      return { label: 'Running Track', icon: 'speedometer-outline' as const, color: '#EF4444', bg: 'bg-rose-50', border: 'border-rose-200' };
    case 'cycleway':
    case 'cycle_route':
      return { label: 'Cycling Path', icon: 'bicycle-outline' as const, color: '#EC4899', bg: 'bg-pink-50', border: 'border-pink-200' };
    case 'trail':
    case 'hiking_route':
      return { label: 'Hiking Trail', icon: 'footsteps-outline' as const, color: '#D97706', bg: 'bg-amber-50', border: 'border-amber-300' };
    default:
      return { label: 'Outdoor Amenity', icon: 'location-outline' as const, color: '#FC4C02', bg: 'bg-orange-50', border: 'border-orange-200' };
  }
};

export function RouteCardCarousel({
  listRef,
  items,
  selectedIndex,
  loading,
  source = 'routes',
  hasActiveFilter = false,
  locationStatus = 'ready',
  nearbyStatus = 'idle',
  nearbyError = null,
  onRetryNearby,
  onRetryLocation,
  onSelect,
  onOpenDetail,
  onToggleSave,
}: RouteCardCarouselProps) {
  const { width } = useWindowDimensions();
  const cardWidth = width - 40;

  const emptyMessage =
    source === 'saved'
      ? 'No saved routes yet. Tap bookmark on any route to save it here.'
      : source === 'nearby'
        ? 'No outdoor places found within 10 km. Try selecting another sport or panning the map.'
        : hasActiveFilter
          ? 'No routes match your filter. Try adjusting your search query or sport filter.'
          : 'No routes discovered near your location yet. Start a workout to record a new route!';

  return (
    <View className="absolute left-0 right-0 bottom-2 z-20" pointerEvents="box-none">
      {loading ? (
        <View className="mx-4 p-5 rounded-2xl bg-white border border-gray-200 items-center justify-center shadow-lg">
          <ActivityIndicator color="#FC4C02" />
          <AppText className="text-gray-500 text-xs mt-2 font-medium">Discovering routes and places…</AppText>
        </View>
      ) : source === 'nearby' && locationStatus === 'permission_denied' ? (
        <View className="mx-4 p-5 rounded-2xl bg-white border border-red-200 items-center justify-center shadow-lg">
          <Ionicons name="lock-closed-outline" size={24} color="#EF4444" />
          <AppText className="text-gray-900 text-sm font-bold mt-1.5">Location Permission Needed</AppText>
          <AppText className="text-gray-500 text-xs mt-1 text-center">Grant location access in Settings to discover places near you.</AppText>
          <Pressable onPress={() => Linking.openSettings()} className="mt-3 bg-[#FC4C02] px-4 py-2 rounded-xl active:opacity-90">
            <Text className="text-xs font-bold text-white">Enable Location in Settings</Text>
          </Pressable>
        </View>
      ) : source === 'nearby' && locationStatus === 'services_off' ? (
        <View className="mx-4 p-5 rounded-2xl bg-white border border-amber-200 items-center justify-center shadow-lg">
          <Ionicons name="location-outline" size={24} color="#F59E0B" />
          <AppText className="text-gray-900 text-sm font-bold mt-1.5">Location Services Disabled</AppText>
          <AppText className="text-gray-500 text-xs mt-1 text-center">Turn on GPS on your device to discover routes and places near you.</AppText>
          <Pressable onPress={() => Linking.openSettings()} className="mt-3 bg-[#FC4C02] px-4 py-2 rounded-xl active:opacity-90">
            <Text className="text-xs font-bold text-white">Open Device Settings</Text>
          </Pressable>
        </View>
      ) : source === 'nearby' && locationStatus === 'no_fix' ? (
        <View className="mx-4 p-5 rounded-2xl bg-white border border-amber-200 items-center justify-center shadow-lg">
          <Ionicons name="navigate-outline" size={24} color="#F59E0B" />
          <AppText className="text-gray-900 text-sm font-bold mt-1.5">GPS Fix Unavailable</AppText>
          <AppText className="text-gray-500 text-xs mt-1 text-center">We couldn’t get a GPS fix. Move outdoors or near a window and retry.</AppText>
          {onRetryLocation ? (
            <Pressable onPress={onRetryLocation} className="mt-3 bg-[#FC4C02] px-4 py-2 rounded-xl active:opacity-90">
              <Text className="text-xs font-bold text-white">Retry GPS Fix</Text>
            </Pressable>
          ) : null}
        </View>
      ) : source === 'nearby' && nearbyStatus === 'error' ? (
        <View className="mx-4 p-5 rounded-2xl bg-white border border-red-200 items-center justify-center shadow-lg">
          <Ionicons name="cloud-offline-outline" size={24} color="#EF4444" />
          <AppText className="text-gray-900 text-sm font-bold mt-1.5">Nearby places temporarily unavailable</AppText>
          <AppText className="text-gray-500 text-xs mt-1 text-center">{nearbyError || 'Check your internet connection and try again.'}</AppText>
          {onRetryNearby ? (
            <Pressable onPress={onRetryNearby} className="mt-3 bg-[#FC4C02] px-4 py-2 rounded-xl active:opacity-90">
              <Text className="text-xs font-bold text-white">Retry</Text>
            </Pressable>
          ) : null}
        </View>
      ) : items.length === 0 ? (
        <View className="mx-4 p-5 rounded-2xl bg-white border border-gray-200 items-center justify-center shadow-lg">
          <AppText className="text-gray-900 text-sm font-bold">No results found</AppText>
          <AppText className="text-gray-500 text-xs mt-1 text-center">{emptyMessage}</AppText>
          {source === 'nearby' && onRetryNearby ? (
            <Pressable onPress={onRetryNearby} className="mt-3 bg-gray-100 px-4 py-2 rounded-xl active:opacity-90">
              <Text className="text-xs font-bold text-gray-700">Refresh</Text>
            </Pressable>
          ) : null}
        </View>
      ) : (
        <FlatList
          ref={listRef}
          data={items}
          horizontal
          keyExtractor={(i) => `${i.kind}:${i.id}`}
          showsHorizontalScrollIndicator={false}
          snapToInterval={cardWidth + 12}
          decelerationRate="fast"
          contentContainerStyle={{ paddingHorizontal: 16 }}
          onMomentumScrollEnd={(e) => {
            const idx = Math.round(e.nativeEvent.contentOffset.x / (cardWidth + 12));
            if (idx >= 0 && idx < items.length) {
              onSelect(idx);
            }
          }}
          renderItem={({ item, index }) => {
            const isSelected = index === selectedIndex;
            const isPlace = item.kind === 'place';
            const hasPhoto = item.photos && item.photos.length > 0;
            const placeCfg = isPlace ? getPlaceCategoryConfig(item.placeCategory) : null;
            const sport = sportConfig(item.sportType);

            return (
              <Pressable
                onPress={() => {
                  onSelect(index);
                  onOpenDetail(item);
                }}
                style={{ width: cardWidth, marginRight: 12 }}
                className={`bg-white rounded-2xl p-3 border shadow-lg flex-row items-center active:opacity-95 ${
                  isSelected ? 'border-[#FC4C02]' : 'border-gray-200'
                }`}>
                {/* Thumbnail */}
                {hasPhoto ? (
                  <Image
                    source={{ uri: item.photos[0] }}
                    className="w-24 h-24 rounded-xl bg-gray-100 mr-3"
                    contentFit="cover"
                    transition={150}
                  />
                ) : isPlace && placeCfg ? (
                  <View className={`w-24 h-24 rounded-xl ${placeCfg.bg} items-center justify-center mr-3 border ${placeCfg.border}`}>
                    <Ionicons name={placeCfg.icon} size={30} color={placeCfg.color} />
                    <AppText className="text-[10px] font-bold text-center mt-1 px-1" style={{ color: placeCfg.color }} numberOfLines={1}>
                      {placeCfg.label}
                    </AppText>
                  </View>
                ) : (
                  <View className="w-24 h-24 rounded-xl bg-orange-50 items-center justify-center mr-3 border border-orange-200">
                    <Ionicons name={sport.icon} size={30} color="#FC4C02" />
                    <AppText className="text-[10px] font-bold text-[#FC4C02] text-center mt-1">
                      {item.sportType}
                    </AppText>
                  </View>
                )}

                {/* Information */}
                <View className="flex-1 justify-between h-24 py-0.5">
                  <View className="flex-row items-start justify-between">
                    <AppText className="text-gray-900 text-sm font-bold flex-1 mr-2" numberOfLines={1}>
                      {item.name}
                    </AppText>
                    {!isPlace ? (
                      <Pressable
                        onPress={(e) => {
                          e.stopPropagation();
                          onToggleSave(item);
                        }}
                        hitSlop={8}
                        className="p-0.5">
                        <Ionicons
                          name={item.saved ? 'bookmark' : 'bookmark-outline'}
                          size={18}
                          color={item.saved ? '#FC4C02' : '#9CA3AF'}
                        />
                      </Pressable>
                    ) : (
                      <View className={`px-2 py-0.5 rounded-full ${placeCfg?.bg ?? 'bg-gray-100'} border ${placeCfg?.border ?? 'border-gray-200'}`}>
                        <AppText className="text-[10px] font-black" style={{ color: placeCfg?.color ?? '#4B5563' }}>
                          OSM
                        </AppText>
                      </View>
                    )}
                  </View>

                  {/* Metrics line or category line */}
                  {isPlace ? (
                    <View className="flex-row items-center">
                      <Ionicons name="location" size={13} color={placeCfg?.color ?? '#10B981'} />
                      <AppText className="text-gray-600 text-xs font-semibold ml-1" numberOfLines={1}>
                        {item.placeAddress || placeCfg?.label}
                      </AppText>
                    </View>
                  ) : (
                    <View className="flex-row items-center">
                      <Ionicons name={sport.icon} size={14} color="#FC4C02" />
                      <AppText className="text-gray-600 text-xs font-semibold ml-1.5" numberOfLines={1}>
                        {kmValue(item.distanceMeters)} km · {item.elevationGainMeters} m
                        {item.estTimeText ? ` · ${item.estTimeText}` : ''}
                      </AppText>
                    </View>
                  )}

                  {/* Distance from me */}
                  <View className="flex-row items-center justify-between">
                    <View className="flex-row items-center">
                      <Ionicons name="locate-outline" size={13} color="#6B7280" />
                      <AppText className="text-gray-500 text-[11px] font-medium ml-1">
                        {item.distanceFromMeM == null
                          ? 'Location needed'
                          : item.distanceFromMeM < 1500
                            ? 'Near you'
                            : item.distanceFromMeM < 10000
                              ? `${(item.distanceFromMeM / 1000).toFixed(1)} km away`
                              : `${Math.round(item.distanceFromMeM / 1000)} km away`}
                      </AppText>
                    </View>
                    <View className="flex-row items-center">
                      <AppText className="text-[#FC4C02] text-xs font-black mr-0.5">
                        {isPlace ? 'View on Map' : 'View'}
                      </AppText>
                      <Ionicons name="chevron-forward" size={13} color="#FC4C02" />
                    </View>
                  </View>

                  {/* Location badge or surface badge */}
                  <View className="flex-row items-center">
                    <Ionicons name={isPlace ? 'navigate-outline' : 'disc-outline'} size={12} color="#6B7280" />
                    <AppText className="text-gray-500 text-[11px] font-medium ml-1" numberOfLines={1}>
                      {isPlace ? `${placeCfg?.label || 'Open Space'} · Tap for details` : `${item.surfacePercentPaved}% Paved · ${item.locationName}`}
                    </AppText>
                  </View>
                </View>
              </Pressable>
            );
          }}
        />
      )}

      {/* Bottom Sheet Handle */}
      <View className="items-center pt-2 pb-0.5 bg-white/95 mt-1 border-t border-gray-100">
        <View className="w-10 h-1 bg-gray-300 rounded-full mb-1" />
        <AppText className="text-gray-900 font-black text-sm text-center">
          {source === 'nearby' ? 'Explore Nearby Outdoor Places' : 'Explore Outdoor Routes'}
        </AppText>
      </View>
    </View>
  );
}
