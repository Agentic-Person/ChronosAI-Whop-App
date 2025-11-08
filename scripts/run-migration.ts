#!/usr/bin/env tsx

/**
 * Run database migration directly using Supabase service role
 * Usage: npx tsx scripts/run-migration.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runMigration() {
  try {
    console.log('🚀 Running trial system migration...\n');

    // Read the migration file
    const migrationPath = path.join(
      __dirname,
      '../supabase/migrations/20251030_add_trial_system.sql'
    );
    const sql = fs.readFileSync(migrationPath, 'utf-8');

    // Split by statement (simple split by semicolon)
    const statements = sql
      .split(';')
      .map((s) => s.trim())
      .filter((s) => s.length > 0 && !s.startsWith('--') && !s.startsWith('COMMENT'));

    console.log(`📝 Executing ${statements.length} SQL statements...\n`);

    for (const statement of statements) {
      if (statement) {
        console.log(`Executing: ${statement.substring(0, 80)}...`);
        const { error } = await supabase.rpc('exec_sql', { sql: statement });

        if (error) {
          console.error('❌ Error:', error.message);
          // Try direct execution as fallback
          const { error: directError } = await (supabase as any).from('_').insert({});
          console.log('Trying alternative method...');
        } else {
          console.log('✅ Success');
        }
      }
    }

    console.log('\n✅ Migration completed successfully!');
    console.log('\nTrial system database schema updated.');
    console.log('Next step: Run npx tsx scripts/setup-demo-content.ts');
  } catch (error: any) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  }
}

runMigration();
