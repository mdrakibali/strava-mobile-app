import { asc, desc, eq } from 'drizzle-orm';
import { Hono } from 'hono';
import { athletes, segmentEfforts, segments } from '../db/schema';
import { getDb } from '../lib/db';
import { optionalAuth, requireAuth } from '../middleware/auth';
import { Env } from '../types';

export const segmentsRouter = new Hono<{ Bindings: Env }>();

// GET /api/v1/segments
segmentsRouter.get('/', optionalAuth, async (c) => {
  try {
    const sportType = c.req.query('sportType');
    const db = getDb(c.env);

    let query = db.select().from(segments);
    const results = sportType
      ? await db.select().from(segments).where(eq(segments.sportType, sportType))
      : await db.select().from(segments);

    return c.json({ segments: results });
  } catch (err: any) {
    console.error('Segments list error:', err);
    return c.json({ error: err.message || 'Failed to fetch segments' }, 500);
  }
});

// GET /api/v1/segments/:id
segmentsRouter.get('/:id', optionalAuth, async (c) => {
  try {
    const id = c.req.param('id');
    if (!id) {
      return c.json({ error: 'Segment ID is required' }, 400);
    }
    const db = getDb(c.env);

    const [segment] = await db.select().from(segments).where(eq(segments.id, id)).limit(1);

    if (!segment) {
      return c.json({ error: 'Segment not found' }, 404);
    }

    return c.json({ segment });
  } catch (err: any) {
    console.error('Segment get error:', err);
    return c.json({ error: err.message || 'Failed to fetch segment' }, 500);
  }
});

// GET /api/v1/segments/:id/leaderboard
segmentsRouter.get('/:id/leaderboard', optionalAuth, async (c) => {
  try {
    const id = c.req.param('id');
    if (!id) {
      return c.json({ error: 'Segment ID is required' }, 400);
    }
    const db = getDb(c.env);

    const efforts = await db
      .select({
        id: segmentEfforts.id,
        elapsedTimeSeconds: segmentEfforts.elapsedTimeSeconds,
        averageSpeedMps: segmentEfforts.averageSpeedMps,
        achievedAt: segmentEfforts.achievedAt,
        athlete: {
          id: athletes.id,
          displayName: athletes.displayName,
          username: athletes.username,
          avatarUrl: athletes.avatarUrl,
        },
      })
      .from(segmentEfforts)
      .innerJoin(athletes, eq(segmentEfforts.athleteId, athletes.id))
      .where(eq(segmentEfforts.segmentId, id))
      .orderBy(asc(segmentEfforts.elapsedTimeSeconds))
      .limit(50);

    const ranked = efforts.map((e, index) => {
      const mins = Math.floor(e.elapsedTimeSeconds / 60);
      const secs = e.elapsedTimeSeconds % 60;
      const speedKmh = e.averageSpeedMps ? (Number(e.averageSpeedMps) * 3.6).toFixed(1) : '0.0';
      return {
        rank: index + 1,
        id: e.id,
        name: e.athlete.displayName,
        username: e.athlete.username,
        avatar: e.athlete.avatarUrl,
        time: `${mins}:${secs < 10 ? '0' : ''}${secs}`,
        speed: `${speedKmh} km/h`,
        achievedAt: e.achievedAt,
      };
    });

    return c.json({ leaderboard: ranked });
  } catch (err: any) {
    console.error('Segment leaderboard error:', err);
    return c.json({ error: err.message || 'Failed to fetch leaderboard' }, 500);
  }
});

// POST /api/v1/segments
segmentsRouter.post('/', requireAuth, async (c) => {
  try {
    const user = c.get('user');
    const body = await c.req.json();

    if (!body.name || !body.polylinePoints || body.polylinePoints.length < 2) {
      return c.json({ error: 'Segment name and polylinePoints (min 2 coordinates) are required' }, 400);
    }

    const db = getDb(c.env);
    const first = body.polylinePoints[0];
    const last = body.polylinePoints[body.polylinePoints.length - 1];

    const newSegment = {
      id: `seg_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name: body.name,
      sportType: body.sportType || 'Run',
      distanceMeters: String(body.distanceMeters || 1000),
      averageGradePercent: String(body.averageGradePercent || 1.0),
      elevationGainMeters: body.elevationGainMeters || 10,
      startLatitude: String(first.latitude || first[1]),
      startLongitude: String(first.longitude || first[0]),
      endLatitude: String(last.latitude || last[1]),
      endLongitude: String(last.longitude || last[0]),
      polylinePoints: body.polylinePoints,
      creatorId: user.athleteId,
    };

    await db.insert(segments).values(newSegment);

    return c.json({ message: 'Segment created successfully', segment: newSegment }, 201);
  } catch (err: any) {
    console.error('Segment create error:', err);
    return c.json({ error: err.message || 'Failed to create segment' }, 500);
  }
});
