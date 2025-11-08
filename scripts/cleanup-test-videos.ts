#!/usr/bin/env tsx

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function cleanup() {
  console.log('🧹 Cleaning up test videos from system demo creator...\n');

  // Delete all videos for system demo creator
  const { error } = await supabase
    .from('videos')
    .delete()
    .eq('creator_id', '00000000-0000-0000-0000-000000000001');

  if (error) {
    console.error('❌ Error:', error.message);
    return;
  }

  console.log('✅ All test videos deleted\n');
  console.log('Ready for fresh demo content import');
}

cleanup();
