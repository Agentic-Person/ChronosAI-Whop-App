#!/usr/bin/env tsx

/**
 * Cleanup using direct SQL
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function cleanup() {
  console.log('🧹 Running SQL cleanup...\n');

  // Count before
  const { count: before } = await supabase
    .from('videos')
    .select('*', { count: 'exact', head: true })
    .eq('creator_id', '00000000-0000-0000-0000-000000000001');

  console.log(`Before: ${before} videos\n`);

  // Delete chunks for non-demo videos first
  console.log('Deleting chunks...');
  const { error: chunkError } = await supabase.rpc('execute_sql', {
    query: `
      DELETE FROM video_chunks
      WHERE video_id IN (
        SELECT id FROM videos
        WHERE creator_id = '00000000-0000-0000-0000-000000000001'
        AND is_demo_content = false
      )
    `
  });

  if (chunkError) {
    console.log('Trying alternative: delete test video rows directly');

    // Try direct delete with simple query
    const { error: directError } = await supabase
      .from('videos')
      .delete()
      .eq('creator_id', '00000000-0000-0000-0000-000000000001')
      .eq('is_demo_content', false)
      .limit(10);

    if (directError) {
      console.error('❌ Delete failed:', directError);
      console.log('\n💡 Tip: You may need to delete these via Supabase SQL Editor:');
      console.log('   DELETE FROM videos WHERE creator_id = \'00000000-0000-0000-0000-000000000001\' AND is_demo_content = false;');
    } else {
      console.log('✅ Deleted 10 test videos. Run script repeatedly to delete all.');
    }
  }

  // Count after
  const { count: after } = await supabase
    .from('videos')
    .select('*', { count: 'exact', head: true })
    .eq('creator_id', '00000000-0000-0000-0000-000000000001');

  console.log(`\nAfter: ${after} videos`);
  console.log(`Deleted: ${(before || 0) - (after || 0)} videos\n`);
}

cleanup();
