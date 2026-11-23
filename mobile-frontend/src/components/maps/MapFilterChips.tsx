import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { AppText } from '../../design';
import { MapSource } from './mapTypes';

interface MapFilterChipsProps {
  source: MapSource;
  onSourceChange: (source: MapSource) => void;
  selectedSport: string;
  onSportChange: (sport: string) => void;
  lengthFilter: string | null;
  onCycleLength: () => void;
  difficultyFilter: string | null;
  onCycleDifficulty: () => void;
}

const SPORTS = ['All', 'Run', 'Walk', 'Hike', 'Ride'] as const;

export function MapFilterChips({
  source,
  onSourceChange,
  selectedSport,
  onSportChange,
  lengthFilter,
  onCycleLength,
  difficultyFilter,
  onCycleDifficulty,
}: MapFilterChipsProps) {
  return (
    <View className="py-1">
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}
      >
        {/* Source Toggle: Routes vs Nearby Places */}
        <Pressable
          onPress={() => onSourceChange(source === 'routes' ? 'nearby' : 'routes')}
          accessibilityRole="button"
          accessibilityLabel={`Mode: ${source === 'nearby' ? 'Nearby Places' : 'Routes'}`}
          className={`px-3.5 py-1.5 rounded-full flex-row items-center bg-white shadow-sm active:bg-gray-50 ${
            source === 'nearby'
              ? 'border-2 border-[#10B981] bg-emerald-50'
              : 'border border-gray-200'
          }`}
        >
          <Ionicons
            name={source === 'nearby' ? 'trail-sign' : 'map'}
            size={14}
            color={source === 'nearby' ? '#10B981' : '#4B5563'}
            className="mr-1"
          />
          <AppText
            className={`text-xs ml-1 ${
              source === 'nearby' ? 'text-[#10B981] font-black' : 'text-gray-700 font-semibold'
            }`}
          >
            {source === 'nearby' ? 'Nearby Places' : 'Explore Routes'}
          </AppText>
        </Pressable>

        {/* Activity Chips: All, Run, Walk, Hike, Ride */}
        {SPORTS.map((s) => {
          const isSelected = selectedSport === s;
          return (
            <Pressable
              key={s}
              onPress={() => onSportChange(s)}
              accessibilityRole="button"
              accessibilityLabel={`Sport filter: ${s}`}
              className={`px-3.5 py-1.5 rounded-full bg-white shadow-sm active:bg-gray-50 ${
                isSelected ? 'border-2 border-[#FC4C02] bg-orange-50' : 'border border-gray-200'
              }`}
            >
              <AppText
                className={`text-xs ${
                  isSelected ? 'text-[#FC4C02] font-black' : 'text-gray-700 font-semibold'
                }`}
              >
                {s}
              </AppText>
            </Pressable>
          );
        })}

        {/* Distance Filter Chip */}
        <Pressable
          onPress={onCycleLength}
          accessibilityRole="button"
          accessibilityLabel={`Distance filter: ${lengthFilter || 'Any'}`}
          className={`px-3.5 py-1.5 rounded-full bg-white shadow-sm active:bg-gray-50 ${
            lengthFilter ? 'border-2 border-[#FC4C02] bg-orange-50' : 'border border-gray-200'
          }`}
        >
          <AppText
            className={`text-xs ${
              lengthFilter ? 'text-[#FC4C02] font-black' : 'text-gray-700 font-semibold'
            }`}
          >
            {lengthFilter ? `Dist: ${lengthFilter}` : 'Distance'}
          </AppText>
        </Pressable>

        {/* Difficulty Filter Chip */}
        <Pressable
          onPress={onCycleDifficulty}
          accessibilityRole="button"
          accessibilityLabel={`Difficulty filter: ${difficultyFilter || 'Any'}`}
          className={`px-3.5 py-1.5 rounded-full bg-white shadow-sm active:bg-gray-50 ${
            difficultyFilter ? 'border-2 border-[#FC4C02] bg-orange-50' : 'border border-gray-200'
          }`}
        >
          <AppText
            className={`text-xs ${
              difficultyFilter ? 'text-[#FC4C02] font-black' : 'text-gray-700 font-semibold'
            }`}
          >
            {difficultyFilter ? `Diff: ${difficultyFilter}` : 'Difficulty'}
          </AppText>
        </Pressable>
      </ScrollView>
    </View>
  );
}
