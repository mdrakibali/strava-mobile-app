import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { color, radius, space } from '../tokens';
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
    <View style={styles.tabs} accessibilityRole="tablist">
      {items.map((item) => {
        const active = item.key === value;
        return (
          <Pressable
            key={item.key}
            onPress={() => onChange(item.key)}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            style={styles.tab}>
            {item.icon ? (
              <Ionicons name={item.icon} size={22} color={active ? color.ink : color.inkTertiary} />
            ) : null}
            <AppText
              variant="label"
              color={active ? 'ink' : 'inkTertiary'}
              style={{ fontWeight: active ? '700' : '500', marginTop: item.icon ? 2 : 0 }}>
              {item.label}
            </AppText>
            <View style={[styles.underline, active && { backgroundColor: color.brand }]} />
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
    style={({ pressed }) => [
      styles.chip,
      selected ? styles.chipSelected : null,
      pressed && !selected ? { backgroundColor: color.canvas } : null,
    ]}>
    {icon ? (
      <Ionicons
        name={icon}
        size={16}
        color={selected ? color.brandText : color.inkSecondary}
        style={{ marginRight: space.xs }}
      />
    ) : null}
    <AppText variant="label" color={selected ? 'brandText' : 'inkSecondary'} style={{ fontWeight: '600' }}>
      {label}
    </AppText>
  </Pressable>
);

export const ChipRow: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <ScrollView
    horizontal
    showsHorizontalScrollIndicator={false}
    contentContainerStyle={{ gap: space.sm }}>
    {children}
  </ScrollView>
);

const styles = StyleSheet.create({
  tabs: {
    flexDirection: 'row',
    backgroundColor: color.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: color.border,
  },
  tab: { flex: 1, alignItems: 'center', paddingTop: space.md, minHeight: 56 },
  underline: {
    marginTop: space.sm,
    height: 3,
    width: '60%',
    borderTopLeftRadius: 2,
    borderTopRightRadius: 2,
    backgroundColor: 'transparent',
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 36,
    paddingHorizontal: space.md,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: color.borderStrong,
    backgroundColor: color.surface,
  },
  chipSelected: { backgroundColor: color.brandSoft, borderColor: color.brand },
});
