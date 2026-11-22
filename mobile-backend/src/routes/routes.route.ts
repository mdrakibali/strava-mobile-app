import { and, desc, eq, ilike } from 'drizzle-orm';
import { Hono } from 'hono';
import { athletes, routes, savedRoutes } from '../db/schema';
import { z } from 'zod';
import { haversineM } from '../../../shared/tracking/geo';
import { getDb } from '../lib/db';
import { HttpError, parseBody } from '../lib/http';
import { optionalAuth, requireAuth } from '../middleware/auth';
import { Env } from '../types';

export const routesRouter = new Hono<{ Bindings: Env }>();

// GET /api/v1/routes
routesRouter.get('/', optionalAuth, async (c) => {
  try {
    const sportType = c.req.query('sportType');
    const search = c.req.query('search');
    const db = getDb(c);

    let query = db
      .select({
        id: routes.id,
        name: routes.name,
        description: routes.description,
        sportType: routes.sportType,
        distanceMeters: routes.distanceMeters,
        elevationGainMeters: routes.elevationGainMeters,
        estimatedTimeSeconds: routes.estimatedTimeSeconds,
        polylinePoints: routes.polylinePoints,
        elevationProfile: routes.elevationProfile,
        surfaceTypes: routes.surfaceTypes,
        createdAt: routes.createdAt,
        creator: {
          id: athletes.id,
          displayName: athletes.displayName,
          avatarUrl: athletes.avatarUrl,
        },
      })
      .from(routes)
      .leftJoin(athletes, eq(routes.creatorId, athletes.id))
      .orderBy(desc(routes.createdAt));

    const results = await query;

    const filtered = results.filter((r) => {
      if (sportType && r.sportType !== sportType) return false;
      if (search && !r.name.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });

    return c.json({ routes: filtered });
  } catch (err: any) {
    console.error('Routes list error:', err);
    return c.json({ error: err.message || 'Failed to fetch routes' }, 500);
  }
});

// GET /api/v1/routes/saved
routesRouter.get('/saved', requireAuth, async (c) => {
  try {
    const user = c.get('user');
    const db = getDb(c);

    const saved = await db
      .select({
        route: routes,
        savedAt: savedRoutes.savedAt,
      })
      .from(savedRoutes)
      .innerJoin(routes, eq(savedRoutes.routeId, routes.id))
      .where(eq(savedRoutes.athleteId, user.athleteId))
      .orderBy(desc(savedRoutes.savedAt));

    return c.json({ savedRoutes: saved.map((s) => ({ ...s.route, isSaved: true })) });
  } catch (err: any) {
    console.error('Saved routes error:', err);
    return c.json({ error: err.message || 'Failed to fetch saved routes' }, 500);
  }
});

// GET /api/v1/routes/:id
routesRouter.get('/:id', optionalAuth, async (c) => {
  try {
    const id = c.req.param('id');
    if (!id) {
      return c.json({ error: 'Route ID is required' }, 400);
    }
    const db = getDb(c);

    const [route] = await db
      .select({
        id: routes.id,
        name: routes.name,
        description: routes.description,
        sportType: routes.sportType,
        distanceMeters: routes.distanceMeters,
        elevationGainMeters: routes.elevationGainMeters,
        estimatedTimeSeconds: routes.estimatedTimeSeconds,
        polylinePoints: routes.polylinePoints,
        elevationProfile: routes.elevationProfile,
        surfaceTypes: routes.surfaceTypes,
        createdAt: routes.createdAt,
        creator: {
          id: athletes.id,
          displayName: athletes.displayName,
          avatarUrl: athletes.avatarUrl,
        },
      })
      .from(routes)
      .leftJoin(athletes, eq(routes.creatorId, athletes.id))
      .where(eq(routes.id, id))
      .limit(1);

    if (!route) {
      return c.json({ error: 'Route not found' }, 404);
    }

    const user = c.get('user' as any) as { athleteId?: string } | undefined;
    let isSaved = false;
    if (user?.athleteId) {
      const [saved] = await db
        .select()
        .from(savedRoutes)
        .where(and(eq(savedRoutes.athleteId, user.athleteId), eq(savedRoutes.routeId, id)))
        .limit(1);
      isSaved = Boolean(saved);
    }

    return c.json({ route: { ...route, isSaved } });
  } catch (err: any) {
    console.error('Route get error:', err);
    return c.json({ error: err.message || 'Failed to fetch route' }, 500);
  }
});

// POST /api/v1/routes
const createRouteSchema = z.object({
  name: z.string().trim().min(1).max(120),
  description: z.string().trim().max(1000).optional(),
  sportType: z.enum(['Run', 'Walk', 'Hike', 'Ride']).default('Run'),
  polylinePoints: z
    .array(z.object({ latitude: z.number().min(-90).max(90), longitude: z.number().min(-180).max(180) }))
    .min(2)
    .max(5000),
  isPublic: z.boolean().optional(),
});

/** Typical moving speeds used only for the *estimated* time label (m/s). */
const TYPICAL_SPEED: Record<string, number> = { Run: 2.8, Walk: 1.3, Hike: 1.1, Ride: 5.5 };

// POST /api/v1/routes — distance is computed from the drawn points on the server; nothing is
// invented (the old handler defaulted to 5 km / 25 m climb / fake surface split / fake profile).
routesRouter.post('/', requireAuth, async (c) => {
  const user = c.get('user');
  const body = await parseBody(c, createRouteSchema);
  const pts = body.polylinePoints;
  let distance = 0;
  for (let i = 1; i < pts.length; i++) distance += haversineM(pts[i - 1].latitude, pts[i - 1].longitude, pts[i].latitude, pts[i].longitude);
  if (distance < 50) throw new HttpError(400, 'route_too_short', 'A route must be at least 50 m long');
  const newRoute = {
    id: `route_${crypto.randomUUID()}`,
    creatorId: user.athleteId,
    name: body.name,
    description: body.description || '',
    sportType: body.sportType,
    distanceMeters: distance.toFixed(2),
    elevationGainMeters: 0, // unknown: no elevation source for drawn routes
    estimatedTimeSeconds: Math.round(distance / TYPICAL_SPEED[body.sportType]),
    polylinePoints: pts,
    elevationProfile: null,
    surfaceTypes: null,
    isPublic: body.isPublic !== false,
  };
  const db = getDb(c);
  await db.insert(routes).values(newRoute);
  return c.json({ message: 'Route created successfully', route: newRoute }, 201);
});

// POST /api/v1/routes/:id/toggle-save
routesRouter.post('/:id/toggle-save', requireAuth, async (c) => {
  try {
    const user = c.get('user');
    const routeId = c.req.param('id');
    if (!routeId) {
      return c.json({ error: 'Route ID is required' }, 400);
    }
    const db = getDb(c);

    const existing = await db
      .select()
      .from(savedRoutes)
      .where(and(eq(savedRoutes.athleteId, user.athleteId), eq(savedRoutes.routeId, routeId)))
      .limit(1);

    if (existing.length > 0) {
      await db
        .delete(savedRoutes)
        .where(and(eq(savedRoutes.athleteId, user.athleteId), eq(savedRoutes.routeId, routeId)));
      return c.json({ message: 'Route removed from saved', isSaved: false });
    } else {
      await db.insert(savedRoutes).values({
        athleteId: user.athleteId,
        routeId,
      });
      return c.json({ message: 'Route saved successfully', isSaved: true });
    }
  } catch (err: any) {
    console.error('Toggle save route error:', err);
    return c.json({ error: err.message || 'Failed to toggle save route' }, 500);
  }
});
