import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { color, elevation, radius, space } from '../tokens';
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
      <View style={styles.root}>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Close sheet"
        />
        <View style={[styles.sheet, elevation.sheet, { paddingBottom: insets.bottom + space.lg }]}>
          <View style={styles.handle} />
          {title ? (
            <View style={styles.header}>
              <AppText variant="title2" accessibilityRole="header" style={{ flex: 1 }}>
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
    style={({ pressed }) => [styles.option, pressed && { backgroundColor: color.canvas }]}>
    {icon ? (
      <View style={styles.optionIcon}>
        <Ionicons name={icon} size={20} color={color.ink} />
      </View>
    ) : null}
    <View style={{ flex: 1 }}>
      <AppText variant="title3">{title}</AppText>
      {description ? (
        <AppText variant="label" color="inkSecondary" style={{ marginTop: 2 }}>
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

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'flex-end', backgroundColor: color.overlay },
  sheet: {
    backgroundColor: color.surface,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    paddingTop: space.sm,
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: color.borderStrong,
    marginBottom: space.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: space.gutter,
    paddingRight: space.sm,
    paddingBottom: space.sm,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: space.gutter,
    paddingVertical: space.md,
    minHeight: 64,
  },
  optionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: color.canvas,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: space.md,
  },
});
