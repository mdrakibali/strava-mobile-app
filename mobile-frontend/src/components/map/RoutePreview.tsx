import React from 'react';
import { View } from 'react-native';
import { LngLat } from '../../lib/activityView';
import { MapView } from './MapView';

export interface RoutePreviewProps {
  route: LngLat[];
  height?: number;
  rounded?: boolean;
}

/**
 * Clean, high-performance route preview map for feed cards, profile lists, and activity save screen.
 * Uses native MapView with interactive=false and pointerEvents="none" for buttery smooth scrolling.
 */
export const RoutePreview: React.FC<RoutePreviewProps> = ({
  route,
  height = 220,
  rounded = false,
}) => {
  if (!route || route.length === 0) return null;

  return (
    <View
      pointerEvents="none"
      style={{ height }}
      className={`w-full bg-[#EEF0EC] overflow-hidden ${rounded ? 'rounded-2xl' : ''}`}>
      <MapView
        mode="route"
        route={route.length > 1 ? route : []}
        userPosition={route[0]}
        focus={route.length < 2 ? { center: route[0], zoom: 15 } : null}
        interactive={false}
        styleKey="liberty"
        showUserLocation={false}
        padding={{ top: 18, bottom: 18, left: 18, right: 18 }}
      />
    </View>
  );
};
