import { Hono } from 'hono';
import { FeedController } from '../controllers/feed.controller';
import { optionalAuth } from '../middleware/auth';
import { Env } from '../types';

export const feedRouter = new Hono<{ Bindings: Env }>();
const controller = new FeedController();

feedRouter.get('/', optionalAuth, (c) => controller.getFeed(c));

