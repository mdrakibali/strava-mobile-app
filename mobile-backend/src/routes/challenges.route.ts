import { Hono } from 'hono';
import { ChallengeController } from '../controllers/challenge.controller';
import { optionalAuth, requireAuth } from '../middleware/auth';
import { Env } from '../types';

export const challengesRouter = new Hono<{ Bindings: Env }>();
const controller = new ChallengeController();

challengesRouter.get('/', optionalAuth, (c) => controller.list(c));
challengesRouter.get('/:id', optionalAuth, (c) => controller.getDetail(c));
challengesRouter.post('/', requireAuth, (c) => controller.create(c));
challengesRouter.post('/:id/join', requireAuth, (c) => controller.toggleJoin(c));

