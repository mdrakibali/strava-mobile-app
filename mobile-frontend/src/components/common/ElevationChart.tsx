import React from 'react';
import { Text, View } from 'react-native';
import Svg, { Defs, LinearGradient, Path, Stop } from 'react-native-svg';

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
    <View className="w-full py-2">
      <View className="flex-row justify-between items-center mb-1">
        <Text className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
          Elevation Profile
        </Text>
        <Text className="text-[11px] text-gray-400 font-medium">
          Min {minElev}m · Max {maxElev}m · Gain +{maxElev - minElev}m
        </Text>
      </View>

      <Svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`}>
        <Defs>
          <LinearGradient id="elevGradient" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor="#8B5CF6" stopOpacity="0.4" />
            <Stop offset="100%" stopColor="#8B5CF6" stopOpacity="0.02" />
          </LinearGradient>
        </Defs>

        <Path d={areaPath} fill="url(#elevGradient)" />
        <Path
          d={linePath}
          fill="none"
          stroke="#8B5CF6"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
      </Svg>
    </View>
  );
};
