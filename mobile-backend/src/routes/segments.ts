import { Hono } from 'hono';
import { and, asc, desc, eq, ilike, or, sql } from 'drizzle-orm';
import { activities, athletes, segmentEfforts, segments } from '../db/schema';
import { getDb } from '../lib/db';
import { optionalAuth, requireAuth } from '../middleware/auth';
import { Env } from '../types';

export const segmentsRouter = new Hono<{ Bindings: Env }>();

// GET /api/v1/segments - List segments
segmentsRouter.get('/', optionalAuth, async (c) => {
  const db = getDb(c.env.DATABASE_URL);
  const q = c.req.query('q');
  const sportType = c.req.query('sportType');

  let baseQuery = db.select().from(segments);

  if (q && q.trim()) {
    baseQuery = baseQuery.where(ilike(segments.name, `%${q.trim()}%`)) as any;
  }

  const list = await baseQuery.limit(30);

  const formatted = list.map((s) => ({
    ...s,
    distanceMeters: Number(s.distanceMeters),
    averageGradePercent: s.averageGradePercent ? Number(s.averageGradePercent) : null,
    startLatitude: Number(s.startLatitude),
    startLongitude: Number(s.startLongitude),
    endLatitude: Number(s.endLatitude),
    endLongitude: Number(s.endLongitude),
  }));

  return c.json({ segments: formatted, count: formatted.length });
});

// GET /api/v1/segments/:id - Segment detail with KOM leaderboard and user PR
segmentsRouter.get('/:id', optionalAuth, async (c) => {
  const db = getDb(c.env.DATABASE_URL);
  const id = c.req.param('id');
  const currentUser = c.get('user');

  const [segment] = await db.select().from(segments).where(eq(segments.id, id)).limit(1);

  if (!segment) {
    return c.json({ error: 'Segment not found' }, 404);
  }

  // Fetch top 10 fastest efforts (KOM / QOM leaderboard)
  const efforts = await db
    .select({
      id: segmentEfforts.id,
      elapsedTimeSeconds: segmentEfforts.elapsedTimeSeconds,
      averageSpeedMps: segmentEfforts.averageSpeedMps,
      averageHeartRate: segmentEfforts.averageHeartRate,
      achievedAt: segmentEfforts.achievedAt,
      athlete: {
        id: athletes.id,
        displayName: athletes.displayName,
        username: athletes.username,
        avatarUrl: athletes.avatarUrl,
        city: athletes.city,
      },
    })
    .from(segmentEfforts)
    .innerJoin(athletes, eq(segmentEfforts.athleteId, athletes.id))
    .where(eq(segmentEfforts.segmentId, id))
    .orderBy(asc(segmentEfforts.elapsedTimeSeconds))
    .limit(20);

  // User's personal record (PR)
  let userPr = null;
  if (currentUser) {
    const [pr] = await db
      .select({
        id: segmentEfforts.id,
        elapsedTimeSeconds: segmentEfforts.elapsedTimeSeconds,
        averageSpeedMps: segmentEfforts.averageSpeedMps,
        achievedAt: segmentEfforts.achievedAt,
      })
      .from(segmentEfforts)
      .where(
        and(
          eq(segmentEfforts.segmentId, id),
          eq(segmentEfforts.athleteId, currentUser.athleteId)
        )
      )
      .orderBy(asc(segmentEfforts.elapsedTimeSeconds))
      .limit(1);

    if (pr) userPr = pr;
  }

  return c.json({
    segment: {
      ...segment,
      distanceMeters: Number(segment.distanceMeters),
      averageGradePercent: segment.averageGradePercent ? Number(segment.averageGradePercent) : null,
      startLatitude: Number(segment.startLatitude),
      startLongitude: Number(segment.startLongitude),
      endLatitude: Number(segment.endLatitude),
      endLongitude: Number(segment.endLongitude),
    },
    leaderboard: efforts,
    userPr,
    kom: efforts[0] || null,
  });
});

// POST /api/v1/segments - Create segment
segmentsRouter.post('/', requireAuth, async (c) => {
  const db = getDb(c.env.DATABASE_URL);
  const currentUser = c.get('user');
  const body = await c.req.json();

  const {
    name,
    sportType = 'Run',
    distanceMeters,
    averageGradePercent = 0,
    elevationGainMeters = 0,
    startLatitude,
    startLongitude,
    endLatitude,
    endLongitude,
    polylinePoints = [],
  } = body;

  if (!name || !distanceMeters || !startLatitude || !startLongitude) {
    return c.json({ error: 'Name, distance, and coordinates are required' }, 400);
  }

  const segmentId = `seg_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

  const [newSegment] = await db
    .insert(segments)
    .values({
      id: segmentId,
      name: name.trim(),
      sportType,
      distanceMeters: String(distanceMeters),
      averageGradePercent: String(averageGradePercent),
      elevationGainMeters,
      startLatitude: String(startLatitude),
      startLongitude: String(startLongitude),
      endLatitude: String(endLatitude || startLatitude),
      endLongitude: String(endLongitude || startLongitude),
      polylinePoints,
      creatorId: currentUser.athleteId,
    })
    .returning();

  return c.json({ message: 'Segment created', segment: newSegment }, 201);
});
