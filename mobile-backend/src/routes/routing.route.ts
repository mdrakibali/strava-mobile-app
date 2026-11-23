import { Hono } from 'hono';
import { z } from 'zod';
import { parseBody } from '../lib/http';
import { requireAuth } from '../middleware/auth';
import { RoutingService } from '../services/routing.service';
import { Env } from '../types';

export const routingRouter = new Hono<{ Bindings: Env }>();

const point = z.object({ lat: z.number().min(-90).max(90), lng: z.number().min(-180).max(180) });
const planSchema = z.object({
  sport: z.enum(['Run', 'Walk', 'Hike', 'Ride']),
  from: point,
  to: point,
});

/** POST /routing/plan — real routes over mapped ways (Valhalla) with DEM elevation, 1–3 alternatives. */
routingRouter.post('/plan', requireAuth, async (c) => {
  const body = await parseBody(c, planSchema);
  return c.json(await new RoutingService().plan(body.sport, body.from, body.to));
});
