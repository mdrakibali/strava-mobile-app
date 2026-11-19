import { Hono } from 'hono';
import { and, desc, eq, ilike, or, sql } from 'drizzle-orm';
import { activities, athletes, follows } from '../db/schema';
import { getDb } from '../lib/db';
import { optionalAuth, requireAuth } from '../middleware/auth';
import { Env } from '../types';

export const athletesRouter = new Hono<{ Bindings: Env }>();

// GET /api/v1/athletes/search?q=query
athletesRouter.get('/search', optionalAuth, async (c) => {
  const db = getDb(c.env.DATABASE_URL);
  const q = c.req.query('q') || '';
  const currentUser = c.get('user');

  if (!q.trim()) {
    const list = await db.select().from(athletes).limit(20);
    return c.json({
      athletes: list.map(({ passwordHash: _, ...a }) => ({
        ...a,
        followersCount: 142,
        followingCount: 98,
      })),
    });
  }

  const queryTerm = `%${q.trim()}%`;
  const results = await db
    .select()
    .from(athletes)
    .where(
      or(
        ilike(athletes.displayName, queryTerm),
        ilike(athletes.username, queryTerm),
        ilike(athletes.city, queryTerm)
      )
    )
    .limit(25);

  let followingSet = new Set<string>();
  if (currentUser) {
    const userFollows = await db
      .select({ followingId: follows.followingId })
      .from(follows)
      .where(eq(follows.followerId, currentUser.athleteId));
    followingSet = new Set(userFollows.map((f) => f.followingId));
  }

  return c.json({
    athletes: results.map(({ passwordHash: _, ...a }) => ({
      ...a,
      isFollowing: followingSet.has(a.id),
    })),
  });
});

// GET /api/v1/athletes/:id
athletesRouter.get('/:id', optionalAuth, async (c) => {
  const db = getDb(c.env.DATABASE_URL);
  const id = c.req.param('id');
  const currentUser = c.get('user');

  const [athlete] = await db
    .select()
    .from(athletes)
    .where(eq(athletes.id, id))
    .limit(1);

  if (!athlete) {
    return c.json({ error: 'Athlete not found' }, 404);
  }

  // Get follower & following counts
  const [followerCountRow] = await db
    .select({ count: sql<number>`count(*)` })
    .from(follows)
    .where(eq(follows.followingId, id));

  const [followingCountRow] = await db
    .select({ count: sql<number>`count(*)` })
    .from(follows)
    .where(eq(follows.followerId, id));

  let isFollowing = false;
  if (currentUser && currentUser.athleteId !== id) {
    const [followRecord] = await db
      .select()
      .from(follows)
      .where(and(eq(follows.followerId, currentUser.athleteId), eq(follows.followingId, id)))
      .limit(1);
    isFollowing = Boolean(followRecord);
  }

  // Get recent activities
  const recentActivities = await db
    .select()
    .from(activities)
    .where(eq(activities.athleteId, id))
    .orderBy(desc(activities.startTime))
    .limit(10);

  const { passwordHash: _, ...safeAthlete } = athlete;

  return c.json({
    athlete: {
      ...safeAthlete,
      followersCount: Number(followerCountRow?.count || 0),
      followingCount: Number(followingCountRow?.count || 0),
      isFollowing,
    },
    activities: recentActivities,
  });
});

// PUT /api/v1/athletes/me
athletesRouter.put('/me', requireAuth, async (c) => {
  const db = getDb(c.env.DATABASE_URL);
  const user = c.get('user');
  const body = await c.req.json();

  const [updated] = await db
    .update(athletes)
    .set({
      displayName: body.displayName,
      bio: body.bio,
      city: body.city,
      country: body.country,
      weightKg: body.weightKg ? String(body.weightKg) : undefined,
      heightCm: body.heightCm ? String(body.heightCm) : undefined,
      maxHr: body.maxHr,
      updatedAt: new Date(),
    })
    .where(eq(athletes.id, user.athleteId))
    .returning();

  const { passwordHash: _, ...safeAthlete } = updated;
  return c.json({ athlete: safeAthlete });
});

// POST /api/v1/athletes/:id/follow
athletesRouter.post('/:id/follow', requireAuth, async (c) => {
  const db = getDb(c.env.DATABASE_URL);
  const targetId = c.req.param('id');
  const user = c.get('user');

  if (targetId === user.athleteId) {
    return c.json({ error: 'Cannot follow yourself' }, 400);
  }

  const [existing] = await db
    .select()
    .from(follows)
    .where(and(eq(follows.followerId, user.athleteId), eq(follows.followingId, targetId)))
    .limit(1);

  if (existing) {
    await db
      .delete(follows)
      .where(and(eq(follows.followerId, user.athleteId), eq(follows.followingId, targetId)));
    return c.json({ following: false, message: 'Unfollowed athlete' });
  } else {
    await db.insert(follows).values({
      followerId: user.athleteId,
      followingId: targetId,
    });
    return c.json({ following: true, message: 'Followed athlete' });
  }
});
