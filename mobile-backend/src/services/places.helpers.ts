import { haversineM } from '../../../shared/tracking/geo';

export type PlaceSport = 'Run' | 'Walk' | 'Hike' | 'Ride';
export type PlaceCategory = 'park' | 'garden' | 'nature' | 'track' | 'trail' | 'footpath' | 'cycleway' | 'cycle_route' | 'hiking_route' | 'recreation';

export interface Place {
  id: string;
  name: string;
  category: PlaceCategory;
  lat: number;
  lng: number;
  distanceM: number;
  lengthM: number | null;
  path: [number, number][][] | null;
  surface: string | null;
  lit: boolean | null;
  address: string | null;
  osmUrl: string;
}

export interface NearbyResult {
  sport: PlaceSport;
  radiusM: number;
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

export const PHOTON_TAGS: Record<PlaceSport, { specific: string[]; general: string[] }> = {
  Run: { specific: ['leisure:track', 'leisure:recreation_ground'], general: ['leisure:park', 'leisure:nature_reserve'] },
  Walk: { specific: ['leisure:garden'], general: ['leisure:park', 'leisure:nature_reserve', 'leisure:recreation_ground'] },
  Hike: { specific: ['leisure:nature_reserve', 'boundary:protected_area', 'natural:wood', 'landuse:forest', 'route:hiking'], general: ['leisure:park'] },
  Ride: { specific: ['highway:cycleway', 'route:bicycle', 'route:mtb'], general: ['leisure:park', 'leisure:recreation_ground'] },
};

const SPECIFIC_SLOTS = 4;

export const photonCategory = (key: string, value: string): PlaceCategory | null => {
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

const MIN_AREA_DIAGONAL_M = 150;
const MIN_GARDEN_DIAGONAL_M = 300;

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
    const linear = category === 'cycleway' || category === 'cycle_route' || category === 'hiking_route' || category === 'footpath';
    if (!linear) {
      const hasExtent = Array.isArray(p.extent) && p.extent.length === 4;
      const diag = hasExtent ? haversineM(p.extent[1], p.extent[0], p.extent[3], p.extent[2]) : null;
      if (category === 'garden' && (diag == null || diag < MIN_GARDEN_DIAGONAL_M)) continue;
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
  const byDistance = (a: Place, b: Place) => a.distanceM - b.distanceM;
  const specific = out.filter((p) => specificCategories.includes(p.category)).sort(byDistance).slice(0, SPECIFIC_SLOTS);
  const general = out.filter((p) => !specific.includes(p)).sort(byDistance).slice(0, limit - specific.length);
  return [...specific, ...general].sort(byDistance);
};

export const specificCategoriesFor = (sport: PlaceSport): PlaceCategory[] =>
  PHOTON_TAGS[sport].specific
    .map((t) => {
      const [k, v] = t.split(':');
      return photonCategory(k, v);
    })
    .filter((c): c is PlaceCategory => c != null);

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

