/**
 * Nearby places. Provider responses below are TEST FIXTURES shaped like real Photon / Overpass
 * answers; they exist only in this test file and never reach the app or any database.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  _clearPlacesMemoryCache,
  buildOverpassQuery,
  normalizeOverpass,
  normalizePhoton,
  PHOTON_TAGS,
  PlacesService,
} from '../services/places.service';
import { AppDatabase } from '../lib/db';
import { createTestApp, createTestDb, seedAthlete } from './harness';

const LAT = 23.738;
const LNG = 90.398;
const off = (northM: number, eastM: number) => [LNG + eastM / (111_320 * Math.cos((LAT * Math.PI) / 180)), LAT + northM / 111_320];

const photonFeature = (name: string, key: string, value: string, northM: number, eastM: number, extentM?: number, type = 'W', id = Math.floor(Math.random() * 1e9)) => {
  const [lng, lat] = off(northM, eastM);
  const d = (extentM ?? 0) / 2 / 111_320;
  return {
    type: 'Feature',
    geometry: { type: 'Point', coordinates: [lng, lat] },
    properties: { osm_type: type, osm_id: id, osm_key: key, osm_value: value, name, ...(extentM ? { extent: [lng - d, lat + d, lng + d, lat - d] } : {}) },
  };
};

const ok = (body: unknown) => new Response(JSON.stringify(body), { status: 200, headers: { 'Content-Type': 'application/json' } });

beforeEach(() => _clearPlacesMemoryCache());

describe('Photon normalization', () => {
  it('keeps named, suitable, nearby places sorted by distance; drops tiny areas, far and duplicate results', () => {
    const json = {
      features: [
        photonFeature('Big Park', 'leisure', 'park', 900, 0, 600, 'W', 1),
        photonFeature('Running Track', 'leisure', 'track', 300, 0, 200, 'W', 2),
        photonFeature('School Inner Garden', 'leisure', 'garden', 100, 0, 60, 'W', 3), // tiny → dropped
        photonFeature('Flower Shop', 'leisure', 'garden', 60, 0, 120, 'W', 8), // garden below 300 m → dropped
        photonFeature('', 'leisure', 'park', 50, 0, 500, 'W', 4), // unnamed → dropped
        photonFeature('Far Park', 'leisure', 'park', 9000, 0, 800, 'W', 5), // outside radius
        photonFeature('Big Park', 'leisure', 'park', 950, 0, 600, 'N', 6), // same name+category → dup
        photonFeature('Some Shop', 'shop', 'mall', 10, 0, 500, 'W', 7), // unsuitable category
      ],
    };
    const places = normalizePhoton(json, LAT, LNG, 5000);
    expect(places.map((p) => p.name)).toEqual(['Running Track', 'Big Park']);
    expect(places[0]).toMatchObject({ category: 'track', id: 'way/2', osmUrl: 'https://www.openstreetmap.org/way/2' });
    expect(places[0].distanceM).toBeGreaterThan(280);
    expect(places[0].distanceM).toBeLessThan(320);
  });

  it('never lets closer parks crowd out the sport-specific places (e.g. cycleways for Ride)', () => {
    const parks = Array.from({ length: 15 }, (_, i) => photonFeature(`Park ${i}`, 'leisure', 'park', 100 + i * 50, 0, 400, 'W', 100 + i));
    const json = { features: [...parks, photonFeature('River Cycleway', 'highway', 'cycleway', 4000, 0, undefined, 'W', 22)] };
    const ride = normalizePhoton(json, LAT, LNG, 5000, 12, ['cycleway', 'cycle_route']);
    expect(ride).toHaveLength(12);
    expect(ride.map((p) => p.name)).toContain('River Cycleway');
    expect(ride[ride.length - 1].name).toBe('River Cycleway'); // still sorted nearest first
    const walk = normalizePhoton(json, LAT, LNG, 5000, 12, []);
    expect(walk.map((p) => p.name)).not.toContain('River Cycleway');
  });

  it('returns an empty list (not invented places) when nothing is found', () => {
    expect(normalizePhoton({ features: [] }, LAT, LNG, 5000)).toEqual([]);
    expect(normalizePhoton(null, LAT, LNG, 5000)).toEqual([]);
  });
});

describe('Overpass normalization', () => {
  it('merges segments of the same named path, measures length, and uses the nearest vertex', () => {
    const seg = (id: number, fromM: number, toM: number) => ({
      type: 'way',
      id,
      tags: { highway: 'cycleway', name: 'Lake Cycleway' },
      geometry: [0, 1, 2, 3].map((i) => {
        const [lon, lat] = off(1000, fromM + ((toM - fromM) * i) / 3);
        return { lat, lon };
      }),
    });
    const json = {
      elements: [
        seg(10, 0, 400),
        seg(11, 400, 800),
        { type: 'way', id: 12, tags: { leisure: 'park', name: 'Lake Park' }, center: (() => { const [lon, lat] = off(500, 0); return { lat, lon }; })() },
        { type: 'way', id: 13, tags: { highway: 'footway', name: 'Tiny stub' }, geometry: [{ lat: LAT, lon: LNG }, { lat: LAT + 0.0001, lon: LNG }] },
      ],
    };
    const places = normalizeOverpass(json, LAT, LNG);
    expect(places.map((p) => p.name)).toEqual(['Lake Park', 'Lake Cycleway']);
    const cw = places[1];
    expect(cw.category).toBe('cycleway');
    expect(cw.lengthM!).toBeGreaterThan(780);
    expect(cw.lengthM!).toBeLessThan(820);
    expect(cw.path).toHaveLength(2);
    expect(cw.distanceM).toBeGreaterThan(990);
    expect(cw.distanceM).toBeLessThan(1010);
  });

  it('builds a radius-limited query around the given point for the sport', () => {
    const q = buildOverpassQuery('Ride', 23.738, 90.398, 4000);
    expect(q).toContain('(around:4000,23.738,90.398)');
    expect(q).toContain('"highway"="cycleway"');
    expect(q).toContain('route"~"^(bicycle|mtb)$"');
  });
});

describe('PlacesService providers', () => {
  it('uses Photon with the sport tags and the rounded position', async () => {
    const calls: string[] = [];
    const svc = new PlacesService(async (url) => {
      calls.push(url);
      return ok({ features: [photonFeature('Big Park', 'leisure', 'park', 500, 0, 600, 'W', 1)] });
    });
    const res = await svc.nearby('Run', 23.73812345, 90.39876543, 5000);
    expect(res).toMatchObject({ provider: 'photon', cached: false, center: { lat: 23.738, lng: 90.399 } });
    expect(res.places).toHaveLength(1);
    const u = new URL(calls[0]);
    expect(u.searchParams.get('lat')).toBe('23.738');
    expect(u.searchParams.get('lon')).toBe('90.399');
    const tagSets = calls.map((c) => new URL(c).searchParams.getAll('osm_tag'));
    expect(tagSets).toEqual([PHOTON_TAGS.Run.specific, PHOTON_TAGS.Run.general]);
  });

  it('fails over to Overpass when Photon is down, and caches the answer', async () => {
    let n = 0;
    const svc = new PlacesService(async (url) => {
      n++;
      if (url.includes('photon')) return new Response('busy', { status: 503 });
      return ok({ elements: [{ type: 'node', id: 1, lat: LAT + 0.004, lon: LNG, tags: { leisure: 'park', name: 'Node Park' } }] });
    }, ['https://overpass.example/a']);
    const first = await svc.nearby('Walk', LAT, LNG, 3000);
    expect(first.provider).toBe('overpass');
    expect(first.places[0].name).toBe('Node Park');
    const second = await svc.nearby('Walk', LAT, LNG, 3000);
    expect(second.cached).toBe(true);
    expect(n).toBe(3); // 2 Photon calls (both failed) + 1 Overpass; the second answer came from the cache
  });

  it('throws 503 (never a static fallback list) when every provider fails', async () => {
    const svc = new PlacesService(async () => {
      throw new Error('ECONNRESET');
    }, ['https://overpass.example/a', 'https://overpass.example/b']);
    await expect(svc.nearby('Hike', LAT, LNG, 5000)).rejects.toMatchObject({ status: 503, code: 'places_unavailable' });
  });
});

describe('GET /places/nearby', () => {
  let db: AppDatabase;
  let call: ReturnType<typeof createTestApp>['call'];
  let token: string;
  beforeEach(async () => {
    ({ db } = await createTestDb());
    ({ call } = createTestApp(db));
    token = await seedAthlete(db, 'ath_a');
  });
  afterEach(() => vi.unstubAllGlobals());

  it('requires auth and validates coordinates', async () => {
    expect((await call('GET', `/places/nearby?lat=${LAT}&lng=${LNG}`)).status).toBe(401);
    expect((await call('GET', '/places/nearby?lat=200&lng=10', { token })).status).toBe(400);
    expect((await call('GET', `/places/nearby?lng=${LNG}`, { token })).status).toBe(400);
    expect((await call('GET', `/places/nearby?lat=${LAT}&lng=${LNG}&sport=Swim`, { token })).status).toBe(400);
  });

  it('returns provider results, and 503 with no places when providers fail', async () => {
    vi.stubGlobal('fetch', async () => ok({ features: [photonFeature('Big Park', 'leisure', 'park', 400, 0, 600, 'W', 1)] }));
    const okRes = await call('GET', `/places/nearby?lat=${LAT}&lng=${LNG}&sport=Run`, { token });
    expect(okRes.status).toBe(200);
    expect(okRes.body.places[0].name).toBe('Big Park');
    expect(okRes.body.attribution).toContain('OpenStreetMap');

    _clearPlacesMemoryCache();
    vi.stubGlobal('fetch', async () => new Response('down', { status: 502 }));
    const fail = await call('GET', `/places/nearby?lat=${LAT}&lng=${LNG}&sport=Run`, { token });
    expect(fail.status).toBe(503);
    expect(fail.body.places).toBeUndefined();
  });
});
