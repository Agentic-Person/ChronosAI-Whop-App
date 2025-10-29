/**
 * Test Data Preparation Script
 *
 * Generates test data for staging environment validation:
 * - Test creator accounts (2)
 * - Test student accounts (2)
 * - Test enrollments
 * - Sample video metadata
 *
 * Usage:
 *   npm run test:prepare-data          # Create test data
 *   npm run test:prepare-data --cleanup # Remove test data
 */

import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

// Environment validation
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ ERROR: Missing required environment variables');
  console.error('   NEXT_PUBLIC_SUPABASE_URL:', !!SUPABASE_URL);
  console.error('   SUPABASE_SERVICE_ROLE_KEY:', !!SUPABASE_SERVICE_KEY);
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// Test data configuration
const TEST_DATA_CONFIG = {
  creators: [
    {
      id: 'test-creator-a-' + crypto.randomUUID(),
      email: 'creator-a@test.videowizard.dev',
      name: 'Test Creator A (PRO)',
      plan: 'PRO',
      whop_company_id: 'test-company-a',
    },
    {
      id: 'test-creator-b-' + crypto.randomUUID(),
      email: 'creator-b@test.videowizard.dev',
      name: 'Test Creator B (FREE)',
      plan: 'FREE',
      whop_company_id: 'test-company-b',
    },
  ],
  students: [
    {
      id: 'test-student-1-' + crypto.randomUUID(),
      email: 'student-1@test.videowizard.dev',
      name: 'Test Student 1 (FREE)',
      plan: 'FREE',
      whop_user_id: 'test-user-1',
    },
    {
      id: 'test-student-2-' + crypto.randomUUID(),
      email: 'student-2@test.videowizard.dev',
      name: 'Test Student 2 (PRO)',
      plan: 'PRO',
      whop_user_id: 'test-user-2',
    },
  ],
};

/**
 * Create test creators
 */
