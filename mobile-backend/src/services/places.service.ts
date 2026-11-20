import { haversineM } from '../../../shared/tracking/geo';
import { HttpError } from '../lib/http';

/**
 * Real nearby places for workouts, from OpenStreetMap via the Overpass API.
 *
 * Why Overpass: free, no API key, worldwide OSM coverage (good in Bangladesh), and it can answer
 * "named parks / tracks / trails / cycleways around this point". OpenFreeMap only serves map
 * tiles — it has no place search. Overpass is fair-use rate limited, so this service:
 *   - rounds the user's position to 3 decimals (~110 m) before it leaves our server (privacy, and
 *     nearby users share cache entries),
 *   - caches each (cell, sport, radius) answer for 24 h,
 *   - fails over between two public Overpass instances,
 *   - NEVER falls back to invented or static places: provider failure → 503, nothing found → [].
 */

export type PlaceSport = 'Run' | 'Walk' | 'Hike' | 'Ride';
export type PlaceCategory = 'park' | 'garden' | 'nature' | 'track' | 'trail' | 'footpath' | 'cycleway' | 'cycle_route' | 'hiking_route' | 'recreation';

export interface Place {
  id: string; // "way/123"
  name: string;
  category: PlaceCategory;
  lat: number;
  lng: number;
  distanceM: number;
  /** Total length of the named path/cycleway segments found (linear features only). */
  lengthM: number | null;
  /** Geometry of linear features ([lng, lat] lines), simplified; null for areas/points. */
  path: [number, number][][] | null;
  surface: string | null;
  lit: boolean | null;
  osmUrl: string;
}

export interface NearbyResult {
  sport: PlaceSport;
  radiusM: number;
  /** Rounded query centre (what was actually sent to the provider). */
  center: { lat: number; lng: number };
  source: 'OpenStreetMap (Overpass API)';
  attribution: '© OpenStreetMap contributors';
  fetchedAt: string;
  cached: boolean;
  places: Place[];
}

export const OVERPASS_ENDPOINTS = ['https://overpass-api.de/api/interpreter', 'https://overpass.private.coffee/api/interpreter'];

type Fetcher = (url: string, init: RequestInit) => Promise<Response>;

/** Which OSM features suit which sport. Each line is an Overpass filter + our category. */
const AREA_FILTERS: Record<PlaceSport, string[]> = {
  Run: ['nwr["leisure"~"^(park|track|recreation_ground)$"]["name"]', 'nwr["leisure"="nature_reserve"]["name"]'],
  Walk: ['nwr["leisure"~"^(park|garden|recreation_ground)$"]["name"]', 'nwr["leisure"="nature_reserve"]["name"]'],
  Hike: ['nwr["leisure"="nature_reserve"]["name"]', 'nwr["boundary"="protected_area"]["name"]', 'nwr["natural"~"^(wood|forest)$"]["name"]', 'nwr["leisure"="park"]["name"]'],
  Ride: ['nwr["leisure"~"^(park|recreation_ground)$"]["name"]'],
};
const LINE_FILTERS: Record<PlaceSport, string[]> = {
  Run: ['way["highway"~"^(footway|path|pedestrian|track)$"]["name"]'],
  Walk: ['way["highway"~"^(footway|path|pedestrian)$"]["name"]'],
  Hike: ['way["highway"~"^(path|track|footway)$"]["name"]'],
  Ride: ['way["highway"="cycleway"]["name"]', 'way["cycleway"~"^(track|lane)$"]["name"]'],
};
const ROUTE_FILTERS: Record<PlaceSport, string> = {
  Run: 'relation["route"~"^(running|foot|fitness_trail)$"]',
  Walk: 'relation["route"~"^(foot|hiking)$"]',
  Hike: 'relation["route"~"^(hiking|foot)$"]',
  Ride: 'relation["route"~"^(bicycle|mtb)$"]',
};

