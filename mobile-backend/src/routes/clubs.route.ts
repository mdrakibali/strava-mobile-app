import { Hono } from 'hono';
import { ClubController } from '../controllers/club.controller';
import { optionalAuth, requireAuth } from '../middleware/auth';
import { Env } from '../types';

export const clubsRouter = new Hono<{ Bindings: Env }>();
const controller = new ClubController();

clubsRouter.get('/', optionalAuth, (c) => controller.list(c));
clubsRouter.get('/:id', optionalAuth, (c) => controller.getDetail(c));
clubsRouter.post('/', requireAuth, (c) => controller.create(c));
clubsRouter.post('/:id/join', requireAuth, (c) => controller.toggleMembership(c));

clubsRouter.patch('/:id', requireAuth, (c) => controller.update(c));
clubsRouter.delete('/:id', requireAuth, (c) => controller.remove(c));
