/**
 * Route map for lists (feed, profile, history, save screen, events).
 *
 * Primary: a native MapLibre snapshot of OpenFreeMap (Positron, light so the orange route stands
 * out) with the route, start and finish drawn into the map itself (routeSnapshot.ts).
 * If a snapshot can't be produced (offline, Expo Go), the route geometry is still drawn honestly
 * as a line on a neutral background with a note — never a fake map and never an invented route.
 * Renders nothing when there is no route.
 */
import { Image } from 'expo-image';
import React, { useEffect, useMemo, useState } from 'react';
import { LayoutChangeEvent, StyleSheet, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { AppText } from '../../design/components/AppText';
import { color } from '../../design/tokens';
import { LngLat } from '../../lib/activityView';
import { previewLayout, thin } from '../../lib/mercator';
import { routeSnapshot, snapshotAvailable } from './routeSnapshot';

export const RoutePreview: React.FC<{ route: LngLat[]; height?: number; rounded?: boolean }> = ({
  route,
  height = 220,
  rounded = false,
}) => {
  const [width, setWidth] = useState(0);
  const [snap, setSnap] = useState<{ key: string; uri: string | null; failed: boolean } | null>(null);
  const [retry, setRetry] = useState(0);
  const onLayout = (e: LayoutChangeEvent) => setWidth(Math.round(e.nativeEvent.layout.width));
  const usable = route.length > 1 && width > 0;
  const key = `${width}x${height}:${route.length}:${route[0]?.join(',')}:${retry}`;

  useEffect(() => {
    if (!usable || !snapshotAvailable()) return;
    let cancelled = false;
    routeSnapshot(route, width, height, retry > 0).then(
      (uri) => !cancelled && setSnap({ key, uri, failed: false }),
      () => !cancelled && setSnap({ key, uri: null, failed: true })
    );
    return () => {
      cancelled = true;
    };
  }, [usable, route, width, height, key, retry]);

  // Fallback geometry (only shown when no snapshot is possible).
  const fallback = useMemo(() => {
    if (!usable) return null;
    const L = previewLayout(thin(route), width, height, { padding: 24, maxZoom: 16 });
    if (!L) return null;
    return { d: L.points.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`).join(' '), start: L.points[0], end: L.points[L.points.length - 1] };
  }, [usable, route, width, height]);

  if (route.length < 2) return null;
  const current = snap && snap.key === key ? snap : null;
  const showSnapshot = Boolean(current?.uri);
  const showFallback = !snapshotAvailable() || current?.failed;

  return (
    <View onLayout={onLayout} style={[styles.box, { height }, rounded && styles.rounded]} accessible accessibilityRole="image" accessibilityLabel="Map of the activity route">
      {showSnapshot ? (
        <>
          <Image
            source={{ uri: current!.uri! }}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
            transition={150}
            onError={() => setRetry((r) => r + 1)}
          />
          <AppText variant="caption" style={styles.attribution}>© OpenFreeMap © OpenStreetMap</AppText>
        </>
      ) : showFallback && fallback ? (
        <>
          <Svg width={width} height={height} style={StyleSheet.absoluteFill}>
            <Path d={fallback.d} stroke="#FFFFFF" strokeWidth={7} fill="none" strokeLinecap="round" strokeLinejoin="round" />
            <Path d={fallback.d} stroke={color.brand} strokeWidth={4} fill="none" strokeLinecap="round" strokeLinejoin="round" />
            <Circle cx={fallback.start[0]} cy={fallback.start[1]} r={6} fill={color.routeStart} stroke="#FFFFFF" strokeWidth={2.5} />
            <Circle cx={fallback.end[0]} cy={fallback.end[1]} r={6} fill={color.routeEnd} stroke="#FFFFFF" strokeWidth={2.5} />
          </Svg>
          <AppText variant="caption" color="inkTertiary" style={styles.note}>Map unavailable — route only</AppText>
        </>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  box: { width: '100%', backgroundColor: '#EEF0EC', overflow: 'hidden' },
  rounded: { borderRadius: 12 },
  attribution: { position: 'absolute', right: 4, bottom: 2, fontSize: 9, color: '#555', backgroundColor: 'rgba(255,255,255,0.7)', paddingHorizontal: 3 },
  note: { position: 'absolute', left: 8, bottom: 6 },
});
