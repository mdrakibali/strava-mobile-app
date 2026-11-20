import { useRouter } from 'expo-router';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { color, space } from '../tokens';
import { AppText } from './AppText';
import { IconButton } from './IconButton';

export interface AppBarProps {
  title?: string;
  /** Show a back arrow (default) or close X; `none` hides it. */
  leading?: 'back' | 'close' | 'none';
  onLeadingPress?: () => void;
  right?: React.ReactNode;
  /** Large left-aligned title for tab roots (Home, You). */
  large?: boolean;
  border?: boolean;
}

export const AppBar: React.FC<AppBarProps> = ({
  title,
  leading = 'back',
  onLeadingPress,
  right,
  large = false,
  border = true,
}) => {
  const router = useRouter();
  const handleLeading = onLeadingPress ?? (() => router.back());

  return (
    <View style={[styles.bar, border && styles.border]}>
      {leading !== 'none' ? (
        <IconButton
          icon={leading === 'close' ? 'close' : 'arrow-back'}
          accessibilityLabel={leading === 'close' ? 'Close' : 'Back'}
          onPress={handleLeading}
        />
      ) : null}
      <View style={[styles.titleWrap, leading !== 'none' && { marginLeft: space.xs }]}>
        {title ? (
          <AppText
            variant={large ? 'title1' : 'title2'}
            numberOfLines={1}
            accessibilityRole="header">
            {title}
          </AppText>
        ) : null}
      </View>
      {right ? <View style={styles.right}>{right}</View> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  bar: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: space.sm,
    backgroundColor: color.surface,
  },
  border: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: color.border },
  titleWrap: { flex: 1, paddingHorizontal: space.sm },
  right: { flexDirection: 'row', alignItems: 'center' },
});
