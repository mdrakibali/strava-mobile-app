/**
 * Local API for device testing WITHOUT touching production (no Neon, no Hyperdrive):
 *   npm run dev:local            → http://0.0.0.0:8787/api/v1 backed by PGlite in ./.local-db
 *   adb reverse tcp:8787 tcp:8787  → the phone reaches it at http://localhost:8787
 * Then start the app with EXPO_PUBLIC_API_URL=http://localhost:8787/api/v1.
 */
import { serve } from '@hono/node-server';
import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import * as schema from '../src/db/schema';
import { createApp } from '../src/index';
import { AppDatabase } from '../src/lib/db';

const dataDir = join(__dirname, '../.local-db');
const fresh = !existsSync(dataDir);
const pg = new PGlite(dataDir);

const main = async () => {
  if (fresh) {
    const dir = join(__dirname, '../drizzle');
    for (const f of readdirSync(dir).filter((x) => x.endsWith('.sql')).sort())
      for (const stmt of readFileSync(join(dir, f), 'utf8').split('--> statement-breakpoint'))
        if (stmt.trim()) await pg.exec(stmt);
    console.log('Local database created and migrated');
  }
  const db = drizzle(pg, { schema }) as unknown as AppDatabase;
  const app = createApp(async () => ({ db, close: async () => {} }));
  const env = {
    JWT_SECRET: process.env.JWT_SECRET ?? 'local-dev-secret-not-for-production-0123456789',
    ENVIRONMENT: 'development',
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID ?? '923419495380-p8senmhosq66vltjdviijc08dbunhmsd.apps.googleusercontent.com',
  };
  const port = Number(process.env.PORT ?? 8787);
  serve({ fetch: (req) => app.fetch(req, env), port, hostname: '0.0.0.0' });
  console.log(`Local API on http://0.0.0.0:${port}/api/v1`);
};
main();
