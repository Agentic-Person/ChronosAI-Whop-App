#!/usr/bin/env tsx

/**
 * Test the chunking timestamp fix by re-importing a demo video
 */

import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const apiKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const testVideo = {
  url: 'https://youtu.be/e6NKN9QlirM',
  title: 'Whop Tutorial For Beginners 2025 (Test)',
};

async function testChunkingFix() {
  console.log('🧪 Testing chunking timestamp fix...\n');
  console.log(`📹 Video: ${testVideo.title}`);
  console.log(`🔗 URL: ${testVideo.url}\n`);

  try {
    const response = await fetch('http://localhost:3001/api/video/youtube-import', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'x-creator-id': '00000000-0000-0000-0000-000000000001',
      },
      body: JSON.stringify({
        youtubeUrl: testVideo.url,
        is_demo_content: true,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('❌ Import failed:', error);
      process.exit(1);
    }

    const data = await response.json();
    console.log('✅ Video imported successfully!');
    console.log(`   Video ID: ${data.id}`);
    console.log(`   Title: ${data.title}`);
    console.log(`   Duration: ${data.duration}\n`);

    console.log('🔍 Check server logs above for:');
    console.log('   1. Chunk timestamps should now be progressive (not all 0.00s)');
    console.log('   2. Should see "✅ Chunks stored" instead of "⚠️ RAG processing failed"');
    console.log('   3. No ChunkingError should occur\n');

  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

testChunkingFix();
