/** Route planning + place details. Provider payloads here are test fixtures only. */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AppDatabase } from '../lib/db';
import { _clearPlaceDetailsCache, PlaceDetailsService } from '../services/place-details.service';
import {
  _clearRoutingCache,
  decodePolyline6,
  elevationChange,
  RoutingService,
} from '../services/routing.service';
import { createTestApp, createTestDb, seedAthlete } from './harness';

const ok = (b: unknown) =>
  new Response(JSON.stringify(b), { status: 200, headers: { 'Content-Type': 'application/json' } });

/** Encoder (test helper only) so fixtures carry a real polyline6 shape. */
const encode6 = (pts: [number, number][]) => {
  let out = '',
    pLat = 0,
    pLng = 0;
  const enc = (v: number) => {
    let n = v < 0 ? ~(v << 1) : v << 1,
      s = '';
    while (n >= 0x20) {
      s += String.fromCharCode((0x20 | (n & 0x1f)) + 63);
      n >>= 5;
    }
    return s + String.fromCharCode(n + 63);
  };
  for (const [lng, lat] of pts) {
    const la = Math.round(lat * 1e6),
      ln = Math.round(lng * 1e6);
    out += enc(la - pLat) + enc(ln - pLng);
    pLat = la;
    pLng = ln;
  }
  return out;
};

const SHAPE: [number, number][] = [
  [90.39582, 23.738072],
  [90.3965, 23.7375],
  [90.398, 23.7368],
  [90.401955, 23.735435],
];
const trip = (km: number, s: number) => ({
  trip: { summary: { length: km, time: s }, legs: [{ shape: encode6(SHAPE) }] },
});

beforeEach(() => {
  _clearRoutingCache();
  _clearPlaceDetailsCache();
});

describe('routing service', () => {
  it('decodes Valhalla polyline6 exactly', () => {
    const back = decodePolyline6(encode6(SHAPE));
    back.forEach(([lng, lat], i) => {
      expect(lng).toBeCloseTo(SHAPE[i][0], 6);
      expect(lat).toBeCloseTo(SHAPE[i][1], 6);
    });
  });

  it('elevation gain ignores DEM noise below 5 m', () => {
    expect(elevationChange([10, 12, 9, 13, 10, 12])).toEqual({ gain: 0, loss: 0 });
    expect(elevationChange([10, 20, 30, 25, 18])).toEqual({ gain: 20, loss: 12 });
    expect(elevationChange([5])).toEqual({ gain: null, loss: null });
  });

  it('returns real geometry + alternatives + DEM elevation, using sport costing and speed', async () => {
    const calls: { url: string; body: any }[] = [];
    const svc = new RoutingService(async (url, init) => {
      const body = JSON.parse(String(init?.body));
      calls.push({ url, body });
      if (url.endsWith('/route'))
        return ok({ ...trip(1.322, 476), alternates: [trip(1.439, 518)] });
      return ok({
        range_height: [
          [0, 10],
          [30, 17],
          [60, 22],
          [90, 21],
        ],
      });
    }, 'https://valhalla.example');
    const plan = await svc.plan(
      'Run',
      { lat: 23.7381, lng: 90.3958 },
      { lat: 23.7353, lng: 90.4022 }
    );
    expect(plan.routes).toHaveLength(2);
    expect(plan.routes[0]).toMatchObject({ distanceM: 1322, durationS: 476, elevationGainM: 12 });
    expect(plan.routes[0].geometry[0][0]).toBeCloseTo(90.39582, 6);
    expect(plan.routes[0].elevationProfile).toHaveLength(4);
    const route = calls.find((c) => c.url.endsWith('/route'))!.body;
    expect(route.costing).toBe('pedestrian');
    expect(route.costing_options.pedestrian.walking_speed).toBe(10);
    expect(route.alternates).toBe(2);
    expect(plan.assumedSpeedKmh).toBe(10);
  });

  it('elevation is null (not invented) when the DEM call fails', async () => {
    const svc = new RoutingService(
      async (url) =>
        url.endsWith('/route') ? ok(trip(1.5, 300)) : new Response('x', { status: 500 }),
      'https://v.example'
    );
    const plan = await svc.plan(
      'Ride',
      { lat: 23.7381, lng: 90.3958 },
      { lat: 23.7353, lng: 90.4022 }
    );
    expect(plan.routes[0]).toMatchObject({ elevationGainM: null, elevationProfile: null });
  });

  it('maps "no path" to 422 and outages to 503, and rejects silly distances', async () => {
    const noPath = new RoutingService(
      async () =>
        new Response(JSON.stringify({ error_code: 442, error: 'No path could be found' }), {
          status: 400,
        }),
      'https://v.example'
    );
    await expect(
      noPath.plan('Walk', { lat: 23.7, lng: 90.4 }, { lat: 23.71, lng: 90.41 })
    ).rejects.toMatchObject({ status: 422, code: 'no_route' });
    const down = new RoutingService(async () => {
      throw new Error('ECONNRESET');
    }, 'https://v.example');
    await expect(
      down.plan('Walk', { lat: 23.7, lng: 90.4 }, { lat: 23.71, lng: 90.41 })
    ).rejects.toMatchObject({ status: 503 });
    await expect(
      down.plan('Walk', { lat: 23.7, lng: 90.4 }, { lat: 23.70001, lng: 90.4 })
    ).rejects.toMatchObject({ code: 'too_close' });
    await expect(
      down.plan('Walk', { lat: 23.7, lng: 90.4 }, { lat: 24.7, lng: 90.4 })
    ).rejects.toMatchObject({ code: 'too_far' });
  });
});

