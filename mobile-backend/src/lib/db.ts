import { Pool } from 'pg';
import { drizzle, NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../db/schema';
import { Env } from '../types';

export type AppDatabase = NodePgDatabase<typeof schema>;

let cachedPool: Pool | null = null;
let cachedConnectionString: string | null = null;

/**
 * Initializes or reuses the database client.
 * Connects directly through Cloudflare Hyperdrive when available for
 * connection pooling and global edge latency reduction.
 */
export const getDb = (envOrConn: Env | string): AppDatabase => {
  let connString: string;
  if (typeof envOrConn === 'string') {
    connString = envOrConn;
  } else {
    connString = envOrConn.HYPERDRIVE?.connectionString || envOrConn.DATABASE_URL;
  }

  if (!cachedPool || cachedConnectionString !== connString) {
    cachedPool = new Pool({
      connectionString: connString,
      max: 10,
    });
    cachedConnectionString = connString;
  }

  return drizzle(cachedPool, { schema });
};
