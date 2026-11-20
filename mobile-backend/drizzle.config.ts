import { defineConfig } from 'drizzle-kit';

// The connection string comes from the environment (never commit it). Technical audit SEC-01.
//   DATABASE_URL=postgres://... npx drizzle-kit migrate
export default defineConfig({
  schema: './src/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL ?? '',
  },
});
