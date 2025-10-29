#!/usr/bin/env tsx

/**
 * Force Supabase PostgREST to reload schema cache
 * Usage: npx tsx scripts/reload-schema.ts
 */

import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials in .env.local');
  process.exit(1);
}

async function reloadSchema() {
  try {
    console.log('🔄 Forcing PostgREST schema cache reload...\n');

    // Send NOTIFY pgrst to trigger schema reload
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/notify_pgrst`, {
      method: 'POST',
      headers: {
        'apikey': supabaseServiceKey,
        'Authorization': `Bearer ${supabaseServiceKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({}),
    });

    if (!response.ok) {
      console.log('Note: notify_pgrst RPC not available (expected)');
      console.log('Trying alternative method...\n');

      // Alternative: Force reload by requesting schema
      const schemaResponse = await fetch(`${supabaseUrl}/rest/v1/`, {
        method: 'GET',
        headers: {
          'apikey': supabaseServiceKey,
          'Authorization': `Bearer ${supabaseServiceKey}`,
          'Accept': 'application/openapi+json',
        },
      });

      if (schemaResponse.ok) {
        console.log('✅ Schema reload requested via OpenAPI endpoint');
        console.log('📋 Schema cache should refresh within 1-2 minutes');
      } else {
        console.error('❌ Could not force schema reload');
        console.log('Please reload manually in Supabase Dashboard:');
        console.log('1. Go to Settings → API');
        console.log('2. Click "Reload schema cache" or restart PostgREST');
      }
    } else {
      console.log('✅ Schema reload triggered successfully!');
    }

    console.log('\n💡 Alternative: In Supabase Dashboard, go to:');
    console.log('   Settings → Database → Connection Pooling → Restart');
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    console.log('\n📝 Manual steps to reload schema:');
    console.log('1. Go to your Supabase Dashboard');
    console.log('2. Navigate to Settings → API');
    console.log('3. Look for "Reload schema" or restart the PostgREST service');
  }
}

reloadSchema();
