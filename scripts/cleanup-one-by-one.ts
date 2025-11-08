#!/usr/bin/env tsx

/**
 * Nuclear cleanup: Delete test videos ONE AT A TIME
 * Slow but guaranteed to work around timeout issues
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const CREATOR_ID = '00000000-0000-0000-0000-000000000001';

async function cleanup() {
  console.log('🧹 Starting aggressive one-by-one cleanup...\n');

  // Count initial
  const { count: before } = await supabase
    .from('videos')
    .select('*', { count: 'exact', head: true })
    .eq('creator_id', CREATOR_ID);

  const { count: demoBefore } = await supabase
    .from('videos')
    .select('*', { count: 'exact', head: true })
    .eq('creator_id', CREATOR_ID)
    .eq('is_demo_content', true);

  console.log(`📊 Initial State:`);
  console.log(`   Total: ${before}`);
  console.log(`   Demo: ${demoBefore}`);
  console.log(`   Test: ${(before || 0) - (demoBefore || 0)}\n`);

  let deleted = 0;
  let errors = 0;
  let skipped = 0;

  console.log('🔥 Deleting test videos...\n');

  while (true) {
    // Get ONE test video
    const { data: videos } = await supabase
      .from('videos')
      .select('id, title')
      .eq('creator_id', CREATOR_ID)
      .eq('is_demo_content', false)
      .limit(1);

    if (!videos || videos.length === 0) {
      console.log('\n✅ No more test videos found!');
      break;
    }

    const video = videos[0];

    // Delete chunks first
    const { error: chunkError } = await supabase
      .from('video_chunks')
      .delete()
      .eq('video_id', video.id);

    if (chunkError && !chunkError.message.includes('No rows found')) {
      console.log(`⚠️  Chunk delete error for ${video.id}: ${chunkError.message}`);
    }

    // Delete video
    const { error: videoError } = await supabase
      .from('videos')
      .delete()
      .eq('id', video.id);

    if (videoError) {
      errors++;
      console.log(`❌ Video delete failed: ${videoError.message}`);
      skipped++;

      if (skipped > 10) {
        console.log('\n⚠️  Too many consecutive errors. Stopping.');
        break;
      }
    } else {
      deleted++;
      skipped = 0;

      // Progress update every 100 videos
      if (deleted % 100 === 0) {
        console.log(`   🗑️  Deleted ${deleted} videos...`);
      }
    }

    // Tiny delay to avoid rate limiting
    if (deleted % 50 === 0) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  // Final count
  const { count: after } = await supabase
    .from('videos')
    .select('*', { count: 'exact', head: true })
    .eq('creator_id', CREATOR_ID);

  console.log(`\n📊 Final State:`);
  console.log(`   Remaining: ${after} videos`);
  console.log(`   Deleted: ${deleted} videos`);
  console.log(`   Errors: ${errors}\n`);

  if (after && after > 10) {
    console.log('⚠️  Still have many videos left. Run this script again or use Supabase SQL Editor.');
  } else {
    console.log('✅ Database cleaned! Only demo videos remain.\n');
  }
}

cleanup().catch(console.error);
