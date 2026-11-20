import { randomUUID } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { beforeEach, describe, expect, it } from 'vitest';
import { line } from '../../../shared/tracking/__tests__/fixtures';
import { toWire, WirePoint } from '../../../shared/tracking/types';
import * as schema from '../db/schema';
import { generateToken } from '../lib/auth';
import { AppDatabase } from '../lib/db';
import { createTestApp, createTestDb, ENV, seedAthlete } from './harness';

const T0 = Date.UTC(2026, 10, 18, 6, 0, 0);
// 1170 m in 390 s at 3 m/s → 391 points: batch 0 = 300, batch 1 = 91
const TRACK: WirePoint[] = line({ t0: T0, seconds: 390, speedMps: 3 }).map(toWire);
const BATCHES = [TRACK.slice(0, 300), TRACK.slice(300)];

let db: AppDatabase;
let call: ReturnType<typeof createTestApp>['call'];
let owner: string; // athlete A
let follower: string; // B follows A
let stranger: string; // C

beforeEach(async () => {
  ({ db } = await createTestDb());
  ({ call } = createTestApp(db));
  owner = await seedAthlete(db, 'ath_a');
  follower = await seedAthlete(db, 'ath_b');
  stranger = await seedAthlete(db, 'ath_c');
  await db.insert(schema.follows).values({ followerId: 'ath_b', followingId: 'ath_a' });
});

const details = (over: Record<string, unknown> = {}) => ({
  title: 'Morning Run',
  description: 'Easy',
  sportType: 'Run',
  visibility: 'PUBLIC',
  startTime: new Date(T0).toISOString(),
  finishedAt: new Date(T0 + 390_000).toISOString(),
  pauses: [],
  batchCount: 2,
  ...over,
});

/** Full upload; returns the activity id. */
const upload = async (token = owner, over: Record<string, unknown> = {}) => {
  const cid = randomUUID();
  expect((await call('POST', '/activities/uploads', { token, body: { clientActivityId: cid, sportType: 'Run', startTime: new Date(T0).toISOString() } })).status).toBe(201);
  for (const [seq, points] of BATCHES.entries()) {
    expect((await call('PUT', `/activities/uploads/${cid}/batches/${seq}`, { token, body: { points } })).status).toBe(200);
  }
  const res = await call('POST', `/activities/uploads/${cid}/complete`, { token, body: details(over) });
  expect(res.status).toBe(201);
  return { cid, id: res.body.activity.id as string, res };
};

