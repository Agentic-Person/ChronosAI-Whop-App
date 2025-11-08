#!/usr/bin/env tsx

/**
 * Cleanup: Remove all test videos, keep only demo-flagged videos
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function cleanup() {
  console.log('🧹 Cleaning up database...\n');

  // Count videos before cleanup
  const { count: totalBefore } = await supabase
    .from('videos')
    .select('*', { count: 'exact', head: true })
    .eq('creator_id', '00000000-0000-0000-0000-000000000001');

  const { count: demoBefore } = await supabase
    .from('videos')
    .select('*', { count: 'exact', head: true })
    .eq('creator_id', '00000000-0000-0000-0000-000000000001')
    .eq('is_demo_content', true);

  console.log(`Before cleanup:`);
  console.log(`  Total videos: ${totalBefore}`);
  console.log(`  Demo videos: ${demoBefore}`);
  console.log(`  Test videos: ${(totalBefore || 0) - (demoBefore || 0)}\n`);

  // Get demo videos to keep
  const { data: demoVideos } = await supabase
    .from('videos')
    .select('id, title')
    .eq('creator_id', '00000000-0000-0000-0000-000000000001')
    .eq('is_demo_content', true);

  console.log(`✅ Keeping ${demoVideos?.length || 0} demo videos:\n`);
  demoVideos?.forEach((v: any, i: number) => {
    console.log(`${i + 1}. ${v.title}`);
  });

  // Delete all NON-demo videos
  console.log(`\n🗑️  Deleting test videos...`);

  const { error } = await supabase
    .from('videos')
    .delete()
    .eq('creator_id', '00000000-0000-0000-0000-000000000001')
    .eq('is_demo_content', false);

  if (error) {
    console.error('❌ Error:', error.message);
    return;
  }

  // Count after cleanup
  const { count: totalAfter } = await supabase
    .from('videos')
    .select('*', { count: 'exact', head: true })
    .eq('creator_id', '00000000-0000-0000-0000-000000000001');

  console.log(`\n✅ Cleanup complete!`);
  console.log(`  Deleted: ${(totalBefore || 0) - (totalAfter || 0)} test videos`);
  console.log(`  Remaining: ${totalAfter} demo videos\n`);
}

cleanup();
