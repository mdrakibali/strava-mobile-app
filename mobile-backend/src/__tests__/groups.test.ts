/** Smoke tests for the existing Groups (clubs, challenges, events) and Maps (routes) modules. */
import { beforeEach, describe, expect, it } from 'vitest';
import { AppDatabase } from '../lib/db';
import { createTestApp, createTestDb, seedAthlete } from './harness';

let db: AppDatabase;
let call: ReturnType<typeof createTestApp>['call'];
let a: string;
let b: string;

beforeEach(async () => {
  ({ db } = await createTestDb());
  ({ call } = createTestApp(db));
  a = await seedAthlete(db, 'ath_a');
  b = await seedAthlete(db, 'ath_b');
});

describe('clubs', () => {
  it('create, list, detail, join/leave', async () => {
    const created = await call('POST', '/clubs', { token: a, body: { name: 'Dhaka Runners', sportType: 'Run', city: 'Dhaka' } });
    expect(created.status).toBe(201);
    const id = created.body.club.id;
    const list = await call('GET', '/clubs', { token: b });
    expect(list.body.clubs.map((x: any) => x.id)).toContain(id);
    const join = await call('POST', `/clubs/${id}/join`, { token: b });
    expect(join.body.isMember).toBe(true);
    const detail = await call('GET', `/clubs/${id}`, { token: b });
    expect(detail.status).toBe(200);
    const leave = await call('POST', `/clubs/${id}/join`, { token: b });
    expect(leave.body.isMember).toBe(false);
    expect((await call('POST', '/clubs', { token: a, body: { name: ' ' } })).status).toBe(400);
  });
});

describe('challenges', () => {
  it('create, list, join', async () => {
    const now = Date.now();
    const created = await call('POST', '/challenges', {
      token: a,
      body: { title: '50 km in November', targetMeters: 50000, sportType: 'Run', startDate: new Date(now - 86400000).toISOString(), endDate: new Date(now + 20 * 86400000).toISOString() },
    });
    expect(created.status).toBe(201);
    const id = created.body.challenge.id;
    const list = await call('GET', '/challenges', { token: b });
    expect(list.body.challenges.map((x: any) => x.id)).toContain(id);
    const join = await call('POST', `/challenges/${id}/join`, { token: b });
    expect(join.status).toBe(200);
    expect((await call('GET', `/challenges/${id}`, { token: b })).status).toBe(200);
  });
});

describe('events', () => {
  it('lists and 404s unknown events', async () => {
    expect((await call('GET', '/events', { token: a })).status).toBe(200);
    expect((await call('GET', '/events/nope', { token: a })).status).toBe(404);
  });
});

describe('routes (Maps)', () => {
  it('create, list, detail, save/unsave', async () => {
    const created = await call('POST', '/routes', {
      token: a,
      body: { name: 'River loop', sportType: 'Run', distanceMeters: 4200, polylinePoints: [{ latitude: 23.78, longitude: 90.42 }, { latitude: 23.79, longitude: 90.43 }] },
    });
    expect(created.status).toBe(201);
    const id = created.body.route.id;
    expect((await call('GET', '/routes', { token: b })).body.routes.map((r: any) => r.id)).toContain(id);
    expect((await call('GET', `/routes/${id}`, { token: b })).status).toBe(200);
    const saved = await call('POST', `/routes/${id}/toggle-save`, { token: b });
    expect(saved.body.isSaved).toBe(true);
    expect((await call('GET', '/routes/saved', { token: b })).body.savedRoutes.length).toBe(1);
  });
});