export const buildOverpassQuery = (sport: PlaceSport, lat: number, lng: number, radiusM: number) => {
  const around = `(around:${radiusM},${lat},${lng})`;
  const areas = AREA_FILTERS[sport].map((f) => `${f}${around};`).join('\n  ');
  const lines = LINE_FILTERS[sport].map((f) => `${f}${around};`).join('\n  ');
  return `[out:json][timeout:20];
(
  ${areas}
  ${ROUTE_FILTERS[sport]}${around};
);
out center tags 80;
(
  ${lines}
);
out geom tags 150;`;
};

const categoryOf = (tags: Record<string, string>, type: string): PlaceCategory | null => {
  if (type === 'relation' && tags.route) {
    if (tags.route === 'bicycle' || tags.route === 'mtb') return 'cycle_route';
    return 'hiking_route';
  }
  if (tags.leisure === 'park') return 'park';
  if (tags.leisure === 'garden') return 'garden';
  if (tags.leisure === 'track') return 'track';
  if (tags.leisure === 'recreation_ground') return 'recreation';
  if (tags.leisure === 'nature_reserve' || tags.boundary === 'protected_area' || tags.natural === 'wood' || tags.natural === 'forest') return 'nature';
  if (tags.highway === 'cycleway' || tags.cycleway) return 'cycleway';
  if (tags.highway === 'path' || tags.highway === 'track') return 'trail';
  if (tags.highway === 'footway' || tags.highway === 'pedestrian') return 'footpath';
  return null;
};

const simplifyLine = (pts: [number, number][], max = 120): [number, number][] => {
  if (pts.length <= max) return pts;
  const step = (pts.length - 1) / (max - 1);
  return Array.from({ length: max }, (_, i) => pts[Math.round(i * step)]);
};

/** Turn an Overpass JSON answer into ranked, de-duplicated places. Pure (unit-tested). */
export const normalizeOverpass = (json: any, lat: number, lng: number, limit = 12): Place[] => {
  const byKey = new Map<string, Place>();
  for (const el of json?.elements ?? []) {
    const tags: Record<string, string> = el.tags ?? {};
    const name = (tags['name:en'] || tags.name || '').trim();
    if (!name) continue;
    const category = categoryOf(tags, el.type);
    if (!category) continue;
    let pLat: number | undefined;
    let pLng: number | undefined;
    let line: [number, number][] | null = null;
    let lengthM: number | null = null;
    if (el.type === 'node') {
      pLat = el.lat;
      pLng = el.lon;
    } else if (Array.isArray(el.geometry) && el.geometry.length > 1 && el.type === 'way' && !tags.leisure && !tags.natural) {
      line = el.geometry.map((g: any) => [g.lon, g.lat] as [number, number]);
      lengthM = 0;
      for (let i = 1; i < line!.length; i++) lengthM += haversineM(line![i - 1][1], line![i - 1][0], line![i][1], line![i][0]);
      // nearest vertex = the point the athlete would head for
      let best = Infinity;
      for (const [x, y] of line!) {
        const d = haversineM(lat, lng, y, x);
        if (d < best) [best, pLat, pLng] = [d, y, x];
      }
    } else if (el.center) {
      pLat = el.center.lat;
      pLng = el.center.lon;
    }
    if (pLat == null || pLng == null) continue;
    const distanceM = Math.round(haversineM(lat, lng, pLat, pLng));
    // Paths and cycleways come as many segments with the same name: merge them into one place.
    const key = line ? `${category}:${name.toLowerCase()}` : `${el.type}/${el.id}`;
    const existing = byKey.get(key);
    if (existing && line) {
      existing.lengthM = (existing.lengthM ?? 0) + (lengthM ?? 0);
      existing.path = [...(existing.path ?? []), simplifyLine(line)];
      if (distanceM < existing.distanceM) Object.assign(existing, { distanceM, lat: pLat, lng: pLng });
      continue;
    }
    if (existing) continue;
    byKey.set(key, {
      id: `${el.type}/${el.id}`,
      name,
      category,
      lat: pLat,
      lng: pLng,
      distanceM,
      lengthM: lengthM != null ? Math.round(lengthM) : null,
      path: line ? [simplifyLine(line)] : null,
      surface: tags.surface ?? null,
      lit: tags.lit === 'yes' ? true : tags.lit === 'no' ? false : null,
      osmUrl: `https://www.openstreetmap.org/${el.type}/${el.id}`,
    });
  }
  return [...byKey.values()]
    // Very short named footway stubs are not a workout destination.
    .filter((p) => p.lengthM == null || p.lengthM >= 300)
    .sort((a, b) => a.distanceM - b.distanceM)
    .slice(0, limit)
    .map((p) => ({ ...p, lengthM: p.lengthM != null ? Math.round(p.lengthM) : null }));
};

