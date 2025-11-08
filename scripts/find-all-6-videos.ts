#!/usr/bin/env tsx

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function findAllVideos() {
  console.log('🔍 Searching for all 6 demo videos...\n');

  // Get all videos for system creator from last 2 hours
  const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();

  const { data, error } = await supabase
    .from('videos')
    .select('id, title, is_demo_content, created_at')
    .eq('creator_id', '00000000-0000-0000-0000-000000000001')
    .gte('created_at', twoHoursAgo)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error:', error.message);
    return;
  }

  if (!data ||data.length === 0) {
    console.log('No recent videos found\n');
    return;
  }

  console.log(`Found ${data.length} videos from last 2 hours:\n`);

  data.forEach((v: any, i: number) => {
    const flag = v.is_demo_content ? '✅ DEMO' : '❌ TEST';
    console.log(`${i + 1}. [${flag}] ${v.title}`);
    console.log(`   ID: ${v.id}`);
    console.log(`   Created: ${new Date(v.created_at).toLocaleString()}\n`);
  });

  // Update the non-demo ones
  const nonDemoIds = data.filter((v: any) => !v.is_demo_content).map((v: any) => v.id);

  if (nonDemoIds.length > 0) {
    console.log(`\n🔧 Updating ${nonDemoIds.length} videos to is_demo_content = true...`);

    const { error: updateError } = await supabase
      .from('videos')
      .update({ is_demo_content: true })
      .in('id', nonDemoIds);

    if (updateError) {
      console.error('Error updating:', updateError.message);
    } else {
      console.log('✅ All videos now marked as demo content\n');
    }
  }
}

findAllVideos();
