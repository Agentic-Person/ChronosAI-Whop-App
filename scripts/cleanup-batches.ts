#!/usr/bin/env tsx

/**
 * Cleanup: Delete test videos in batches to avoid timeout
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function cleanupInBatches() {
  console.log('🧹 Deleting test videos in batches...\n');

  let totalDeleted = 0;
  let batchNumber = 1;

  while (true) {
    // Get 1000 test video IDs
    const { data: testVideos } = await supabase
      .from('videos')
      .select('id')
      .eq('creator_id', '00000000-0000-0000-0000-000000000001')
      .eq('is_demo_content', false)
      .limit(1000);

    if (!testVideos || testVideos.length === 0) {
      console.log('\n✅ All test videos deleted!');
      break;
    }

    console.log(`Batch ${batchNumber}: Deleting ${testVideos.length} videos...`);

    const ids = testVideos.map((v: any) => v.id);

    const { error } = await supabase
      .from('videos')
      .delete()
      .in('id', ids);

    if (error) {
      console.error('❌ Error:', error.message);
      break;
    }

    totalDeleted += testVideos.length;
    console.log(`  ✅ Deleted ${totalDeleted} total\n`);

    batchNumber++;

    // Small delay to avoid rate limits
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  console.log(`\n🎉 Cleanup complete! Deleted ${totalDeleted} test videos\n`);
}

cleanupInBatches();
