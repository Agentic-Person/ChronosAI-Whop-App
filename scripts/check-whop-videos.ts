#!/usr/bin/env tsx

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkWhopVideos() {
  console.log('🔍 Checking for Whop tutorial videos...\n');

  // Check for videos with "Whop" in title
  const { data: whopVideos, error } = await supabase
    .from('videos')
    .select('id, title, created_at, is_demo_content')
    .eq('creator_id', '00000000-0000-0000-0000-000000000001')
    .ilike('title', '%Whop%')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('❌ Error:', error.message);
    return;
  }

  if (!whopVideos || whopVideos.length === 0) {
    console.log('❌ No Whop videos found\n');
  } else {
    console.log(`✅ Found ${whopVideos.length} Whop videos:\n`);
    whopVideos.forEach((v: any, i: number) => {
      console.log(`${i + 1}. ${v.title}`);
      console.log(`   Created: ${new Date(v.created_at).toLocaleString()}`);
      console.log(`   Demo flag: ${v.is_demo_content}\n`);
    });
  }

  // Also check for recently created videos (last hour)
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { data: recentVideos } = await supabase
    .from('videos')
    .select('id, title, created_at, is_demo_content')
    .eq('creator_id', '00000000-0000-0000-0000-000000000001')
    .gte('created_at', oneHourAgo)
    .order('created_at', { ascending: false })
    .limit(10);

  if (recentVideos && recentVideos.length > 0) {
    console.log(`\n📅 Recently created videos (last hour): ${recentVideos.length}\n`);
    recentVideos.forEach((v: any) => {
      console.log(`- ${v.title}`);
      console.log(`  Demo: ${v.is_demo_content}, Created: ${new Date(v.created_at).toLocaleString()}\n`);
    });
  }
}

checkWhopVideos();
