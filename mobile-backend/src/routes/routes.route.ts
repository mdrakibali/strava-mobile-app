import { and, desc, eq, ilike } from 'drizzle-orm';
import { Hono } from 'hono';
import { athletes, routes, savedRoutes } from '../db/schema';
import { getDb } from '../lib/db';
import { optionalAuth, requireAuth } from '../middleware/auth';
import { Env } from '../types';

export const routesRouter = new Hono<{ Bindings: Env }>();

// GET /api/v1/routes
routesRouter.get('/', optionalAuth, async (c) => {
  try {
    const sportType = c.req.query('sportType');
    const search = c.req.query('search');
    const db = getDb(c.env);

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
    const db = getDb(c.env);

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
    const db = getDb(c.env);

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

    return c.json({ route });
  } catch (err: any) {
    console.error('Route get error:', err);
    return c.json({ error: err.message || 'Failed to fetch route' }, 500);
  }
});

// POST /api/v1/routes
routesRouter.post('/', requireAuth, async (c) => {
  try {
    const user = c.get('user');
    const body = await c.req.json();

    if (!body.name || !body.polylinePoints || body.polylinePoints.length < 2) {
      return c.json({ error: 'Route name and polylinePoints (min 2 coordinates) are required' }, 400);
    }

    const db = getDb(c.env);
    const newRoute = {
      id: `route_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      creatorId: user.athleteId,
      name: body.name,
      description: body.description || '',
      sportType: body.sportType || 'Run',
      distanceMeters: String(body.distanceMeters || 5000),
      elevationGainMeters: body.elevationGainMeters || 25,
      estimatedTimeSeconds: body.estimatedTimeSeconds || 1800,
      polylinePoints: body.polylinePoints,
      elevationProfile: body.elevationProfile || [10, 15, 20, 15, 10],
      surfaceTypes: body.surfaceTypes || { paved: 85, gravel: 15, dirt: 0 },
      isPublic: body.isPublic !== false,
    };

    await db.insert(routes).values(newRoute);

    return c.json({ message: 'Route created successfully', route: newRoute }, 201);
  } catch (err: any) {
    console.error('Route create error:', err);
    return c.json({ error: err.message || 'Failed to create route' }, 500);
  }
});

// POST /api/v1/routes/:id/toggle-save
routesRouter.post('/:id/toggle-save', requireAuth, async (c) => {
  try {
    const user = c.get('user');
    const routeId = c.req.param('id');
    if (!routeId) {
      return c.json({ error: 'Route ID is required' }, 400);
    }
    const db = getDb(c.env);

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
