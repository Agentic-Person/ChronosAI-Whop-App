/**
 * Assign orphaned videos (without course_id) to the main demo course
 */

import { config } from 'dotenv';
config({ path: '.env.local' });

import { createAdminClient } from '../lib/supabase/admin';

async function assignVideos() {
  const supabase = createAdminClient();
  const devCreatorId = '00000000-0000-0000-0000-000000000001';
  const mainCourseId = '98e45c09-b513-4019-9eca-a7f16d241241'; // Getting Started with Whop

  try {
    console.log('🔍 Finding orphaned videos...\n');

    // Find videos without course_id
    const { data: orphanedVideos, error: fetchError } = await supabase
      .from('videos')
      .select('id, title')
      .eq('creator_id', devCreatorId)
      .is('course_id', null);

    if (fetchError) {
      console.error('❌ Error fetching videos:', fetchError);
      return;
    }

    console.log(`Found ${orphanedVideos?.length || 0} orphaned videos\n`);

    if (!orphanedVideos || orphanedVideos.length === 0) {
      console.log('✅ No orphaned videos found. All videos are assigned to courses.');
      return;
    }
    // Assign each orphaned video to the main course
    console.log(`Assigning ${orphanedVideos.length} videos to course: Getting Started with Whop\n`);

    for (const video of orphanedVideos) {
      const { error: updateError } = await supabase
        .from('videos')
        .update({ course_id: mainCourseId })
        .eq('id', video.id);

      if (updateError) {
        console.error(`❌ Failed to assign video: ${video.title}`, updateError);
      } else {
        console.log(`✅ Assigned: ${video.title.substring(0, 60)}`);
      }
    }

    // Update course video_count
    const { data: courseVideos, error: countError } = await supabase
      .from('videos')
      .select('id')
      .eq('course_id', mainCourseId);

    if (!countError && courseVideos) {
      const { error: updateCountError } = await supabase
        .from('courses')
        .update({ video_count: courseVideos.length })
        .eq('id', mainCourseId);

      if (updateCountError) {
        console.error('❌ Failed to update course video count:', updateCountError);
      } else {
        console.log(`\n✅ Updated course video count: ${courseVideos.length} videos`);
      }
    }

    console.log('\n🎉 All orphaned videos assigned to course!');

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

assignVideos();
