import { beforeEach, describe, expect, it } from 'vitest';
import * as schema from '../db/schema';
import { AppDatabase } from '../lib/db';
import { periodStart } from '../routes/goals.route';
import { createTestApp, createTestDb, seedAthlete } from './harness';

let db: AppDatabase;
let call: ReturnType<typeof createTestApp>['call'];
let a: string;
let b: string;

const run = (id: string, athleteId: string, sportType: string, startTime: Date, meters: string) =>
  db.insert(schema.activities).values({
    id,
    athleteId,
    title: id,
    sportType,
    visibility: 'PUBLIC',
    startTime,
    distanceMeters: meters,
    movingTimeSeconds: 1500,
    elapsedTimeSeconds: 1600,
  });

beforeEach(async () => {
  ({ db } = await createTestDb());
  ({ call } = createTestApp(db));
  a = await seedAthlete(db, 'ath_a');
  b = await seedAthlete(db, 'ath_b');
});

describe('goals', () => {
  it('requires authentication for every method (no fallback athlete)', async () => {
    expect((await call('GET', '/goals')).status).toBe(401);
    expect((await call('POST', '/goals', { body: { title: 'x', targetValue: 5 } })).status).toBe(
      401
    );
    expect((await call('DELETE', '/goals/anything')).status).toBe(401);
  });

  it('keeps goals private to their owner and only the owner can delete', async () => {
    const created = await call('POST', '/goals', {
      token: a,
      body: { title: 'Weekly 20k', targetValue: 20 },
    });
    expect(created.status).toBe(201);
    const id = created.body.goal.id;
    expect((await call('GET', '/goals', { token: b })).body.goals).toHaveLength(0);
    expect((await call('DELETE', `/goals/${id}`, { token: b })).status).toBe(404);
    expect((await call('GET', '/goals', { token: a })).body.goals).toHaveLength(1);
    expect((await call('DELETE', `/goals/${id}`, { token: a })).status).toBe(200);
    expect((await call('GET', '/goals', { token: a })).body.goals).toHaveLength(0);
  });

  it('rejects invalid input', async () => {
    expect(
      (await call('POST', '/goals', { token: a, body: { title: '', targetValue: 5 } })).status
    ).toBe(400);
    expect(
      (await call('POST', '/goals', { token: a, body: { title: 'x', targetValue: -1 } })).status
    ).toBe(400);
    expect(
      (
        await call('POST', '/goals', {
          token: a,
          body: { title: 'x', targetValue: 5, period: 'DAILY' },
        })
      ).status
    ).toBe(400);
  });

  it("computes progress from the athlete's own activities of that sport inside the period", async () => {
    await call('POST', '/goals', {
      token: a,
      body: { title: 'Runs', targetValue: 20, period: 'WEEKLY', sportType: 'Run' },
    });
    await run('r1', 'ath_a', 'Run', new Date(), '5000');
    await run('r2', 'ath_a', 'Run', new Date(), '2500');
    await run('ride', 'ath_a', 'Ride', new Date(), '30000'); // other sport
    await run('old', 'ath_a', 'Run', new Date(Date.now() - 40 * 86_400_000), '9000'); // outside the week
    await run('theirs', 'ath_b', 'Run', new Date(), '8000'); // someone else
    const res = await call('GET', '/goals', { token: a });
    expect(res.body.goals[0]).toMatchObject({
      targetValue: 20,
      currentValue: 7.5,
      sportType: 'Run',
    });
  });

  it('period windows start on Monday / first of month / Jan 1 (UTC)', () => {
    const wed = new Date(Date.UTC(2026, 10, 18, 15)); // Wed 18 Nov 2026
    expect(periodStart('WEEKLY', wed).toISOString()).toBe('2026-11-16T00:00:00.000Z');
    expect(periodStart('WEEKLY', new Date(Date.UTC(2026, 10, 22, 1))).toISOString()).toBe(
      '2026-11-16T00:00:00.000Z'
    ); // Sunday
    expect(periodStart('MONTHLY', wed).toISOString()).toBe('2026-11-01T00:00:00.000Z');
    expect(periodStart('ANNUAL', wed).toISOString()).toBe('2026-01-01T00:00:00.000Z');
  });
});
