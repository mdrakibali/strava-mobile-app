import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, StyleProp, Text, View, ViewStyle } from 'react-native';
import { hitSlop, minTouch } from '../tokens';

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
  className?: string;
}

export const IconButton: React.FC<IconButtonProps> = ({
  icon,
  accessibilityLabel,
  onPress,
  appearance = 'plain',
  size = minTouch,
  iconColor = '#1F2937',
  badgeCount,
  disabled,
  style,
  className = '',
}) => (
  <Pressable
    onPress={onPress}
    disabled={disabled}
    hitSlop={hitSlop}
    accessibilityRole="button"
    accessibilityLabel={
      badgeCount ? `${accessibilityLabel}, ${badgeCount} unread` : accessibilityLabel
    }
    style={[
      { width: size, height: size, borderRadius: size / 2 },
      disabled ? { opacity: 0.4 } : null,
      style,
    ]}
    className={`items-center justify-center ${
      appearance === 'floating' ? 'bg-white shadow-md active:bg-gray-50' : 'active:bg-gray-100'
    } ${className}`}>
    <Ionicons name={icon} size={Math.round(size * 0.5)} color={iconColor} />
    {badgeCount ? (
      <View className="absolute top-1 right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-[#FC4C02] border-2 border-white items-center justify-center">
        <Text className="text-[10px] font-bold text-white leading-none">
          {badgeCount > 9 ? '9+' : String(badgeCount)}
        </Text>
      </View>
    ) : null}
  </Pressable>
);