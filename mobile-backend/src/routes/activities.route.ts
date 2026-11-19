import { Hono } from 'hono';
import { ActivityController } from '../controllers/activity.controller';
import { optionalAuth, requireAuth } from '../middleware/auth';
import { Env } from '../types';

export const activitiesRouter = new Hono<{ Bindings: Env }>();
const controller = new ActivityController();

activitiesRouter.post('/', requireAuth, (c) => controller.create(c));
activitiesRouter.get('/:id', optionalAuth, (c) => controller.getDetail(c));
activitiesRouter.post('/:id/kudos', requireAuth, (c) => controller.toggleKudos(c));
activitiesRouter.post('/:id/comments', requireAuth, (c) => controller.addComment(c));
activitiesRouter.get('/:id/export', (c) => controller.exportGpx(c));
