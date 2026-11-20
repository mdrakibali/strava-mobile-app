import { Context, Next } from 'hono';
import { drizzle, NodePgDatabase } from 'drizzle-orm/node-postgres';
import { Client } from 'pg';
import * as schema from '../db/schema';
import { Env } from '../types';

export type AppDatabase = NodePgDatabase<typeof schema>;

declare module 'hono' {
  interface ContextVariableMap {
    db: AppDatabase;
  }
}

/** Factory used by the DB middleware. Tests inject an in-process database instead (PGlite). */
export type DbProvider = (c: Context<{ Bindings: Env }>) => Promise<{ db: AppDatabase; close: () => Promise<void> }>;

/**
 * Production provider: ONE pg client per request through Hyperdrive (pooling happens in Hyperdrive),
 * closed after the response via waitUntil — Cloudflare's documented Hyperdrive + node-postgres pattern
 * (ADR-08). The previous code created a new Pool on every getDb() call and never closed it.
 */
export const hyperdriveProvider: DbProvider = async (c) => {
  const connectionString = c.env.HYPERDRIVE?.connectionString || c.env.DATABASE_URL;
  if (!connectionString) throw new Error('Database is not configured (HYPERDRIVE or DATABASE_URL)');
  const client = new Client({ connectionString, connectionTimeoutMillis: 15_000 });
  await client.connect();
  return { db: drizzle(client, { schema }), close: () => client.end() };
};

export const dbMiddleware =
  (provider: DbProvider) =>
  async (c: Context<{ Bindings: Env }>, next: Next) => {
    const { db, close } = await provider(c);
    c.set('db', db);
    try {
      await next();
    } finally {
      const done = close().catch((e) => console.warn('db close failed', e));
      try {
        c.executionCtx.waitUntil(done);
      } catch {
        await done; // no ExecutionContext outside Workers (Node dev server, tests)
      }
    }
  };

/** Per-request database set by dbMiddleware. */
export const getDb = (c: Context<any>): AppDatabase => {
  const db = c.get('db');
  if (!db) throw new Error('Database middleware not installed');
  return db;
};
