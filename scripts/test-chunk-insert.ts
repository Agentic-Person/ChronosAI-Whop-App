#!/usr/bin/env tsx

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function testChunkInsert() {
  console.log('🧪 Testing chunk insert...\n');

  // Try to insert a minimal test chunk
  const testChunk = {
    video_id: '00000000-0000-0000-0000-000000000000', // Test video ID
    // creator_id removed - column doesn't exist in video_chunks table
    chunk_text: 'Test chunk text',
    chunk_index: 0,
    start_timestamp: 0,
    end_timestamp: 10,
    word_count: 3,
    metadata: { created_by: 'test' },
  };

  console.log('Attempting to insert:', JSON.stringify(testChunk, null, 2));

  const { data, error } = await supabase
    .from('video_chunks')
    .insert([testChunk])
    .select();

  if (error) {
    console.error('\n❌ INSERT FAILED:');
    console.error('Error code:', error.code);
    console.error('Error message:', error.message);
    console.error('Error details:', error.details);
    console.error('Error hint:', error.hint);
  } else {
    console.log('\n✅ INSERT SUCCEEDED:');
    console.log('Data:', data);
  }
}

testChunkInsert();
