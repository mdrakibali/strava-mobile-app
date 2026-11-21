import { beforeEach, describe, expect, it } from 'vitest';
import * as schema from '../db/schema';
import { AppDatabase } from '../lib/db';
import { weekStartUtc } from '../services/social.service';
import { createTestApp, createTestDb, seedAthlete } from './harness';

let db: AppDatabase;
let call: ReturnType<typeof createTestApp>['call'];
let a: string; // owner
let b: string; // will follow a
let c: string; // stranger

const NOW = Date.now();
const insertActivity = (id: string, athleteId: string, visibility: string, startTime = new Date(NOW - 3600_000), distance = '5000') =>
  db.insert(schema.activities).values({
    id,
    athleteId,
    title: id,
    sportType: 'Run',
    visibility,
    startTime,
    distanceMeters: distance,
    movingTimeSeconds: 1500,
    elapsedTimeSeconds: 1600,
    elevationGainMeters: 20,
  });

beforeEach(async () => {
  ({ db } = await createTestDb());
  ({ call } = createTestApp(db));
  a = await seedAthlete(db, 'ath_a');
  b = await seedAthlete(db, 'ath_b');
  c = await seedAthlete(db, 'ath_c');
  await insertActivity('pub', 'ath_a', 'PUBLIC');
  await insertActivity('fol', 'ath_a', 'FOLLOWERS_ONLY');
  await insertActivity('priv', 'ath_a', 'ONLY_ME');
});

describe('follow / unfollow', () => {
  it('is idempotent, updates counts and notifies once', async () => {
    const f1 = await call('PUT', '/athletes/ath_a/follow', { token: b });
    const f2 = await call('PUT', '/athletes/ath_a/follow', { token: b });
    expect(f1.body).toMatchObject({ isFollowing: true, followersCount: 1, followingCount: 1 });
    expect(f2.body).toMatchObject({ isFollowing: true, followersCount: 1, followingCount: 1 });
    const notes = await call('GET', '/notifications', { token: a });
    expect(notes.body.notifications.filter((n: any) => n.actionType === 'FOLLOW')).toHaveLength(1);
    const u1 = await call('DELETE', '/athletes/ath_a/follow', { token: b });
    const u2 = await call('DELETE', '/athletes/ath_a/follow', { token: b });
    expect(u1.body).toMatchObject({ isFollowing: false, followersCount: 0, followingCount: 0 });
    expect(u2.status).toBe(200);
    expect((await call('PUT', '/athletes/ath_b/follow', { token: b })).status).toBe(422);
    expect((await call('PUT', '/athletes/nobody/follow', { token: b })).status).toBe(404);
    expect((await call('PUT', '/athletes/ath_a/follow')).status).toBe(401);
  });

  it('following unlocks followers-only activities in the feed', async () => {
    const before = await call('GET', '/feed?tab=following', { token: b });
    expect(before.body.feed).toHaveLength(0);
    await call('PUT', '/athletes/ath_a/follow', { token: b });
    const after = await call('GET', '/feed?tab=following', { token: b });
    expect(after.body.feed.map((x: any) => x.id).sort()).toEqual(['fol', 'pub']);
  });

  it('lists followers and following with viewer follow state and pagination', async () => {
    await call('PUT', '/athletes/ath_a/follow', { token: b });
    await call('PUT', '/athletes/ath_a/follow', { token: c });
    await call('PUT', '/athletes/ath_b/follow', { token: c });
    const followers = await call('GET', '/athletes/ath_a/followers?limit=1', { token: c });
    expect(followers.body.athletes).toHaveLength(1);
    expect(followers.body.hasNextPage).toBe(true);
    const next = await call('GET', `/athletes/ath_a/followers?limit=1&cursor=${followers.body.nextCursor}`, { token: c });
    const ids = [followers.body.athletes[0].id, next.body.athletes[0].id].sort();
    expect(ids).toEqual(['ath_b', 'ath_c']);
    const bRow = [...followers.body.athletes, ...next.body.athletes].find((x: any) => x.id === 'ath_b');
    expect(bRow.isFollowing).toBe(true); // c follows b
    const following = await call('GET', '/athletes/ath_c/following', { token: c });
    expect(following.body.athletes.map((x: any) => x.id).sort()).toEqual(['ath_a', 'ath_b']);
    expect(following.body.athletes[0].email).toBeUndefined();
  });
});

describe('kudos', () => {
  it('give, see state in feed, list givers, remove — all idempotent', async () => {
    await call('PUT', '/athletes/ath_a/follow', { token: b });
    expect((await call('PUT', '/activities/pub/kudos', { token: b })).body).toEqual({ hasKudos: true, kudosCount: 1 });
    expect((await call('POST', '/activities/pub/kudos', { token: b })).body).toEqual({ hasKudos: true, kudosCount: 1 });
    await call('PUT', '/activities/pub/kudos', { token: c });
    const feed = await call('GET', '/feed?tab=following', { token: b });
    const item = feed.body.feed.find((x: any) => x.id === 'pub');
    expect(item).toMatchObject({ hasKudos: true, kudosCount: 2 });
    const givers = await call('GET', '/activities/pub/kudos', { token: a });
    expect(givers.body.athletes.map((x: any) => x.id).sort()).toEqual(['ath_b', 'ath_c']);
    expect(givers.body.kudosCount).toBe(2);
    expect((await call('DELETE', '/activities/pub/kudos', { token: b })).body).toEqual({ hasKudos: false, kudosCount: 1 });
    expect((await call('DELETE', '/activities/pub/kudos', { token: b })).body).toEqual({ hasKudos: false, kudosCount: 1 });
    const detail = await call('GET', '/activities/pub', { token: b });
    expect(detail.body).toMatchObject({ hasKudos: false, kudosCount: 1 });
  });

  it('concurrent kudos from the same athlete count once', async () => {
    await Promise.all(Array.from({ length: 5 }, () => call('PUT', '/activities/pub/kudos', { token: b })));
    expect((await call('GET', '/activities/pub', { token: a })).body.kudosCount).toBe(1);
  });

  it('respects visibility for give, remove and list', async () => {
    expect((await call('PUT', '/activities/fol/kudos', { token: c })).status).toBe(404);
    expect((await call('DELETE', '/activities/priv/kudos', { token: b })).status).toBe(404);
    expect((await call('GET', '/activities/priv/kudos', { token: b })).status).toBe(404);
    expect((await call('PUT', '/activities/pub/kudos', { token: a })).body).toEqual({ hasKudos: true, kudosCount: 1 });
  });
});

