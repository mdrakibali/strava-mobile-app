import { Hono } from 'hono';
import { ActivityController } from '../controllers/activity.controller';
import { optionalAuth, requireAuth } from '../middleware/auth';
import { Env } from '../types';

export const activitiesRouter = new Hono<{ Bindings: Env }>();
const controller = new ActivityController();

// Batch GPS uploads (registered before /:id so "uploads" is never read as an activity id)
activitiesRouter.post('/uploads', requireAuth, (c) => controller.startUpload(c));
activitiesRouter.get('/uploads/:cid', requireAuth, (c) => controller.getUpload(c));
activitiesRouter.put('/uploads/:cid/batches/:seq', requireAuth, (c) => controller.putBatch(c));
activitiesRouter.post('/uploads/:cid/complete', requireAuth, (c) => controller.completeUpload(c));

activitiesRouter.post('/', requireAuth, (c) => controller.create(c));
activitiesRouter.get('/:id', optionalAuth, (c) => controller.getDetail(c));
activitiesRouter.patch('/:id', requireAuth, (c) => controller.update(c));
activitiesRouter.delete('/:id', requireAuth, (c) => controller.remove(c));
activitiesRouter.post('/:id/kudos', requireAuth, (c) => controller.giveKudos(c));
activitiesRouter.post('/:id/comments', requireAuth, (c) => controller.addComment(c));
activitiesRouter.get('/:id/export', requireAuth, (c) => controller.exportGpx(c));
