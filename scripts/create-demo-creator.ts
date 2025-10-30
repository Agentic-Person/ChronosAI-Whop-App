#!/usr/bin/env tsx

/**
 * Create System Demo Creator Account
 * Creates the system demo creator account that will own all demo content
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

const SYSTEM_DEMO_CREATOR_ID = '00000000-0000-0000-0000-000000000001';

async function createDemoCreator() {
  console.log('🚀 Creating system demo creator account...\n');

  try {
    // Check if already exists
    const { data: existing } = await supabase
      .from('creators')
      .select('id')
      .eq('id', SYSTEM_DEMO_CREATOR_ID)
      .single();

    if (existing) {
      console.log('✅ System demo creator already exists');
      console.log(`   ID: ${SYSTEM_DEMO_CREATOR_ID}\n`);
      return true;
    }

    // Create system demo creator
    const { data, error } = await supabase
      .from('creators')
      .insert({
        id: SYSTEM_DEMO_CREATOR_ID,
        whop_company_id: 'demo_system',
        whop_user_id: 'demo_system_user',
        company_name: 'System Demo Content',
        subscription_tier: 'enterprise', // Give it enterprise to bypass limits
        trial_status: 'converted', // Not on trial
        has_demo_content: false,
      })
      .select()
      .single();

    if (error) {
      console.error('❌ Failed to create system demo creator:', error.message);
      return false;
    }

    console.log('✅ System demo creator created successfully!');
    console.log(`   ID: ${data.id}`);
    console.log(`   Name: ${data.company_name}\n`);
    return true;

  } catch (error: any) {
    console.error('❌ Error:', error.message);
    return false;
  }
}

createDemoCreator();
