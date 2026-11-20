import { Hono } from 'hono';
import { z } from 'zod';
import { HttpError } from '../lib/http';
import { requireAuth } from '../middleware/auth';
import { PlaceDetailsService } from '../services/place-details.service';
import { PlacesService } from '../services/places.service';
import { Env } from '../types';

export const placesRouter = new Hono<{ Bindings: Env }>();

const querySchema = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
  sport: z.enum(['Run', 'Walk', 'Hike', 'Ride']).default('Run'),
  radius: z.coerce.number().int().min(500).max(15_000).default(5000),
});

/**
 * GET /places/nearby?lat=&lng=&sport=&radius=
 * Real OSM places near the caller's position (Photon, Overpass failover). Auth required so the
 * public providers can't be abused through us. Never returns invented places: provider failure
 * is a 503, nothing found is an empty list.
 */
placesRouter.get('/nearby', requireAuth, async (c) => {
  const parsed = querySchema.safeParse(c.req.query());
  if (!parsed.success) {
    throw new HttpError(400, 'validation_failed', 'lat and lng are required (sport: Run|Walk|Hike|Ride, radius 500–15000 m)', parsed.error.issues.map((i) => ({ path: i.path.join('.'), message: i.message })));
  }
  const { lat, lng, sport, radius } = parsed.data;
  let waitUntil: ((p: Promise<unknown>) => void) | undefined;
  try {
    const ctx = c.executionCtx;
    waitUntil = (p) => ctx.waitUntil(p);
  } catch {
    waitUntil = undefined;
  }
  return c.json(await new PlacesService().nearby(sport, lat, lng, radius, waitUntil));
});

/** GET /places/:type/:id — OSM details + a genuine Wikimedia Commons photo (or null) with attribution. */
placesRouter.get('/:type/:id', requireAuth, async (c) => {
  return c.json(await new PlaceDetailsService().details(c.req.param('type') ?? '', c.req.param('id') ?? ''));
});
