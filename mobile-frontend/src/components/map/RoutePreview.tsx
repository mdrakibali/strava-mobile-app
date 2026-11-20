/**
 * Static route preview for lists (feed, profile). Pure SVG — no map engine per list item
 * (technical audit FE-02). Renders nothing when there is no route: we never draw an invented
 * route (the old RouteMapPreview drew a fake loop around Dhaka; UI/UX audit X-3).
 *
 * Upgrade path: MapLibre v11 `StaticMapImageManager` can render real basemap snapshots once
 * cached server-side; the call sites only need `route`.
 */
import React, { useMemo, useState } from 'react';
import { LayoutChangeEvent, StyleSheet, View } from 'react-native';
import Svg, { Circle, Defs, Line, Path, Pattern, Rect } from 'react-native-svg';
import { color } from '../../design/tokens';
import { LngLat } from '../../lib/activityView';

const MAX_POINTS = 300;

const downsample = (pts: LngLat[]) => {
  if (pts.length <= MAX_POINTS) return pts;
  const step = pts.length / MAX_POINTS;
  const out: LngLat[] = [];
  for (let i = 0; i < MAX_POINTS; i++) out.push(pts[Math.floor(i * step)]);
  out.push(pts[pts.length - 1]);
  return out;
};

export const RoutePreview: React.FC<{ route: LngLat[]; height?: number; rounded?: boolean }> = ({
  route,
  height = 180,
  rounded = false,
}) => {
  const [width, setWidth] = useState(0);
  const onLayout = (e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width);

  const geometry = useMemo(() => {
    if (route.length < 2 || width === 0) return null;
    const pts = downsample(route);
    const midLat = pts.reduce((s, p) => s + p[1], 0) / pts.length;
    const kx = Math.cos((midLat * Math.PI) / 180); // equirectangular scaling
    const xs = pts.map((p) => p[0] * kx);
    const ys = pts.map((p) => p[1]);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    const pad = 24;
    const spanX = Math.max(maxX - minX, 1e-6);
    const spanY = Math.max(maxY - minY, 1e-6);
    const scale = Math.min((width - pad * 2) / spanX, (height - pad * 2) / spanY);
    const offX = (width - spanX * scale) / 2;
    const offY = (height - spanY * scale) / 2;
    const project = (i: number): [number, number] => [
      offX + (xs[i] - minX) * scale,
      offY + (maxY - ys[i]) * scale, // north up
    ];
    let d = '';
    for (let i = 0; i < pts.length; i++) {
      const [x, y] = project(i);
      d += `${i === 0 ? 'M' : 'L'}${x.toFixed(1)} ${y.toFixed(1)} `;
    }
    return { d, start: project(0), end: project(pts.length - 1) };
  }, [route, width, height]);

  if (route.length < 2) return null;

  return (
    <View
      onLayout={onLayout}
      style={[styles.box, { height }, rounded && styles.rounded]}
      accessible
      accessibilityLabel="Route map preview">
      {geometry ? (
        <Svg width={width} height={height}>
          <Defs>
            <Pattern id="grid" width={24} height={24} patternUnits="userSpaceOnUse">
              <Line x1={0} y1={0} x2={24} y2={0} stroke="#E4E7EC" strokeWidth={1} />
              <Line x1={0} y1={0} x2={0} y2={24} stroke="#E4E7EC" strokeWidth={1} />
            </Pattern>
          </Defs>
          <Rect x={0} y={0} width={width} height={height} fill="url(#grid)" />
          <Path d={geometry.d} stroke="#FFFFFF" strokeWidth={7} fill="none" strokeLinecap="round" strokeLinejoin="round" />
          <Path d={geometry.d} stroke={color.brand} strokeWidth={4} fill="none" strokeLinecap="round" strokeLinejoin="round" />
          <Circle cx={geometry.start[0]} cy={geometry.start[1]} r={6} fill={color.routeStart} stroke="#FFFFFF" strokeWidth={2.5} />
          <Circle cx={geometry.end[0]} cy={geometry.end[1]} r={6} fill={color.routeEnd} stroke="#FFFFFF" strokeWidth={2.5} />
        </Svg>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  box: { width: '100%', backgroundColor: '#F6F7F9', overflow: 'hidden' },
  rounded: { borderRadius: 12 },
});
