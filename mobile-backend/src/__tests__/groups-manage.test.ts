import { beforeEach, describe, expect, it } from 'vitest';
import * as schema from '../db/schema';
import { AppDatabase } from '../lib/db';
import { createTestApp, createTestDb, seedAthlete } from './harness';

let db: AppDatabase;
let call: ReturnType<typeof createTestApp>['call'];
let a: string; // creator / owner
let b: string; // member
let c: string; // stranger

beforeEach(async () => {
  ({ db } = await createTestDb());
  ({ call } = createTestApp(db));
  a = await seedAthlete(db, 'ath_a');
  b = await seedAthlete(db, 'ath_b');
  c = await seedAthlete(db, 'ath_c');
});

const day = 86_400_000;

describe('clubs: manage', () => {
  it('invents no city, country or photo when none was given', async () => {
    const res = await call('POST', '/clubs', { token: a, body: { name: 'Quiet Club' } });
    expect(res.status).toBe(201);
    expect(res.body.club).toMatchObject({ city: null, country: null, avatarUrl: null, bannerUrl: null, sportType: 'Run' });
  });

  it('only the owner can edit or delete; others get 403, unknown ids 404', async () => {
    const id = (await call('POST', '/clubs', { token: a, body: { name: 'Owners' } })).body.club.id;
    await call('POST', `/clubs/${id}/join`, { token: b, body: { join: true } });

    expect((await call('PATCH', `/clubs/${id}`, { token: b, body: { name: 'Hacked' } })).status).toBe(403);
    expect((await call('DELETE', `/clubs/${id}`, { token: b })).status).toBe(403);
    expect((await call('PATCH', `/clubs/${id}`, { token: a, body: { name: 'Renamed', city: 'Dhaka' } })).body.club).toMatchObject({ name: 'Renamed', city: 'Dhaka' });
    expect((await call('GET', `/clubs/${id}`, { token: c })).body.club.name).toBe('Renamed');
    expect((await call('PATCH', '/clubs/nope', { token: a, body: { name: 'xx' } })).status).toBe(404);
    expect((await call('PATCH', `/clubs/${id}`, { token: a, body: { name: 'x' } })).status).toBe(400);

    expect((await call('DELETE', `/clubs/${id}`, { token: a })).status).toBe(200);
    expect((await call('GET', `/clubs/${id}`, { token: a })).status).toBe(404);
    expect((await call('GET', '/clubs', { token: b })).body.clubs.map((x: any) => x.id)).not.toContain(id);
  });

  it('join is idempotent when the desired state is sent, and 404s on an unknown club', async () => {
    const id = (await call('POST', '/clubs', { token: a, body: { name: 'Idem' } })).body.club.id;
    const j1 = await call('POST', `/clubs/${id}/join`, { token: b, body: { join: true } });
    const j2 = await call('POST', `/clubs/${id}/join`, { token: b, body: { join: true } });
    expect(j1.body).toMatchObject({ isMember: true, membersCount: 2 });
    expect(j2.body).toMatchObject({ isMember: true, membersCount: 2 });
    const l1 = await call('POST', `/clubs/${id}/join`, { token: b, body: { join: false } });
    const l2 = await call('POST', `/clubs/${id}/join`, { token: b, body: { join: false } });
    expect(l1.body).toMatchObject({ isMember: false, membersCount: 1 });
    expect(l2.body).toMatchObject({ isMember: false, membersCount: 1 });
    expect((await call('POST', '/clubs/nope/join', { token: b })).status).toBe(404);
  });

  it('the owner cannot leave (409)', async () => {
    const id = (await call('POST', '/clubs', { token: a, body: { name: 'Stay' } })).body.club.id;
    const res = await call('POST', `/clubs/${id}/join`, { token: a, body: { join: false } });
    expect(res.status).toBe(409);
    expect(res.body.code).toBe('owner_cannot_leave');
  });

  it('the weekly leaderboard never counts private activities', async () => {
    const id = (await call('POST', '/clubs', { token: a, body: { name: 'Board' } })).body.club.id;
    const base = { athleteId: 'ath_a', sportType: 'Run', startTime: new Date(), movingTimeSeconds: 600, elapsedTimeSeconds: 600 };
    await db.insert(schema.activities).values([
      { ...base, id: 'pub', title: 'pub', visibility: 'PUBLIC', distanceMeters: '3000' },
      { ...base, id: 'priv', title: 'priv', visibility: 'ONLY_ME', distanceMeters: '7000' },
    ]);
    const board = (await call('GET', `/clubs/${id}`, { token: b })).body.weeklyLeaderboard;
    expect(board.find((r: any) => r.athleteId === 'ath_a').distanceMeters).toBe(3000);
  });
});

