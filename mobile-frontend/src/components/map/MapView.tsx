/**
 * MapLibre v11 map wrapper (docs/STRAVA_SCREEN_DESIGN_PLAN.md §2.4, ADR-14).
 *
 * The previous StravaMapView used the v10 API (`default.MapView`, `ShapeSource`, `LineLayer`),
 * which does not exist in the installed v11 package, so the native map never rendered and every
 * map silently fell back to a Leaflet WebView (UI/UX audit X-1). This component uses the v11
 * named exports. The Leaflet view is kept only as a fallback for Expo Go, where the native module
 * is absent.
 */
import Constants, { ExecutionEnvironment } from 'expo-constants';
import React, { useMemo } from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { color } from '../../design/tokens';
import { LngLat } from '../../lib/activityView';
import { LeafletMapView } from './LeafletMapView';
import { MAP_STYLES } from './mapTypes';

type MapLibreModule = typeof import('@maplibre/maplibre-react-native');

const isExpoGo =
  Constants.appOwnership === 'expo' ||
  Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

let ML: MapLibreModule | null = null;
if (!isExpoGo) {
  try {
    // Conditional require: the native module is absent in Expo Go (static import would crash).
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    ML = require('@maplibre/maplibre-react-native');
  } catch {
    ML = null;
  }
}

export const isNativeMapAvailable = Boolean(ML?.Map);

const STYLE_URL = process.env.EXPO_PUBLIC_MAP_STYLE_URL || MAP_STYLES.positron;

export interface MapViewProps {
  /** `route`: frame the whole route. `live`: follow the user while recording. */
  mode: 'route' | 'live';
  route?: LngLat[];
  /** Last known user position — used to centre before the first route point exists. */
  userPosition?: LngLat | null;
  following?: boolean;
  onFollowingChange?: (following: boolean) => void;
  interactive?: boolean;
  /** Extra space so overlays (cards, sheets) don't cover the framed route. */
  padding?: { top?: number; right?: number; bottom?: number; left?: number };
  style?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
  /** Additional routes drawn faintly for context (Maps tab). */
  otherRoutes?: LngLat[][];
  /** Show the blue user dot in route mode too. */
  showUserLocation?: boolean;
  /** Changing this re-frames the camera (e.g. a different route was selected). */
  frameKey?: string;
}

const boundsOf = (pts: LngLat[]): [number, number, number, number] => {
  let w = Infinity;
  let s = Infinity;
  let e = -Infinity;
  let n = -Infinity;
  for (const [lng, lat] of pts) {
    w = Math.min(w, lng);
    e = Math.max(e, lng);
    s = Math.min(s, lat);
    n = Math.max(n, lat);
  }
  // Avoid a zero-area box (single point / stationary track).
  const minSpan = 0.002;
  if (e - w < minSpan) {
    w -= minSpan / 2;
    e += minSpan / 2;
  }
  if (n - s < minSpan) {
    s -= minSpan / 2;
    n += minSpan / 2;
  }
  return [w, s, e, n];
};

