import { Hono } from 'hono';
import { AuthController } from '../controllers/auth.controller';
import { requireAuth } from '../middleware/auth';
import { Env } from '../types';

export const authRouter = new Hono<{ Bindings: Env }>();
const controller = new AuthController();

// Production Authentication (Email/Password & Google OAuth)
authRouter.post('/register', (c) => controller.register(c));
authRouter.post('/login', (c) => controller.login(c));
authRouter.post('/google', (c) => controller.googleLogin(c));
authRouter.get('/me', requireAuth, (c) => controller.getMe(c));

