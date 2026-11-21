import { haversineM } from '../tracking/shared';

export type LngLat = [number, number];

/** Further than this from the line counts as off route. */
export const OFF_ROUTE_METERS = 50;

export interface RouteProgress {
  /** Metres still to travel along the route, measured from the vertex nearest the user. */
  remainingMeters: number;
  /** Straight-line metres from the user to that nearest vertex. */
  offsetMeters: number;
  onRoute: boolean;
}

/** Real progress from a GPS fix. Returns null when there is no route or no fix: nothing is invented. */
export function routeProgress(route: LngLat[], user: LngLat | null | undefined): RouteProgress | null {
  if (!user || route.length < 2) return null;
  let nearest = 0;
  let best = Infinity;
  route.forEach(([lng, lat], i) => {
    const d = haversineM(user[1], user[0], lat, lng);
    if (d < best) {
      best = d;
      nearest = i;
    }
  });
  let remaining = 0;
  for (let i = nearest; i < route.length - 1; i++) {
    remaining += haversineM(route[i][1], route[i][0], route[i + 1][1], route[i + 1][0]);
  }
  return { remainingMeters: remaining, offsetMeters: best, onRoute: best <= OFF_ROUTE_METERS };
}

/** Minutes left at the current GPS speed, or null while the user is (nearly) stationary. */
export function etaMinutes(remainingMeters: number, speedMps: number): number | null {
  if (!Number.isFinite(speedMps) || speedMps < 0.5) return null;
  return Math.round(remainingMeters / speedMps / 60);
}