/** Small TTL cache: Workers Cache API when available, in-memory otherwise (Node dev/tests). */
const memory = new Map<string, { at: number; body: NearbyResult }>();
const TTL_MS = 24 * 3600_000;

export class PlacesService {
  constructor(
    private fetcher: Fetcher = (u, i) => fetch(u, i),
    private endpoints: string[] = OVERPASS_ENDPOINTS,
    private now: () => number = Date.now
  ) {}

  private cacheKey(sport: string, lat: number, lng: number, radius: number) {
    return `https://cache.openstrava.internal/places/${sport}/${lat}/${lng}/${radius}`;
  }

  private async cacheGet(key: string): Promise<NearbyResult | null> {
    const cf = (globalThis as any).caches?.default as Cache | undefined;
    if (cf) {
      const hit = await cf.match(key).catch(() => undefined);
      return hit ? ((await hit.json()) as NearbyResult) : null;
    }
    const m = memory.get(key);
    return m && this.now() - m.at < TTL_MS ? m.body : null;
  }

  private async cachePut(key: string, body: NearbyResult, waitUntil?: (p: Promise<unknown>) => void) {
    const cf = (globalThis as any).caches?.default as Cache | undefined;
    if (cf) {
      const p = cf.put(key, new Response(JSON.stringify(body), { headers: { 'Cache-Control': `public, max-age=${TTL_MS / 1000}` } }));
      if (waitUntil) waitUntil(p);
      else await p;
      return;
    }
    memory.set(key, { at: this.now(), body });
  }

  async nearby(sport: PlaceSport, rawLat: number, rawLng: number, radiusM: number, waitUntil?: (p: Promise<unknown>) => void): Promise<NearbyResult> {
    const lat = Math.round(rawLat * 1000) / 1000;
    const lng = Math.round(rawLng * 1000) / 1000;
    const key = this.cacheKey(sport, lat, lng, radiusM);
    const hit = await this.cacheGet(key);
    if (hit) return { ...hit, cached: true };

    const query = buildOverpassQuery(sport, lat, lng, radiusM);
    let lastError = 'no endpoint';
    for (const endpoint of this.endpoints) {
      try {
        const res = await this.fetcher(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': 'OpenStrava/1.1 (fitness app; nearby places)' },
          body: `data=${encodeURIComponent(query)}`,
        });
        if (!res.ok) {
          lastError = `${endpoint} → HTTP ${res.status}`;
          continue;
        }
        const json = await res.json();
        const body: NearbyResult = {
          sport,
          radiusM,
          center: { lat, lng },
          source: 'OpenStreetMap (Overpass API)',
          attribution: '© OpenStreetMap contributors',
          fetchedAt: new Date(this.now()).toISOString(),
          cached: false,
          places: normalizeOverpass(json, lat, lng),
        };
        await this.cachePut(key, body, waitUntil);
        return body;
      } catch (e: any) {
        lastError = `${endpoint} → ${e?.message ?? 'network error'}`;
      }
    }
    console.warn('Overpass unavailable:', lastError);
    throw new HttpError(503, 'places_unavailable', 'Nearby places are temporarily unavailable. Please try again.');
  }
}

/** Test hook. */
export const _clearPlacesMemoryCache = () => memory.clear();
