#!/usr/bin/env tsx

/**
 * Apply RLS policy fix using direct postgres connection
 * Usage: npx tsx scripts/fix-rls-direct.ts
 */

import { Client } from 'pg';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const connectionString = `postgresql://postgres.dddttlnrkwaddzjvkacp:${process.env.SUPABASE_PASSWORD}@aws-0-us-east-1.pooler.supabase.com:6543/postgres`;

async function fixRlsPolicy() {
  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log('🔌 Connecting to database...\n');
    await client.connect();
    console.log('✅ Connected successfully\n');

    // Drop the problematic policy
    console.log('🗑️  Dropping problematic RLS policy...');
    await client.query('DROP POLICY IF EXISTS creators_view_own_plan ON creators;');
    console.log('✅ Policy dropped\n');

    // Create the new non-recursive policy
    console.log('🔨 Creating new RLS policy...');
    await client.query(`
      CREATE POLICY creators_view_own_plan ON creators
        FOR SELECT
        USING (whop_user_id = auth.uid()::text);
    `);
    console.log('✅ Policy created\n');

    console.log('🎉 RLS policy fix applied successfully!');
    console.log('   The infinite recursion issue is now resolved.');
    console.log('\nNext: Verify production health at https://chronos-ai.app/api/health');

  } catch (error: any) {
    console.error('\n❌ Error applying fix:', error.message);
    console.error('\nFull error:', error);
    process.exit(1);
  } finally {
    await client.end();
    console.log('\n🔌 Database connection closed');
  }
}

fixRlsPolicy();
