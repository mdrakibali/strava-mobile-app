import { haversineM } from '../../../shared/tracking/geo';
import { HttpError } from '../lib/http';

/**
 * Route planning along real mapped ways (roads, footpaths, trails, cycleways) with Valhalla.
 *
 * Engine: the FOSSGIS public Valhalla instance (valhalla1.openstreetmap.de) — OpenStreetMap data,
 * free, no API key, fair use. Chosen over the public OSRM foot profile, which returned a 5.7 km
 * route for a 1.3 km walk in testing. Elevation: Valhalla's /height (DEM) along the real shape.
 *
 * Nothing is drawn as straight lines or invented: geometry, distance and duration are Valhalla's;
 * elevation comes from the DEM, or is null when that call fails. Failures → 503 / no route → 422.
 */

export type PlanSport = 'Run' | 'Walk' | 'Hike' | 'Ride';
export interface LatLng {
  lat: number;
  lng: number;
}

export interface PlannedRoute {
  /** [lng, lat] along mapped ways, continuous. */
  geometry: [number, number][];
  distanceM: number;
  /** Valhalla's estimate at the sport's assumed speed (see SPEED_KMH). */
  durationS: number;
  elevationGainM: number | null;
  elevationLossM: number | null;
  /** [distance along route m, elevation m] every ~30 m; null when unavailable. */
  elevationProfile: [number, number][] | null;
}

export interface RoutePlan {
  sport: PlanSport;
  from: LatLng;
  to: LatLng;
  routes: PlannedRoute[];
  engine: 'Valhalla (FOSSGIS, OpenStreetMap data)';
  attribution: '© OpenStreetMap contributors';
  assumedSpeedKmh: number;
}

export const VALHALLA_URL = 'https://valhalla1.openstreetmap.de';
/** Speed assumptions behind the duration estimate (shown to the user). */
export const SPEED_KMH: Record<PlanSport, number> = { Run: 10, Walk: 5, Hike: 4, Ride: 18 };
const MAX_DISTANCE_M = 60_000;

type Fetcher = (url: string, init?: RequestInit) => Promise<Response>;
const memory = new Map<string, { at: number; body: RoutePlan }>();
const TTL_MS = 7 * 24 * 3600_000;

