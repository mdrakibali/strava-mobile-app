import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { AppText, BottomSheet, color, space } from '../../design';
import { MVP_SPORTS } from '../../lib/sports';
import { SportType } from '../../types';

const LAST_SPORT_KEY = '@last_sport_type';

/** Strava preselects the last-used sport on the record screen (research §1). */
export const loadLastSport = async (): Promise<SportType | null> => {
  try {
    const v = await AsyncStorage.getItem(LAST_SPORT_KEY);
    return MVP_SPORTS.some((s) => s.id === v) ? (v as SportType) : null;
  } catch {
    return null;
  }
};

export const saveLastSport = (sport: SportType) => {
  AsyncStorage.setItem(LAST_SPORT_KEY, sport).catch(() => {});
};

/** "Choose a sport" sheet (reference: ScreensDesign 374715). MVP sports only. */
export const SportSheet: React.FC<{
  visible: boolean;
  selected: SportType;
  onSelect: (sport: SportType) => void;
  onClose: () => void;
}> = ({ visible, selected, onSelect, onClose }) => (
  <BottomSheet visible={visible} onClose={onClose} title="Choose a sport">
    <View accessibilityRole="radiogroup">
      {MVP_SPORTS.map((s) => {
        const active = s.id === selected;
        return (
          <Pressable
            key={s.id}
            onPress={() => {
              saveLastSport(s.id);
              onSelect(s.id);
            }}
            accessibilityRole="radio"
            accessibilityState={{ checked: active }}
            accessibilityLabel={s.label}
            style={({ pressed }) => [styles.row, pressed && { backgroundColor: color.canvas }]}>
            <View style={[styles.icon, active && { backgroundColor: color.brandSoft }]}>
              <Ionicons name={s.icon} size={22} color={active ? color.brandText : color.ink} />
            </View>
            <AppText variant="title3" style={{ flex: 1 }}>
              {s.label}
            </AppText>
            {active ? <Ionicons name="checkmark" size={24} color={color.brand} /> : null}
          </Pressable>
        );
      })}
    </View>
  </BottomSheet>
);

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: space.gutter,
    minHeight: 60,
  },
  icon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: color.canvas,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: space.md,
  },
});
