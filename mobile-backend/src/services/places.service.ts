import { haversineM } from '../../../shared/tracking/geo';
import { HttpError } from '../lib/http';
import {
  buildOverpassQuery,
  NearbyResult,
  normalizePhoton,
  OVERPASS_ENDPOINTS,
  PHOTON_REVERSE,
  PHOTON_TAGS,
  Place,
  PlaceCategory,
  PlaceSport,
  specificCategoriesFor,
} from './places.helpers';

export type { NearbyResult, Place, PlaceCategory, PlaceSport };
export { buildOverpassQuery, normalizePhoton, OVERPASS_ENDPOINTS, PHOTON_REVERSE, PHOTON_TAGS, specificCategoriesFor };

type Fetcher = (url: string, init: RequestInit) => Promise<Response>;

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
    const key = line ? `${category}:${name.toLowerCase()}` : `${el.type}/${el.id}`;
    const existing = byKey.get(key);
    if (existing && line) {
      existing.lengthM = (existing.lengthM ?? 0) + (lengthM ?? 0);
      existing.path = [...(existing.path ?? []), simplifyLine(line)];
      if (distanceM < existing.distanceM) Object.assign(existing, { distanceM, lat: pLat, lng: pLng });
      continue;
    }
    byKey.set(key, {
      id: `${el.type}/${el.id}`,
      name,
      category,
      lat: pLat,
      lng: pLng,
      distanceM,
      lengthM,
      path: line ? [simplifyLine(line)] : null,
      surface: tags.surface || null,
      lit: tags.lit === 'yes' ? true : tags.lit === 'no' ? false : null,
      address: null,
      osmUrl: `https://www.openstreetmap.org/${el.type}/${el.id}`,
    });
  }
  return Array.from(byKey.values())
    .sort((a, b) => a.distanceM - b.distanceM)
    .slice(0, limit);
};

const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const memory = new Map<string, { value: NearbyResult; expiresAt: number }>();

export class PlacesService {
  constructor(
    private fetcher: Fetcher = fetch as unknown as Fetcher,
    private endpoints: string[] = OVERPASS_ENDPOINTS,
    private photonUrl: string = PHOTON_REVERSE
  ) {}

  async nearby(sport: PlaceSport, userLat: number, userLng: number, radiusM: number): Promise<NearbyResult> {
    const lat = Math.round(userLat * 1000) / 1000;
    const lng = Math.round(userLng * 1000) / 1000;
    const cacheKey = `${sport}:${lat}:${lng}:${radiusM}`;
    const cached = memory.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return { ...cached.value, cached: true };
    }

    let lastError: string | null = null;
    const finish = async (places: Place[], provider: 'photon' | 'overpass'): Promise<NearbyResult> => {
      const result: NearbyResult = {
        sport,
        radiusM,
        center: { lat, lng },
        source: 'OpenStreetMap',
        provider,
        attribution: '© OpenStreetMap contributors',
        fetchedAt: new Date().toISOString(),
        cached: false,
        places,
      };
      memory.set(cacheKey, { value: result, expiresAt: Date.now() + CACHE_TTL_MS });
      return result;
    };

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

export const _clearPlacesMemoryCache = () => memory.clear();
