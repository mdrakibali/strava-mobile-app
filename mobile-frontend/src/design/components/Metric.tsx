import React from 'react';
import { StyleProp, View, ViewStyle } from 'react-native';
import { TypeVariant } from '../tokens';
import { AppText } from './AppText';

export interface MetricTileProps {
  label: string;
  value: string;
  unit?: string;
  size?: 'M' | 'L' | 'XL' | 'display';
  align?: 'start' | 'center';
  inverse?: boolean;
  style?: StyleProp<ViewStyle>;
  className?: string;
}

const VALUE_VARIANT: Record<NonNullable<MetricTileProps['size']>, TypeVariant> = {
  M: 'metricM',
  L: 'metricL',
  XL: 'metricXL',
  display: 'display',
};

/** Label above value (reference: feed + detail screens). Unit rendered smaller after value. */
export const MetricTile: React.FC<MetricTileProps> = ({
  label,
  value,
  unit,
  size = 'M',
  align = 'start',
  inverse = false,
  style,
  className = '',
}) => {
  const center = align === 'center';
  const unitVariant: TypeVariant = size === 'M' ? 'label' : 'title3';
  return (
    <View
      className={`${center ? 'items-center' : 'items-start'} ${className}`}
      style={style}
      accessible
      accessibilityLabel={`${label}: ${value}${unit ? ` ${unit}` : ''}`}
    >
      {size === 'XL' || size === 'display' ? null : (
        <AppText variant="label" color={inverse ? 'inverse' : 'inkSecondary'} numberOfLines={1}>
          {label}
        </AppText>
      )}
      <View className="flex-row items-baseline">
        <AppText
          variant={VALUE_VARIANT[size]}
          color={inverse ? 'inverse' : 'ink'}
          numberOfLines={1}
          adjustsFontSizeToFit={size === 'XL' || size === 'display'}
          minimumFontScale={0.6}
        >
          {value}
        </AppText>
        {unit ? (
          <AppText
            variant={unitVariant}
            color={inverse ? 'inverse' : 'inkSecondary'}
            className="ml-1"
          >
            {unit}
          </AppText>
        ) : null}
      </View>
      {size === 'XL' || size === 'display' ? (
        <AppText variant="label" color={inverse ? 'inverse' : 'inkSecondary'} numberOfLines={1}>
          {label}
        </AppText>
      ) : null}
    </View>
  );
};

export const MetricRow: React.FC<{
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  className?: string;
}> = ({ children, style, className = '' }) => (
  <View className={`flex-row ${className}`} style={style}>
    {React.Children.map(children, (child, i) =>
      child ? <View className={`shrink ${i > 0 ? 'ml-4' : ''}`}>{child}</View> : null
    )}
  </View>
);
