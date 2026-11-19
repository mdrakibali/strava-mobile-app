import { Hono } from 'hono';
import { and, desc, eq, sql } from 'drizzle-orm';
import { athletes, challengeParticipants, challenges } from '../db/schema';
import { getDb } from '../lib/db';
import { optionalAuth, requireAuth } from '../middleware/auth';
import { Env } from '../types';

export const challengesRouter = new Hono<{ Bindings: Env }>();

// GET /api/v1/challenges - List challenges
challengesRouter.get('/', optionalAuth, async (c) => {
  const db = getDb(c.env.DATABASE_URL);
  const currentUser = c.get('user');

  const list = await db
    .select()
    .from(challenges)
    .orderBy(desc(challenges.startDate));

  const enriched = await Promise.all(
    list.map(async (ch) => {
      // Participant count
      const [countRow] = await db
        .select({ count: sql<number>`count(*)` })
        .from(challengeParticipants)
        .where(eq(challengeParticipants.challengeId, ch.id));

      let isJoined = false;
      let currentMeters = 0;
      let isCompleted = false;

      if (currentUser) {
        const [participation] = await db
          .select({
            currentMeters: challengeParticipants.currentMeters,
            isCompleted: challengeParticipants.isCompleted,
          })
          .from(challengeParticipants)
          .where(
            and(
              eq(challengeParticipants.challengeId, ch.id),
              eq(challengeParticipants.athleteId, currentUser.athleteId)
            )
          )
          .limit(1);

        if (participation) {
          isJoined = true;
          currentMeters = Number(participation.currentMeters);
          isCompleted = participation.isCompleted;
        }
      }

      const now = new Date();
      const end = new Date(ch.endDate);
      const diffMs = end.getTime() - now.getTime();
      const daysRemaining = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));

      return {
        ...ch,
        targetMeters: Number(ch.targetMeters),
        participantsCount: Number(countRow?.count || 0),
        isJoined,
        currentMeters,
        isCompleted,
        daysRemaining,
      };
    })
  );

  return c.json({ challenges: enriched, count: enriched.length });
});

// GET /api/v1/challenges/:id - Challenge details + participant leaderboard
challengesRouter.get('/:id', optionalAuth, async (c) => {
  const db = getDb(c.env.DATABASE_URL);
  const id = c.req.param('id');
  const currentUser = c.get('user');

  const [ch] = await db.select().from(challenges).where(eq(challenges.id, id)).limit(1);

  if (!ch) {
    return c.json({ error: 'Challenge not found' }, 404);
  }

  // Fetch participant leaderboard
  const participants = await db
    .select({
      athleteId: challengeParticipants.athleteId,
      currentMeters: sql<number>`CAST(${challengeParticipants.currentMeters} AS DOUBLE PRECISION)`,
      isCompleted: challengeParticipants.isCompleted,
      completedAt: challengeParticipants.completedAt,
      joinedAt: challengeParticipants.joinedAt,
      displayName: athletes.displayName,
      username: athletes.username,
      avatarUrl: athletes.avatarUrl,
      city: athletes.city,
    })
    .from(challengeParticipants)
    .innerJoin(athletes, eq(challengeParticipants.athleteId, athletes.id))
    .where(eq(challengeParticipants.challengeId, id))
    .orderBy(desc(challengeParticipants.currentMeters))
    .limit(50);

  const userParticipation = currentUser
    ? participants.find((p) => p.athleteId === currentUser.athleteId)
    : null;

  return c.json({
    challenge: {
      ...ch,
      targetMeters: Number(ch.targetMeters),
      participantsCount: participants.length,
      isJoined: Boolean(userParticipation),
      userProgress: userParticipation
        ? {
            currentMeters: userParticipation.currentMeters,
            isCompleted: userParticipation.isCompleted,
            completedAt: userParticipation.completedAt,
          }
        : null,
    },
    leaderboard: participants,
  });
});

// POST /api/v1/challenges/:id/join - Join or leave challenge
challengesRouter.post('/:id/join', requireAuth, async (c) => {
  const db = getDb(c.env.DATABASE_URL);
  const id = c.req.param('id');
  const currentUser = c.get('user');

  const [ch] = await db.select().from(challenges).where(eq(challenges.id, id)).limit(1);

  if (!ch) {
    return c.json({ error: 'Challenge not found' }, 404);
  }

  const [existing] = await db
    .select()
    .from(challengeParticipants)
    .where(
      and(
        eq(challengeParticipants.challengeId, id),
        eq(challengeParticipants.athleteId, currentUser.athleteId)
      )
    )
    .limit(1);

  let isJoined = false;
  if (existing) {
    await db
      .delete(challengeParticipants)
      .where(
        and(
          eq(challengeParticipants.challengeId, id),
          eq(challengeParticipants.athleteId, currentUser.athleteId)
        )
      );
    isJoined = false;
  } else {
    await db.insert(challengeParticipants).values({
      challengeId: id,
      athleteId: currentUser.athleteId,
      currentMeters: '0',
      isCompleted: false,
    });
    isJoined = true;
  }

  const [countRow] = await db
    .select({ count: sql<number>`count(*)` })
    .from(challengeParticipants)
    .where(eq(challengeParticipants.challengeId, id));

  return c.json({
    message: isJoined ? 'Joined challenge!' : 'Left challenge',
    isJoined,
    participantsCount: Number(countRow?.count || 0),
  });
});

// POST /api/v1/challenges - Create new challenge
challengesRouter.post('/', requireAuth, async (c) => {
  const db = getDb(c.env.DATABASE_URL);
  const currentUser = c.get('user');
  const body = await c.req.json();
  const { title, description, sportType = 'Run', targetMeters, startDate, endDate, badgeUrl } = body;

  if (!title || !targetMeters) {
    return c.json({ error: 'Title and target distance (meters) are required' }, 400);
  }

  const challengeId = `ch_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

  const [newChallenge] = await db
    .insert(challenges)
    .values({
      id: challengeId,
      title: title.trim(),
      description: description || null,
      sportType,
      targetMeters: String(targetMeters),
      badgeUrl: badgeUrl || 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=300',
      startDate: startDate ? new Date(startDate) : new Date(),
      endDate: endDate
        ? new Date(endDate)
        : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days default
      creatorId: currentUser.athleteId,
    })
    .returning();

  // Auto-join creator
  await db.insert(challengeParticipants).values({
    challengeId,
    athleteId: currentUser.athleteId,
    currentMeters: '0',
    isCompleted: false,
  });

  return c.json({ message: 'Challenge created', challenge: newChallenge }, 201);
});

