import { haversineM } from '../../../shared/tracking/geo';
import { HttpError } from '../lib/http';

/**
 * Real nearby places for workouts, from OpenStreetMap data.
 *
 * Providers (both free, no API key, OSM-based; OpenFreeMap itself only serves tiles):
 *   1. Photon (komoot) reverse search with OSM tag filters — fast (~1 s), answered reliably in
 *      testing for Dhaka (parks, gardens, running tracks, nature reserves, cycleways).
 *   2. Overpass API — failover; richer (path geometry/length) but the public instances are often
 *      at capacity (observed 502s/timeouts during development).
 * Both are fair-use services, so this service:
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
  /** Street / area / city from the provider (real address data), or null. */
  address: string | null;
  osmUrl: string;
}

export interface NearbyResult {
  sport: PlaceSport;
  radiusM: number;
  /** Rounded query centre (what was actually sent to the provider). */
  center: { lat: number; lng: number };
  source: 'OpenStreetMap';
  provider: 'photon' | 'overpass';
  attribution: '© OpenStreetMap contributors';
  fetchedAt: string;
  cached: boolean;
  places: Place[];
}

export const OVERPASS_ENDPOINTS = ['https://overpass-api.de/api/interpreter', 'https://overpass.private.coffee/api/interpreter'];
export const PHOTON_REVERSE = 'https://photon.komoot.io/reverse';

/**
 * OSM key:value tags per sport (Photon `osm_tag` filters). `specific` features are queried on
 * their own so nearby parks can't crowd them out, and they rank ahead of general green space.
 */
export const PHOTON_TAGS: Record<PlaceSport, { specific: string[]; general: string[] }> = {
  Run: { specific: ['leisure:track', 'leisure:recreation_ground'], general: ['leisure:park', 'leisure:nature_reserve'] },
  // (highway:pedestrian was tried and returned foot-over-bridges and bazaar roads — not workout places)
  Walk: { specific: ['leisure:garden'], general: ['leisure:park', 'leisure:nature_reserve', 'leisure:recreation_ground'] },
  Hike: { specific: ['leisure:nature_reserve', 'boundary:protected_area', 'natural:wood', 'landuse:forest', 'route:hiking'], general: ['leisure:park'] },
  Ride: { specific: ['highway:cycleway', 'route:bicycle', 'route:mtb'], general: ['leisure:park', 'leisure:recreation_ground'] },
};

/** Up to this many result slots are reserved for sport-specific places (tracks, cycleways…). */
const SPECIFIC_SLOTS = 4;

const photonCategory = (key: string, value: string): PlaceCategory | null => {
  if (key === 'leisure') {
    if (value === 'park') return 'park';
    if (value === 'garden') return 'garden';
    if (value === 'track') return 'track';
    if (value === 'recreation_ground') return 'recreation';
    if (value === 'nature_reserve') return 'nature';
  }
  if (key === 'boundary' || key === 'natural' || key === 'landuse') return 'nature';
  if (key === 'highway' && value === 'cycleway') return 'cycleway';
  if (key === 'highway' && value === 'pedestrian') return 'footpath';
  if (key === 'route') return value === 'bicycle' || value === 'mtb' ? 'cycle_route' : 'hiking_route';
  return null;
};

/** Areas smaller than this (bbox diagonal) are courtyards/school gardens, not workout places. */
const MIN_AREA_DIAGONAL_M = 150;
/** Gardens are often small or mis-tagged (shops, compounds): require a clearly walkable size. */
const MIN_GARDEN_DIAGONAL_M = 300;

