import { config } from 'dotenv';
import { defineConfig } from 'drizzle-kit';

config();
config({ path: '.dev.vars' });

const FALLBACK_URL =
  'postgresql://neondb_owner:npg_chTDF35Axdla@ep-nameless-meadow-biyayy82-pooler.c-5.ap-southeast-1.aws.neon.tech/neondb?sslmode=require';

const rawUrl = process.env.DATABASE_URL || FALLBACK_URL;
const cleanUrl = rawUrl.replace(/^["'“”]+|["'“”]+$/g, '').trim();

export default defineConfig({
  schema: './src/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: cleanUrl,
  },
});
