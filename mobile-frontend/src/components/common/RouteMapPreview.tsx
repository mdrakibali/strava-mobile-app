import React from 'react';
import { LatLngPoint } from '../../types';
import { RoutePreview } from '../map/RoutePreview';

/**
 * Legacy name kept for existing screens. Renders the real route preview, and NOTHING when there
 * is no route (it used to draw an invented loop around Dhaka).
 */
export const RouteMapPreview: React.FC<{ points?: LatLngPoint[]; height?: number }> = ({
  points,
  height = 190,
}) =>
  points && points.length > 1 ? (
    <RoutePreview
      route={points.map((p) => [p.longitude, p.latitude] as [number, number])}
      height={height}
      rounded
    />
  ) : null;