describe('comments', () => {
  const add = async (token: string, content: string) => (await call('POST', '/activities/pub/comments', { token, body: { content } })).body.comment;

  it('add, list (paginated), edit by author only, delete by author or owner', async () => {
    const c1 = await add(b, 'Nice run!');
    const c2 = await add(c, 'Great pace');
    await add(b, 'Third');
    const page1 = await call('GET', '/activities/pub/comments?limit=2', { token: c });
    expect(page1.body.comments.map((x: any) => x.content)).toEqual(['Nice run!', 'Great pace']);
    const page2 = await call('GET', `/activities/pub/comments?limit=2&cursor=${page1.body.nextCursor}`, { token: c });
    expect(page2.body.comments.map((x: any) => x.content)).toEqual(['Third']);

    expect((await call('PATCH', `/activities/pub/comments/${c1.id}`, { token: c, body: { content: 'hijack' } })).status).toBe(403);
    expect((await call('PATCH', `/activities/pub/comments/${c1.id}`, { token: a, body: { content: 'owner edit' } })).status).toBe(403);
    const edited = await call('PATCH', `/activities/pub/comments/${c1.id}`, { token: b, body: { content: 'Nice run!!' } });
    expect(edited.body.comment).toMatchObject({ content: 'Nice run!!' });
    expect(edited.body.comment.updatedAt).toBeTruthy();

    expect((await call('DELETE', `/activities/pub/comments/${c2.id}`, { token: b })).status).toBe(403); // not author, not owner
    expect((await call('DELETE', `/activities/pub/comments/${c2.id}`, { token: a })).body).toEqual({ commentsCount: 2 }); // owner
    expect((await call('DELETE', `/activities/pub/comments/${c1.id}`, { token: b })).body).toEqual({ commentsCount: 1 }); // author
    expect((await call('DELETE', `/activities/pub/comments/${c1.id}`, { token: b })).status).toBe(404);
  });

  it('validates content and visibility', async () => {
    expect((await call('POST', '/activities/pub/comments', { token: b, body: { content: '   ' } })).status).toBe(400);
    expect((await call('POST', '/activities/pub/comments', { token: b, body: { content: 'x'.repeat(1001) } })).status).toBe(400);
    expect((await call('GET', '/activities/priv/comments', { token: b })).status).toBe(404);
    const c1 = await add(b, 'hi');
    // a comment id from another activity is not addressable through this one
    expect((await call('DELETE', `/activities/fol/comments/${c1.id}`, { token: a })).status).toBe(404);
  });
});

describe('stats', () => {
  it('are policy-aware: private activities never leak into totals', async () => {
    const own = await call('GET', '/athletes/ath_a/stats', { token: a });
    const stranger = await call('GET', '/athletes/ath_a/stats', { token: c });
    expect(own.body.activityCount).toBe(3);
    expect(stranger.body.activityCount).toBe(1);
    expect(stranger.body.bySport[0].allTime.distanceMeters).toBe(5000);
    const thisWeek = own.body.weeks[11].bySport.Run;
    expect(thisWeek.count).toBe(3);
    expect(own.body.weeks).toHaveLength(12);
  });

  it('week buckets start on Monday (UTC)', () => {
    expect(new Date(weekStartUtc(Date.UTC(2026, 10, 20, 12))).toISOString()).toBe('2026-11-16T00:00:00.000Z');
    expect(new Date(weekStartUtc(Date.UTC(2026, 10, 16, 0))).toISOString()).toBe('2026-11-16T00:00:00.000Z');
  });
});

describe('feed refresh semantics', () => {
  it('returns fresh data on every request with no-store caching and no duplicates across pages', async () => {
    for (let i = 0; i < 5; i++) await insertActivity(`p${i}`, 'ath_a', 'PUBLIC', new Date(NOW - 7200_000));
    const p1 = await call('GET', '/feed?tab=following&limit=4', { token: a });
    await insertActivity('newest', 'ath_a', 'PUBLIC', new Date(NOW)); // arrives between page loads
    const p2 = await call('GET', `/feed?tab=following&limit=4&cursor=${p1.body.nextCursor}`, { token: a });
    const ids = [...p1.body.feed, ...p2.body.feed].map((x: any) => x.id);
    expect(new Set(ids).size).toBe(ids.length);
    const refreshed = await call('GET', '/feed?tab=following&limit=4', { token: a });
    expect(refreshed.body.feed[0].id).toBe('newest');
    expect(refreshed.headers.get('cache-control')).toBe('no-store');
  });
});
