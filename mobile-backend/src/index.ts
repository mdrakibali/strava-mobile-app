import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { activitiesRouter } from './routes/activities.route';
import { athletesRouter } from './routes/athletes.route';
import { authRouter } from './routes/auth.route';
import { beaconRouter } from './routes/beacon.route';
import { challengesRouter } from './routes/challenges.route';
import { clubsRouter } from './routes/clubs.route';
import { feedRouter } from './routes/feed.route';
import { gearRouter } from './routes/gear.route';
import { notificationsRouter } from './routes/notifications.route';
import { privacyZonesRouter } from './routes/privacy-zones.route';
import { messagesRouter } from './routes/messages.route';
import { segmentsRouter } from './routes/segments.route';
import { routesRouter } from './routes/routes.route';
import { eventsRouter } from './routes/events.route';
import { goalsRouter } from './routes/goals.route';
import { Env } from './types';

const app = new Hono<{ Bindings: Env }>();

// 1. Global Middleware
app.use('*', logger());

// Dynamic CORS configuration using Cloudflare Worker environment variables
app.use('*', async (c, next) => {
  const corsHandler = cors({
    origin: c.env.CORS_ORIGIN || '*',
    allowHeaders: ['Content-Type', 'Authorization', 'Cache-Control', 'Accept'],
    allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    exposeHeaders: ['Content-Length', 'Content-Disposition'],
    maxAge: 86400,
  });
  return corsHandler(c, next);
});

// 2. Health & Diagnostic Check
app.get('/', (c) => {
  return c.json({
    status: 'online',
    service: 'OpenStrava Backend Engine',
    version: '1.0.0',
    runtime: 'Cloudflare Workers (Edge)',
    hyperdriveActive: Boolean(c.env.HYPERDRIVE),
    authProvider: 'Google OAuth 2.0 (Verified via JWKS)',
    documentation: 'https://github.com/open-strava',
  });
});

// 3. API v1 Modular Routes
const api = new Hono<{ Bindings: Env }>();

api.route('/auth', authRouter);
api.route('/athletes', athletesRouter);
api.route('/activities', activitiesRouter);
api.route('/feed', feedRouter);
api.route('/clubs', clubsRouter);
api.route('/challenges', challengesRouter);
api.route('/beacon', beaconRouter);
api.route('/notifications', notificationsRouter);
api.route('/gear', gearRouter);
api.route('/privacy-zones', privacyZonesRouter);
api.route('/messages', messagesRouter);
api.route('/segments', segmentsRouter);
api.route('/routes', routesRouter);
api.route('/events', eventsRouter);
api.route('/goals', goalsRouter);

app.route('/api/v1', api);

// 4. Global 404 Handler
app.notFound((c) => {
  return c.json({ error: 'Endpoint Not Found', path: c.req.path }, 404);
});

// 5. Global Error Handler
app.onError((err, c) => {
  console.error('Unhandled Server Exception:', err);
  return c.json(
    {
      error: 'Internal Server Error',
      message: c.env.ENVIRONMENT === 'production' ? 'An unexpected error occurred' : err.message,
    },
    500
  );
});

export default app;
