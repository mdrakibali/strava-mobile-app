import React from 'react';
import { StyleProp, Text, TextProps, TextStyle } from 'react-native';
import { color as palette, ColorToken, type, TypeVariant } from '../tokens';

export interface AppTextProps extends TextProps {
  variant?: TypeVariant;
  color?: ColorToken;
  align?: TextStyle['textAlign'];
  style?: StyleProp<TextStyle>;
}

export const AppText: React.FC<AppTextProps> = ({
  variant = 'body',
  color = 'ink',
  align,
  style,
  ...rest
}) => (
  <Text
    {...rest}
    style={[type[variant], { color: palette[color] }, align ? { textAlign: align } : null, style]}
  />
);