describe('batch upload', () => {
  it('creates an activity with server-computed metrics', async () => {
    const { res } = await upload();
    const a = res.body.activity;
    expect(Number(a.distanceMeters)).toBeGreaterThan(1150);
    expect(Number(a.distanceMeters)).toBeLessThan(1190);
    expect(a.movingTimeSeconds).toBeGreaterThanOrEqual(385);
    expect(a.elapsedTimeSeconds).toBe(390);
    expect(a.calories).toBeGreaterThan(0);
    expect(a.splits).toHaveLength(2);
    expect(a.rawPolyline).toBeUndefined(); // never echoed
    expect(a.clientActivityId).toBeUndefined();
  });

  it('is idempotent at every step (start, batch, complete)', async () => {
    const cid = randomUUID();
    const start = { clientActivityId: cid, sportType: 'Run', startTime: new Date(T0).toISOString() };
    expect((await call('POST', '/activities/uploads', { token: owner, body: start })).status).toBe(201);
    const again = await call('POST', '/activities/uploads', { token: owner, body: start });
    expect(again.status).toBe(200);
    expect(again.body.upload.receivedSeqs).toEqual([]);

    await call('PUT', `/activities/uploads/${cid}/batches/0`, { token: owner, body: { points: BATCHES[0] } });
    const dup = await call('PUT', `/activities/uploads/${cid}/batches/0`, { token: owner, body: { points: BATCHES[0] } });
    expect(dup.body).toMatchObject({ seq: 0, duplicate: true });
    await call('PUT', `/activities/uploads/${cid}/batches/1`, { token: owner, body: { points: BATCHES[1] } });

    const first = await call('POST', `/activities/uploads/${cid}/complete`, { token: owner, body: details() });
    const second = await call('POST', `/activities/uploads/${cid}/complete`, { token: owner, body: details() });
    expect(first.status).toBe(201);
    expect(second.status).toBe(200);
    expect(second.body.activity.id).toBe(first.body.activity.id);

    // a batch retried after completion (lost ack) is acknowledged, not an error
    const late = await call('PUT', `/activities/uploads/${cid}/batches/1`, { token: owner, body: { points: BATCHES[1] } });
    expect(late.status).toBe(200);

    const rows = await db.select().from(schema.activities).where(eq(schema.activities.athleteId, 'ath_a'));
    expect(rows).toHaveLength(1);
  });

  it('creates exactly one activity under concurrent duplicate /complete calls', async () => {
    const cid = randomUUID();
    await call('POST', '/activities/uploads', { token: owner, body: { clientActivityId: cid, sportType: 'Run', startTime: new Date(T0).toISOString() } });
    for (const [seq, points] of BATCHES.entries()) await call('PUT', `/activities/uploads/${cid}/batches/${seq}`, { token: owner, body: { points } });
    const results = await Promise.all(
      Array.from({ length: 5 }, () => call('POST', `/activities/uploads/${cid}/complete`, { token: owner, body: details() }))
    );
    expect(results.filter((r) => r.status === 201)).toHaveLength(1);
    expect(results.filter((r) => r.status === 200)).toHaveLength(4);
    expect(new Set(results.map((r) => r.body.activity.id)).size).toBe(1);
    const rows = await db.select().from(schema.activities);
    expect(rows).toHaveLength(1);
  });

  it('refuses to complete with missing batches and reports which', async () => {
    const cid = randomUUID();
    await call('POST', '/activities/uploads', { token: owner, body: { clientActivityId: cid, sportType: 'Run', startTime: new Date(T0).toISOString() } });
    await call('PUT', `/activities/uploads/${cid}/batches/0`, { token: owner, body: { points: BATCHES[0] } });
    const res = await call('POST', `/activities/uploads/${cid}/complete`, { token: owner, body: details() });
    expect(res.status).toBe(409);
    expect(res.body.details.missingSeqs).toEqual([1]);
    const status = await call('GET', `/activities/uploads/${cid}`, { token: owner });
    expect(status.body.upload.receivedSeqs).toEqual([0]);
  });

  it('rejects a batch re-sent with different content', async () => {
    const cid = randomUUID();
    await call('POST', '/activities/uploads', { token: owner, body: { clientActivityId: cid, sportType: 'Run', startTime: new Date(T0).toISOString() } });
    await call('PUT', `/activities/uploads/${cid}/batches/0`, { token: owner, body: { points: BATCHES[0] } });
    const res = await call('PUT', `/activities/uploads/${cid}/batches/0`, { token: owner, body: { points: BATCHES[1] } });
    expect(res.status).toBe(409);
    expect(res.body.code).toBe('batch_conflict');
  });

  it('keeps uploads private to their athlete', async () => {
    const cid = randomUUID();
    await call('POST', '/activities/uploads', { token: owner, body: { clientActivityId: cid, sportType: 'Run', startTime: new Date(T0).toISOString() } });
    expect((await call('PUT', `/activities/uploads/${cid}/batches/0`, { token: stranger, body: { points: BATCHES[0] } })).status).toBe(404);
    expect((await call('POST', `/activities/uploads/${cid}/complete`, { token: stranger, body: details({ batchCount: 0 }) })).status).toBe(404);
    expect((await call('GET', `/activities/uploads/${cid}`, { token: stranger })).status).toBe(404);
    expect((await call('POST', '/activities/uploads', { body: { clientActivityId: cid, sportType: 'Run', startTime: new Date(T0).toISOString() } })).status).toBe(401);
  });

  it('validates input', async () => {
    const cid = randomUUID();
    const bad = await call('POST', '/activities/uploads', { token: owner, body: { clientActivityId: 'nope', sportType: 'Swim', startTime: 'yesterday' } });
    expect(bad.status).toBe(400);
    expect(bad.body.code).toBe('validation_failed');
    expect((await call('POST', '/activities/uploads', { token: owner, raw: '{not json' })).status).toBe(400);
    await call('POST', '/activities/uploads', { token: owner, body: { clientActivityId: cid, sportType: 'Run', startTime: new Date(T0).toISOString() } });
    const badPoint = [[T0, 200, 10, 5, null, null, null, 0]];
    expect((await call('PUT', `/activities/uploads/${cid}/batches/0`, { token: owner, body: { points: badPoint } })).status).toBe(400);
    expect((await call('PUT', `/activities/uploads/${cid}/batches/-1`, { token: owner, body: { points: BATCHES[1] } })).status).toBe(400);
    const noTitle = await call('POST', `/activities/uploads/${cid}/complete`, { token: owner, body: details({ title: '  ', batchCount: 0 }) });
    expect(noTitle.status).toBe(400);
    const backwards = await call('POST', `/activities/uploads/${cid}/complete`, {
      token: owner,
      body: details({ batchCount: 0, finishedAt: new Date(T0 - 1000).toISOString() }),
    });
    expect(backwards.status).toBe(400);
  });

  it('legacy POST /activities is idempotent when clientActivityId is sent', async () => {
    const body = { clientActivityId: randomUUID(), title: 'Old build', sportType: 'Run', distanceMeters: 1000, movingTimeSeconds: 300 };
    const a = await call('POST', '/activities', { token: owner, body });
    const b = await call('POST', '/activities', { token: owner, body });
    expect(a.status).toBe(201);
    expect(b.status).toBe(200);
    expect(b.body.activity.id).toBe(a.body.activity.id);
  });
});

