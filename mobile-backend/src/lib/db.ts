import { Pool } from 'pg';
import { drizzle, NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../db/schema';
import { Env } from '../types';

export type AppDatabase = NodePgDatabase<typeof schema>;

export const getDb = (envOrConn: Env | string): AppDatabase => {
  let connString: string;
  if (typeof envOrConn === 'string') {
    connString = envOrConn;
  } else {
    connString = envOrConn.HYPERDRIVE?.connectionString || envOrConn.DATABASE_URL;
  }

  const pool = new Pool({
    connectionString: connString,
    max: 1,
    connectionTimeoutMillis: 15000,
  });

  return drizzle(pool, { schema });
};
