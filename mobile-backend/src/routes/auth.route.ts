import { Hono } from 'hono';
import { AuthController } from '../controllers/auth.controller';
import { requireAuth } from '../middleware/auth';
import { Env } from '../types';

export const authRouter = new Hono<{ Bindings: Env }>();
const controller = new AuthController();

// Google-Only Authentication
authRouter.post('/google', (c) => controller.googleLogin(c));
authRouter.post('/demo-login', (c) => controller.demoLogin(c));
authRouter.get('/me', requireAuth, (c) => controller.getMe(c));
