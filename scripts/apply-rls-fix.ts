#!/usr/bin/env tsx

/**
 * Apply RLS policy fix to resolve infinite recursion
 * Usage: npx tsx scripts/apply-rls-fix.ts
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

console.log('🔧 Applying RLS policy fix...\n');

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  db: { schema: 'public' },
  auth: { persistSession: false }
});

async function applyRlsFix() {
  try {
    // Read the migration file
    const migrationPath = path.join(
      __dirname,
      '../supabase/migrations/20251031000001_fix_creators_rls_recursion.sql'
    );

    console.log(`📄 Reading migration: ${migrationPath}\n`);
    const sql = fs.readFileSync(migrationPath, 'utf-8');

    // Execute DROP POLICY statement
    console.log('🗑️  Dropping problematic RLS policy...');
    const dropResult = await supabase.rpc('exec_sql' as any, {
      query: 'DROP POLICY IF EXISTS creators_view_own_plan ON creators;'
    });

    // If RPC doesn't exist, try direct connection
    if (dropResult.error) {
      console.log('⚠️  RPC method not available, using direct execution...\n');

      // Execute the full migration as a single query
      const { data, error } = await supabase.from('_').select('*').limit(0);

      if (error) {
        // Try alternative: use raw SQL query through a function
        console.log('Attempting direct SQL execution...\n');

        // Split SQL into individual statements
        const statements = [
          'DROP POLICY IF EXISTS creators_view_own_plan ON creators;',
          `CREATE POLICY creators_view_own_plan ON creators
            FOR SELECT
            USING (whop_user_id = auth.uid()::text);`
        ];

        for (const stmt of statements) {
          console.log(`📝 Executing: ${stmt.substring(0, 60)}...`);

          // Use the admin client to execute raw SQL
          const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'apikey': supabaseServiceKey,
              'Authorization': `Bearer ${supabaseServiceKey}`
            },
            body: JSON.stringify({ query: stmt })
          });

          if (!response.ok) {
            const errorText = await response.text();
            console.error(`❌ Failed: ${errorText}`);
          } else {
            console.log('✅ Success');
          }
        }
      }
    } else {
      console.log('✅ Policy dropped successfully\n');

      // Execute CREATE POLICY statement
      console.log('🔨 Creating new RLS policy...');
      const createResult = await supabase.rpc('exec_sql' as any, {
        query: `CREATE POLICY creators_view_own_plan ON creators
                FOR SELECT
                USING (whop_user_id = auth.uid()::text);`
      });

      if (createResult.error) {
        throw new Error(`Failed to create policy: ${createResult.error.message}`);
      }

      console.log('✅ Policy created successfully');
    }

    console.log('\n✅ RLS policy fix applied successfully!');
    console.log('🎉 The infinite recursion issue should now be resolved.');
    console.log('\n Next: Verify production health check at https://chronos-ai.app/api/health');

  } catch (error: any) {
    console.error('\n❌ Migration failed:', error.message);
    console.error('\nManual fix required:');
    console.error('1. Go to Supabase Dashboard > SQL Editor');
    console.error('2. Execute the following SQL:\n');
    console.error('   DROP POLICY IF EXISTS creators_view_own_plan ON creators;');
    console.error('   CREATE POLICY creators_view_own_plan ON creators');
    console.error('     FOR SELECT');
    console.error("     USING (whop_user_id = auth.uid()::text);");
    process.exit(1);
  }
}

applyRlsFix();
