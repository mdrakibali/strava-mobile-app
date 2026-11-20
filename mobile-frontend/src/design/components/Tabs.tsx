import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { color } from '../tokens';
import { AppText } from './AppText';

export interface TabItem<K extends string> {
  key: K;
  label: string;
  icon?: keyof typeof Ionicons.glyphMap;
}

/** Underline tabs with optional icons (reference: profile Progress / Activities). */
export function SegmentedTabs<K extends string>({
  items,
  value,
  onChange,
}: {
  items: TabItem<K>[];
  value: K;
  onChange: (key: K) => void;
}) {
  return (
    <View className="flex-row bg-white border-b border-gray-200" accessibilityRole="tablist">
      {items.map((item) => {
        const active = item.key === value;
        return (
          <Pressable
            key={item.key}
            onPress={() => onChange(item.key)}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            className="flex-1 items-center pt-3 min-h-[56px]">
            {item.icon ? (
              <Ionicons name={item.icon} size={22} color={active ? color.ink : color.inkTertiary} />
            ) : null}
            <AppText
              variant="label"
              color={active ? 'ink' : 'inkTertiary'}
              className={`font-bold ${item.icon ? 'mt-0.5' : ''}`}>
              {item.label}
            </AppText>
            <View className={`mt-2 h-[3px] w-[60%] rounded-t ${active ? 'bg-primary' : 'bg-transparent'}`} />
          </Pressable>
        );
      })}
    </View>
  );
}

export const Chip: React.FC<{
  label: string;
  selected?: boolean;
  onPress?: () => void;
  icon?: keyof typeof Ionicons.glyphMap;
}> = ({ label, selected, onPress, icon }) => (
  <Pressable
    onPress={onPress}
    accessibilityRole="button"
    accessibilityState={{ selected: !!selected }}
    className={`flex-row items-center h-9 px-3 rounded-full border ${
      selected
        ? 'bg-orange-50 border-primary'
        : 'bg-white border-gray-300 active:bg-gray-100'
    }`}>
    {icon ? (
      <Ionicons
        name={icon}
        size={16}
        color={selected ? color.brandText : color.inkSecondary}
        className="mr-1"
      />
    ) : null}
    <AppText
      variant="label"
      color={selected ? 'brandText' : 'inkSecondary'}
      className="font-semibold">
      {label}
    </AppText>
  </Pressable>
);

export const ChipRow: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <ScrollView
    horizontal
    showsHorizontalScrollIndicator={false}
    contentContainerStyle={{ gap: 8 }}>
    {children}
  </ScrollView>
);
