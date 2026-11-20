import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Modal, Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { color } from '../tokens';
import { AppText } from './AppText';
import { IconButton } from './IconButton';

export interface BottomSheetProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
}

/** Modal bottom sheet (no extra dependency). Backdrop tap + Android back close it. */
export const BottomSheet: React.FC<BottomSheetProps> = ({ visible, onClose, title, children }) => {
  const insets = useSafeAreaInsets();
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
      navigationBarTranslucent>
      <View className="flex-1 justify-end bg-black/40">
        <Pressable
          className="absolute inset-0"
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Close sheet"
        />
        <View
          className="bg-white rounded-t-3xl pt-2 shadow-2xl"
          style={{ paddingBottom: Math.max(insets.bottom, 16) + 16 }}>
          <View className="self-center w-10 h-1 rounded-full bg-gray-300 mb-2" />
          {title ? (
            <View className="flex-row items-center pl-4 pr-2 pb-2">
              <AppText variant="title2" accessibilityRole="header" className="flex-1">
                {title}
              </AppText>
              <IconButton icon="close" accessibilityLabel="Close" onPress={onClose} />
            </View>
          ) : null}
          {children}
        </View>
      </View>
    </Modal>
  );
};

/** Radio option row with description (reference: "Who Can View"). */
export const OptionRow: React.FC<{
  title: string;
  description?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  selected: boolean;
  onPress: () => void;
}> = ({ title, description, icon, selected, onPress }) => (
  <Pressable
    onPress={onPress}
    accessibilityRole="radio"
    accessibilityState={{ checked: selected }}
    className="flex-row items-center px-4 py-3 min-h-[64px] active:bg-gray-50">
    {icon ? (
      <View className="w-10 h-10 rounded-full bg-gray-100 items-center justify-center mr-3">
        <Ionicons name={icon} size={20} color={color.ink} />
      </View>
    ) : null}
    <View className="flex-1">
      <AppText variant="title3">{title}</AppText>
      {description ? (
        <AppText variant="label" color="inkSecondary" className="mt-0.5">
          {description}
        </AppText>
      ) : null}
    </View>
    <Ionicons
      name={selected ? 'radio-button-on' : 'radio-button-off'}
      size={24}
      color={selected ? color.brand : color.borderStrong}
    />
  </Pressable>
);
