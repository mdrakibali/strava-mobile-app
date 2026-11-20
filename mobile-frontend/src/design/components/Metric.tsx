import React from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { space, TypeVariant } from '../tokens';
import { AppText } from './AppText';

export interface MetricTileProps {
  label: string;
  value: string;
  unit?: string;
  size?: 'M' | 'L' | 'XL' | 'display';
  align?: 'start' | 'center';
  inverse?: boolean;
  style?: StyleProp<ViewStyle>;
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
}) => {
  const center = align === 'center';
  const unitVariant: TypeVariant = size === 'M' ? 'label' : 'title3';
  return (
    <View
      style={[{ alignItems: center ? 'center' : 'flex-start' }, style]}
      accessible
      accessibilityLabel={`${label}: ${value}${unit ? ` ${unit}` : ''}`}>
      {size === 'XL' || size === 'display' ? null : (
        <AppText variant="label" color={inverse ? 'inverse' : 'inkSecondary'} numberOfLines={1}>
          {label}
        </AppText>
      )}
      <View style={styles.valueRow}>
        <AppText
          variant={VALUE_VARIANT[size]}
          color={inverse ? 'inverse' : 'ink'}
          numberOfLines={1}
          adjustsFontSizeToFit={size === 'XL' || size === 'display'}
          minimumFontScale={0.6}>
          {value}
        </AppText>
        {unit ? (
          <AppText
            variant={unitVariant}
            color={inverse ? 'inverse' : 'inkSecondary'}
            style={{ marginLeft: space.xs }}>
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

export const MetricRow: React.FC<{ children: React.ReactNode; style?: StyleProp<ViewStyle> }> = ({
  children,
  style,
}) => (
  <View style={[styles.row, style]}>
    {React.Children.map(children, (child, i) =>
      child ? <View style={[styles.cell, i > 0 && { marginLeft: space.lg }]}>{child}</View> : null
    )}
  </View>
);

const styles = StyleSheet.create({
  valueRow: { flexDirection: 'row', alignItems: 'baseline' },
  row: { flexDirection: 'row' },
  cell: { flexShrink: 1 },
});