/** Photon GeoJSON → places. Pure (unit-tested). */
export const normalizePhoton = (
  json: any,
  lat: number,
  lng: number,
  radiusM: number,
  limit = 12,
  specificCategories: PlaceCategory[] = []
): Place[] => {
  const seen = new Set<string>();
  const out: Place[] = [];
  for (const f of json?.features ?? []) {
    const p = f?.properties ?? {};
    const name = String(p.name ?? '').trim();
    const coords = f?.geometry?.coordinates;
    if (!name || !Array.isArray(coords)) continue;
    const category = photonCategory(p.osm_key, p.osm_value);
    if (!category) continue;
    const [pLng, pLat] = coords as [number, number];
    const distanceM = Math.round(haversineM(lat, lng, pLat, pLng));
    if (distanceM > radiusM) continue;
    // extent = [minLon, maxLat, maxLon, minLat]
    const linear = category === 'cycleway' || category === 'cycle_route' || category === 'hiking_route' || category === 'footpath';
    if (!linear) {
      const hasExtent = Array.isArray(p.extent) && p.extent.length === 4;
      const diag = hasExtent ? haversineM(p.extent[1], p.extent[0], p.extent[3], p.extent[2]) : null;
      if (category === 'garden' && (diag == null || diag < MIN_GARDEN_DIAGONAL_M)) continue;
      // Running tracks are compact by design (an 84 m outline is a real track); other areas aren't.
      if (diag != null && diag < (category === 'track' ? 50 : MIN_AREA_DIAGONAL_M)) continue;
    }
    const type = p.osm_type === 'N' ? 'node' : p.osm_type === 'R' ? 'relation' : 'way';
    const id = `${type}/${p.osm_id}`;
    const dupKey = `${category}:${name.toLowerCase()}`;
    if (seen.has(id) || seen.has(dupKey)) continue;
    seen.add(id);
    seen.add(dupKey);
    out.push({
      id,
      name,
      category,
      lat: pLat,
      lng: pLng,
      distanceM,
      lengthM: null,
      path: null,
      surface: null,
      lit: null,
      address: [p.street, p.locality ?? p.district, p.city].filter((x: unknown) => typeof x === 'string' && x).filter((x: string, i: number, a: string[]) => a.indexOf(x) === i).join(', ') || null,
      osmUrl: `https://www.openstreetmap.org/${type}/${p.osm_id}`,
    });
  }
  // Dense cities have many parks close by; reserve slots so the sport-specific places (running
  // tracks for Run, cycleways for Ride, reserves for Hike) are never crowded out. Final order is
  // nearest first.
  const byDistance = (a: Place, b: Place) => a.distanceM - b.distanceM;
  const specific = out.filter((p) => specificCategories.includes(p.category)).sort(byDistance).slice(0, SPECIFIC_SLOTS);
  const general = out.filter((p) => !specific.includes(p)).sort(byDistance).slice(0, limit - specific.length);
  return [...specific, ...general].sort(byDistance);
};

/** Categories produced by a sport's specific tags (for ranking). */
export const specificCategoriesFor = (sport: PlaceSport): PlaceCategory[] =>
  PHOTON_TAGS[sport].specific
    .map((t) => {
      const [k, v] = t.split(':');
      return photonCategory(k, v);
    })
    .filter((c): c is PlaceCategory => c != null);

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
      address: [tags['addr:street'], tags['addr:suburb'], tags['addr:city']].filter(Boolean).join(', ') || null,
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
    private now: () => number = Date.now,
    private photonUrl: string = PHOTON_REVERSE
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

    const finish = async (places: Place[], provider: NearbyResult['provider']) => {
      const body: NearbyResult = {
        sport,
        radiusM,
        center: { lat, lng },
        source: 'OpenStreetMap',
        provider,
        attribution: '© OpenStreetMap contributors',
        fetchedAt: new Date(this.now()).toISOString(),
        cached: false,
        places,
      };
      await this.cachePut(key, body, waitUntil);
      return body;
    };
    let lastError = 'no provider';

    // 1) Photon reverse search (primary): sport-specific and general green space in parallel.
    try {
      const photon = (tags: string[]) => {
        const qs = new URLSearchParams({ lat: String(lat), lon: String(lng), radius: String(radiusM / 1000), limit: '30' });
        for (const t of tags) qs.append('osm_tag', t);
        return this.fetcher(`${this.photonUrl}?${qs.toString()}`, { headers: { 'User-Agent': 'OpenStrava/1.1 (fitness app; nearby places)' } });
      };
      const [spec, gen] = await Promise.all([photon(PHOTON_TAGS[sport].specific), photon(PHOTON_TAGS[sport].general)]);
      if (spec.ok && gen.ok) {
        const [a, b]: any[] = await Promise.all([spec.json(), gen.json()]);
        const merged = { features: [...(a?.features ?? []), ...(b?.features ?? [])] };
        return await finish(normalizePhoton(merged, lat, lng, radiusM, 12, specificCategoriesFor(sport)), 'photon');
      }
      lastError = `photon → HTTP ${spec.status}/${gen.status}`;
    } catch (e: any) {
      lastError = `photon → ${e?.message ?? 'network error'}`;
    }

    // 2) Overpass (failover)
    const query = buildOverpassQuery(sport, lat, lng, radiusM);
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
        return await finish(normalizeOverpass(await res.json(), lat, lng), 'overpass');
      } catch (e: any) {
        lastError = `${endpoint} → ${e?.message ?? 'network error'}`;
      }
    }
    console.warn('Places providers unavailable:', lastError);
    throw new HttpError(503, 'places_unavailable', 'Nearby places are temporarily unavailable. Please try again.');
  }
}

/** Test hook. */
export const _clearPlacesMemoryCache = () => memory.clear();
