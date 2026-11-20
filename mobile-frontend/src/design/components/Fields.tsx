import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Pressable, StyleSheet, TextInput, TextInputProps, View } from 'react-native';
import { color, radius, space, type } from '../tokens';
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
    style={({ pressed }) => [styles.field, styles.select, pressed && { backgroundColor: color.canvas }]}>
    {icon ? <Ionicons name={icon} size={20} color={color.ink} style={{ marginRight: space.md }} /> : null}
    <AppText variant="body" style={{ flex: 1 }} numberOfLines={1}>
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
        <AppText variant="label" color="inkSecondary" style={{ marginBottom: space.xs }}>
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
        {...rest}
        style={[
          styles.field,
          type.body,
          { color: color.ink },
          multiline ? styles.multiline : null,
          focused ? { borderColor: color.ink } : null,
          style,
        ]}
      />
    </View>
  );
};

export const SectionTitle: React.FC<{ title: string; style?: object }> = ({ title, style }) => (
  <AppText variant="title2" accessibilityRole="header" style={[{ marginBottom: space.md }, style]}>
    {title}
  </AppText>
);

export const Divider: React.FC<{ inset?: number }> = ({ inset = 0 }) => (
  <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: color.border, marginLeft: inset }} />
);

const styles = StyleSheet.create({
  field: {
    minHeight: 56,
    borderWidth: 1,
    borderColor: color.borderStrong,
    borderRadius: radius.md,
    paddingHorizontal: space.lg,
    backgroundColor: color.surface,
  },
  select: { flexDirection: 'row', alignItems: 'center' },
  multiline: { minHeight: 104, paddingTop: space.md, paddingBottom: space.md },
});