async function createTestCreators() {
  console.log('\n📝 Creating test creators...');

  for (const creator of TEST_DATA_CONFIG.creators) {
    console.log(`\n  Creating: ${creator.name}`);
    console.log(`  ID: ${creator.id}`);
    console.log(`  Email: ${creator.email}`);
    console.log(`  Plan: ${creator.plan}`);

    // Check if creator already exists
    const { data: existing } = await supabase
      .from('creators')
      .select('id')
      .eq('email', creator.email)
      .single();

    if (existing) {
      console.log(`  ⚠️  Creator already exists, skipping`);
      continue;
    }

    // Create creator
    const { data, error } = await supabase
      .from('creators')
      .insert({
        id: creator.id,
        email: creator.email,
        name: creator.name,
        whop_company_id: creator.whop_company_id,
        subscription_tier: creator.plan,
        onboarding_completed: true,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error(`  ❌ Error creating creator: ${error.message}`);
    } else {
      console.log(`  ✅ Creator created successfully`);
    }
  }
}

/**
 * Create test students
 */
async function createTestStudents() {
  console.log('\n📝 Creating test students...');

  for (const student of TEST_DATA_CONFIG.students) {
    console.log(`\n  Creating: ${student.name}`);
    console.log(`  ID: ${student.id}`);
    console.log(`  Email: ${student.email}`);
    console.log(`  Plan: ${student.plan}`);

    // Check if student already exists
    const { data: existing } = await supabase
      .from('students')
      .select('id')
      .eq('email', student.email)
      .single();

    if (existing) {
      console.log(`  ⚠️  Student already exists, skipping`);
      continue;
    }

    // Create student
    const { data, error } = await supabase
      .from('students')
      .insert({
        id: student.id,
        email: student.email,
        name: student.name,
        whop_user_id: student.whop_user_id,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error(`  ❌ Error creating student: ${error.message}`);
    } else {
      console.log(`  ✅ Student created successfully`);
    }
  }
}

/**
 * Create test enrollments
 */
async function createTestEnrollments() {
  console.log('\n📝 Creating test enrollments...');

  // Enroll both students with Creator A
  const creatorA = TEST_DATA_CONFIG.creators[0];

  for (const student of TEST_DATA_CONFIG.students) {
    console.log(`\n  Enrolling: ${student.name} with ${creatorA.name}`);

    // Check if enrollment exists
    const { data: existing } = await supabase
      .from('enrollments')
      .select('id')
      .eq('student_id', student.id)
      .eq('creator_id', creatorA.id)
      .single();

    if (existing) {
      console.log(`  ⚠️  Enrollment already exists, skipping`);
      continue;
    }

    // Create enrollment
    const { data, error } = await supabase
      .from('enrollments')
      .insert({
        student_id: student.id,
        creator_id: creatorA.id,
        status: 'active',
        enrolled_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error(`  ❌ Error creating enrollment: ${error.message}`);
    } else {
      console.log(`  ✅ Enrollment created successfully`);
    }
  }
}

/**
 * Create sample test questions for RAG testing
 */
async function createTestQuestions() {
  console.log('\n📝 Creating test questions...');

  const questions = [
    {
      category: 'Machine Learning',
      question: 'What is supervised learning?',
      expected_keywords: ['supervised learning', 'labeled data', 'training'],
    },
    {
      category: 'Machine Learning',
      question: 'What are neural networks?',
      expected_keywords: ['neural networks', 'layers', 'neurons'],
    },
    {
      category: 'General',
      question: 'What is this video about?',
      expected_keywords: ['introduction', 'overview', 'summary'],
    },
  ];

  console.log(`  Generated ${questions.length} test questions:`);
  questions.forEach((q, i) => {
    console.log(`    ${i + 1}. [${q.category}] ${q.question}`);
  });

  return questions;
}

/**
 * Generate test video files info
 */
async function generateTestVideoInfo() {
  console.log('\n📝 Test video file requirements:');
  console.log('\n  Please prepare the following video files in ./test-data/ directory:');
  console.log('\n  1. test-video-5mb.mp4');
  console.log('     - Size: ~5MB');
  console.log('     - Duration: 2-3 minutes');
  console.log('     - Content: Educational content with known transcript');
  console.log('\n  2. test-video-50mb.mp4');
  console.log('     - Size: ~50MB');
  console.log('     - Duration: 10 minutes');
  console.log('     - Content: Educational content with known transcript');
  console.log('\n  3. YouTube video URL');
  console.log('     - Public video');
  console.log('     - Educational content');
  console.log('     - Duration: 5-10 minutes');
}

/**
 * Output test credentials for manual testing
 */
async function outputTestCredentials() {
  console.log('\n' + '='.repeat(80));
  console.log('📋 TEST CREDENTIALS - Save these for manual testing');
  console.log('='.repeat(80));

  console.log('\n🔑 Creator Accounts:\n');
  TEST_DATA_CONFIG.creators.forEach((creator, i) => {
    console.log(`Creator ${i + 1}: ${creator.name}`);
    console.log(`  ID:    ${creator.id}`);
    console.log(`  Email: ${creator.email}`);
    console.log(`  Plan:  ${creator.plan}`);
    console.log();
  });

  console.log('🎓 Student Accounts:\n');
  TEST_DATA_CONFIG.students.forEach((student, i) => {
    console.log(`Student ${i + 1}: ${student.name}`);
    console.log(`  ID:    ${student.id}`);
    console.log(`  Email: ${student.email}`);
    console.log(`  Plan:  ${student.plan}`);
    console.log();
  });

  console.log('📊 Enrollments:\n');
  console.log(`  Both students enrolled with: ${TEST_DATA_CONFIG.creators[0].name}`);
  console.log();

  console.log('🔗 Quick Test Commands:\n');
  console.log('  # Test authentication (should succeed):');
  console.log(`  curl -X POST https://staging-url.vercel.app/api/video/upload-url \\`);
  console.log(`    -H "Content-Type: application/json" \\`);
  console.log(`    -H "x-creator-id: ${TEST_DATA_CONFIG.creators[0].id}" \\`);
  console.log(`    -d '{"filename": "test.mp4", "contentType": "video/mp4", "fileSize": 1000000}'`);
  console.log();
  console.log('  # Test multi-tenant isolation (should fail):');
  console.log(`  curl -X POST https://staging-url.vercel.app/api/video/upload-url \\`);
  console.log(`    -H "Content-Type: application/json" \\`);
  console.log(`    -H "x-creator-id: ${TEST_DATA_CONFIG.creators[1].id}" \\`);
  console.log(`    -d '{"filename": "test.mp4", "contentType": "video/mp4", "fileSize": 1000000}'`);
  console.log();

  console.log('='.repeat(80));
}

/**
 * Cleanup test data
 */
async function cleanupTestData() {
  console.log('\n🧹 Cleaning up test data...');

  // Delete enrollments
  console.log('\n  Deleting test enrollments...');
  const studentIds = TEST_DATA_CONFIG.students.map(s => s.id);
  const { error: enrollError } = await supabase
    .from('enrollments')
    .delete()
    .in('student_id', studentIds);

  if (enrollError) {
    console.error(`  ❌ Error deleting enrollments: ${enrollError.message}`);
  } else {
    console.log(`  ✅ Enrollments deleted`);
  }

  // Delete students
  console.log('\n  Deleting test students...');
  const { error: studentError } = await supabase
    .from('students')
    .delete()
    .in('id', studentIds);

  if (studentError) {
    console.error(`  ❌ Error deleting students: ${studentError.message}`);
  } else {
    console.log(`  ✅ Students deleted`);
  }

  // Delete creators
  console.log('\n  Deleting test creators...');
  const creatorIds = TEST_DATA_CONFIG.creators.map(c => c.id);
  const { error: creatorError } = await supabase
    .from('creators')
    .delete()
    .in('id', creatorIds);

  if (creatorError) {
    console.error(`  ❌ Error deleting creators: ${creatorError.message}`);
  } else {
    console.log(`  ✅ Creators deleted`);
  }

  console.log('\n✨ Cleanup complete!');
}

/**
 * Main execution
 */
async function main() {
  const args = process.argv.slice(2);
  const isCleanup = args.includes('--cleanup');

  console.log('\n' + '='.repeat(80));
  console.log('🧪 TEST DATA PREPARATION SCRIPT');
  console.log('='.repeat(80));
  console.log(`Environment: ${SUPABASE_URL}`);
  console.log(`Mode: ${isCleanup ? 'CLEANUP' : 'CREATE'}`);
  console.log('='.repeat(80));

  try {
    if (isCleanup) {
      await cleanupTestData();
    } else {
      await createTestCreators();
      await createTestStudents();
      await createTestEnrollments();
      await createTestQuestions();
      await generateTestVideoInfo();
      await outputTestCredentials();

      console.log('\n✨ Test data preparation complete!');
      console.log('\n📝 Next steps:');
      console.log('  1. Save the test credentials above');
      console.log('  2. Prepare test video files in ./test-data/ directory');
      console.log('  3. Wait for staging deployment');
      console.log('  4. Run test execution plan');
      console.log('\n  To cleanup test data later, run:');
      console.log('    npm run test:prepare-data --cleanup');
    }
  } catch (error) {
    console.error('\n❌ Fatal error:', error);
    process.exit(1);
  }
}

// Run main function
main();
