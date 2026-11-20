import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();
dotenv.config({ path: path.join(__dirname, '../.env') });
dotenv.config({ path: path.join(__dirname, '../.dev.vars') });

const databaseUrl = process.env.DATABASE_URL;

async function runMigration() {
  if (!databaseUrl) {
    throw new Error('DATABASE_URL is not defined in environment, .env, or .dev.vars');
  }
  console.log('Connecting to Neon Database...');
  const sql = neon(databaseUrl);

  const migrationFiles = [
    path.join(__dirname, '../drizzle/0000_amazing_hex.sql'),
    path.join(__dirname, '../drizzle/0001_clean_payback.sql'),
    path.join(__dirname, '../drizzle/0002_batch_uploads.sql'),
    path.join(__dirname, '../drizzle/0003_social.sql'),
  ];

  for (const migrationFile of migrationFiles) {
    if (!fs.existsSync(migrationFile)) continue;
    console.log(`Running migration: ${path.basename(migrationFile)}`);
    const sqlContent = fs.readFileSync(migrationFile, 'utf-8');
    const statements = sqlContent
      .split('--> statement-breakpoint')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    for (let i = 0; i < statements.length; i++) {
      const stmt = statements[i];
      try {
        await sql(stmt);
      } catch (err) {
        // Ignore "already exists" errors safely
        if (!err.message?.includes('already exists')) {
          console.error(`Statement error in ${path.basename(migrationFile)}:`, err.message);
        }
      }
    }
  }

  // Create pg_trgm extension for fuzzy search
  try {
    await sql`CREATE EXTENSION IF NOT EXISTS pg_trgm;`;
    console.log('Extension pg_trgm enabled for athlete search.');
  } catch (err) {
    console.log('pg_trgm note:', err.message);
  }

  // Verify created tables
  const tables = await sql`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    ORDER BY table_name;
  `;
  console.log('Current Public Tables in Neon:');
  tables.forEach((t) => console.log(` - ${t.table_name}`));
  console.log('Migration Completed Successfully!');
}

runMigration().catch((err) => {
  console.error('Fatal migration error:', err);
  process.exit(1);
});

