import { Hono } from 'hono';
import { GearController } from '../controllers/gear.controller';
import { requireAuth } from '../middleware/auth';
import { Env } from '../types';

export const gearRouter = new Hono<{ Bindings: Env }>();
const controller = new GearController();

gearRouter.get('/', requireAuth, (c) => controller.list(c));
gearRouter.post('/', requireAuth, (c) => controller.create(c));
gearRouter.patch('/:id', requireAuth, (c) => controller.update(c));
gearRouter.delete('/:id', requireAuth, (c) => controller.delete(c));

