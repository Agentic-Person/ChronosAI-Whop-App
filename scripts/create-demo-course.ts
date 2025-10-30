#!/usr/bin/env tsx

/**
 * Create demo course with 4 Whop tutorial videos
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function createDemoCourse() {
  console.log('📚 Creating demo course with 4 Whop videos...\n');

  // Get the 4 demo videos
  const { data: videos, error: videoError } = await supabase
    .from('videos')
    .select('id, title')
    .eq('creator_id', '00000000-0000-0000-0000-000000000001')
    .eq('is_demo_content', true)
    .order('created_at', { ascending: true });

  if (videoError || !videos || videos.length === 0) {
    console.error('❌ Error fetching demo videos:', videoError?.message);
    return;
  }

  console.log(`✅ Found ${videos.length} demo videos:\n`);
  videos.forEach((v: any, i: number) => {
    console.log(`${i + 1}. ${v.title}`);
  });

  // Check if course already exists
  const { data: existingCourse } = await supabase
    .from('courses')
    .select('id, title')
    .eq('creator_id', '00000000-0000-0000-0000-000000000001')
    .eq('is_demo', true)
    .single();

  if (existingCourse) {
    console.log(`\n✅ Demo course already exists: "${existingCourse.title}"`);
    console.log(`   ID: ${existingCourse.id}\n`);
    return;
  }

  // Create the course
  const { data: course, error: courseError } = await supabase
    .from('courses')
    .insert({
      creator_id: '00000000-0000-0000-0000-000000000001',
      title: 'Getting Started with Whop',
      description: 'Learn the fundamentals of selling digital products on Whop. This demo course covers platform basics, digital downloads, course creation, and scaling strategies.',
      is_demo: true,
    })
    .select()
    .single();

  if (courseError) {
    console.error('\n❌ Error creating course:', courseError.message);
    return;
  }

  console.log(`\n✅ Course created: "${course.title}"`);
  console.log(`   ID: ${course.id}`);

  // Add videos to course
  console.log(`\n📹 Adding videos to course...`);

  for (let i = 0; i < videos.length; i++) {
    const { error: updateError } = await supabase
      .from('videos')
      .update({ course_id: course.id })
      .eq('id', videos[i].id);

    if (updateError) {
      console.error(`  ❌ Error adding video ${i + 1}:`, updateError.message);
    } else {
      console.log(`  ✅ Added: ${videos[i].title}`);
    }
  }

  console.log(`\n🎉 Demo course setup complete!\n`);
  console.log('Summary:');
  console.log(`  Course: "Getting Started with Whop"`);
  console.log(`  Videos: ${videos.length}`);
  console.log(`  Course ID: ${course.id}\n`);
}

createDemoCourse();
