import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Defs, LinearGradient, Path, Stop } from 'react-native-svg';
import { Colors, Spacing, Typography } from '../../constants/theme';

interface ElevationChartProps {
  elevations?: number[];
  height?: number;
}

export const ElevationChart: React.FC<ElevationChartProps> = ({
  elevations = [120, 140, 190, 230, 245, 210, 160, 130],
  height = 90,
}) => {
  const width = 340;
  const paddingH = 15;
  const paddingV = 10;

  const minElev = Math.min(...elevations);
  const maxElev = Math.max(...elevations);
  const elevRange = maxElev - minElev || 1;

  const innerW = width - paddingH * 2;
  const innerH = height - paddingV * 2;

  const points = elevations.map((elev, idx) => {
    const x = paddingH + (idx / (elevations.length - 1)) * innerW;
    const y = paddingV + (1 - (elev - minElev) / elevRange) * innerH;
    return { x, y };
  });

  const linePath = points.reduce((acc, curr, idx) => {
    return idx === 0 ? `M ${curr.x} ${curr.y}` : `${acc} L ${curr.x} ${curr.y}`;
  }, '');

  const areaPath = `${linePath} L ${points[points.length - 1].x} ${height} L ${points[0].x} ${height} Z`;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Elevation Profile</Text>
        <Text style={styles.statText}>
          Min {minElev}m · Max {maxElev}m · Gain +{maxElev - minElev}m
        </Text>
      </View>

      <Svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`}>
        <Defs>
          <LinearGradient id="elevGradient" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor={Colors.elevation} stopOpacity="0.4" />
            <Stop offset="100%" stopColor={Colors.elevation} stopOpacity="0.02" />
          </LinearGradient>
        </Defs>

        {/* Shaded Area */}
        <Path d={areaPath} fill="url(#elevGradient)" />

        {/* Outline Line */}
        <Path
          d={linePath}
          fill="none"
          stroke={Colors.elevation}
          strokeWidth="2.5"
          strokeLinecap="round"
        />
      </Svg>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    paddingVertical: Spacing.sm,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  title: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statText: {
    fontSize: Typography.fontSize.xs,
    color: Colors.textMuted,
    fontWeight: Typography.fontWeight.medium,
  },
});

