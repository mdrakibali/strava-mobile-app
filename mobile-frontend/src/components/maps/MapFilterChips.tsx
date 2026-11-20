import React from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { AppText } from '../../design';

interface MapFilterChipsProps {
  activeFilter: string;
  onFilterPress: (filter: string) => void;
  lengthFilter: string | null;
  onCycleLength: () => void;
  difficultyFilter: string | null;
  onCycleDifficulty: () => void;
}

const FILTERS = ['Routes', 'Length', 'Difficulty', 'Elevation', 'Surface'] as const;

export function MapFilterChips({
  activeFilter,
  onFilterPress,
  lengthFilter,
  onCycleLength,
  difficultyFilter,
  onCycleDifficulty,
}: MapFilterChipsProps) {
  const getFilterLabel = (filter: string) => {
    if (filter === 'Length' && lengthFilter) return lengthFilter;
    if (filter === 'Difficulty' && difficultyFilter) return difficultyFilter;
    return filter;
  };

  const handlePress = (filter: string) => {
    if (filter === 'Length') {
      onCycleLength();
    } else if (filter === 'Difficulty') {
      onCycleDifficulty();
    } else {
      onFilterPress(filter);
    }
  };

  return (
    <View className="py-1">
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}>
        {FILTERS.map((f) => {
          const isSelected =
            f === activeFilter ||
            (f === 'Length' && Boolean(lengthFilter)) ||
            (f === 'Difficulty' && Boolean(difficultyFilter));

          return (
            <Pressable
              key={f}
              onPress={() => handlePress(f)}
              accessibilityRole="button"
              accessibilityLabel={`Filter: ${f}`}
              className={`px-4 py-1.5 rounded-full bg-white shadow-sm active:bg-gray-50 ${
                isSelected
                  ? 'border-2 border-[#FC4C02]'
                  : 'border border-gray-200'
              }`}>
              <AppText
                className={`text-xs ${
                  isSelected ? 'text-[#FC4C02] font-black' : 'text-gray-700 font-semibold'
                }`}>
                {getFilterLabel(f)}
              </AppText>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