describe('visibility matrix', () => {
  let pub: string;
  let fol: string;
  let priv: string;

  beforeEach(async () => {
    pub = (await upload(owner, { title: 'Public', visibility: 'PUBLIC' })).id;
    fol = (await upload(owner, { title: 'Followers', visibility: 'FOLLOWERS_ONLY' })).id;
    priv = (await upload(owner, { title: 'Private', visibility: 'ONLY_ME' })).id;
  });

  const viewers = () => ({ anonymous: undefined, stranger, follower, owner });
  const expected: Record<string, Record<string, boolean>> = {
    anonymous: { pub: true, fol: false, priv: false },
    stranger: { pub: true, fol: false, priv: false },
    follower: { pub: true, fol: true, priv: false },
    owner: { pub: true, fol: true, priv: true },
  };

  it('detail endpoint (invisible = 404)', async () => {
    for (const [who, token] of Object.entries(viewers())) {
      for (const [key, id] of Object.entries({ pub, fol, priv })) {
        const res = await call('GET', `/activities/${id}`, { token });
        expect([who, key, res.status]).toEqual([who, key, expected[who][key] ? 200 : 404]);
      }
    }
  });

  it('only the owner receives the raw track', async () => {
    expect((await call('GET', `/activities/${pub}`, { token: owner })).body.activity.rawPolyline.length).toBeGreaterThan(0);
    expect((await call('GET', `/activities/${pub}`, { token: follower })).body.activity.rawPolyline).toBeNull();
  });

  it('history and profile lists', async () => {
    for (const [who, token] of Object.entries(viewers())) {
      const list = await call('GET', '/athletes/ath_a/activities', { token });
      const titles = list.body.activities.map((a: any) => a.title).sort();
      const want = (['pub', 'fol', 'priv'] as const)
        .filter((k) => expected[who][k])
        .map((k) => ({ pub: 'Public', fol: 'Followers', priv: 'Private' })[k])
        .sort();
      expect([who, titles]).toEqual([who, want]);
      const profile = await call('GET', '/athletes/ath_a', { token });
      expect([who, profile.body.recentActivities.map((a: any) => a.title).sort()]).toEqual([who, want]);
      expect(profile.body.athlete.email === undefined).toBe(who !== 'owner');
      expect(profile.body.recentActivities.every((a: any) => a.rawPolyline === undefined)).toBe(true);
    }
  });

  it('following feed hides private activities of followed athletes', async () => {
    const feed = await call('GET', '/feed?tab=following', { token: follower });
    expect(feed.body.feed.map((a: any) => a.title).sort()).toEqual(['Followers', 'Public']);
    const own = await call('GET', '/feed?tab=following', { token: owner });
    expect(own.body.feed).toHaveLength(3);
    const all = await call('GET', '/feed?tab=all', { token: stranger });
    expect(all.body.feed.map((a: any) => a.title)).toEqual(['Public']);
  });

  it('kudos, comments and export respect visibility', async () => {
    expect((await call('POST', `/activities/${priv}/kudos`, { token: follower })).status).toBe(404);
    expect((await call('POST', `/activities/${fol}/kudos`, { token: stranger })).status).toBe(404);
    expect((await call('POST', `/activities/${priv}/comments`, { token: follower, body: { content: 'hi' } })).status).toBe(404);
    expect((await call('GET', `/activities/${pub}/export`, { token: follower })).status).toBe(404);
    expect((await call('GET', `/activities/${pub}/export`)).status).toBe(401);
    const gpx = await call('GET', `/activities/${pub}/export`, { token: owner });
    expect(gpx.status).toBe(200);
    expect(String(gpx.body)).toContain('<trkpt');
  });
});

