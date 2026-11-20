import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { color, elevation, hitSlop, minTouch } from '../tokens';
import { AppText } from './AppText';

export interface IconButtonProps {
  icon: keyof typeof Ionicons.glyphMap;
  accessibilityLabel: string;
  onPress?: () => void;
  /** `floating` = white circle with shadow for map overlays; `plain` = toolbar icon. */
  appearance?: 'floating' | 'plain';
  size?: number;
  iconColor?: string;
  badgeCount?: number;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}

export const IconButton: React.FC<IconButtonProps> = ({
  icon,
  accessibilityLabel,
  onPress,
  appearance = 'plain',
  size = minTouch,
  iconColor = color.ink,
  badgeCount,
  disabled,
  style,
}) => (
  <Pressable
    onPress={onPress}
    disabled={disabled}
    hitSlop={hitSlop}
    accessibilityRole="button"
    accessibilityLabel={
      badgeCount ? `${accessibilityLabel}, ${badgeCount} unread` : accessibilityLabel
    }
    style={({ pressed }) => [
      styles.base,
      { width: size, height: size, borderRadius: size / 2 },
      appearance === 'floating' && [styles.floating, elevation.floating],
      pressed && { backgroundColor: appearance === 'floating' ? color.canvas : color.canvas },
      disabled && { opacity: 0.4 },
      style,
    ]}>
    <Ionicons name={icon} size={Math.round(size * 0.5)} color={iconColor} />
    {badgeCount ? (
      <View style={styles.badge}>
        <AppText variant="caption" color="inverse" style={styles.badgeText}>
          {badgeCount > 9 ? '9+' : String(badgeCount)}
        </AppText>
      </View>
    ) : null}
  </Pressable>
);

const styles = StyleSheet.create({
  base: { alignItems: 'center', justifyContent: 'center' },
  floating: { backgroundColor: color.surface },
  badge: {
    position: 'absolute',
    top: 4,
    right: 4,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    borderRadius: 9,
    backgroundColor: color.brand,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: color.surface,
  },
  badgeText: { fontSize: 10, lineHeight: 12, fontWeight: '700' },
});
