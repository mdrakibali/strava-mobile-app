/**
 * The app's single interactive map: MapLibre Native v11 + OpenFreeMap vector tiles (no API key).
 *
 * History: the original StravaMapView used the v10 API, which doesn't exist in the installed v11
 * package, so the native map never rendered (UI/UX audit X-1). This wrapper uses the v11 named
 * exports. In Expo Go (no native MapLibre module) it says so instead of silently showing a
 * different map with an invented default location.
 *
 * Never invents a position: with no route and no known user position the camera shows the world.
 */
import Constants, { ExecutionEnvironment } from 'expo-constants';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleProp, View, ViewStyle } from 'react-native';
import { AppText } from '../../design/components/AppText';
import { color } from '../../design/tokens';
import { LngLat } from '../../lib/activityView';
import { MAP_STYLES, MapStyleKey } from './mapTypes';

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
export const nativeMapModule = ML;

export const styleUrl = (key: MapStyleKey = 'liberty') =>
  (key === 'liberty' && process.env.EXPO_PUBLIC_MAP_STYLE_URL) || MAP_STYLES[key];

export interface MapMarker {
  id: string;
  coordinate: LngLat;
  selected?: boolean;
}

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
  /** Changing this re-frames the camera (e.g. a different route or place was selected). */
  frameKey?: string;
  /** Point markers (e.g. nearby places). The selected one is drawn larger. */
  markers?: MapMarker[];
  onMarkerPress?: (id: string) => void;
  /** Tap on the map (route builder). */
  onMapPress?: (lngLat: LngLat) => void;
  /** Centre + zoom when there is no route to frame (e.g. a selected place). */
  focus?: { center: LngLat; zoom: number } | null;
  styleKey?: MapStyleKey;
  /** Camera tilt in degrees (0 = 2D). With the Liberty style, >0 shows real 3D buildings. */
  pitch?: number;
  /** A PLANNED route drawn as a dashed blue reference line — never mixed with the recorded route. */
  plannedRoute?: LngLat[];
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
  markers,
  onMarkerPress,
  onMapPress,
  focus,
  styleKey = 'liberty',
  pitch = 0,
  plannedRoute,
}) => {
  const [loadState, setLoadState] = useState<'loading' | 'ready' | 'error'>('loading');
  const cameraRef = useRef<any>(null);
  // Tilt in place (keeps the current centre and zoom; switching styles keeps them too because the
  // Map instance is not remounted).
  useEffect(() => {
    cameraRef.current?.easeTo?.({ pitch, duration: 600 });
  }, [pitch]);

  const plannedData = useMemo<GeoJSON.FeatureCollection>(
    () => ({
      type: 'FeatureCollection',
      features:
        plannedRoute && plannedRoute.length > 1
          ? [{ type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: plannedRoute } }]
          : [],
    }),
    [plannedRoute]
  );
  const [attempt, setAttempt] = useState(0);

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

  const othersData = useMemo<GeoJSON.FeatureCollection>(
    () => ({
      type: 'FeatureCollection',
      features: (otherRoutes ?? [])
        .filter((r) => r.length > 1)
        .map((coordinates) => ({ type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates } })),
    }),
    [otherRoutes]
  );

  const nativeUserLocation = mode === 'live' || showUserLocation;
  const userDotData = useMemo<GeoJSON.FeatureCollection | null>(() => {
    // The native puck is the only current-location marker. A second dot tracks a different
    // GPS subscription and draws another blue circle on top of it.
    if (nativeUserLocation || !userPosition) return null;
    return {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          properties: {},
          geometry: {
            type: 'Point',
            coordinates: userPosition,
          },
        },
      ],
    };
  }, [nativeUserLocation, userPosition]);

  const endpoints = useMemo<GeoJSON.FeatureCollection>(() => {
    const features: GeoJSON.Feature[] = [];
    if (mode === 'route' && route.length > 0) {
      features.push({ type: 'Feature', properties: { kind: 'start' }, geometry: { type: 'Point', coordinates: route[0] } });
    }
    if (mode === 'route' && route.length > 1) {
      const isLoop =
        Math.abs(route[0][0] - route[route.length - 1][0]) < 0.0008 &&
        Math.abs(route[0][1] - route[route.length - 1][1]) < 0.0008;
      if (!isLoop) {
        features.push({
          type: 'Feature',
          properties: { kind: 'end' },
          geometry: { type: 'Point', coordinates: route[route.length - 1] },
        });
      }
    }
    return { type: 'FeatureCollection', features };
  }, [route, mode]);

  const markerData = useMemo<GeoJSON.FeatureCollection>(
    () => ({
      type: 'FeatureCollection',
      features: (markers ?? []).map((m) => ({
        type: 'Feature',
        properties: { id: m.id, selected: m.selected ? 1 : 0 },
        geometry: { type: 'Point', coordinates: m.coordinate },
      })),
    }),
    [markers]
  );

  const cameraPadding = {
    top: 48 + (padding.top ?? 0),
    right: 40 + (padding.right ?? 0),
    bottom: 48 + (padding.bottom ?? 0),
    left: 40 + (padding.left ?? 0),
  };

  if (!ML) {
    return (
      <View style={style} className="flex-1 bg-gray-50 items-center justify-center p-6">
        <AppText variant="bodyStrong">Map unavailable in Expo Go</AppText>
        <AppText variant="label" color="inkSecondary" style={{ textAlign: 'center', marginTop: 4 }}>
          Maps and GPS recording need the development build (npx expo run:android).
        </AppText>
        {children}
      </View>
    );
  }

  const { Map, Camera, GeoJSONSource, Layer, UserLocation } = ML;

  // Camera: fit the route (route mode), follow the user (live), a focus point, or the best known
  // real position. Never a hard-coded city.
  let cameraElement: React.ReactNode;
  if (mode === 'route' && route.length > 0) {
    cameraElement = <Camera ref={cameraRef} key={frameKey ?? 'route'} initialViewState={{ bounds: boundsOf(route), padding: cameraPadding }} />;
  } else if (mode === 'live') {
    const centre = userPosition || route[route.length - 1];
    cameraElement = (
      <Camera
        ref={cameraRef}
        key={centre ? 'live' : 'live-unknown'}
        initialViewState={centre ? { center: centre, zoom: 16 } : { zoom: 1 }}
        trackUserLocation={following ? 'default' : undefined}
        onTrackUserLocationChange={(e) => {
          if (e.nativeEvent.trackUserLocation === null) onFollowingChange?.(false);
        }}
      />
    );
  } else if (focus) {
    cameraElement = <Camera ref={cameraRef} key={frameKey ?? 'focus'} initialViewState={{ center: focus.center, zoom: focus.zoom }} />;
  } else if (userPosition) {
    cameraElement = <Camera ref={cameraRef} key={frameKey ?? 'user'} initialViewState={{ center: userPosition, zoom: 13 }} />;
  } else {
    cameraElement = <Camera ref={cameraRef} key="world" initialViewState={{ zoom: 1 }} />;
  }

  return (
    <View style={style} className="flex-1 bg-gray-50">
      <Map
        key={attempt}
        style={{ flex: 1 }}
        mapStyle={styleUrl(styleKey)}
        logo={false}
        compass={false}
        attribution
        attributionPosition={{ bottom: 8 + (padding.bottom ?? 0), left: 8 }}
        dragPan={interactive}
        touchZoom={interactive}
        doubleTapZoom={interactive}
        touchRotate={false}
        touchPitch={pitch > 0}
        onDidFinishLoadingMap={() => setLoadState('ready')}
        onDidFailLoadingMap={() => setLoadState('error')}
        onPress={onMapPress ? (e) => onMapPress(e.nativeEvent.lngLat as LngLat) : undefined}>
        {cameraElement}
        {userDotData ? (
          <GeoJSONSource id="user-location-badge" data={userDotData}>
            <Layer
              id="user-location-radar"
              type="circle"
              paint={{
                'circle-radius': 16,
                'circle-color': 'rgba(37, 99, 235, 0.20)',
                'circle-stroke-width': 1.5,
                'circle-stroke-color': '#2563EB',
              }}
            />
            <Layer
              id="user-location-white-ring"
              type="circle"
              paint={{
                'circle-radius': 9.5,
                'circle-color': '#FFFFFF',
                'circle-stroke-width': 2.5,
                'circle-stroke-color': '#DBEAFE',
              }}
            />
            <Layer
              id="user-location-blue-core"
              type="circle"
              paint={{
                'circle-radius': 6,
                'circle-color': '#0070F3',
              }}
            />
          </GeoJSONSource>
        ) : null}
        {nativeUserLocation ? <UserLocation animated accuracy={false} heading={false} /> : null}
        {otherRoutes && otherRoutes.length ? (
          <GeoJSONSource id="other-routes" data={othersData}>
            <Layer
              id="other-routes-line"
              type="line"
              layout={{ 'line-cap': 'round', 'line-join': 'round' }}
              paint={{ 'line-color': color.brand, 'line-width': 3, 'line-opacity': 0.4 }}
            />
          </GeoJSONSource>
        ) : null}
        {plannedRoute && plannedRoute.length > 1 ? (
          <GeoJSONSource id="planned-route" data={plannedData}>
            <Layer
              id="planned-route-casing"
              type="line"
              layout={{ 'line-cap': 'round', 'line-join': 'round' }}
              paint={{ 'line-color': '#FFFFFF', 'line-width': 8 }}
            />
            <Layer
              id="planned-route-line"
              type="line"
              layout={{ 'line-cap': 'round', 'line-join': 'round' }}
              paint={{ 'line-color': color.brand, 'line-width': 5, 'line-opacity': 0.9 }}
            />
          </GeoJSONSource>
        ) : null}
        <GeoJSONSource id="route" data={lineData}>
          <Layer
            id="route-casing"
            type="line"
            layout={{ 'line-cap': 'round', 'line-join': 'round' }}
            paint={{ 'line-color': '#FFFFFF', 'line-width': 9 }}
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
              'circle-radius': 8,
              'circle-stroke-width': 3,
              'circle-stroke-color': '#FFFFFF',
              'circle-color': ['match', ['get', 'kind'], 'start', '#10B981', color.routeEnd],
            }}
          />
        </GeoJSONSource>
        {markers && markers.length ? (
          <GeoJSONSource
            id="markers"
            data={markerData}
            hitbox={{ top: 12, right: 12, bottom: 12, left: 12 }}
            onPress={(e) => {
              const id = e.nativeEvent.features?.[0]?.properties?.id;
              if (id != null) onMarkerPress?.(String(id));
            }}>
            <Layer
              id="markers-circle"
              type="circle"
              paint={{
                'circle-radius': ['case', ['==', ['get', 'selected'], 1], 11, 7],
                'circle-color': ['case', ['==', ['get', 'selected'], 1], color.brand, '#FFFFFF'],
                'circle-stroke-color': color.brand,
                'circle-stroke-width': 3,
              }}
            />
          </GeoJSONSource>
        ) : null}
      </Map>
      {loadState === 'error' ? (
        <View className="absolute inset-0 items-center justify-center p-6 bg-[#F5F6F8]/95">
          <AppText variant="bodyStrong">The map couldn’t load</AppText>
          <AppText variant="label" color="inkSecondary" style={{ textAlign: 'center', marginTop: 4 }}>Check your connection.</AppText>
          <Pressable
            onPress={() => {
              setLoadState('loading');
              setAttempt((a) => a + 1);
            }}
            accessibilityRole="button"
            className="mt-3 px-5 py-2.5">
            <AppText variant="bodyStrong" color="brandText">Retry</AppText>
          </Pressable>
        </View>
      ) : null}
      {children}
    </View>
  );
};
