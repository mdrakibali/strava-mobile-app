import { useRouter } from 'expo-router';
import React from 'react';
import { View } from 'react-native';
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
    <View
      className={`h-14 flex-row items-center px-2 bg-white ${border ? 'border-b border-gray-100' : ''}`}
    >
      {leading !== 'none' ? (
        <IconButton
          icon={leading === 'close' ? 'close' : 'arrow-back'}
          accessibilityLabel={leading === 'close' ? 'Close' : 'Back'}
          onPress={handleLeading}
        />
      ) : null}
      <View className={`flex-1 px-2 ${leading !== 'none' ? 'ml-1' : ''}`}>
        {title ? (
          <AppText
            variant={large ? 'title1' : 'title2'}
            numberOfLines={1}
            accessibilityRole="header"
          >
            {title}
          </AppText>
        ) : null}
      </View>
      {right ? <View className="flex-row items-center">{right}</View> : null}
    </View>
  );
};
