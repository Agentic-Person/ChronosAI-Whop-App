#!/usr/bin/env tsx

/**
 * Cleanup: Remove test videos in batches
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const BATCH_SIZE = 1000;
const CREATOR_ID = '00000000-0000-0000-0000-000000000001';

async function cleanup() {
  console.log('🧹 Starting batched cleanup...\n');

  // Count initial state
  const { count: totalBefore } = await supabase
    .from('videos')
    .select('*', { count: 'exact', head: true })
    .eq('creator_id', CREATOR_ID);

  const { count: demoBefore } = await supabase
    .from('videos')
    .select('*', { count: 'exact', head: true })
    .eq('creator_id', CREATOR_ID)
    .eq('is_demo_content', true);

  console.log(`Initial state:`);
  console.log(`  Total: ${totalBefore}`);
  console.log(`  Demo: ${demoBefore}`);
  console.log(`  Test: ${(totalBefore || 0) - (demoBefore || 0)}\n`);

  let totalDeleted = 0;
  let batchNum = 1;

  while (true) {
    console.log(`\n📦 Processing batch ${batchNum}...`);

    // Get IDs of non-demo videos (limit to batch size)
    const { data: testVideos, error: fetchError } = await supabase
      .from('videos')
      .select('id')
      .eq('creator_id', CREATOR_ID)
      .eq('is_demo_content', false)
      .limit(BATCH_SIZE);

    if (fetchError) {
      console.error('❌ Error fetching videos:', fetchError.message);
      break;
    }

    if (!testVideos || testVideos.length === 0) {
      console.log('✅ No more test videos to delete!');
      break;
    }

    console.log(`   Found ${testVideos.length} videos to delete`);

    // Delete chunks first (foreign key constraint)
    const videoIds = testVideos.map((v: any) => v.id);

    const { error: chunkError } = await supabase
      .from('video_chunks')
      .delete()
      .in('video_id', videoIds);

    if (chunkError) {
      console.error('❌ Error deleting chunks:', chunkError.message);
    } else {
      console.log('   Deleted related chunks');
    }

    // Delete videos
    const { error: deleteError } = await supabase
      .from('videos')
      .delete()
      .in('id', videoIds);

    if (deleteError) {
      console.error('❌ Error deleting videos:', deleteError.message);
      break;
    }

    totalDeleted += testVideos.length;
    console.log(`   ✅ Deleted ${testVideos.length} videos (${totalDeleted} total)`);

    batchNum++;

    // Small delay between batches
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  // Final count
  const { count: totalAfter } = await supabase
    .from('videos')
    .select('*', { count: 'exact', head: true })
    .eq('creator_id', CREATOR_ID);

  console.log(`\n✅ Cleanup complete!`);
  console.log(`  Deleted: ${totalDeleted} videos`);
  console.log(`  Remaining: ${totalAfter} videos\n`);
}

cleanup();
