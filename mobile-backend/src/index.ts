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
import { notificationsRouter } from './routes/notifications.route';
import { privacyZonesRouter } from './routes/privacy-zones.route';
import { messagesRouter } from './routes/messages.route';
import { segmentsRouter } from './routes/segments.route';
import { routesRouter } from './routes/routes.route';
import { eventsRouter } from './routes/events.route';
import { goalsRouter } from './routes/goals.route';
import { DbProvider, dbMiddleware, hyperdriveProvider } from './lib/db';
import { errorBody, HttpError } from './lib/http';
import { Env } from './types';

/**
 * App factory. Production uses Hyperdrive; tests and the local Node dev server inject a database.
 */
export const createApp = (dbProvider: DbProvider = hyperdriveProvider) => {
  const app = new Hono<{ Bindings: Env }>();

  app.use('*', logger());
  app.use('*', async (c, next) =>
    cors({
      origin: c.env.CORS_ORIGIN || '*',
      allowHeaders: ['Content-Type', 'Authorization', 'Cache-Control', 'Accept'],
      allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      exposeHeaders: ['Content-Length', 'Content-Disposition'],
      maxAge: 86400,
    })(c, next)
  );

  app.get('/', (c) =>
    c.json({
      status: 'online',
      service: 'OpenStrava Backend Engine',
      version: '1.1.0',
      runtime: 'Cloudflare Workers (Edge)',
      hyperdriveActive: Boolean(c.env.HYPERDRIVE),
    })
  );

  const api = new Hono<{ Bindings: Env }>();
  api.use('*', dbMiddleware(dbProvider));

  // MVP scope (ADR-15)
  api.route('/auth', authRouter);
  api.route('/athletes', athletesRouter);
  api.route('/activities', activitiesRouter);
  api.route('/feed', feedRouter);
  api.route('/notifications', notificationsRouter);
  api.route('/privacy-zones', privacyZonesRouter);

  // Out-of-scope modules: not mounted in production (SEC-07); the app hides them behind flags.
  const outOfScope: [string, Hono<{ Bindings: Env }>][] = [
    ['/clubs', clubsRouter],
    ['/challenges', challengesRouter],
    ['/beacon', beaconRouter],
    ['/messages', messagesRouter],
    ['/segments', segmentsRouter],
    ['/routes', routesRouter],
    ['/events', eventsRouter],
    ['/goals', goalsRouter],
  ];
  for (const [path, router] of outOfScope) {
    const gate = async (c: any, next: () => Promise<void>) =>
      c.env.ENVIRONMENT === 'production' ? c.json({ error: 'Endpoint Not Found', code: 'not_found' }, 404) : next();
    api.use(path, gate);
    api.use(`${path}/*`, gate);
    api.route(path, router);
  }

  app.route('/api/v1', api);

  app.notFound((c) => c.json({ error: 'Endpoint Not Found', code: 'not_found', path: c.req.path }, 404));

  app.onError((err, c) => {
    if (err instanceof HttpError) return c.json(errorBody(err), err.status);
    console.error('Unhandled Server Exception:', err);
    return c.json(
      {
        error: 'Internal Server Error',
        code: 'internal',
        message: c.env?.ENVIRONMENT === 'production' ? 'An unexpected error occurred' : err.message,
      },
      500
    );
  });

  return app;
};

export default createApp();
