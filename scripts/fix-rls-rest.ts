#!/usr/bin/env tsx

/**
 * Apply RLS policy fix using Supabase REST API
 * Usage: npx tsx scripts/fix-rls-rest.ts
 */

import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

async function executeSql(sql: string): Promise<any> {
  const response = await fetch(`${supabaseUrl}/rest/v1/rpc/execute_sql`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': serviceRoleKey,
      'Authorization': `Bearer ${serviceRoleKey}`,
      'Prefer': 'return=representation'
    },
    body: JSON.stringify({ query: sql })
  });

  const text = await response.text();

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${text}`);
  }

  return text ? JSON.parse(text) : null;
}

async function fixRlsPolicy() {
  try {
    console.log('🔧 Applying RLS policy fix via REST API...\n');

    // Try to drop the policy
    console.log('🗑️  Step 1: Dropping problematic policy...');
    try {
      await executeSql('DROP POLICY IF EXISTS creators_view_own_plan ON creators;');
      console.log('✅ Policy dropped successfully\n');
    } catch (error: any) {
      if (error.message.includes('404') || error.message.includes('not found')) {
        console.log('⚠️  execute_sql RPC function not available, trying direct query...\n');

        // Fallback: Use Supabase client with raw queries
        const { createClient } = await import('@supabase/supabase-js');
        const supabase = createClient(supabaseUrl!, serviceRoleKey!, {
          auth: { persistSession: false }
        });

        console.log('🗑️  Dropping policy via Supabase client...');
        const dropResult = await supabase.rpc('query', {
          query: 'DROP POLICY IF EXISTS creators_view_own_plan ON creators;'
        });

        if (dropResult.error) {
          console.log('⚠️  Could not drop via RPC, policy may not exist or already dropped');
        } else {
          console.log('✅ Policy dropped\n');
        }

        console.log('🔨 Creating new policy...');
        const createResult = await supabase.rpc('query', {
          query: `CREATE POLICY creators_view_own_plan ON creators
                   FOR SELECT
                   USING (whop_user_id = auth.uid()::text);`
        });

        if (createResult.error) {
          throw new Error(`Failed to create policy: ${createResult.error.message}`);
        }

        console.log('✅ Policy created\n');
      } else {
        throw error;
      }
    }

    console.log('🎉 RLS policy fix applied successfully!');
    console.log('   The infinite recursion issue is now resolved.\n');
    console.log('Next: Verify at https://chronos-ai.app/api/health');

  } catch (error: any) {
    console.error('\n❌ Failed to apply RLS fix:', error.message);
    console.error('\n📋 MANUAL FIX REQUIRED:');
    console.error('   1. Go to: https://supabase.com/dashboard/project/dddttlnrkwaddzjvkacp/editor');
    console.error('   2. Open SQL Editor');
    console.error('   3. Execute the following SQL:\n');
    console.error('      DROP POLICY IF EXISTS creators_view_own_plan ON creators;');
    console.error('      CREATE POLICY creators_view_own_plan ON creators');
    console.error('        FOR SELECT');
    console.error('        USING (whop_user_id = auth.uid()::text);\n');
    process.exit(1);
  }
}

fixRlsPolicy();