export const MapView: React.FC<MapViewProps> = ({
  mode,
  route = [],
  userPosition,
  following = mode === 'live',
  onFollowingChange,
  interactive = true,
  padding = {},
  style,
  children,
  otherRoutes,
  showUserLocation = false,
  frameKey,
}) => {
  const othersData = useMemo<GeoJSON.FeatureCollection>(
    () => ({
      type: 'FeatureCollection',
      features: (otherRoutes ?? [])
        .filter((r) => r.length > 1)
        .map((coordinates) => ({ type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates } })),
    }),
    [otherRoutes]
  );

  const lineData = useMemo<GeoJSON.FeatureCollection>(
    () => ({
      type: 'FeatureCollection',
      features:
        route.length > 1
          ? [{ type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: route } }]
          : [],
    }),
    [route]
  );

  const endpoints = useMemo<GeoJSON.FeatureCollection>(() => {
    const features: GeoJSON.Feature[] = [];
    if (route.length > 0) {
      features.push({
        type: 'Feature',
        properties: { kind: 'start' },
        geometry: { type: 'Point', coordinates: route[0] },
      });
    }
    if (mode === 'route' && route.length > 1) {
      features.push({
        type: 'Feature',
        properties: { kind: 'end' },
        geometry: { type: 'Point', coordinates: route[route.length - 1] },
      });
    }
    return { type: 'FeatureCollection', features };
  }, [route, mode]);

  const cameraPadding = {
    top: 48 + (padding.top ?? 0),
    right: 40 + (padding.right ?? 0),
    bottom: 48 + (padding.bottom ?? 0),
    left: 40 + (padding.left ?? 0),
  };

  if (!ML) {
    // Expo Go fallback (no native MapLibre). Kept until all testers use development builds.
    const centre = route[0] || userPosition || undefined;
    return (
      <View style={[styles.fill, style]} pointerEvents={interactive ? 'auto' : 'none'}>
        <LeafletMapView
          routeCoordinates={route}
          userLocation={userPosition ?? undefined}
          centerCoordinate={centre}
          zoomLevel={15}
          showUserLocation={mode === 'live'}
          mode={mode === 'live' ? 'live-record' : 'view-route'}
          followUser={mode === 'live' && following}
          autoFitRoute={mode === 'route'}
        />
        {children}
      </View>
    );
  }

  const { Map, Camera, GeoJSONSource, Layer, UserLocation } = ML;

  // Camera: fit route bounds (route mode), follow user (live), or centre on the best known point.
  let cameraElement: React.ReactNode;
  if (mode === 'route' && route.length > 0) {
    cameraElement = (
      <Camera
        key={frameKey ?? 'route'}
        initialViewState={{ bounds: boundsOf(route), padding: cameraPadding }}
      />
    );
  } else if (mode === 'live') {
    const centre = userPosition || route[route.length - 1];
    cameraElement = (
      <Camera
        initialViewState={centre ? { center: centre, zoom: 16 } : { zoom: 2 }}
        trackUserLocation={following ? 'default' : undefined}
        onTrackUserLocationChange={(e) => {
          if (e.nativeEvent.trackUserLocation === null) onFollowingChange?.(false);
        }}
      />
    );
  } else if (userPosition) {
    cameraElement = <Camera key={frameKey ?? 'user'} initialViewState={{ center: userPosition, zoom: 13 }} />;
  } else {
    cameraElement = <Camera initialViewState={{ zoom: 2 }} />;
  }

  return (
    <View style={[styles.fill, style]}>
      <Map
        style={styles.fill}
        mapStyle={STYLE_URL}
        logo={false}
        compass={false}
        attribution
        attributionPosition={{ bottom: 8 + (padding.bottom ?? 0), left: 8 }}
        dragPan={interactive}
        touchZoom={interactive}
        doubleTapZoom={interactive}
        touchRotate={false}
        touchPitch={false}>
        {cameraElement}
        {mode === 'live' || showUserLocation ? <UserLocation animated accuracy /> : null}
        {otherRoutes && otherRoutes.length ? (
          <GeoJSONSource id="other-routes" data={othersData}>
            <Layer
              id="other-routes-line"
              type="line"
              layout={{ 'line-cap': 'round', 'line-join': 'round' }}
              paint={{ 'line-color': color.brand, 'line-width': 3, 'line-opacity': 0.35 }}
            />
          </GeoJSONSource>
        ) : null}
        <GeoJSONSource id="route" data={lineData}>
          <Layer
            id="route-casing"
            type="line"
            layout={{ 'line-cap': 'round', 'line-join': 'round' }}
            paint={{ 'line-color': '#FFFFFF', 'line-width': 8 }}
          />
          <Layer
            id="route-line"
            type="line"
            layout={{ 'line-cap': 'round', 'line-join': 'round' }}
            paint={{ 'line-color': color.brand, 'line-width': 5 }}
          />
        </GeoJSONSource>
        <GeoJSONSource id="route-endpoints" data={endpoints}>
          <Layer
            id="route-endpoints"
            type="circle"
            paint={{
              'circle-radius': 7,
              'circle-stroke-width': 3,
              'circle-stroke-color': '#FFFFFF',
              'circle-color': ['match', ['get', 'kind'], 'start', color.routeStart, color.routeEnd],
            }}
          />
        </GeoJSONSource>
      </Map>
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: color.canvas },
});
