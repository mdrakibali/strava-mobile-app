import { Hono } from 'hono';
import { AthleteController } from '../controllers/athlete.controller';
import { optionalAuth, requireAuth } from '../middleware/auth';
import { Env } from '../types';

export const athletesRouter = new Hono<{ Bindings: Env }>();
const controller = new AthleteController();

athletesRouter.get('/search', optionalAuth, (c) => controller.search(c));
athletesRouter.put('/me', requireAuth, (c) => controller.updateProfile(c));
athletesRouter.get('/:id', optionalAuth, (c) => controller.getProfile(c));
athletesRouter.get('/:id/activities', optionalAuth, (c) => controller.listActivities(c));
// Legacy toggle (older builds); new clients use the idempotent PUT/DELETE.
athletesRouter.post('/:id/follow', requireAuth, (c) => controller.toggleFollow(c));
athletesRouter.put('/:id/follow', requireAuth, (c) => controller.follow(c));
athletesRouter.delete('/:id/follow', requireAuth, (c) => controller.unfollow(c));
athletesRouter.get('/:id/followers', optionalAuth, (c) => controller.listFollows(c, 'followers'));
athletesRouter.get('/:id/following', optionalAuth, (c) => controller.listFollows(c, 'following'));
athletesRouter.get('/:id/stats', optionalAuth, (c) => controller.stats(c));

