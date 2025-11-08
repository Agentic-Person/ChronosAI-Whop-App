import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function checkState() {
  console.log('🔍 Checking database state...\n');

  // Check if trial migration applied
  const { data: videos, error: vidError } = await supabase
    .from('videos')
    .select('is_demo_content')
    .limit(1);

  const migrationApplied = !vidError && videos && videos.length > 0 && videos[0].hasOwnProperty('is_demo_content');
  console.log('✓ Trial migration applied:', migrationApplied);

  // Count videos
  const { count: totalVideos } = await supabase
    .from('videos')
    .select('*', { count: 'exact', head: true });

  const { count: demoVideos } = await supabase
    .from('videos')
    .select('*', { count: 'exact', head: true })
    .eq('is_demo_content', true);

  console.log(`\nVideos: ${totalVideos} total, ${demoVideos || 0} demo, ${(totalVideos || 0) - (demoVideos || 0)} test`);

  // Count courses
  const { count: totalCourses } = await supabase
    .from('courses')
    .select('*', { count: 'exact', head: true });

  const { count: demoCourses } = await supabase
    .from('courses')
    .select('*', { count: 'exact', head: true })
    .eq('is_demo', true);

  console.log(`Courses: ${totalCourses || 0} total, ${demoCourses || 0} demo`);

  // Check for chunks
  const { count: totalChunks } = await supabase
    .from('video_chunks')
    .select('*', { count: 'exact', head: true });

  console.log(`Chunks: ${totalChunks || 0} total\n`);
}

checkState();
