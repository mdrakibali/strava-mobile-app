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
  it('create with validation, list shows the viewer RSVP and real attendee count, RSVP', async () => {
    const when = new Date(Date.now() + 3 * 86400000).toISOString();
    expect((await call('POST', '/events', { token: a, body: { title: 'x', sportType: 'Run', eventDate: '2001-01-01T00:00:00Z', meetingPoint: 'Park' } })).status).toBe(400);
    const created = await call('POST', '/events', { token: a, body: { title: 'Saturday long run', sportType: 'Run', eventDate: when, meetingPoint: 'Hatirjheel', distanceMeters: 15000 } });
    expect(created.status).toBe(201);
    const id = created.body.event.id;
    let list = await call('GET', '/events', { token: b });
    let ev = list.body.events.find((e: any) => e.id === id);
    expect(ev).toMatchObject({ attendeesCount: 1, rsvpStatus: null });
    await call('POST', `/events/${id}/rsvp`, { token: b, body: { status: 'GOING' } });
    list = await call('GET', '/events', { token: b });
    ev = list.body.events.find((e: any) => e.id === id);
    expect(ev).toMatchObject({ attendeesCount: 2, rsvpStatus: 'GOING' });
  });

  it('lists and 404s unknown events', async () => {
    expect((await call('GET', '/events', { token: a })).status).toBe(200);
    expect((await call('GET', '/events/nope', { token: a })).status).toBe(404);
  });
});

describe('routes (Maps)', () => {
  it('create, list, detail, save/unsave', async () => {
    const created = await call('POST', '/routes', {
      token: a,
      body: { name: 'River loop', sportType: 'Run', distanceMeters: 999999, polylinePoints: [{ latitude: 23.78, longitude: 90.42 }, { latitude: 23.79, longitude: 90.43 }] },
    });
    expect(created.status).toBe(201);
    // distance comes from the points (≈1.5 km), never from the client or a default
    expect(Number(created.body.route.distanceMeters)).toBeGreaterThan(1400);
    expect(Number(created.body.route.distanceMeters)).toBeLessThan(1600);
    expect(created.body.route.surfaceTypes).toBeNull();
    expect((await call('POST', '/routes', { token: a, body: { name: 'x', polylinePoints: [{ latitude: 1, longitude: 1 }] } })).status).toBe(400);
    const id = created.body.route.id;
    expect((await call('GET', '/routes', { token: b })).body.routes.map((r: any) => r.id)).toContain(id);
    expect((await call('GET', `/routes/${id}`, { token: b })).status).toBe(200);
    const saved = await call('POST', `/routes/${id}/toggle-save`, { token: b });
    expect(saved.body.isSaved).toBe(true);
    expect((await call('GET', '/routes/saved', { token: b })).body.savedRoutes.length).toBe(1);
  });
});
