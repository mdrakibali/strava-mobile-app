import { Image } from 'expo-image';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { color } from '../tokens';
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
        style={[styles.image, style]}
        contentFit="cover"
        accessibilityIgnoresInvertColors
        accessible
        accessibilityLabel={name ? `${name}'s photo` : 'Profile photo'}
      />
    );
  }
  return (
    <View
      style={[styles.initials, style, { backgroundColor: tintOf(name || '?') }]}
      accessible
      accessibilityLabel={name ? `${name}'s avatar` : 'Avatar'}>
      <AppText
        variant={size >= 72 ? 'title1' : size >= 48 ? 'title3' : 'label'}
        style={{ fontWeight: '700', color: color.inkSecondary }}>
        {initialsOf(name)}
      </AppText>
    </View>
  );
};

const styles = StyleSheet.create({
  image: { backgroundColor: color.canvas },
  initials: { alignItems: 'center', justifyContent: 'center' },
});