/** Valhalla encodes shapes with 6 decimal places (polyline6). Returns [lng, lat]. */
export const decodePolyline6 = (str: string): [number, number][] => {
  let index = 0,
    lat = 0,
    lng = 0;
  const out: [number, number][] = [];
  while (index < str.length) {
    for (const which of [0, 1]) {
      let result = 0,
        shift = 0,
        b: number;
      do {
        b = str.charCodeAt(index++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20);
      const delta = result & 1 ? ~(result >> 1) : result >> 1;
      if (which === 0) lat += delta;
      else lng += delta;
    }
    out.push([lng / 1e6, lat / 1e6]);
  }
  return out;
};

/** Gain/loss from DEM samples (SRTM-class DEM, ±5 m vertical noise in cities) with 5 m hysteresis. */
export const elevationChange = (heights: number[], threshold = 5) => {
  if (heights.length < 2) return { gain: null, loss: null };
  let gain = 0,
    loss = 0,
    ref = heights[0];
  for (const h of heights) {
    if (h - ref >= threshold) {
      gain += h - ref;
      ref = h;
    } else if (ref - h >= threshold) {
      loss += ref - h;
      ref = h;
    }
  }
  return { gain: Math.round(gain), loss: Math.round(loss) };
};

const costing = (sport: PlanSport) => {
  switch (sport) {
    case 'Ride':
      return {
        costing: 'bicycle',
        costing_options: { bicycle: { bicycle_type: 'hybrid', cycling_speed: SPEED_KMH.Ride } },
      };
    case 'Hike':
      return {
        costing: 'pedestrian',
        costing_options: {
          pedestrian: { walking_speed: SPEED_KMH.Hike, max_hiking_difficulty: 6, use_hills: 1 },
        },
      };
    default:
      return {
        costing: 'pedestrian',
        costing_options: { pedestrian: { walking_speed: SPEED_KMH[sport] } },
      };
  }
};

export class RoutingService {
  constructor(
    private fetcher: Fetcher = (u, i) => fetch(u, i),
    private base = VALHALLA_URL,
    private now: () => number = Date.now
  ) {}

  private async post(path: string, body: unknown) {
    return this.fetcher(`${this.base}${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'OpenStrava/1.1 (fitness app; route planning)',
      },
      body: JSON.stringify(body),
    });
  }

  private async elevation(
    shape: string
  ): Promise<Pick<PlannedRoute, 'elevationGainM' | 'elevationLossM' | 'elevationProfile'>> {
    try {
      const res = await this.post('/height', {
        encoded_polyline: shape,
        shape_format: 'polyline6',
        range: true,
        resample_distance: 30,
      });
      if (!res.ok) throw new Error(String(res.status));
      const d: any = await res.json();
      const profile: [number, number][] = (d.range_height ?? []).filter(
        (p: any) => Array.isArray(p) && p[1] != null && p[1] > -1000
      );
      if (profile.length < 2) throw new Error('no heights');
      const { gain, loss } = elevationChange(profile.map((p) => p[1]));
      return { elevationGainM: gain, elevationLossM: loss, elevationProfile: profile };
    } catch {
      return { elevationGainM: null, elevationLossM: null, elevationProfile: null };
    }
  }

  async plan(sport: PlanSport, from: LatLng, to: LatLng): Promise<RoutePlan> {
    const crow = haversineM(from.lat, from.lng, to.lat, to.lng);
    if (crow < 20) throw new HttpError(422, 'too_close', 'You are already there.');
    if (crow > MAX_DISTANCE_M)
      throw new HttpError(
        422,
        'too_far',
        'Destination is too far for a workout route (max 60 km).'
      );
    const r4 = (n: number) => Math.round(n * 1e4) / 1e4; // ~11 m: cache key + privacy
    const f = { lat: r4(from.lat), lng: r4(from.lng) };
    const t = { lat: r4(to.lat), lng: r4(to.lng) };
    const key = `${sport}:${f.lat},${f.lng}:${t.lat},${t.lng}`;
    const hit = memory.get(key);
    if (hit && this.now() - hit.at < TTL_MS) return hit.body;

    let d: any;
    try {
      const res = await this.post('/route', {
        locations: [
          { lat: f.lat, lon: f.lng },
          { lat: t.lat, lon: t.lng },
        ],
        ...costing(sport),
        alternates: 2,
        units: 'kilometers',
        directions_type: 'none',
      });
      d = await res.json().catch(() => null);
      if (!res.ok) {
        // 442 / 171 etc.: no route between the points over mapped ways
        if (res.status === 400 && d?.error_code)
          throw new HttpError(
            422,
            'no_route',
            'No route over mapped paths was found to this place.'
          );
        throw new Error(`HTTP ${res.status}`);
      }
    } catch (e) {
      if (e instanceof HttpError) throw e;
      throw new HttpError(
        503,
        'routing_unavailable',
        'Route planning is temporarily unavailable. Please try again.'
      );
    }

    const trips = [d?.trip, ...(d?.alternates ?? []).map((a: any) => a.trip)].filter(Boolean);
    const routes: PlannedRoute[] = [];
    for (const trip of trips) {
      const shape: string = trip.legs?.[0]?.shape;
      if (!shape) continue;
      const geometry = decodePolyline6(shape);
      if (geometry.length < 2) continue;
      routes.push({
        geometry,
        distanceM: Math.round(trip.summary.length * 1000),
        durationS: Math.round(trip.summary.time),
        ...(await this.elevation(shape)),
      });
    }
    if (!routes.length)
      throw new HttpError(422, 'no_route', 'No route over mapped paths was found to this place.');
    const body: RoutePlan = {
      sport,
      from: f,
      to: t,
      routes,
      engine: 'Valhalla (FOSSGIS, OpenStreetMap data)',
      attribution: '© OpenStreetMap contributors',
      assumedSpeedKmh: SPEED_KMH[sport],
    };
    memory.set(key, { at: this.now(), body });
    return body;
  }

  /**
   * Valhalla map matching via /trace_route.
   * Matches GPS traces to real OpenStreetMap roads/paths when valid.
   * If trace is in an unmapped area or match is unreliable, returns null so the raw GPS route is preserved.
   */
  async matchTrace(
    sport: PlanSport,
    points: { lat: number; lng: number; time?: number }[]
  ): Promise<[number, number][] | null> {
    if (!points || points.length < 2) return null;
    try {
      const shape = points.map((p) => ({
        lat: p.lat,
        lon: p.lng,
        ...(p.time ? { time: p.time } : {}),
      }));
      const costingName = sport === 'Ride' ? 'bicycle' : 'pedestrian';
      const res = await this.post('/trace_route', {
        shape,
        costing: costingName,
        shape_match: 'walk_or_snap',
        directions_type: 'none',
      });
      if (!res.ok) return null;
      const data: any = await res.json().catch(() => null);
      const encoded = data?.trip?.legs?.[0]?.shape;
      if (!encoded) return null;
      const matched = decodePolyline6(encoded);
      return matched.length >= 2 ? matched : null;
    } catch {
      return null;
    }
  }
}

export const _clearRoutingCache = () => memory.clear();
