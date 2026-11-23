import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Pressable, TextInput, TextInputProps, View } from 'react-native';
import { color } from '../tokens';
import { AppText } from './AppText';

/** Bordered select row that opens a sheet (reference: Save Activity dropdown rows). */
export const SelectField: React.FC<{
  value: string;
  icon?: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  accessibilityLabel: string;
}> = ({ value, icon, onPress, accessibilityLabel }) => (
  <Pressable
    onPress={onPress}
    accessibilityRole="button"
    accessibilityLabel={`${accessibilityLabel}: ${value}`}
    className="flex-row items-center min-h-[56px] border border-gray-300 rounded-xl px-4 bg-white active:bg-gray-100"
  >
    {icon ? <Ionicons name={icon} size={20} color={color.ink} className="mr-3" /> : null}
    <AppText variant="body" className="flex-1" numberOfLines={1}>
      {value}
    </AppText>
    <Ionicons name="chevron-down" size={20} color={color.inkSecondary} />
  </Pressable>
);

export const TextField: React.FC<TextInputProps & { label?: string }> = ({
  label,
  multiline,
  style,
  ...rest
}) => {
  const [focused, setFocused] = useState(false);
  return (
    <View>
      {label ? (
        <AppText variant="label" color="inkSecondary" className="mb-1">
          {label}
        </AppText>
      ) : null}
      <TextInput
        placeholderTextColor={color.inkTertiary}
        multiline={multiline}
        textAlignVertical={multiline ? 'top' : 'center'}
        onFocus={(e) => {
          setFocused(true);
          rest.onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          rest.onBlur?.(e);
        }}
        accessibilityLabel={label ?? rest.placeholder}
        className={`min-h-[56px] border rounded-xl px-4 bg-white text-base text-gray-900 ${
          focused ? 'border-gray-900' : 'border-gray-300'
        } ${multiline ? 'min-h-[104px] py-3' : ''}`}
        {...rest}
        style={style}
      />
    </View>
  );
};

export const SectionTitle: React.FC<{ title: string; style?: object; className?: string }> = ({
  title,
  style,
  className = '',
}) => (
  <AppText
    variant="title2"
    accessibilityRole="header"
    className={`mb-3 ${className}`}
    style={style}
  >
    {title}
  </AppText>
);

export const Divider: React.FC<{ inset?: number; className?: string }> = ({
  inset = 0,
  className = '',
}) => (
  <View
    className={`h-[1px] bg-gray-200 ${className}`}
    style={inset ? { marginLeft: inset } : undefined}
  />
);
