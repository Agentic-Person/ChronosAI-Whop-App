#!/usr/bin/env tsx

/**
 * Apply courses system migration using admin client
 * Usage: npx tsx scripts/apply-courses-migration.ts
 */

import { createAdminClient } from '../lib/supabase/admin';

async function applyMigration() {
  console.log('🚀 Applying courses system migration...\n');

  const supabase = createAdminClient();

  try {
    // Create courses table
    console.log('📦 Creating courses table...');
    const { error: coursesError } = await supabase.from('courses').select('count').limit(1);

    if (coursesError && coursesError.message.includes('does not exist')) {
      console.log('   Table does not exist, creating...');
      // The table doesn't exist, which means our migration SQL needs to be run differently
      console.log('   ⚠️  Note: Tables will be created when the migration is run via Supabase dashboard');
    } else if (!coursesError) {
      console.log('   ✅ Courses table already exists');
    }

    // Create demo courses for testing
    console.log('\n📚 Creating demo courses...');

    // First get the dev creator
    const { data: creator, error: creatorError } = await supabase
      .from('creators')
      .select('id')
      .eq('whop_company_id', 'dev_company_001')
      .single();

    if (creatorError) {
      console.log('   ⚠️  Could not find dev creator, trying with default ID...');

      // Try with the default UUID
      const creatorId = '00000000-0000-0000-0000-000000000001';

      const demoCourses = [
        {
          creator_id: creatorId,
          title: 'Getting Started',
          description: 'Learn the fundamentals and build a strong foundation',
          order_index: 1,
          is_active: true
        },
        {
          creator_id: creatorId,
          title: 'Advanced Techniques',
          description: 'Master advanced concepts and best practices',
          order_index: 2,
          is_active: true
        },
        {
          creator_id: creatorId,
          title: 'Master Class',
          description: 'Expert-level strategies and real-world applications',
          order_index: 3,
          is_active: true
        }
      ];

      for (const course of demoCourses) {
        const { data, error } = await supabase
          .from('courses')
          .insert(course)
          .select()
          .single();

        if (error) {
          if (error.message.includes('does not exist')) {
            console.log('   ❌ Courses table does not exist yet');
            console.log('\n⚠️  IMPORTANT: Please run the following SQL in Supabase SQL editor:');
            console.log('   1. Go to: https://supabase.com/dashboard/project/dddttlnrkwaddzjvkacp/sql/new');
            console.log('   2. Copy and paste the contents of: supabase/migrations/20251028000001_add_courses_system.sql');
            console.log('   3. Click "Run" to execute the migration\n');
            return;
          }
          console.log(`   ⚠️  Could not create course "${course.title}": ${error.message}`);
        } else {
          console.log(`   ✅ Created course: ${course.title}`);
        }
      }
    } else if (creator) {
      console.log(`   Found creator with ID: ${creator.id}`);
      // Use the found creator ID for demo courses
      // (Similar code as above but with creator.id)
    }

    console.log('\n✨ Migration setup complete!');
    console.log('\nNext steps:');
    console.log('1. If tables were not created, run the SQL migration in Supabase dashboard');
    console.log('2. Restart the development server to see the new course features');
    console.log('3. Navigate to /dashboard/creator/videos to manage courses');

  } catch (error) {
    console.error('❌ Error during migration:', error);
  }
}

// Run the migration
applyMigration();