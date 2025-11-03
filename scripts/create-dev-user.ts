/**
 * Create dev user in database for development
 */

import { config } from 'dotenv';
config({ path: '.env.local' });

import { createAdminClient } from '../lib/supabase/admin';

async function createDevUser() {
  const supabase = createAdminClient();

  const devUserId = '00000000-0000-0000-0000-000000000001';

  try {
    // Create dev student
    const { data: student, error: studentError } = await supabase
      .from('students')
      .upsert({
        id: devUserId,
        email: 'dev@chronos-ai.app',
        name: 'Dev User',
        whop_user_id: 'user_dev_000',
        whop_membership_id: 'mem_dev_000',
      })
      .select()
      .single();

    if (studentError) {
      console.error('❌ Failed to create dev student:', studentError);
      return;
    }

    console.log('✅ Dev student created:', student);

    // Create dev creator
    const { data: creator, error: creatorError } = await supabase
      .from('creators')
      .upsert({
        id: devUserId,
        whop_company_id: 'biz_dev_000',
        whop_user_id: 'user_dev_000',
        company_name: 'Dev Creator',
      })
      .select()
      .single();

    if (creatorError) {
      console.error('❌ Failed to create dev creator:', creatorError);
      return;
    }

    console.log('✅ Dev creator created:', creator);

    // Try to create enrollment (student enrolled with creator)
    // Note: This table may not exist in current schema - it's optional for chat functionality
    try {
      const { data: enrollment, error: enrollmentError } = await supabase
        .from('student_creator_enrollments')
        .upsert({
          student_id: devUserId,
          creator_id: devUserId,
          status: 'active',
        })
        .select()
        .single();

      if (enrollmentError && enrollmentError.code !== '23505') { // Ignore duplicate key error
        console.warn('⚠️  Enrollment table not found (optional):', enrollmentError.message);
      } else {
        console.log('✅ Dev enrollment created:', enrollment);
      }
    } catch (enrollmentErr) {
      console.warn('⚠️  Could not create enrollment (table may not exist - this is okay)');
    }

    console.log('\n🎉 Dev user setup complete!');

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

createDevUser();
