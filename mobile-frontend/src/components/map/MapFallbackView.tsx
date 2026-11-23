import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Path, Stop } from 'react-native-svg';
import { HeatmapTypeOption, MapMarkerItem, MapTypeOption, TerrainTypeOption } from './mapTypes';

interface MapFallbackViewProps {
  routeCoordinates?: [number, number][];
  markers?: MapMarkerItem[];
  userLocation?: [number, number];
  centerCoordinate?: [number, number];
  mapType?: MapTypeOption;
  heatmapType?: HeatmapTypeOption;
  terrainType?: TerrainTypeOption;
  is3D?: boolean;
  poiEnabled?: boolean;
  bikeLanesEnabled?: boolean;
  onMarkerPress?: (marker: MapMarkerItem) => void;
}

export const MapFallbackView: React.FC<MapFallbackViewProps> = ({
  routeCoordinates,
  markers = [],
  userLocation,
  centerCoordinate,
  mapType = 'standard',
  heatmapType = 'global_run',
  terrainType = 'none',
  is3D = false,
  poiEnabled = true,
  bikeLanesEnabled = false,
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

  // Theme based on mapType
  const isSatellite = mapType === 'satellite' || mapType === 'hybrid';
  const isWinter = mapType === 'winter';
  const bgColor = isSatellite ? 'bg-[#15231D]' : isWinter ? 'bg-[#EAF2F8]' : 'bg-[#F4F3F0]';

  return (
    <View className={`flex-1 ${bgColor} items-center justify-center relative overflow-hidden`}>
      {/* 3D Horizon and Perspective Grid */}
      {is3D && (
        <View className="absolute inset-x-0 top-0 h-20 bg-sky-200/40 pointer-events-none z-10 border-b border-sky-300/50">
          <View className="flex-row justify-between px-6 pt-3">
            <Text className="text-[10px] font-black tracking-widest text-sky-700 uppercase bg-white/70 px-2 py-0.5 rounded-full">
              3D Terrain Perspective
            </Text>
            <Ionicons name="cube-outline" size={14} color="#0369A1" />
          </View>
        </View>
      )}

      {/* Background Cartographic Styling Grid */}
      <View className="absolute inset-0 opacity-40">
        <View className="w-full h-full border border-gray-300/50" />
        <View
          className={`absolute w-full h-1 ${isSatellite ? 'bg-[#374151]' : 'bg-[#E2E8F0]'} top-1/4 -rotate-6`}
        />
        <View
          className={`absolute w-full h-2 ${isSatellite ? 'bg-[#4B5563]' : 'bg-[#E2E8F0]'} top-1/2 rotate-6`}
        />
        <View
          className={`absolute w-2 h-full ${isSatellite ? 'bg-[#374151]' : 'bg-[#E2E8F0]'} left-1/3`}
        />
        <View
          className={`absolute w-1.5 h-full ${isSatellite ? 'bg-[#374151]' : 'bg-[#E2E8F0]'} right-1/4 -rotate-3`}
        />

        {/* River / Water body */}
        <View
          className={`absolute -right-10 top-1/3 w-36 h-28 ${isSatellite ? 'bg-[#0E7490]/50' : 'bg-[#BAE6FD]/60'} rounded-full blur-sm`}
        />

        {/* Park / Greenery feature */}
        <View
          className={`absolute -left-8 bottom-6 w-44 h-32 ${isSatellite ? 'bg-[#064E3B]/60' : 'bg-[#DCFCE7]/70'} rounded-3xl`}
        />
      </View>

      {/* Heatmap Layer Overlays (Strava Heatmap Effect) */}
      {heatmapType !== 'none' && (
        <View className="absolute inset-0 pointer-events-none opacity-60 z-10">
          {/* Heat glow lines mimicking community athletic activity */}
          <Svg width="100%" height="100%">
            <Path
              d="M 20 80 Q 120 40 220 90 T 360 70"
              stroke={
                heatmapType === 'night'
                  ? '#A855F7'
                  : heatmapType === 'weekly'
                    ? '#10B981'
                    : '#FC4C02'
              }
              strokeWidth={8}
              strokeOpacity={0.4}
              fill="none"
            />
            <Path
              d="M 20 80 Q 120 40 220 90 T 360 70"
              stroke="#FDE047"
              strokeWidth={3}
              strokeOpacity={0.8}
              fill="none"
            />
            <Path
              d="M 80 10 Q 140 120 180 240"
              stroke={heatmapType === 'personal' ? '#3B82F6' : '#FC4C02'}
              strokeWidth={7}
              strokeOpacity={0.4}
              fill="none"
            />
            <Path
              d="M 80 10 Q 140 120 180 240"
              stroke="#FFF"
              strokeWidth={2}
              strokeOpacity={0.7}
              fill="none"
            />
          </Svg>
        </View>
      )}

      {/* Bike Lanes Layer Overlay */}
      {bikeLanesEnabled && (
        <View className="absolute inset-0 pointer-events-none z-10">
          <Svg width="100%" height="100%">
            <Path
              d="M 0 140 C 90 120, 180 160, 360 130"
              stroke="#10B981"
              strokeWidth={3.5}
              strokeDasharray="6 4"
              fill="none"
            />
          </Svg>
        </View>
      )}

      {/* Real Geodesic SVG Polyline */}
      {pathString ? (
        <View className="w-full h-full absolute inset-0 items-center justify-center z-20">
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
                <Circle
                  cx={startPt.x}
                  cy={startPt.y}
                  r={6}
                  fill="#10B981"
                  stroke="#FFFFFF"
                  strokeWidth={2}
                />
                <Circle cx={startPt.x} cy={startPt.y} r={2.5} fill="#FFFFFF" />
              </>
            )}

            {/* Finish Pin / Current Location (Red/Orange with Pulse Ring) */}
            {endPt && (
              <>
                <Circle cx={endPt.x} cy={endPt.y} r={9} fill="#FC4C02" opacity={0.25} />
                <Circle
                  cx={endPt.x}
                  cy={endPt.y}
                  r={6}
                  fill="#EF4444"
                  stroke="#FFFFFF"
                  strokeWidth={2}
                />
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

      {/* Points of Interest (POIs) if enabled */}
      {poiEnabled && (
        <>
          <View className="absolute top-1/4 left-16 z-20 flex-row items-center bg-white/95 px-2 py-1 rounded-full shadow-sm border border-gray-200">
            <Ionicons name="cafe" size={12} color="#D97706" />
            <Text className="text-[9px] font-bold text-gray-800 ml-1">Café</Text>
          </View>
          <View className="absolute bottom-1/3 right-12 z-20 flex-row items-center bg-white/95 px-2 py-1 rounded-full shadow-sm border border-gray-200">
            <Ionicons name="water" size={12} color="#0284C7" />
            <Text className="text-[9px] font-bold text-gray-800 ml-1">Water Station</Text>
          </View>
        </>
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
          className="items-center z-20"
        >
          <View
            className={`w-7 h-7 rounded-full border-2 border-white shadow-md items-center justify-center ${
              m.type === 'segment' ? 'bg-amber-500' : 'bg-[#FC4C02]'
            }`}
          >
            <Ionicons
              name={m.type === 'segment' ? 'trophy' : 'navigate'}
              size={14}
              color="#FFFFFF"
            />
          </View>
          <Text className="text-[9px] font-black text-gray-800 bg-white/95 px-1.5 py-0.5 rounded shadow mt-0.5">
            {m.title}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
};
