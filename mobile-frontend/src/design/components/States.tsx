import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Animated, View, ViewStyle } from 'react-native';
import { color } from '../tokens';
import { AppText } from './AppText';
import { Button } from './Button';

export const EmptyState: React.FC<{
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  body?: string;
  primary?: { label: string; onPress: () => void };
  secondary?: { label: string; onPress: () => void };
}> = ({ icon, title, body, primary, secondary }) => (
  <View className="flex-grow items-center justify-center px-8 py-16">
    <View className="w-[72px] h-[72px] rounded-full bg-gray-100 items-center justify-center">
      <Ionicons name={icon} size={30} color={color.inkSecondary} />
    </View>
    <AppText variant="title2" align="center" className="mt-4">
      {title}
    </AppText>
    {body ? (
      <AppText variant="body" color="inkSecondary" align="center" className="mt-2">
        {body}
      </AppText>
    ) : null}
    {primary ? <Button label={primary.label} onPress={primary.onPress} className="mt-5" /> : null}
    {secondary ? (
      <Button
        label={secondary.label}
        onPress={secondary.onPress}
        variant="outline"
        className="mt-2"
      />
    ) : null}
  </View>
);

export const ErrorState: React.FC<{
  message?: string;
  onRetry?: () => void;
  compact?: boolean;
}> = ({
  message = 'Something went wrong. Check your connection and try again.',
  onRetry,
  compact,
}) =>
  compact ? (
    <View className="flex-row items-center p-3 rounded-lg bg-red-50" accessibilityRole="alert">
      <Ionicons name="alert-circle" size={20} color={color.danger} />
      <AppText variant="label" className="flex-1 ml-2">
        {message}
      </AppText>
      {onRetry ? <Button label="Retry" size="sm" variant="outline" onPress={onRetry} /> : null}
    </View>
  ) : (
    <View className="flex-grow items-center justify-center px-8 py-16" accessibilityRole="alert">
      <View className="w-[72px] h-[72px] rounded-full bg-red-100 items-center justify-center">
        <Ionicons name="cloud-offline-outline" size={30} color={color.danger} />
      </View>
      <AppText variant="title2" align="center" className="mt-4">
        Couldn’t load
      </AppText>
      <AppText variant="body" color="inkSecondary" align="center" className="mt-2">
        {message}
      </AppText>
      {onRetry ? <Button label="Retry" onPress={onRetry} className="mt-5" /> : null}
    </View>
  );

export const LoadingState: React.FC = () => (
  <View className="flex-grow items-center justify-center px-8 py-16" accessibilityLabel="Loading">
    <ActivityIndicator size="large" color={color.brand} />
  </View>
);

/** Pulsing grey block for skeleton layouts. */
export const Skeleton: React.FC<{ style?: ViewStyle; className?: string }> = ({
  style,
  className = '',
}) => {
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
    <Animated.View className={`bg-gray-200 rounded ${className}`} style={[{ opacity }, style]} />
  );
};
