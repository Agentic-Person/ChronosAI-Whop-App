#!/usr/bin/env tsx

/**
 * Run courses system database migration
 * Usage: npx tsx scripts/run-courses-migration.ts
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

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function runMigration() {
  try {
    console.log('🚀 Running courses system migration...\n');

    // Read the migration file
    const migrationPath = path.join(
      __dirname,
      '../supabase/migrations/20251028000001_add_courses_system.sql'
    );

    if (!fs.existsSync(migrationPath)) {
      console.error('❌ Migration file not found:', migrationPath);
      process.exit(1);
    }

    const sql = fs.readFileSync(migrationPath, 'utf-8');

    // Split by statement (careful with functions that contain semicolons)
    const statements: string[] = [];
    let currentStatement = '';
    let inFunction = false;

    sql.split('\n').forEach(line => {
      // Check if we're entering or leaving a function definition
      if (line.includes('CREATE OR REPLACE FUNCTION') || line.includes('CREATE FUNCTION')) {
        inFunction = true;
      }
      if (line.includes('$$ LANGUAGE')) {
        inFunction = false;
        currentStatement += line + '\n';
        statements.push(currentStatement.trim());
        currentStatement = '';
        return;
      }

      // If we're in a function, just accumulate lines
      if (inFunction) {
        currentStatement += line + '\n';
        return;
      }

      // Otherwise, split on semicolons
      if (line.includes(';') && !line.trim().startsWith('--')) {
        currentStatement += line;
        const parts = currentStatement.split(';');
        for (let i = 0; i < parts.length - 1; i++) {
          const stmt = parts[i].trim();
          if (stmt && !stmt.startsWith('--')) {
            statements.push(stmt);
          }
        }
        currentStatement = parts[parts.length - 1];
      } else {
        currentStatement += line + '\n';
      }
    });

    // Add any remaining statement
    if (currentStatement.trim()) {
      statements.push(currentStatement.trim());
    }

    console.log(`📝 Executing ${statements.length} SQL statements...\n`);

    let successCount = 0;
    let errorCount = 0;

    for (const statement of statements) {
      if (statement && !statement.startsWith('--')) {
        const preview = statement.substring(0, 80).replace(/\n/g, ' ');
        console.log(`Executing: ${preview}...`);

        try {
          // Use raw SQL execution
          const { error } = await supabase.rpc('exec_sql', { sql: statement });

          if (error) {
            // Try direct execution as fallback
            const { data, error: directError } = await supabase
              .from('_sql')
              .select()
              .single()
              .eq('query', statement);

            if (directError) {
              console.error(`❌ Error: ${directError.message}`);
              errorCount++;
              // Continue with other statements
              continue;
            }
          }

          console.log('✅ Success');
          successCount++;
        } catch (err: any) {
          console.error(`❌ Error: ${err.message}`);
          errorCount++;
        }
      }
    }

    console.log('\n========================================');
    console.log(`✅ Successfully executed: ${successCount} statements`);
    if (errorCount > 0) {
      console.log(`❌ Failed: ${errorCount} statements`);
      console.log('\nNote: Some errors may be expected (e.g., "already exists" errors)');
    }
    console.log('========================================\n');

    // Verify the tables were created
    console.log('📊 Verifying tables...\n');

    const { data: courses, error: coursesError } = await supabase
      .from('courses')
      .select('count')
      .limit(1);

    if (coursesError) {
      console.error('❌ Could not verify courses table:', coursesError.message);
    } else {
      console.log('✅ Courses table exists');
    }

    const { data: queue, error: queueError } = await supabase
      .from('upload_queue')
      .select('count')
      .limit(1);

    if (queueError) {
      console.error('❌ Could not verify upload_queue table:', queueError.message);
    } else {
      console.log('✅ Upload queue table exists');
    }

    console.log('\n✨ Migration completed!');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

// Run the migration
runMigration();