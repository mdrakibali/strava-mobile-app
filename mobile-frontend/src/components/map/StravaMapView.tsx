/**
 * Compatibility adapter for screens written against the old StravaMapView API (route detail,
 * route navigation, route builder, segment, heatmap). It renders the single working map
 * (MapView: MapLibre v11 + OpenFreeMap). The old implementation used the non-existent v10 API
 * and defaulted to hard-coded Dhaka coordinates; this one never invents a position.
 */
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { MapView } from './MapView';
import { MapMarkerItem, MapStyleKey, StravaMapViewProps } from './mapTypes';

export type { HeatmapTypeOption, MapMarkerItem, MapStyleKey, MapTypeOption, TerrainTypeOption } from './mapTypes';

const toStyle = (k?: string): MapStyleKey => (k === 'positron' ? 'positron' : k === 'bright' ? 'bright' : 'liberty');

export const StravaMapView: React.FC<StravaMapViewProps> = ({
  styleKey,
  centerCoordinate,
  userLocation,
  zoomLevel,
  routeCoordinates = [],
  heatmapRoutes,
  markers,
  selectedMarkerId,
  onMarkerPress,
  onMapPress,
  showUserLocation,
  mode = 'view-route',
  followUser,
  children,
}) => {
  const byId = new Map<string, MapMarkerItem>((markers ?? []).map((m) => [m.id, m]));
  return (
    <View style={styles.fill}>
      <MapView
        mode={mode === 'live-record' ? 'live' : 'route'}
        route={routeCoordinates}
        userPosition={userLocation ?? null}
        following={mode === 'live-record' ? followUser !== false : undefined}
        showUserLocation={showUserLocation}
        otherRoutes={heatmapRoutes}
        markers={markers?.map((m) => ({ id: m.id, coordinate: m.coordinate, selected: m.id === selectedMarkerId }))}
        onMarkerPress={onMarkerPress ? (id) => byId.get(id) && onMarkerPress(byId.get(id)!) : undefined}
        onMapPress={onMapPress}
        focus={routeCoordinates.length === 0 && centerCoordinate ? { center: centerCoordinate, zoom: zoomLevel ?? 14 } : null}
        frameKey={`${routeCoordinates.length}:${centerCoordinate?.join(',') ?? ''}`}
        styleKey={toStyle(styleKey)}>
        {children}
      </MapView>
    </View>
  );
};

const styles = StyleSheet.create({ fill: { flex: 1 } });
