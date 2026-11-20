import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import React, { RefObject } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  useWindowDimensions,
  View,
} from 'react-native';
import { AppText } from '../../design';
import { kmValue } from '../../lib/format';
import { sportConfig } from '../../lib/sports';
import { MapItem } from './mapTypes';

interface RouteCardCarouselProps {
  listRef: RefObject<FlatList<MapItem> | null>;
  items: MapItem[];
  selectedIndex: number;
  loading: boolean;
  onSelect: (index: number) => void;
  onOpenDetail: (item: MapItem) => void;
  onToggleSave: (item: MapItem) => void;
}

export function RouteCardCarousel({
  listRef,
  items,
  selectedIndex,
  loading,
  onSelect,
  onOpenDetail,
  onToggleSave,
}: RouteCardCarouselProps) {
  const { width } = useWindowDimensions();
  const cardWidth = width - 40;

  return (
    <View className="absolute left-0 right-0 bottom-2 z-20" pointerEvents="box-none">
      {loading ? (
        <View className="mx-4 p-5 rounded-2xl bg-white border border-gray-200 items-center justify-center shadow-lg">
          <ActivityIndicator color="#FC4C02" />
          <AppText className="text-gray-500 text-xs mt-2 font-medium">Discovering routes…</AppText>
        </View>
      ) : items.length === 0 ? (
        <View className="mx-4 p-5 rounded-2xl bg-white border border-gray-200 items-center justify-center shadow-lg">
          <AppText className="text-gray-900 text-sm font-bold">No routes match your filter</AppText>
          <AppText className="text-gray-500 text-xs mt-1 text-center">
            Try adjusting your search query or sport filter.
          </AppText>
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
            const hasPhoto = item.photos && item.photos.length > 0;
            const sport = sportConfig(item.sportType);

            return (
              <Pressable
                onPress={() => {
                  if (!isSelected) {
                    onSelect(index);
                  } else {
                    onOpenDetail(item);
                  }
                }}
                style={{ width: cardWidth, marginRight: 12 }}
                className={`bg-white rounded-2xl p-3 border shadow-lg flex-row items-center ${
                  isSelected ? 'border-[#FC4C02]' : 'border-gray-200'
                }`}>
                {/* Photo Thumbnail */}
                {hasPhoto ? (
                  <Image
                    source={{ uri: item.photos[0] }}
                    className="w-24 h-24 rounded-xl bg-gray-100 mr-3"
                    contentFit="cover"
                    transition={150}
                  />
                ) : (
                  <View className="w-24 h-24 rounded-xl bg-orange-50 items-center justify-center mr-3 border border-orange-200">
                    <Ionicons name={sport.icon} size={30} color="#FC4C02" />
                  </View>
                )}

                {/* Route Information */}
                <View className="flex-1 justify-between h-24 py-0.5">
                  <View className="flex-row items-start justify-between">
                    <AppText className="text-gray-900 text-sm font-bold flex-1 mr-2" numberOfLines={1}>
                      {item.name}
                    </AppText>
                    <Pressable onPress={() => onToggleSave(item)} hitSlop={8} className="p-0.5">
                      <Ionicons
                        name={item.saved ? 'bookmark' : 'bookmark-outline'}
                        size={18}
                        color={item.saved ? '#FC4C02' : '#9CA3AF'}
                      />
                    </Pressable>
                  </View>

                  {/* Sport & Distance line */}
                  <View className="flex-row items-center">
                    <Ionicons name={sport.icon} size={13} color="#FC4C02" />
                    <View className="bg-[#0070F3] px-1.5 py-0.5 rounded ml-1 mr-1.5">
                      <AppText className="text-white text-[9px] font-black uppercase">Moderate</AppText>
                    </View>
                    <AppText className="text-gray-600 text-xs font-semibold" numberOfLines={1}>
                      {kmValue(item.distanceMeters)} km · {item.elevationGainMeters} m · {item.estTimeText || '1h 2m'}
                    </AppText>
                  </View>

                  {/* Distance from me */}
                  <View className="flex-row items-center">
                    <Ionicons name="locate-outline" size={13} color="#6B7280" />
                    <AppText className="text-gray-500 text-[11px] font-medium ml-1">
                      From your location
                    </AppText>
                  </View>

                  {/* Made for you badge */}
                  <View className="flex-row items-center">
                    <Ionicons name="flame" size={13} color="#FC4C02" />
                    <AppText className="text-[#FC4C02] text-[11px] font-bold ml-1">
                      Made for you
                    </AppText>
                  </View>
                </View>
              </Pressable>
            );
          }}
        />
      )}

      {/* Bottom Sheet Handle & Title */}
      <View className="items-center pt-2 pb-0.5 bg-white/95 mt-1 border-t border-gray-100">
        <View className="w-10 h-1 bg-gray-300 rounded-full mb-1" />
        <AppText className="text-gray-900 font-black text-base text-center">
          Explore anywhere with confidence
        </AppText>
      </View>
    </View>
  );
}

