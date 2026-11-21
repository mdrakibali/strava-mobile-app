import { config } from 'dotenv';
import { defineConfig } from 'drizzle-kit';

config();
config({ path: '.dev.vars' });

/**
 * pg-connection-string parses a non-absolute URL against the base `postgres://base`.
 * A DATABASE_URL that is still wrapped in quotes (or missing the protocol) therefore
 * fails with `getaddrinfo ENOTFOUND base`. Strip quotes and reject that host.
 */
function databaseUrl(): string {
  const clean = (process.env.DATABASE_URL || '')
    .replace(/^\uFEFF/, '')
    .replace(/^["'“”]+|["'“”]+$/g, '')
    .trim();
  if (!clean) {
    throw new Error('DATABASE_URL is not set. Copy .dev.vars.example to .dev.vars and set an absolute postgresql:// URL.');
  }
  let host = '';
  try {
    host = new URL(clean.replace(/^postgres(ql)?:/i, 'http:')).hostname;
  } catch {
    throw new Error('DATABASE_URL is not a valid postgres URL. Use postgresql://user:password@host/database');
  }
  if (!host || host === 'base') {
    throw new Error(
      'DATABASE_URL host resolved to "base". Remove surrounding quotes and keep the postgresql:// protocol so Drizzle Kit does not fall back to postgres://base.'
    );
  }
  return clean;
}

export default defineConfig({
  schema: './src/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: databaseUrl(),
  },
});
