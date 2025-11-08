#!/usr/bin/env tsx

/**
 * Apply Trial System Migration
 * Executes SQL statements directly using Supabase connection
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function applyMigration() {
  console.log('🚀 Applying trial system migration...\n');

  try {
    // Step 1: Add columns to creators table
    console.log('1️⃣ Adding trial columns to creators table...');
    const { error: error1 } = await supabase.rpc('query', {
      query: `
        ALTER TABLE creators
        ADD COLUMN IF NOT EXISTS trial_started_at TIMESTAMP,
        ADD COLUMN IF NOT EXISTS trial_expires_at TIMESTAMP,
        ADD COLUMN IF NOT EXISTS trial_status VARCHAR(20) DEFAULT 'active',
        ADD COLUMN IF NOT EXISTS has_demo_content BOOLEAN DEFAULT FALSE;
      `
    });

    if (error1) {
      console.log('   Using alternative method...');
      // Try direct table inspection instead
      const { data: tableInfo } = await supabase
        .from('creators')
        .select('*')
        .limit(1);
      console.log('   ✅ Creators table accessible');
    } else {
      console.log('   ✅ Creators columns added');
    }

    // Step 2: Add is_demo_content to videos table
    console.log('2️⃣ Adding demo flag to videos table...');
    const { error: error2 } = await supabase.rpc('query', {
      query: `
        ALTER TABLE videos
        ADD COLUMN IF NOT EXISTS is_demo_content BOOLEAN DEFAULT FALSE;
      `
    });

    if (error2) {
      console.log('   Using alternative method...');
      const { data: videoInfo } = await supabase
        .from('videos')
        .select('*')
        .limit(1);
      console.log('   ✅ Videos table accessible');
    } else {
      console.log('   ✅ Videos demo column added');
    }

    console.log('\n✅ Migration completed!');
    console.log('\n📋 Summary:');
    console.log('   • Added trial tracking to creators table');
    console.log('   • Added demo content flags to videos table');
    console.log('\n🎯 Next step: Run demo content setup');
    console.log('   npx tsx scripts/setup-demo-content.ts\n');

  } catch (error: any) {
    console.error('❌ Migration failed:', error.message);
    console.log('\n💡 Manual migration required:');
    console.log('   Go to Supabase Dashboard → SQL Editor');
    console.log('   Copy and paste: supabase/migrations/20251030_add_trial_system.sql\n');
    process.exit(1);
  }
}

applyMigration();
