import { Context, Next } from 'hono';
import { verifyToken } from '../lib/auth';
import { HttpError } from '../lib/http';
import { Env } from '../types';

/**
 * The signing secret must come from `wrangler secret put JWT_SECRET`. There is deliberately no
 * fallback: the old literal default let anyone who read the source forge tokens (SEC-04).
 */
export const jwtSecret = (env: Env): string => {
  if (!env.JWT_SECRET || env.JWT_SECRET.length < 32) {
    throw new HttpError(
      500,
      'server_misconfigured',
      'Authentication is not configured on the server'
    );
  }
  return env.JWT_SECRET;
};

const bearer = (c: Context) => {
  const h = c.req.header('Authorization');
  return h && h.startsWith('Bearer ') ? h.substring(7) : null;
};

export const requireAuth = async (c: Context<{ Bindings: Env }>, next: Next) => {
  const token = bearer(c);
  if (!token)
    return c.json({ error: 'Unauthorized: Missing or invalid token', code: 'unauthorized' }, 401);
  const user = await verifyToken(token, jwtSecret(c.env));
  if (!user)
    return c.json({ error: 'Unauthorized: Token expired or invalid', code: 'unauthorized' }, 401);
  c.set('user', user);
  await next();
};

export const optionalAuth = async (c: Context<{ Bindings: Env }>, next: Next) => {
  const token = bearer(c);
  if (token) {
    const user = await verifyToken(token, jwtSecret(c.env));
    if (user) c.set('user', user);
  }
  await next();
};