describe('place details (genuine images only)', () => {
  it('follows OSM wikidata → P18 → Commons and returns attribution', async () => {
    const svc = new PlaceDetailsService(async (url) => {
      if (url.includes('openstreetmap.org/api'))
        return ok({
          elements: [
            {
              tags: {
                name: 'রমনা পার্ক',
                'name:en': 'Ramna Park',
                wikidata: 'Q7289746',
                leisure: 'park',
              },
            },
          ],
        });
      if (url.includes('wikidata.org'))
        return ok({
          entities: {
            Q7289746: {
              claims: { P18: [{ mainsnak: { datavalue: { value: 'Romna Park5.JPG' } } }] },
            },
          },
        });
      if (url.includes('commons.wikimedia.org')) {
        expect(new URL(url).searchParams.get('titles')).toBe('File:Romna Park5.JPG');
        return ok({
          query: {
            pages: {
              '1': {
                imageinfo: [
                  {
                    thumburl: 'https://upload.wikimedia.org/x/800px-Romna_Park5.JPG',
                    descriptionurl: 'https://commons.wikimedia.org/wiki/File:Romna_Park5.JPG',
                    mime: 'image/jpeg',
                    extmetadata: {
                      Artist: { value: '<a href="#">Hameem Shakhawat</a>' },
                      LicenseShortName: { value: 'CC BY-SA 3.0' },
                      LicenseUrl: { value: 'http://creativecommons.org/licenses/by-sa/3.0/' },
                    },
                  },
                ],
              },
            },
          },
        });
      }
      throw new Error(url);
    });
    const d = await svc.details('way', '236956073');
    expect(d.nameEn).toBe('Ramna Park');
    expect(d.image).toMatchObject({
      author: 'Hameem Shakhawat',
      license: 'CC BY-SA 3.0',
      source: 'Wikimedia Commons',
    });
  });

  it('returns image: null when the place links no media (never a stock/category picture)', async () => {
    const svc = new PlaceDetailsService(async () =>
      ok({ elements: [{ tags: { name: 'Suhrawardy Udyan', leisure: 'park' } }] })
    );
    expect((await svc.details('node', '9684909174')).image).toBeNull();
  });

  it('validates ids and maps provider outages', async () => {
    const svc = new PlaceDetailsService(async () => new Response('down', { status: 502 }));
    await expect(svc.details('shop', '1')).rejects.toMatchObject({ status: 400 });
    await expect(svc.details('way', '1')).rejects.toMatchObject({ status: 503 });
  });
});

describe('HTTP: /routing/plan and /places/:type/:id', () => {
  let db: AppDatabase;
  let call: ReturnType<typeof createTestApp>['call'];
  let token: string;
  beforeEach(async () => {
    ({ db } = await createTestDb());
    ({ call } = createTestApp(db));
    token = await seedAthlete(db, 'ath_a');
  });
  afterEach(() => vi.unstubAllGlobals());

  it('requires auth and validates input', async () => {
    expect(
      (
        await call('POST', '/routing/plan', {
          body: { sport: 'Run', from: { lat: 1, lng: 1 }, to: { lat: 1.01, lng: 1 } },
        })
      ).status
    ).toBe(401);
    expect(
      (
        await call('POST', '/routing/plan', {
          token,
          body: { sport: 'Swim', from: { lat: 1, lng: 1 }, to: { lat: 1.01, lng: 1 } },
        })
      ).status
    ).toBe(400);
    expect((await call('GET', '/places/way/236956073')).status).toBe(401);
  });

  it('plans a route end to end', async () => {
    vi.stubGlobal('fetch', async (url: string) =>
      String(url).endsWith('/route')
        ? ok(trip(1.322, 476))
        : ok({
            range_height: [
              [0, 10],
              [30, 11],
            ],
          })
    );
    const res = await call('POST', '/routing/plan', {
      token,
      body: {
        sport: 'Walk',
        from: { lat: 23.7381, lng: 90.3958 },
        to: { lat: 23.7353, lng: 90.4022 },
      },
    });
    expect(res.status).toBe(200);
    expect(res.body.routes[0].distanceM).toBe(1322);
    expect(res.body.attribution).toContain('OpenStreetMap');
  });
});
