import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import {
  ActivityIndicator,
  StyleProp,
  Text,
  TouchableOpacity,
  View,
  ViewStyle,
} from 'react-native';
import { hitSlop, minTouch } from '../tokens';

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

const VARIANTS: Record<ButtonVariant, { bg: string; fg: string; border?: string }> = {
  primary: { bg: '#FC4C02', fg: '#FFFFFF' },
  dark: { bg: '#15171C', fg: '#FFFFFF' },
  secondary: { bg: '#F3F4F6', fg: '#15171C', border: '#D1D5DB' },
  outline: { bg: '#FFFFFF', fg: '#15171C', border: '#D1D5DB' },
  ghost: { bg: 'transparent', fg: '#15171C' },
  danger: { bg: 'transparent', fg: '#DC2626', border: '#FCA5A5' },
};

const HEIGHT: Record<ButtonSize, number> = { lg: 52, md: 44, sm: 34 };

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

  return (
    <TouchableOpacity
      testID={testID}
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.75}
      hitSlop={size === 'sm' ? hitSlop : undefined}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      className={`rounded-full items-center justify-center flex-row ${fullWidth ? 'w-full' : ''} ${className || ''}`}
      style={[
        {
          height: HEIGHT[size],
          minWidth: size === 'sm' ? 0 : minTouch,
          paddingHorizontal: size === 'sm' ? 14 : 20,
          backgroundColor: v.bg,
          borderColor: v.border || 'transparent',
          borderWidth: v.border ? 1 : 0,
          opacity: isDisabled && !loading ? 0.45 : 1,
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={v.fg} size="small" />
      ) : (
        <View className="flex-row items-center justify-center">
          {icon ? (
            <Ionicons
              name={icon}
              size={size === 'sm' ? 15 : 18}
              color={v.fg}
              style={{ marginRight: 6 }}
            />
          ) : null}
          <Text
            style={{
              color: v.fg,
              fontSize: size === 'sm' ? 13 : 15,
              fontWeight: '700',
            }}
            numberOfLines={1}
          >
            {label}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
};
