import React, { useState } from 'react';
import { LayoutChangeEvent, View } from 'react-native';
import Svg, { Defs, LinearGradient, Path, Stop } from 'react-native-svg';
import { AppText, color, space } from '../../design';

/**
 * Elevation profile from recorded altitudes. Renders nothing without ≥ 2 real samples
 * (the old ElevationChart drew a made-up profile and labelled max−min as "gain").
 */
export const ElevationProfile: React.FC<{ samples: number[]; height?: number }> = ({ samples, height = 120 }) => {
  const [width, setWidth] = useState(0);
  if (samples.length < 2) return null;

  const min = Math.min(...samples);
  const max = Math.max(...samples);
  const range = Math.max(max - min, 1);
  const step = Math.max(1, Math.floor(samples.length / 200));
  const pts = samples.filter((_, i) => i % step === 0);

  let line = '';
  pts.forEach((v, i) => {
    const x = (i / (pts.length - 1)) * width;
    const y = 8 + (1 - (v - min) / range) * (height - 16);
    line += `${i === 0 ? 'M' : 'L'}${x.toFixed(1)} ${y.toFixed(1)} `;
  });
  const area = `${line} L${width} ${height} L0 ${height} Z`;

  return (
    <View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: space.sm }}>
        <AppText variant="label" color="inkSecondary">
          Low {Math.round(min)} m
        </AppText>
        <AppText variant="label" color="inkSecondary">
          High {Math.round(max)} m
        </AppText>
      </View>
      <View
        onLayout={(e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width)}
        style={{ height }}
        accessible
        accessibilityLabel={`Elevation profile from ${Math.round(min)} to ${Math.round(max)} metres`}>
        {width > 0 ? (
          <Svg width={width} height={height}>
            <Defs>
              <LinearGradient id="elev" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor={color.inkSecondary} stopOpacity={0.35} />
                <Stop offset="1" stopColor={color.inkSecondary} stopOpacity={0.05} />
              </LinearGradient>
            </Defs>
            <Path d={area} fill="url(#elev)" />
            <Path d={line} stroke={color.inkSecondary} strokeWidth={2} fill="none" />
          </Svg>
        ) : null}
      </View>
    </View>
  );
};
