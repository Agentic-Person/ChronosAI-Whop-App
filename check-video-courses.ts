import { config } from 'dotenv';
config({ path: '.env.local' });

import { createAdminClient } from './lib/supabase/admin';

async function checkVideoCourses() {
  const supabase = createAdminClient();
  
  console.log('🔍 Checking video course assignments...\n');
  
  // Check videos with course_id
  const { data: videos, error } = await supabase
    .from('videos')
    .select('id, title, course_id, is_demo_content')
    .eq('creator_id', '00000000-0000-0000-0000-000000000001')
    .order('created_at');
  
  if (error) {
    console.error('❌ Error:', error);
    return;
  }
  
  const videosWithCourse = (videos || []).filter(v => v.course_id);
  const videosWithoutCourse = (videos || []).filter(v => !v.course_id);
  
  console.log(`Total videos: ${videos ? videos.length : 0}`);
  console.log(`Videos WITH course_id: ${videosWithCourse.length}`);
  console.log(`Videos WITHOUT course_id: ${videosWithoutCourse.length}\n`);
  
  if (videosWithoutCourse.length > 0) {
    console.log('⚠️  Videos without course_id:');
    videosWithoutCourse.forEach(v => {
      console.log(`  - ${v.title.substring(0, 50)}`);
    });
    console.log('');
  }
  
  // Check courses
  const { data: courses, error: coursesError } = await supabase
    .from('courses')
    .select('id, title, video_count')
    .eq('creator_id', '00000000-0000-0000-0000-000000000001');
  
  if (coursesError) {
    console.error('❌ Courses error:', coursesError);
    return;
  }
  
  console.log(`\n📚 Courses for dev creator:`);
  if (courses) {
    courses.forEach(c => {
      console.log(`  - ${c.title} (${c.video_count || 0} videos) [ID: ${c.id}]`);
    });
  }
}

checkVideoCourses();
