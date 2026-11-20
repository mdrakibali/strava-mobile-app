import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import * as schema from '../db/schema';
import { createApp } from '../index';
import { generateToken } from '../lib/auth';
import { AppDatabase } from '../lib/db';

export const JWT_SECRET = 'test-secret-'.padEnd(48, 'x');
export const ENV = { JWT_SECRET, ENVIRONMENT: 'test', GOOGLE_CLIENT_ID: 'test-client-id' } as const;

/** Fresh in-process Postgres with the real migrations applied (drizzle/*.sql, in order). */
export const createTestDb = async () => {
  const pg = new PGlite();
  const dir = join(__dirname, '../../drizzle');
  for (const file of readdirSync(dir).filter((f) => f.endsWith('.sql')).sort()) {
    for (const stmt of readFileSync(join(dir, file), 'utf8').split('--> statement-breakpoint')) {
      if (stmt.trim()) await pg.exec(stmt);
    }
  }
  const db = drizzle(pg, { schema }) as unknown as AppDatabase;
  return { pg, db };
};

export const createTestApp = (db: AppDatabase, env: Record<string, string> = ENV) => {
  const app = createApp(async () => ({ db, close: async () => {} }));
  const call = async (method: string, path: string, opts: { token?: string; body?: unknown; raw?: string } = {}) => {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (opts.token) headers.Authorization = `Bearer ${opts.token}`;
    const res = await app.request(
      `/api/v1${path}`,
      { method, headers, body: opts.raw ?? (opts.body !== undefined ? JSON.stringify(opts.body) : undefined) },
      env
    );
    const text = await res.text();
    let json: any = null;
    try {
      json = text ? JSON.parse(text) : null;
    } catch {
      json = text;
    }
    return { status: res.status, body: json };
  };
  return { app, call };
};

export const seedAthlete = async (db: AppDatabase, id: string) => {
  await db.insert(schema.athletes).values({ id, username: id, email: `${id}@example.com`, displayName: id.toUpperCase() });
  return generateToken({ athleteId: id, username: id, email: `${id}@example.com` }, JWT_SECRET);
};
