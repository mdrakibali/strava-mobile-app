import { Context, Next } from 'hono';
import { verifyToken } from '../lib/auth';
import { Env } from '../types';

export const requireAuth = async (c: Context<{ Bindings: Env }>, next: Next) => {
  const authHeader = c.req.header('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json({ error: 'Unauthorized: Missing or invalid token' }, 401);
  }

  const token = authHeader.substring(7);
  const secret = c.env.JWT_SECRET || 'open-strava-prod-secret-jwt-key-2026-auth';
  const user = await verifyToken(token, secret);

  if (!user) {
    return c.json({ error: 'Unauthorized: Token expired or invalid' }, 401);
  }

  c.set('user', user);
  await next();
};

export const optionalAuth = async (c: Context<{ Bindings: Env }>, next: Next) => {
  const authHeader = c.req.header('Authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    const secret = c.env.JWT_SECRET || 'open-strava-prod-secret-jwt-key-2026-auth';
    const user = await verifyToken(token, secret);
    if (user) {
      c.set('user', user);
    }
  }
  await next();
};

