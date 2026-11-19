export interface LatLngPoint {
  latitude: number;
  longitude: number;
  altitude?: number | null;
  timestamp?: number;
  speed?: number | null;
}

export interface PrivacyZone {
  latitude: number;
  longitude: number;
  radiusMeters: number;
  isActive: boolean;
}

const haversineMeters = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number => {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

/**
 * Server-side Privacy Zone Masking
 * Removes coordinates within user's active privacy zones (e.g. home/work 500m radius)
 * from public routes so exact addresses are never exposed in API feeds.
 */
export const maskPolylineWithPrivacyZones = (
  points: LatLngPoint[],
  zones: PrivacyZone[]
): LatLngPoint[] => {
  if (!points || points.length === 0) return [];
  const activeZones = zones.filter((z) => z.isActive);
  if (activeZones.length === 0) return points;

  // Filter out any coordinate that falls within any active privacy zone radius
  const masked = points.filter((p) => {
    for (const zone of activeZones) {
      const dist = haversineMeters(p.latitude, p.longitude, +zone.latitude, +zone.longitude);
      if (dist <= zone.radiusMeters) {
        return false; // Point is inside privacy zone, exclude from public view
      }
    }
    return true;
  });

  return masked;
};