describe('activity management', () => {
  it('owner can edit; others get 404', async () => {
    const { id } = await upload();
    const res = await call('PATCH', `/activities/${id}`, { token: owner, body: { title: 'Renamed', visibility: 'ONLY_ME', sportType: 'Walk' } });
    expect(res.status).toBe(200);
    expect(res.body.activity).toMatchObject({ title: 'Renamed', visibility: 'ONLY_ME', sportType: 'Walk' });
    expect((await call('PATCH', `/activities/${id}`, { token: follower, body: { title: 'x' } })).status).toBe(404);
    expect((await call('PATCH', `/activities/${id}`, { token: owner, body: {} })).status).toBe(400);
    expect((await call('GET', `/activities/${id}`, { token: follower })).status).toBe(404); // now private
  });

  it('owner can delete; a later retry of the upload does not resurrect it', async () => {
    const { id, cid } = await upload();
    expect((await call('DELETE', `/activities/${id}`, { token: stranger })).status).toBe(404);
    expect((await call('DELETE', `/activities/${id}`, { token: owner })).status).toBe(204);
    expect((await call('GET', `/activities/${id}`, { token: owner })).status).toBe(404);
    const retry = await call('POST', `/activities/uploads/${cid}/complete`, { token: owner, body: details() });
    expect(retry.status).toBe(200);
    expect(retry.body).toMatchObject({ created: false, deleted: true, activity: null });
    expect(await db.select().from(schema.activities)).toHaveLength(0);
  });

  it('kudos are give-only, idempotent and not self-given', async () => {
    const { id } = await upload();
    await call('POST', `/activities/${id}/kudos`, { token: follower });
    const again = await call('POST', `/activities/${id}/kudos`, { token: follower });
    expect(again.body).toEqual({ hasKudos: true, kudosCount: 1 });
    expect((await call('POST', `/activities/${id}/kudos`, { token: owner })).status).toBe(422);
  });

  it('paginates history without skipping or repeating equal start times', async () => {
    for (let i = 0; i < 7; i++) {
      await db.insert(schema.activities).values({
        id: `act_${i}`,
        athleteId: 'ath_a',
        title: `A${i}`,
        sportType: 'Run',
        startTime: new Date(T0), // identical start times
        distanceMeters: '1000',
        movingTimeSeconds: 300,
        elapsedTimeSeconds: 300,
      });
    }
    const seen: string[] = [];
    let cursor: string | null = null;
    do {
      const q: string = `/athletes/ath_a/activities?limit=3${cursor ? `&cursor=${cursor}` : ''}`;
      const page = await call('GET', q, { token: owner });
      seen.push(...page.body.activities.map((a: any) => a.id));
      cursor = page.body.nextCursor;
    } while (cursor);
    expect(seen).toHaveLength(7);
    expect(new Set(seen).size).toBe(7);
    expect((await call('GET', '/athletes/ath_a/activities?cursor=garbage', { token: owner })).status).toBe(400);
  });
});

describe('authentication', () => {
  it('fails closed without a JWT secret', async () => {
    const { call: noSecret } = createTestApp(db, { ENVIRONMENT: 'test' });
    expect((await noSecret('GET', '/auth/me', { token: owner })).status).toBe(500);
  });

  it('rejects tokens signed with another secret (incl. the old hard-coded default)', async () => {
    const forged = await generateToken({ athleteId: 'ath_a', username: 'a', email: 'a@x' }, 'open-strava-prod-secret-jwt-key-2026-auth');
    expect((await call('GET', '/auth/me', { token: forged })).status).toBe(401);
  });

  it('no longer accepts mock Google tokens', async () => {
    const res = await call('POST', '/auth/google', { body: { idToken: 'mock:anything' } });
    expect(res.status).toBe(401);
    const demo = await call('POST', '/auth/google', { body: { idToken: 'demo-google-token' } });
    expect(demo.status).toBe(401);
  });

  it('hides demo login and out-of-scope modules in production', async () => {
    const { call: prod } = createTestApp(db, { ...ENV, ENVIRONMENT: 'production' });
    expect((await prod('POST', '/auth/demo-login')).status).toBe(404);
    expect((await prod('GET', '/clubs', { token: owner })).status).toBe(404);
    expect((await prod('GET', '/segments', { token: owner })).status).toBe(404);
  });
});
