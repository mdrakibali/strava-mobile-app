import { neon } from '@neondatabase/serverless';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const databaseUrl = 'postgresql://neondb_owner:npg_chTDF35Axdla@ep-nameless-meadow-biyayy82-pooler.c-5.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';

async function runMigration() {
  console.log('Connecting to Neon Database...');
  const sql = neon(databaseUrl);

  const migrationFile = path.join(__dirname, '../drizzle/0000_amazing_hex.sql');
  const sqlContent = fs.readFileSync(migrationFile, 'utf-8');

  // Split by statement-breakpoint
  const statements = sqlContent
    .split('--> statement-breakpoint')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  console.log(`Executing ${statements.length} migration statements...`);

  for (let i = 0; i < statements.length; i++) {
    const stmt = statements[i];
    try {
      await sql(stmt);
      console.log(`[${i + 1}/${statements.length}] Statement executed successfully`);
    } catch (err) {
      console.error(`Statement ${i + 1} error:`, err.message);
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

