import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { LayoutChangeEvent, View } from 'react-native';
import Svg, { Defs, LinearGradient, Path, Stop } from 'react-native-svg';
import { AppText, color, space } from '../../design';
import { kmValue } from '../../lib/format';

interface ElevationProfileProps {
  samples?: number[] | null;
  distanceMeters?: number | null;
  gainMeters?: number | null;
  height?: number;
}

/**
 * Elevation profile from real recorded altitudes or DEM heights.
 * If real elevation data is unavailable (< 2 samples), displays an honest unavailable state.
 * Never invents, randomizes, or simulates elevation data.
 */
export const ElevationProfile: React.FC<ElevationProfileProps> = ({
  samples,
  distanceMeters,
  gainMeters,
  height = 120,
}) => {
  const [width, setWidth] = useState(0);

  if (!samples || samples.length < 2) {
    return (
      <View className="py-5 px-4 items-center justify-center bg-gray-50 rounded-2xl border border-gray-200">
        <Ionicons name="stats-chart-outline" size={24} color="#9CA3AF" />
        <AppText className="text-gray-500 text-xs font-semibold mt-1">
          Elevation profile unavailable for this route
        </AppText>
      </View>
    );
  }

  const min = Math.min(...samples);
  const max = Math.max(...samples);
  const range = Math.max(max - min, 1);
  const step = Math.max(1, Math.floor(samples.length / 200));
  const pts = samples.filter((_, i) => i % step === 0);

  let line = '';
  pts.forEach((v, i) => {
    const x = (i / (pts.length - 1)) * width;
    const y = 8 + (1 - (v - min) / range) * (height - 24);
    line += `${i === 0 ? 'M' : 'L'}${x.toFixed(1)} ${y.toFixed(1)} `;
  });
  const area = `${line} L${width} ${height - 16} L0 ${height - 16} Z`;

  const totalKm = distanceMeters ? Number(kmValue(distanceMeters)) : null;
  const midKm = totalKm ? (totalKm / 2).toFixed(1) : null;

  return (
    <View className="bg-gray-50 rounded-2xl p-4 border border-gray-200">
      {/* Top metrics header */}
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: space.sm,
        }}
      >
        <View className="flex-row items-center gap-2">
          <View className="px-2 py-0.5 rounded-full bg-orange-100 border border-orange-200">
            <AppText className="text-[#FC4C02] text-xs font-black">
              {gainMeters != null ? `+${gainMeters} m gain` : `${Math.round(max - min)} m climb`}
            </AppText>
          </View>
        </View>
        <View className="flex-row items-center gap-3">
          <AppText className="text-gray-500 text-xs font-medium">Low {Math.round(min)} m</AppText>
          <AppText className="text-gray-500 text-xs font-medium">High {Math.round(max)} m</AppText>
        </View>
      </View>

      {/* SVG graph */}
      <View
        onLayout={(e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width)}
        style={{ height }}
        accessible
        accessibilityLabel={`Elevation profile from ${Math.round(min)} to ${Math.round(max)} metres`}
      >
        {width > 0 ? (
          <Svg width={width} height={height - 16}>
            <Defs>
              <LinearGradient id="elev" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor={color.brand} stopOpacity={0.35} />
                <Stop offset="1" stopColor={color.brand} stopOpacity={0.05} />
              </LinearGradient>
            </Defs>
            <Path d={area} fill="url(#elev)" />
            <Path d={line} stroke={color.brand} strokeWidth={2.5} fill="none" />
          </Svg>
        ) : null}
      </View>

      {/* X-axis distance labels */}
      {totalKm != null ? (
        <View className="flex-row justify-between items-center pt-1 border-t border-gray-200">
          <AppText className="text-gray-400 text-[10px] font-bold">0 km</AppText>
          {midKm ? (
            <AppText className="text-gray-400 text-[10px] font-bold">{midKm} km</AppText>
          ) : null}
          <AppText className="text-gray-400 text-[10px] font-bold">{totalKm} km</AppText>
        </View>
      ) : null}
    </View>
  );
};
