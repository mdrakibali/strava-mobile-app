import { Ionicons } from '@expo/vector-icons';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import React, { useEffect, useRef, useState } from 'react';
import { Platform, Text, TouchableOpacity, View } from 'react-native';
import { MapFallbackView } from './MapFallbackView';
import { LeafletMapView } from './LeafletMapView';
import {
  HeatmapTypeOption,
  MAP_STYLES,
  MapMarkerItem,
  MapStyleKey,
  MapTypeOption,
  StravaMapViewProps,
  TerrainTypeOption,
} from './mapTypes';

export {
  HeatmapTypeOption,
  MAP_STYLES,
  MapMarkerItem,
  MapStyleKey,
  MapTypeOption,
  StravaMapViewProps,
  TerrainTypeOption,
};

let MapLibreGL: any = null;
try {
  MapLibreGL = require('@maplibre/maplibre-react-native').default;
  if (MapLibreGL?.setAccessToken) {
    MapLibreGL.setAccessToken(null);
  }
} catch {
  MapLibreGL = null;
}

export const StravaMapView: React.FC<StravaMapViewProps> = ({
  styleKey = 'positron',
  mapType = 'standard',
  heatmapType = 'global_run',
  terrainType = 'none',
  is3D = false,
  poiEnabled = true,
  bikeLanesEnabled = false,
  centerCoordinate = [90.4125, 23.7745],
  userLocation,
  zoomLevel = 13,
  routeCoordinates,
  markers = [],
  selectedMarkerId,
  onMarkerPress,
  onMapPress,
  showControls = true,
  showUserLocation = true,
  mode = 'explore',
  followUser = mode === 'live-record',
  autoFitRoute = mode === 'view-route',
  className = 'w-full h-full',
  children,
}) => {
  const [currentStyle, setCurrentStyle] = useState<MapStyleKey>(styleKey);
  const [zoom, setZoom] = useState(zoomLevel);
  const [center, setCenter] = useState<[number, number]>(userLocation || centerCoordinate);
  const cameraRef = useRef<any>(null);

  useEffect(() => {
    setCurrentStyle(styleKey);
  }, [styleKey]);

  useEffect(() => {
    if (userLocation) {
      setCenter(userLocation);
    } else {
      setCenter(centerCoordinate);
    }
  }, [centerCoordinate[0], centerCoordinate[1], userLocation?.[0], userLocation?.[1]]);

  const routeGeoJSON: any = routeCoordinates && routeCoordinates.length > 1
    ? {
        type: 'FeatureCollection',
        features: [
          {
            type: 'Feature',
            geometry: {
              type: 'LineString',
              coordinates: routeCoordinates,
            },
            properties: {},
          },
        ],
      }
    : null;

  const handleRecenter = () => {
    const target = userLocation || centerCoordinate;
    setCenter(target);
    if (cameraRef.current?.setCamera) {
      cameraRef.current.setCamera({
        centerCoordinate: target,
        zoomLevel: 14,
        animationDuration: 600,
      });
    }
  };

  const handleZoomIn = () => {
    const nextZoom = Math.min(zoom + 1, 18);
    setZoom(nextZoom);
    cameraRef.current?.zoomTo?.(nextZoom, 300);
  };

  const handleZoomOut = () => {
    const nextZoom = Math.max(zoom - 1, 3);
    setZoom(nextZoom);
    cameraRef.current?.zoomTo?.(nextZoom, 300);
  };

  const cycleStyle = () => {
    const styles: MapStyleKey[] = ['positron', 'voyager', 'dark'];
    const nextIdx = (styles.indexOf(currentStyle) + 1) % styles.length;
    setCurrentStyle(styles[nextIdx]);
  };

  const isExpoGo =
    Constants.appOwnership === 'expo' ||
    Constants.executionEnvironment === ExecutionEnvironment.StoreClient;
  const isMapLibreAvailable =
    !isExpoGo && Boolean(MapLibreGL && MapLibreGL.MapView && Platform.OS !== 'web');

  return (
    <View style={{ flex: 1 }} className={`relative overflow-hidden bg-gray-100 ${className}`}>
      {isMapLibreAvailable ? (
        <MapLibreGL.MapView
          style={{ flex: 1 }}
          styleURL={MAP_STYLES[currentStyle]}
          logoEnabled={false}
          attributionEnabled={true}
          attributionPosition={{ bottom: 8, right: 8 }}
          onPress={(e: any) => {
            if (onMapPress && e.geometry?.coordinates) {
              onMapPress(e.geometry.coordinates);
            }
          }}>
          <MapLibreGL.Camera
            ref={cameraRef}
            defaultSettings={{
              centerCoordinate: center,
              zoomLevel: zoom,
            }}
          />

          {showUserLocation && (
            <MapLibreGL.UserLocation visible={true} showsUserHeadingIndicator={true} />
          )}

          {routeGeoJSON && (
            <MapLibreGL.ShapeSource id="routeSource" shape={routeGeoJSON}>
              <MapLibreGL.LineLayer
                id="routeLineCasing"
                style={{
                  lineColor: '#FFFFFF',
                  lineWidth: 6,
                  lineCap: 'round',
                  lineJoin: 'round',
                }}
              />
              <MapLibreGL.LineLayer
                id="routeLineLayer"
                style={{
                  lineColor: '#FC4C02',
                  lineWidth: 4,
                  lineCap: 'round',
                  lineJoin: 'round',
                }}
              />
            </MapLibreGL.ShapeSource>
          )}

          {markers.map((m) => {
            const isSelected = m.id === selectedMarkerId;
            return (
              <MapLibreGL.PointAnnotation
                key={m.id}
                id={m.id}
                coordinate={m.coordinate}
                onSelected={() => onMarkerPress && onMarkerPress(m)}>
                <View
                  className={`w-8 h-8 rounded-full items-center justify-center border-2 border-white shadow-md ${
                    isSelected ? 'bg-black' : m.type === 'segment' ? 'bg-amber-500' : 'bg-[#FC4C02]'
                  }`}>
                  <Ionicons
                    name={m.type === 'segment' ? 'trophy' : 'navigate'}
                    size={16}
                    color="#FFFFFF"
                  />
                </View>
              </MapLibreGL.PointAnnotation>
            );
          })}
        </MapLibreGL.MapView>
      ) : (
        <LeafletMapView
          routeCoordinates={routeCoordinates}
          markers={markers}
          selectedMarkerId={selectedMarkerId}
          onMarkerPress={onMarkerPress}
          onMapPress={onMapPress}
          userLocation={userLocation}
          centerCoordinate={center}
          zoomLevel={zoom}
          styleKey={currentStyle}
          mapType={mapType}
          heatmapType={heatmapType}
          terrainType={terrainType}
          is3D={is3D}
          showUserLocation={showUserLocation}
          mode={mode}
          followUser={followUser}
          autoFitRoute={autoFitRoute}
        />
      )}

      {showControls && (
        <View className="absolute top-4 right-4 space-y-2 z-20">
          <TouchableOpacity
            onPress={cycleStyle}
            className="w-10 h-10 rounded-full bg-white shadow-md items-center justify-center border border-gray-100 mb-2">
            <Ionicons name="layers-outline" size={20} color="#111827" />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleZoomIn}
            className="w-10 h-10 rounded-full bg-white shadow-md items-center justify-center border border-gray-100 mb-2">
            <Ionicons name="add" size={22} color="#111827" />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleZoomOut}
            className="w-10 h-10 rounded-full bg-white shadow-md items-center justify-center border border-gray-100 mb-2">
            <Ionicons name="remove" size={22} color="#111827" />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleRecenter}
            className="w-10 h-10 rounded-full bg-white shadow-md items-center justify-center border border-gray-100">
            <Ionicons name="locate" size={20} color="#FC4C02" />
          </TouchableOpacity>
        </View>
      )}

      <View className="absolute bottom-2 left-2 bg-white/80 px-2 py-0.5 rounded shadow-sm z-10">
        <Text className="text-[9px] text-gray-600 font-medium">
          © CARTO · © OpenStreetMap
        </Text>
      </View>

      {children}
    </View>
  );
};
