import React from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Path, Stop } from 'react-native-svg';
import { Colors } from '../../constants/theme';
import { LatLngPoint } from '../../types';

interface RouteMapPreviewProps {
  points?: LatLngPoint[];
  height?: number;
  width?: number | string;
}

export const RouteMapPreview: React.FC<RouteMapPreviewProps> = ({
  points,
  height = 180,
}) => {
  // If points are provided, normalize them to 0-300 width and 0-height coordinates
  const svgWidth = 340;
  const svgHeight = height;

  // Generate normalized SVG path
  let pathString = '';
  let startX = 40;
  let startY = 120;
  let endX = 290;
  let endY = 60;

  if (points && points.length >= 2) {
    const lats = points.map((p) => p.latitude);
    const lngs = points.map((p) => p.longitude);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);

    const latRange = maxLat - minLat || 0.001;
    const lngRange = maxLng - minLng || 0.001;

    const padding = 35;
    const innerW = svgWidth - padding * 2;
    const innerH = svgHeight - padding * 2;

    const coords = points.map((p) => {
      const x = padding + ((p.longitude - minLng) / lngRange) * innerW;
      const y = padding + (1 - (p.latitude - minLat) / latRange) * innerH;
      return { x, y };
    });

    startX = coords[0].x;
    startY = coords[0].y;
    endX = coords[coords.length - 1].x;
    endY = coords[coords.length - 1].y;

    pathString = coords.reduce((acc, curr, idx) => {
      return idx === 0 ? `M ${curr.x} ${curr.y}` : `${acc} L ${curr.x} ${curr.y}`;
    }, '');
  } else {
    // Default dynamic scenic route curve
    startX = 50;
    startY = 130;
    endX = 280;
    endY = 55;
    pathString = `M 50 130 Q 90 40 150 70 T 230 110 T 280 55`;
  }

  return (
    <View style={[styles.container, { height }]}>
      <Svg width="100%" height={height} viewBox={`0 0 ${svgWidth} ${svgHeight}`}>
        <Defs>
          <LinearGradient id="routeGradient" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0%" stopColor={Colors.primary} stopOpacity="1" />
            <Stop offset="100%" stopColor="#FF7A00" stopOpacity="1" />
          </LinearGradient>
          <LinearGradient id="bgGradient" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor="#F9FAFB" stopOpacity="1" />
            <Stop offset="100%" stopColor="#F3F4F6" stopOpacity="1" />
          </LinearGradient>
        </Defs>

        {/* Background Canvas */}
        <Path
          d={`M 0 0 L ${svgWidth} 0 L ${svgWidth} ${svgHeight} L 0 ${svgHeight} Z`}
          fill="url(#bgGradient)"
        />

        {/* Soft Grid Lines mimicking topography map */}
        <Path
          d={`M 0 ${svgHeight * 0.33} L ${svgWidth} ${svgHeight * 0.33} M 0 ${svgHeight * 0.66} L ${svgWidth} ${svgHeight * 0.66} M ${svgWidth * 0.33} 0 L ${svgWidth * 0.33} ${svgHeight} M ${svgWidth * 0.66} 0 L ${svgWidth * 0.66} ${svgHeight}`}
          stroke="#E5E7EB"
          strokeWidth="1"
          strokeDasharray="4 4"
        />

        {/* Shadow polyline */}
        <Path
          d={pathString}
          fill="none"
          stroke="rgba(252, 76, 2, 0.2)"
          strokeWidth="8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Main Route Polyline */}
        <Path
          d={pathString}
          fill="none"
          stroke="url(#routeGradient)"
          strokeWidth="4.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Start Point Pin (Green) */}
        <Circle cx={startX} cy={startY} r="6" fill="#10B981" stroke="#FFFFFF" strokeWidth="2" />

        {/* End Point Pin (Checkered/Dark) */}
        <Circle cx={endX} cy={endY} r="6" fill="#111827" stroke="#FFFFFF" strokeWidth="2" />
      </Svg>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#F9FAFB',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#E5E7EB',
  },
});

