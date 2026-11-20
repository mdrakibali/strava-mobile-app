import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Animated, StyleSheet, View, ViewStyle } from 'react-native';
import { color, radius, space } from '../tokens';
import { AppText } from './AppText';
import { Button } from './Button';

export const EmptyState: React.FC<{
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  body?: string;
  primary?: { label: string; onPress: () => void };
  secondary?: { label: string; onPress: () => void };
}> = ({ icon, title, body, primary, secondary }) => (
  <View style={styles.center}>
    <View style={styles.iconCircle}>
      <Ionicons name={icon} size={30} color={color.inkSecondary} />
    </View>
    <AppText variant="title2" align="center" style={{ marginTop: space.lg }}>
      {title}
    </AppText>
    {body ? (
      <AppText variant="body" color="inkSecondary" align="center" style={{ marginTop: space.sm }}>
        {body}
      </AppText>
    ) : null}
    {primary ? (
      <Button label={primary.label} onPress={primary.onPress} style={{ marginTop: space.xl }} />
    ) : null}
    {secondary ? (
      <Button
        label={secondary.label}
        onPress={secondary.onPress}
        variant="outline"
        style={{ marginTop: space.sm }}
      />
    ) : null}
  </View>
);

export const ErrorState: React.FC<{ message?: string; onRetry?: () => void; compact?: boolean }> = ({
  message = 'Something went wrong. Check your connection and try again.',
  onRetry,
  compact,
}) =>
  compact ? (
    <View style={styles.banner} accessibilityRole="alert">
      <Ionicons name="alert-circle" size={20} color={color.danger} />
      <AppText variant="label" style={{ flex: 1, marginLeft: space.sm }}>
        {message}
      </AppText>
      {onRetry ? <Button label="Retry" size="sm" variant="outline" onPress={onRetry} /> : null}
    </View>
  ) : (
    <View style={styles.center} accessibilityRole="alert">
      <View style={[styles.iconCircle, { backgroundColor: color.dangerSoft }]}>
        <Ionicons name="cloud-offline-outline" size={30} color={color.danger} />
      </View>
      <AppText variant="title2" align="center" style={{ marginTop: space.lg }}>
        Couldn’t load
      </AppText>
      <AppText variant="body" color="inkSecondary" align="center" style={{ marginTop: space.sm }}>
        {message}
      </AppText>
      {onRetry ? <Button label="Retry" onPress={onRetry} style={{ marginTop: space.xl }} /> : null}
    </View>
  );

export const LoadingState: React.FC = () => (
  <View style={styles.center} accessibilityLabel="Loading">
    <ActivityIndicator size="large" color={color.brand} />
  </View>
);

/** Pulsing grey block for skeleton layouts. */
export const Skeleton: React.FC<{ style?: ViewStyle }> = ({ style }) => {
  const [opacity] = useState(() => new Animated.Value(0.5));
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.5, duration: 700, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);
  return (
    <Animated.View
      style={[{ backgroundColor: color.skeleton, borderRadius: radius.sm, opacity }, style]}
    />
  );
};

const styles = StyleSheet.create({
  center: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: space.xxxl,
    paddingVertical: space.xxxl * 2,
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: color.canvas,
    alignItems: 'center',
    justifyContent: 'center',
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: space.md,
    borderRadius: radius.md,
    backgroundColor: color.dangerSoft,
  },
});
