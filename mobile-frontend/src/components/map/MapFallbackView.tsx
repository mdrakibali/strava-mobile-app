import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Path, Stop } from 'react-native-svg';
import { MapMarkerItem } from './mapTypes';

interface MapFallbackViewProps {
  routeCoordinates?: [number, number][];
  markers?: MapMarkerItem[];
  userLocation?: [number, number];
  centerCoordinate?: [number, number];
  onMarkerPress?: (marker: MapMarkerItem) => void;
}

export const MapFallbackView: React.FC<MapFallbackViewProps> = ({
  routeCoordinates,
  markers = [],
  userLocation,
  centerCoordinate,
  onMarkerPress,
}) => {
  const svgWidth = 360;
  const svgHeight = 240;
  const padding = 32;

  let pathString = '';
  let startPt: { x: number; y: number } | null = null;
  let endPt: { x: number; y: number } | null = null;

  if (routeCoordinates && routeCoordinates.length >= 2) {
    let minLon = Infinity;
    let maxLon = -Infinity;
    let minLat = Infinity;
    let maxLat = -Infinity;

    for (const [lon, lat] of routeCoordinates) {
      if (lon < minLon) minLon = lon;
      if (lon > maxLon) maxLon = lon;
      if (lat < minLat) minLat = lat;
      if (lat > maxLat) maxLat = lat;
    }

    const lonSpan = maxLon - minLon || 0.001;
    const latSpan = maxLat - minLat || 0.001;

    const pts = routeCoordinates.map(([lon, lat]) => {
      const x = padding + ((lon - minLon) / lonSpan) * (svgWidth - 2 * padding);
      const y = padding + ((maxLat - lat) / latSpan) * (svgHeight - 2 * padding);
      return { x, y };
    });

    pathString = pts.reduce(
      (acc, p, i) =>
        i === 0
          ? `M ${p.x.toFixed(1)} ${p.y.toFixed(1)}`
          : `${acc} L ${p.x.toFixed(1)} ${p.y.toFixed(1)}`,
      ''
    );
    startPt = pts[0];
    endPt = pts[pts.length - 1];
  }

  return (
    <View className="flex-1 bg-[#F4F3F0] items-center justify-center relative overflow-hidden">
      {/* Background Cartographic Styling Grid */}
      <View className="absolute inset-0 opacity-40">
        <View className="w-full h-full border border-gray-200" />
        <View className="absolute w-full h-1 bg-[#E2E8F0] top-1/4 -rotate-6" />
        <View className="absolute w-full h-2 bg-[#E2E8F0] top-1/2 rotate-6" />
        <View className="absolute w-2 h-full bg-[#E2E8F0] left-1/3" />
        <View className="absolute w-1.5 h-full bg-[#E2E8F0] right-1/4 -rotate-3" />
        {/* River / Lake feature */}
        <View className="absolute -right-10 top-1/3 w-36 h-28 bg-[#BAE6FD]/40 rounded-full blur-sm" />
        {/* Park / Greenery feature */}
        <View className="absolute -left-8 bottom-6 w-44 h-32 bg-[#DCFCE7]/50 rounded-3xl" />
      </View>

      {/* Real Geodesic SVG Polyline */}
      {pathString ? (
        <View className="w-full h-full absolute inset-0 items-center justify-center">
          <Svg width="100%" height="100%" viewBox={`0 0 ${svgWidth} ${svgHeight}`}>
            <Defs>
              <LinearGradient id="routeGlow" x1="0" y1="0" x2="1" y2="1">
                <Stop offset="0%" stopColor="#FC4C02" stopOpacity="0.9" />
                <Stop offset="100%" stopColor="#FF7A00" stopOpacity="1" />
              </LinearGradient>
            </Defs>

            {/* White route casing shadow for high contrast */}
            <Path
              d={pathString}
              stroke="#FFFFFF"
              strokeWidth={7}
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
              opacity={0.95}
            />

            {/* Primary Strava Orange Polyline */}
            <Path
              d={pathString}
              stroke="url(#routeGlow)"
              strokeWidth={4.5}
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />

            {/* Start Pin (Green) */}
            {startPt && (
              <>
                <Circle cx={startPt.x} cy={startPt.y} r={6} fill="#10B981" stroke="#FFFFFF" strokeWidth={2} />
                <Circle cx={startPt.x} cy={startPt.y} r={2.5} fill="#FFFFFF" />
              </>
            )}

            {/* Finish Pin / Current Location (Red/Orange with Pulse Ring) */}
            {endPt && (
              <>
                <Circle cx={endPt.x} cy={endPt.y} r={9} fill="#FC4C02" opacity={0.25} />
                <Circle cx={endPt.x} cy={endPt.y} r={6} fill="#EF4444" stroke="#FFFFFF" strokeWidth={2} />
                <Circle cx={endPt.x} cy={endPt.y} r={2} fill="#FFFFFF" />
              </>
            )}
          </Svg>
        </View>
      ) : null}

      {/* Prominent Live GPS Location Beacon */}
      {userLocation ? (
        <View className="items-center justify-center z-30">
          <View className="w-16 h-16 rounded-full bg-blue-500/15 items-center justify-center">
            <View className="w-9 h-9 rounded-full bg-blue-500/30 items-center justify-center">
              <View className="w-5 h-5 rounded-full bg-blue-600 border-2 border-white shadow-xl items-center justify-center">
                <View className="w-1.5 h-1.5 rounded-full bg-white" />
              </View>
            </View>
          </View>
          <View className="bg-stone-900/90 border border-stone-700 px-2.5 py-1 rounded-full shadow-md mt-1 flex-row items-center">
            <View className="w-2 h-2 rounded-full bg-emerald-400 mr-1.5" />
            <Text className="text-[10px] font-black text-white tracking-wide">
              GPS Active · {userLocation[1].toFixed(4)}, {userLocation[0].toFixed(4)}
            </Text>
          </View>
        </View>
      ) : (
        /* Standalone Location Puck when GPS fix is being acquired */
        <View className="items-center justify-center z-20">
          <View className="w-8 h-8 rounded-full bg-blue-500/20 items-center justify-center">
            <View className="w-4 h-4 rounded-full bg-blue-600 border-2 border-white shadow-md items-center justify-center">
              <View className="w-1.5 h-1.5 rounded-full bg-white" />
            </View>
          </View>
          <Text className="text-[10px] font-bold text-gray-500 bg-white/80 px-2 py-0.5 rounded-full shadow-sm mt-1">
            Acquiring GPS Signal...
          </Text>
        </View>
      )}

      {/* Interactive Route and Segment Markers */}
      {markers.map((m, idx) => (
        <TouchableOpacity
          key={m.id}
          onPress={() => onMarkerPress && onMarkerPress(m)}
          style={{
            position: 'absolute',
            top: `${26 + (idx % 3) * 22}%`,
            left: `${22 + (idx % 3) * 26}%`,
          }}
          className="items-center z-20">
          <View
            className={`w-7 h-7 rounded-full border-2 border-white shadow-md items-center justify-center ${
              m.type === 'segment' ? 'bg-amber-500' : 'bg-[#FC4C02]'
            }`}>
            <Ionicons name={m.type === 'segment' ? 'trophy' : 'navigate'} size={14} color="#FFFFFF" />
          </View>
          <Text className="text-[9px] font-black text-gray-800 bg-white/95 px-1.5 py-0.5 rounded shadow mt-0.5">
            {m.title}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
};
