import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, TextInput, View } from 'react-native';
import { AppText } from '../../design';
import { sportConfig } from '../../lib/sports';
import { MapSource } from './mapTypes';

interface MapSearchBarProps {
  query: string;
  onQueryChange: (text: string) => void;
  selectedSport: string;
  onSportPress: () => void;
  source: MapSource;
  onToggleSaved: () => void;
}

export function MapSearchBar({
  query,
  onQueryChange,
  selectedSport,
  onSportPress,
  source,
  onToggleSaved,
}: MapSearchBarProps) {
  const cfg = sportConfig(selectedSport === 'All' ? 'Run' : selectedSport);

  return (
    <View className="mx-4 h-12 bg-white rounded-full flex-row items-center px-3.5 shadow-md border border-gray-200">
      {/* Sport Selector Pill */}
      <Pressable
        onPress={onSportPress}
        accessibilityRole="button"
        accessibilityLabel={`Sport: ${selectedSport}. Change sport`}
        className="flex-row items-center py-1 pr-2 active:opacity-70"
      >
        <Ionicons name={cfg.icon} size={20} color="#FC4C02" />
        <Ionicons name="chevron-down" size={14} color="#6B7280" className="ml-1" />
      </Pressable>

      {/* Vertical Divider */}
      <View className="w-[1px] h-5 bg-gray-200 mr-2" />

      {/* Search Input */}
      <TextInput
        value={query}
        onChangeText={onQueryChange}
        placeholder={source === 'saved' ? 'Search saved routes' : 'Trail run with views'}
        placeholderTextColor="#9CA3AF"
        className="flex-1 text-sm font-semibold text-gray-900 py-1"
        accessibilityLabel="Search routes"
        returnKeyType="search"
      />

      {/* Clear or Saved Button */}
      {query.length > 0 ? (
        <Pressable
          onPress={() => onQueryChange('')}
          hitSlop={8}
          className="p-1"
          accessibilityLabel="Clear search text"
        >
          <Ionicons name="close-circle" size={18} color="#9CA3AF" />
        </Pressable>
      ) : (
        <Pressable
          onPress={onToggleSaved}
          accessibilityRole="button"
          accessibilityLabel="View Saved Routes"
          className="flex-row items-center pl-2 py-1 active:opacity-70"
        >
          <Ionicons
            name={source === 'saved' ? 'bookmark' : 'bookmark-outline'}
            size={18}
            color={source === 'saved' ? '#FC4C02' : '#111827'}
          />
          <AppText
            className={`text-xs font-bold ml-1 ${
              source === 'saved' ? 'text-[#FC4C02]' : 'text-gray-900'
            }`}
          >
            Saved
          </AppText>
        </Pressable>
      )}
    </View>
  );
}
