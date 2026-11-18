import React from 'react';
import { View } from 'react-native';
import { LatLngPoint } from '../../types';
import { StravaMapView } from '../map/StravaMapView';

interface RouteMapPreviewProps {
  points?: LatLngPoint[];
  height?: number;
}

export const RouteMapPreview: React.FC<RouteMapPreviewProps> = ({
  points,
  height = 190,
}) => {
  const coords: [number, number][] =
    points && points.length > 0
      ? points.map((p) => [p.longitude, p.latitude])
      : [
          [90.4125, 23.7745],
          [90.4150, 23.7780],
          [90.4200, 23.7730],
          [90.4125, 23.7745],
        ];

  const centerCoord: [number, number] = coords[0] || [90.4125, 23.7745];

  return (
    <View
      style={{ height }}
      className="w-full rounded-2xl overflow-hidden border border-gray-200 bg-stone-100 relative"
      pointerEvents="none">
      <StravaMapView
        styleKey="positron"
        centerCoordinate={centerCoord}
        routeCoordinates={coords}
        zoomLevel={13}
        showControls={false}
        showUserLocation={false}
        className="w-full h-full"
      />
    </View>
  );
};
