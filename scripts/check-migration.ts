#!/usr/bin/env tsx

/**
 * Check if trial system migration was applied
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkMigration() {
  console.log('🔍 Checking trial system migration status...\n');

  try {
    // Query information schema for columns
    const { data, error } = await supabase
      .from('information_schema.columns')
      .select('column_name')
      .eq('table_name', 'creators')
      .in('column_name', ['trial_started_at', 'trial_expires_at', 'trial_status', 'has_demo_content']);

    if (error) {
      console.log('❌ Cannot query information_schema directly');
      console.log('   Trying alternative check...\n');

      // Try to select from creators table with new columns
      const { data: testData, error: testError } = await supabase
        .from('creators')
        .select('trial_started_at, trial_expires_at, trial_status, has_demo_content')
        .limit(1);

      if (testError) {
        console.log('❌ Trial columns NOT found');
        console.log(`   Error: ${testError.message}\n`);
        console.log('🔧 Migration needs to be applied manually:');
        console.log('   1. Go to https://supabase.com/dashboard/project/dddttlnrkwaddzjvkacp/editor');
        console.log('   2. Click "SQL Editor" → "New query"');
        console.log('   3. Copy/paste: supabase/migrations/20251030_add_trial_system.sql');
        console.log('   4. Click "Run"\n');
        return false;
      } else {
        console.log('✅ Trial columns exist in creators table');
        console.log('   Found:', Object.keys(testData?.[0] || {}).join(', '));
      }
    } else {
      console.log('✅ Found columns:', data?.map((d: any) => d.column_name).join(', '));
    }

    // Check videos table
    const { data: videoData, error: videoError } = await supabase
      .from('videos')
      .select('is_demo_content')
      .limit(1);

    if (videoError) {
      console.log('❌ is_demo_content column NOT found in videos table');
      return false;
    } else {
      console.log('✅ is_demo_content column exists in videos table\n');
    }

    console.log('✅ Migration is applied correctly!\n');
    console.log('🎯 Ready for demo content setup');
    return true;

  } catch (error: any) {
    console.error('❌ Check failed:', error.message);
    return false;
  }
}

checkMigration();
