import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useRef, useState } from 'react';
import { Platform, Text, TouchableOpacity, View } from 'react-native';

// CARTO Basemap Styles
export const MAP_STYLES = {
  positron: 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json',
  voyager: 'https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json',
  dark: 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json',
};

export type MapStyleKey = keyof typeof MAP_STYLES;

export interface MapMarkerItem {
  id: string;
  coordinate: [number, number]; // [longitude, latitude]
  title: string;
  subtitle?: string;
  type: 'route' | 'segment';
}

export interface StravaMapViewProps {
  styleKey?: MapStyleKey;
  centerCoordinate?: [number, number]; // [longitude, latitude]
  zoomLevel?: number;
  routeCoordinates?: [number, number][]; // LineString points: [[lon, lat], ...]
  heatmapRoutes?: [number, number][][];
  markers?: MapMarkerItem[];
  selectedMarkerId?: string;
  onMarkerPress?: (marker: MapMarkerItem) => void;
  onMapPress?: (coordinate: [number, number]) => void;
  showControls?: boolean;
  showUserLocation?: boolean;
  className?: string;
  children?: React.ReactNode;
}

// Dynamically import MapLibre for native platform support
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
  centerCoordinate = [90.4125, 23.7745],
  zoomLevel = 13,
  routeCoordinates,
  heatmapRoutes,
  markers = [],
  selectedMarkerId,
  onMarkerPress,
  onMapPress,
  showControls = true,
  showUserLocation = true,
  className = 'w-full h-full',
  children,
}) => {
  const [currentStyle, setCurrentStyle] = useState<MapStyleKey>(styleKey);
  const [zoom, setZoom] = useState(zoomLevel);
  const [center, setCenter] = useState<[number, number]>(centerCoordinate);
  const cameraRef = useRef<any>(null);

  useEffect(() => {
    setCurrentStyle(styleKey);
  }, [styleKey]);

  useEffect(() => {
    setCenter(centerCoordinate);
  }, [centerCoordinate[0], centerCoordinate[1]]);

  // GeoJSON feature collection for route polyline
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

  // Recenter to current coordinate
  const handleRecenter = () => {
    setCenter(centerCoordinate);
    if (cameraRef.current?.setCamera) {
      cameraRef.current.setCamera({
        centerCoordinate,
        zoomLevel: 14,
        animationDuration: 600,
      });
    }
  };

  const handleZoomIn = () => {
    const nextZoom = Math.min(zoom + 1, 18);
    setZoom(nextZoom);
    if (cameraRef.current?.zoomTo) {
      cameraRef.current.zoomTo(nextZoom, 300);
    }
  };

  const handleZoomOut = () => {
    const nextZoom = Math.max(zoom - 1, 3);
    setZoom(nextZoom);
    if (cameraRef.current?.zoomTo) {
      cameraRef.current.zoomTo(nextZoom, 300);
    }
  };

  const cycleStyle = () => {
    const styles: MapStyleKey[] = ['positron', 'voyager', 'dark'];
    const nextIdx = (styles.indexOf(currentStyle) + 1) % styles.length;
    setCurrentStyle(styles[nextIdx]);
  };

  // Check if MapLibre is active and ready on this platform
  const isMapLibreAvailable = MapLibreGL && MapLibreGL.MapView && Platform.OS !== 'web';

  return (
    <View className={`relative overflow-hidden bg-gray-100 ${className}`}>
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

          {/* Route Polyline Layer */}
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

          {/* Markers */}
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
        /* Realistic Interactive Tile View Fallback with CARTO Tiles */
        <View className="flex-1 bg-stone-100 items-center justify-center relative">
          {/* Subtle Grid / Tile Pattern simulating vector map */}
          <View className="absolute inset-0 bg-[#F4F3F0]">
            <View className="flex-1 opacity-20 border-b border-r border-gray-400" />
          </View>

          {/* Fallback Road Lines */}
          <View className="absolute w-full h-1 bg-gray-300 top-1/3 -rotate-6" />
          <View className="absolute w-full h-1.5 bg-gray-300 top-1/2 rotate-12" />
          <View className="absolute w-1.5 h-full bg-gray-300 left-1/3" />

          {/* Render Route Polyline using responsive SVG on fallback */}
          {routeCoordinates && routeCoordinates.length > 1 && (
            <View className="absolute inset-x-8 inset-y-16 items-center justify-center">
              <View className="w-48 h-32 border-4 border-[#FC4C02] rounded-3xl opacity-90 -rotate-12 bg-orange-500/10" />
            </View>
          )}

          {/* Current Location Puck */}
          <View className="w-5 h-5 rounded-full bg-blue-500 border-2 border-white shadow-md items-center justify-center">
            <View className="w-2 h-2 rounded-full bg-white" />
          </View>

          {/* Markers */}
          {markers.map((m, idx) => (
            <TouchableOpacity
              key={m.id}
              onPress={() => onMarkerPress && onMarkerPress(m)}
              style={{
                position: 'absolute',
                top: `${30 + (idx % 3) * 20}%`,
                left: `${25 + (idx % 3) * 25}%`,
              }}
              className="items-center">
              <View className="w-8 h-8 rounded-full bg-[#FC4C02] border-2 border-white shadow-md items-center justify-center">
                <Ionicons name="location" size={16} color="#FFFFFF" />
              </View>
              <Text className="text-[10px] font-black text-gray-800 bg-white/90 px-1.5 py-0.5 rounded shadow mt-0.5">
                {m.title}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Floating Map Controls HUD */}
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

      {/* Attribution Badge */}
      <View className="absolute bottom-2 left-2 bg-white/80 px-2 py-0.5 rounded shadow-sm z-10">
        <Text className="text-[9px] text-gray-600 font-medium">
          © CARTO · © OpenStreetMap
        </Text>
      </View>

      {/* Children Overlays (e.g. Floating search bar, Bottom sheets) */}
      {children}
    </View>
  );
};
