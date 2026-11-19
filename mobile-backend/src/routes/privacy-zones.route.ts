import { Hono } from 'hono';
import { PrivacyZoneController } from '../controllers/privacy-zone.controller';
import { requireAuth } from '../middleware/auth';
import { Env } from '../types';

export const privacyZonesRouter = new Hono<{ Bindings: Env }>();
const controller = new PrivacyZoneController();

privacyZonesRouter.get('/', requireAuth, (c) => controller.list(c));
privacyZonesRouter.post('/', requireAuth, (c) => controller.create(c));
privacyZonesRouter.delete('/:id', requireAuth, (c) => controller.delete(c));

