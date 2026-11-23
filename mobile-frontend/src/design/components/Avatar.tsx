import { Image } from 'expo-image';
import React from 'react';
import { View } from 'react-native';
import { AppText } from './AppText';

const TINTS = ['#FDE7D9', '#DCEBFF', '#E2F4E8', '#F3E4FF', '#FFF0C7', '#E3F1F4'];

const initialsOf = (name?: string) => {
  const parts = (name || '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  return (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase();
};

const tintOf = (seed: string) => {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0;
  return TINTS[Math.abs(h) % TINTS.length];
};

export interface AvatarProps {
  uri?: string | null;
  name?: string;
  size?: 32 | 40 | 48 | 72;
}

/** Real photo when available; otherwise initials on a deterministic tint (never a stock photo). */
export const Avatar: React.FC<AvatarProps> = ({ uri, name, size = 40 }) => {
  const style = { width: size, height: size, borderRadius: size / 2 };
  if (uri) {
    return (
      <Image
        source={{ uri }}
        style={style}
        className="bg-gray-100"
        contentFit="cover"
        accessibilityIgnoresInvertColors
        accessible
        accessibilityLabel={name ? `${name}'s photo` : 'Profile photo'}
      />
    );
  }
  return (
    <View
      style={[style, { backgroundColor: tintOf(name || '?') }]}
      className="items-center justify-center"
      accessible
      accessibilityLabel={name ? `${name}'s avatar` : 'Avatar'}
    >
      <AppText
        variant={size >= 72 ? 'title1' : size >= 48 ? 'title3' : 'label'}
        className="font-bold text-gray-500"
      >
        {initialsOf(name)}
      </AppText>
    </View>
  );
};
