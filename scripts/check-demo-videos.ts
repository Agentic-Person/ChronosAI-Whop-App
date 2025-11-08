#!/usr/bin/env tsx

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkDemoVideos() {
  console.log('🔍 Checking demo videos in database...\n');

  const { data: videos, error } = await supabase
    .from('videos')
    .select('id, title, duration_seconds, is_demo_content, creator_id')
    .eq('creator_id', '00000000-0000-0000-0000-000000000001')
    .order('created_at', { ascending: true });

  if (error) {
    console.error('❌ Error:', error.message);
    return;
  }

  if (!videos || videos.length === 0) {
    console.log('❌ No demo videos found');
    console.log('   Run the demo setup script to import them\n');
    return;
  }

  console.log(`✅ Found ${videos.length} demo videos:\n`);
  videos.forEach((v: any, i: number) => {
    console.log(`${i + 1}. ${v.title}`);
    console.log(`   ID: ${v.id}`);
    console.log(`   Duration: ${Math.round((v.duration_seconds || 0) / 60)} minutes`);
    console.log(`   Demo: ${v.is_demo_content}\n`);
  });
}

checkDemoVideos();
