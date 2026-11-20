import { Hono } from 'hono';
import { BeaconController } from '../controllers/beacon.controller';
import { requireAuth } from '../middleware/auth';
import { Env } from '../types';

export const beaconRouter = new Hono<{ Bindings: Env }>();
const controller = new BeaconController();

// Unauthenticated public spectator map view
beaconRouter.get('/:token', (c) => controller.getSpectator(c));

// Authenticated athlete live broadcaster endpoints
beaconRouter.post('/start', requireAuth, (c) => controller.start(c));
beaconRouter.post('/:token/ping', requireAuth, (c) => controller.ping(c));
beaconRouter.post('/:token/stop', requireAuth, (c) => controller.stop(c));

