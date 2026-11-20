import { Hono } from 'hono';
import { NotificationController } from '../controllers/notification.controller';
import { requireAuth } from '../middleware/auth';
import { Env } from '../types';

export const notificationsRouter = new Hono<{ Bindings: Env }>();
const controller = new NotificationController();

notificationsRouter.get('/', requireAuth, (c) => controller.list(c));
notificationsRouter.get('/stream', requireAuth, (c) => controller.stream(c));
notificationsRouter.patch('/:id/read', requireAuth, (c) => controller.markRead(c));
notificationsRouter.post('/read-all', requireAuth, (c) => controller.markAllRead(c));

