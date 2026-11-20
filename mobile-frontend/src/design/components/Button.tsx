import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleProp,
  View,
  ViewStyle,
} from 'react-native';
import { color, hitSlop, minTouch, space } from '../tokens';
import { AppText } from './AppText';

export type ButtonVariant = 'primary' | 'dark' | 'secondary' | 'outline' | 'ghost' | 'danger';
export type ButtonSize = 'lg' | 'md' | 'sm';

export interface ButtonProps {
  label: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: keyof typeof Ionicons.glyphMap;
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  style?: StyleProp<ViewStyle>;
  className?: string;
  accessibilityHint?: string;
  testID?: string;
}

const VARIANTS: Record<ButtonVariant, { bg: string; bgPressed: string; fg: string; border?: string }> = {
  primary: { bg: color.brand, bgPressed: color.brandPressed, fg: color.inverse },
  dark: { bg: color.ink, bgPressed: '#000000', fg: color.inverse },
  secondary: { bg: color.canvas, bgPressed: color.border, fg: color.ink },
  outline: { bg: color.surface, bgPressed: color.canvas, fg: color.ink, border: color.borderStrong },
  ghost: { bg: 'transparent', bgPressed: color.canvas, fg: color.ink },
  danger: { bg: 'transparent', bgPressed: color.dangerSoft, fg: color.danger },
};

const HEIGHT: Record<ButtonSize, number> = { lg: 56, md: 44, sm: 34 };

export const Button: React.FC<ButtonProps> = ({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  icon,
  loading = false,
  disabled = false,
  fullWidth = false,
  style,
  className,
  accessibilityHint,
  testID,
}) => {
  const v = VARIANTS[variant];
  const isDisabled = disabled || loading;
  const textVariant = size === 'sm' ? 'buttonSm' : 'button';

  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      disabled={isDisabled}
      hitSlop={size === 'sm' ? hitSlop : undefined}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      className={`rounded-full items-center justify-center ${fullWidth ? 'self-stretch' : ''} ${className || ''}`}
      style={({ pressed }) => [
        {
          height: HEIGHT[size],
          minWidth: size === 'sm' ? 0 : minTouch,
          paddingHorizontal: size === 'sm' ? space.lg : space.xl,
          backgroundColor: pressed ? v.bgPressed : v.bg,
          borderColor: v.border ?? 'transparent',
          borderWidth: v.border ? 1 : 0,
          opacity: isDisabled && !loading ? 0.45 : 1,
        },
        style,
      ]}>
      {loading ? (
        <ActivityIndicator color={v.fg} />
      ) : (
        <View className="flex-row items-center">
          {icon ? (
            <Ionicons
              name={icon}
              size={size === 'sm' ? 16 : 20}
              color={v.fg}
              className="mr-2"
            />
          ) : null}
          <AppText variant={textVariant} style={{ color: v.fg }} numberOfLines={1}>
            {label}
          </AppText>
        </View>
      )}
    </Pressable>
  );
};