describe('challenges: manage', () => {
  const body = () => ({ title: 'Nov 50k', targetMeters: 50000, sportType: 'Run', startDate: new Date(Date.now() - day).toISOString(), endDate: new Date(Date.now() + 20 * day).toISOString() });

  it('rejects an end date before the start, and invents no badge', async () => {
    const bad = await call('POST', '/challenges', { token: a, body: { ...body(), endDate: new Date(Date.now() - 5 * day).toISOString() } });
    expect(bad.status).toBe(400);
    const ok = await call('POST', '/challenges', { token: a, body: body() });
    expect(ok.body.challenge.badgeUrl).toBeNull();
  });

  it('only the creator can edit or delete; join is idempotent and counts stay right', async () => {
    const id = (await call('POST', '/challenges', { token: a, body: body() })).body.challenge.id;
    const j1 = await call('POST', `/challenges/${id}/join`, { token: b, body: { join: true } });
    const j2 = await call('POST', `/challenges/${id}/join`, { token: b, body: { join: true } });
    expect(j1.body).toMatchObject({ isJoined: true, participantsCount: 2 });
    expect(j2.body).toMatchObject({ isJoined: true, participantsCount: 2 });

    expect((await call('PATCH', `/challenges/${id}`, { token: b, body: { title: 'Mine now' } })).status).toBe(403);
    expect((await call('DELETE', `/challenges/${id}`, { token: b })).status).toBe(403);
    const up = await call('PATCH', `/challenges/${id}`, { token: a, body: { targetMeters: 10000 } });
    expect(Number(up.body.challenge.targetMeters)).toBe(10000);

    expect((await call('POST', `/challenges/${id}/join`, { token: b, body: { join: false } })).body).toMatchObject({ isJoined: false, participantsCount: 1 });
    expect((await call('POST', '/challenges/nope/join', { token: b })).status).toBe(404);

    expect((await call('DELETE', `/challenges/${id}`, { token: a })).status).toBe(200);
    expect((await call('GET', `/challenges/${id}`, { token: a })).status).toBe(404);
  });

  it('editing the target recomputes participants\' completion from real activities', async () => {
    const id = (await call('POST', '/challenges', { token: a, body: body() })).body.challenge.id;
    await call('POST', '/activities', {
      token: a,
      body: { title: 'Run', sportType: 'Run', distanceMeters: 6000, movingTimeSeconds: 1800, startTime: new Date().toISOString() },
    });
    let me = (await call('GET', `/challenges/${id}`, { token: a })).body.leaderboard[0];
    expect(me.isCompleted).toBe(false);
    await call('PATCH', `/challenges/${id}`, { token: a, body: { targetMeters: 5000 } });
    me = (await call('GET', `/challenges/${id}`, { token: a })).body.leaderboard[0];
    expect(me.isCompleted).toBe(true);
  });
});

describe('events: manage', () => {
  const ev = () => ({ title: 'Sat run', sportType: 'Run', eventDate: new Date(Date.now() + 3 * day).toISOString(), meetingPoint: 'Park' });

  it('RSVP validates the status, 404s on unknown events and is idempotent', async () => {
    const id = (await call('POST', '/events', { token: a, body: ev() })).body.event.id;
    expect((await call('POST', `/events/${id}/rsvp`, { token: b, body: { status: 'bogus' } })).status).toBe(400);
    expect((await call('POST', '/events/nope/rsvp', { token: b, body: { status: 'GOING' } })).status).toBe(404);
    const r1 = await call('POST', `/events/${id}/rsvp`, { token: b, body: { status: 'GOING' } });
    const r2 = await call('POST', `/events/${id}/rsvp`, { token: b, body: { status: 'GOING' } });
    expect(r1.body).toMatchObject({ status: 'GOING', attendeesCount: 2 });
    expect(r2.body).toMatchObject({ status: 'GOING', attendeesCount: 2 });
    const detail = await call('GET', `/events/${id}`, { token: b });
    expect(detail.body.attendees.find((x: any) => x.athleteId === 'ath_b').status).toBe('GOING');
    expect((await call('POST', `/events/${id}/rsvp`, { token: b, body: { status: 'DECLINED' } })).body).toMatchObject({ status: null, attendeesCount: 1 });
  });

  it('list invents no club name or pace text and counts per event', async () => {
    const id = (await call('POST', '/events', { token: a, body: ev() })).body.event.id;
    await call('POST', `/events/${id}/rsvp`, { token: b, body: { status: 'GOING' } });
    const e = (await call('GET', '/events', { token: c })).body.events.find((x: any) => x.id === id);
    expect(e).toMatchObject({ clubName: null, paceDescription: null, attendeesCount: 2, rsvpStatus: null });
  });

  it('rejects an unknown clubId on create', async () => {
    expect((await call('POST', '/events', { token: a, body: { ...ev(), clubId: 'clb_missing' } })).status).toBe(400);
  });

  it('only the creator can edit or delete; delete removes it for everyone', async () => {
    const id = (await call('POST', '/events', { token: a, body: ev() })).body.event.id;
    expect((await call('PATCH', `/events/${id}`, { token: b, body: { title: 'x' } })).status).toBe(403);
    expect((await call('DELETE', `/events/${id}`, { token: b })).status).toBe(403);
    const up = await call('PATCH', `/events/${id}`, { token: a, body: { title: 'Sun run', meetingPoint: 'Lake', distanceMeters: 8000 } });
    expect(up.body.event).toMatchObject({ title: 'Sun run', meetingPoint: 'Lake' });
    expect((await call('GET', `/events/${id}`, { token: b })).body.event.title).toBe('Sun run');
    expect((await call('PATCH', '/events/nope', { token: a, body: { title: 'x' } })).status).toBe(404);
    expect((await call('DELETE', `/events/${id}`, { token: a })).status).toBe(200);
    expect((await call('GET', `/events/${id}`, { token: b })).status).toBe(404);
    expect((await call('GET', '/events', { token: b })).body.events.map((x: any) => x.id)).not.toContain(id);
  });
});
