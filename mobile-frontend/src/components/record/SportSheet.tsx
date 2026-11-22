import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import React from 'react';
import { Pressable, View } from 'react-native';
import { AppText, BottomSheet } from '../../design';
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
            className="flex-row items-center px-4 min-h-[60px] active:bg-gray-50">
            <View className={`w-11 h-11 rounded-full items-center justify-center mr-3 ${active ? 'bg-[#FFF2EB]' : 'bg-gray-100'}`}>
              <Ionicons name={s.icon} size={22} color={active ? '#FC4C02' : '#1F2937'} />
            </View>
            <AppText variant="title3" className="flex-1">
              {s.label}
            </AppText>
            {active ? <Ionicons name="checkmark" size={24} color="#FC4C02" /> : null}
          </Pressable>
        );
      })}
    </View>
  </BottomSheet>
);
