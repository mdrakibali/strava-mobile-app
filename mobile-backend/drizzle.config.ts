import { config } from 'dotenv';
import { defineConfig } from 'drizzle-kit';

config();
config({ path: '.dev.vars' });

// The connection string comes from the environment or .env / .dev.vars (never commit it). Technical audit SEC-01.
export default defineConfig({
  schema: './src/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL ?? '',
  },
});
