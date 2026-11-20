/**
 * Static route map for lists (feed, profile, history, save screen).
 *
 * Real basemap (CARTO raster tiles — the same provider as the interactive MapLibre style) with
 * the route drawn on the exact same Web Mercator pixel grid, so the line sits on the streets.
 * No map engine per list item: tiles are plain cached images (expo-image) and the line is SVG.
 * Renders nothing when there is no route — we never draw an invented one (UI/UX audit X-3).
 */
import { Image } from 'expo-image';
import React, { useMemo, useState } from 'react';
import { LayoutChangeEvent, StyleSheet, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { color } from '../../design/tokens';
import { LngLat } from '../../lib/activityView';
import { previewLayout, thin } from '../../lib/mercator';

const TILE_URL =
  process.env.EXPO_PUBLIC_RASTER_TILE_URL || 'https://basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}@2x.png';

const tileUrl = (z: number, x: number, y: number) =>
  TILE_URL.replace('{z}', String(z)).replace('{x}', String(x)).replace('{y}', String(y));

export const RoutePreview: React.FC<{ route: LngLat[]; height?: number; rounded?: boolean }> = ({
  route,
  height = 220,
  rounded = false,
}) => {
  const [width, setWidth] = useState(0);
  const onLayout = (e: LayoutChangeEvent) => setWidth(Math.round(e.nativeEvent.layout.width));

  const layout = useMemo(
    () => (width > 0 ? previewLayout(thin(route), width, height, { padding: 28, maxZoom: 16 }) : null),
    [route, width, height]
  );

  const path = useMemo(() => {
    if (!layout) return '';
    return layout.points.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)} ${y.toFixed(1)}`).join(' ');
  }, [layout]);

  if (route.length < 2) return null;
  const start = layout?.points[0];
  const end = layout?.points[layout.points.length - 1];

  return (
    <View
      onLayout={onLayout}
      style={[styles.box, { height }, rounded && styles.rounded]}
      accessible
      accessibilityRole="image"
      accessibilityLabel="Map of the activity route">
      {layout ? (
        <>
          {layout.tiles.map((t) => (
            <Image
              key={`${t.z}/${t.x}/${t.y}/${t.left}`}
              source={{ uri: tileUrl(t.z, t.x, t.y) }}
              style={{ position: 'absolute', left: t.left, top: t.top, width: 256, height: 256 }}
              cachePolicy="disk"
              transition={150}
              recyclingKey={`${t.z}/${t.x}/${t.y}`}
            />
          ))}
          <Svg width={width} height={height} style={StyleSheet.absoluteFill}>
            {/* white casing keeps the route readable over busy streets */}
            <Path d={path} stroke="#FFFFFF" strokeWidth={7} fill="none" strokeLinecap="round" strokeLinejoin="round" />
            <Path d={path} stroke={color.brand} strokeWidth={4} fill="none" strokeLinecap="round" strokeLinejoin="round" />
            {start ? <Circle cx={start[0]} cy={start[1]} r={6} fill={color.success} stroke="#FFFFFF" strokeWidth={2.5} /> : null}
            {end ? <Circle cx={end[0]} cy={end[1]} r={6} fill={color.ink} stroke="#FFFFFF" strokeWidth={2.5} /> : null}
          </Svg>
        </>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  box: { width: '100%', backgroundColor: '#EEF0EC', overflow: 'hidden' },
  rounded: { borderRadius: 12 },
});
