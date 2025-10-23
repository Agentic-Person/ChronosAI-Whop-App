/**
 * Test Data Setup Script
 * Creates sample creators, students, videos, and other test data
 * for local development and testing
 *
 * Usage:
 *   tsx scripts/setup-test-data.ts
 *   tsx scripts/setup-test-data.ts --clear  # Clear existing test data first
 */

import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials');
  console.error('Required: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

// Test data configuration
const TEST_DATA = {
  creators: [
    {
      id: 'test_creator_a',
      email: 'creator.a@test.com',
      whop_user_id: 'whop_creator_a_123',
      whop_company_id: 'company_a_456',
      company_name: 'Alpha Trading Academy',
      subscription_tier: 'PRO',
      membership_tier: 'PRO',
      membership_valid: true,
      settings: {
        branding: {
          primary_color: '#3B82F6',
          logo_url: 'https://via.placeholder.com/150',
        },
        notifications: {
          email_enabled: true,
          webhook_url: 'https://webhook.test/creator-a',
        },
      },
    },
    {
      id: 'test_creator_b',
      email: 'creator.b@test.com',
      whop_user_id: 'whop_creator_b_234',
      whop_company_id: 'company_b_567',
      company_name: 'Beta Fitness Coaching',
      subscription_tier: 'BASIC',
      membership_tier: 'BASIC',
      membership_valid: true,
      settings: {
        branding: {
          primary_color: '#10B981',
          logo_url: 'https://via.placeholder.com/150',
        },
      },
    },
    {
      id: 'test_creator_c',
      email: 'creator.c@test.com',
      whop_user_id: 'whop_creator_c_345',
      whop_company_id: 'company_c_678',
      company_name: 'Gamma Real Estate Mastery',
      subscription_tier: 'ENTERPRISE',
      membership_tier: 'ENTERPRISE',
      membership_valid: true,
      settings: {},
    },
  ],

  students: [
    // Creator A's students
    {
      id: 'test_student_a1',
      email: 'student.a1@test.com',
      creator_id: 'test_creator_a',
      whop_membership_id: 'mem_a1_789',
      membership_tier: 'BASIC',
      membership_status: 'active',
      learning_preferences: {
        pace: 'normal',
        difficulty: 'beginner',
      },
      onboarding_completed: true,
    },
    {
      id: 'test_student_a2',
      email: 'student.a2@test.com',
      creator_id: 'test_creator_a',
      whop_membership_id: 'mem_a2_890',
      membership_tier: 'PRO',
      membership_status: 'active',
      learning_preferences: {
        pace: 'fast',
        difficulty: 'advanced',
      },
      onboarding_completed: true,
    },
    // Creator B's students
    {
      id: 'test_student_b1',
      email: 'student.b1@test.com',
      creator_id: 'test_creator_b',
      whop_membership_id: 'mem_b1_901',
      membership_tier: 'BASIC',
      membership_status: 'active',
      learning_preferences: {
        pace: 'slow',
        difficulty: 'beginner',
      },
      onboarding_completed: false,
    },
  ],

  videos: [
    // Creator A's videos
    {
      id: 'test_video_a1',
      creator_id: 'test_creator_a',
      title: 'Introduction to Day Trading',
      description: 'Learn the fundamentals of day trading strategies',
      youtube_url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      duration_seconds: 1800,
      processing_status: 'completed',
      transcript: 'Welcome to day trading 101. In this video, we will cover the basics of day trading including market analysis, risk management, and entry strategies...',
    },
    {
      id: 'test_video_a2',
      creator_id: 'test_creator_a',
      title: 'Advanced Chart Patterns',
      description: 'Master technical analysis with advanced chart patterns',
      youtube_url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      duration_seconds: 2400,
      processing_status: 'completed',
      transcript: 'Chart patterns are essential tools for traders. Today we explore head and shoulders, double tops, and triangle patterns...',
    },
    // Creator B's videos
    {
      id: 'test_video_b1',
      creator_id: 'test_creator_b',
      title: 'Full Body Workout Routine',
      description: 'Complete workout guide for building strength',
      youtube_url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      duration_seconds: 3600,
      processing_status: 'completed',
      transcript: 'Welcome to this full body workout. We will start with warm-up exercises, then move to compound movements...',
    },
  ],

  video_chunks: [
    {
      video_id: 'test_video_a1',
      content: 'Welcome to day trading 101. In this video, we will cover the basics of day trading including market analysis, risk management, and entry strategies.',
      chunk_index: 0,
      start_time: 0,
      end_time: 300,
      // Mock embedding (1536 dimensions for OpenAI ada-002)
      embedding: Array(1536).fill(0).map(() => Math.random()),
    },
    {
      video_id: 'test_video_a1',
      content: 'Risk management is crucial in day trading. Never risk more than 1-2% of your capital on a single trade. Use stop losses to protect your positions.',
      chunk_index: 1,
      start_time: 300,
      end_time: 600,
      embedding: Array(1536).fill(0).map(() => Math.random()),
    },
    {
      video_id: 'test_video_b1',
      content: 'Full body workouts are efficient for building overall strength. We focus on compound movements like squats, deadlifts, and bench press.',
      chunk_index: 0,
      start_time: 0,
      end_time: 300,
      embedding: Array(1536).fill(0).map(() => Math.random()),
    },
  ],

  learning_progress: [
    {
      student_id: 'test_student_a1',
      video_id: 'test_video_a1',
      creator_id: 'test_creator_a',
      completion_percentage: 100,
      watch_time_seconds: 1800,
      last_position_seconds: 1800,
      completed: true,
    },
    {
      student_id: 'test_student_a1',
      video_id: 'test_video_a2',
      creator_id: 'test_creator_a',
      completion_percentage: 45,
      watch_time_seconds: 1080,
      last_position_seconds: 1080,
      completed: false,
    },
    {
      student_id: 'test_student_a2',
      video_id: 'test_video_a1',
      creator_id: 'test_creator_a',
      completion_percentage: 100,
      watch_time_seconds: 1800,
      last_position_seconds: 1800,
      completed: true,
    },
  ],

  chat_sessions: [
    {
      id: 'test_session_a1',
      student_id: 'test_student_a1',
      creator_id: 'test_creator_a',
      title: 'Questions about risk management',
    },
    {
      id: 'test_session_a2',
      student_id: 'test_student_a2',
      creator_id: 'test_creator_a',
      title: 'Advanced trading strategies',
    },
  ],

  chat_messages: [
    {
      session_id: 'test_session_a1',
      student_id: 'test_student_a1',
      creator_id: 'test_creator_a',
      role: 'user',
      content: 'What is the recommended risk percentage per trade?',
    },
    {
      session_id: 'test_session_a1',
      student_id: 'test_student_a1',
      creator_id: 'test_creator_a',
      role: 'assistant',
      content: 'Based on the course material, it is recommended to risk no more than 1-2% of your capital on any single trade. This helps preserve your trading account during losing streaks.',
      video_references: [
        {
          video_id: 'test_video_a1',
          video_title: 'Introduction to Day Trading',
          timestamp: 300,
          relevance_score: 0.92,
        },
      ],
    },
  ],

  quizzes: [
    {
      id: 'test_quiz_a1',
      creator_id: 'test_creator_a',
      video_id: 'test_video_a1',
      title: 'Day Trading Fundamentals Quiz',
      description: 'Test your knowledge of day trading basics',
      questions: [
        {
          id: 'q1',
          question: 'What is the recommended risk percentage per trade?',
          type: 'multiple_choice',
          options: ['0.5-1%', '1-2%', '5-10%', '10-20%'],
          correct_answer: '1-2%',
          explanation: 'Risk 1-2% per trade to preserve capital during losing streaks.',
        },
        {
          id: 'q2',
          question: 'What is a stop loss?',
          type: 'short_answer',
          correct_answer: 'A predetermined price level where you exit a losing trade',
          explanation: 'Stop losses protect your capital by automatically closing positions at a loss limit.',
        },
      ],
    },
  ],

  quiz_attempts: [
    {
      student_id: 'test_student_a1',
      quiz_id: 'test_quiz_a1',
      creator_id: 'test_creator_a',
      score: 85,
      total_questions: 2,
      correct_answers: 1,
      answers: {
        q1: '1-2%',
        q2: 'A price level to exit losing trades',
      },
      completed: true,
    },
  ],
};

/**
 * Clear existing test data
 */
async function clearTestData(): Promise<void> {
  console.log('\n🧹 Clearing existing test data...');

  const tables = [
    'quiz_attempts',
    'quizzes',
    'chat_messages',
    'chat_sessions',
    'learning_progress',
    'video_chunks',
    'videos',
    'students',
    'creators',
  ];

  for (const table of tables) {
    try {
      const { error } = await supabase
        .from(table)
        .delete()
        .like('id', 'test_%');

      if (error) {
        console.warn(`  ⚠️  Warning clearing ${table}:`, error.message);
      } else {
        console.log(`  ✓ Cleared ${table}`);
      }
    } catch (err) {
      console.warn(`  ⚠️  Error clearing ${table}:`, err);
    }
  }
}

/**
 * Insert test data into database
 */
async function insertTestData(): Promise<void> {
  console.log('\n📝 Inserting test data...');

  // Insert creators
  console.log('\n  Creating test creators...');
  for (const creator of TEST_DATA.creators) {
    const { error } = await supabase.from('creators').insert(creator);
    if (error) {
      console.error(`    ❌ Failed to create creator ${creator.company_name}:`, error.message);
    } else {
      console.log(`    ✓ Created creator: ${creator.company_name}`);
    }
  }

  // Insert students
  console.log('\n  Creating test students...');
  for (const student of TEST_DATA.students) {
    const { error } = await supabase.from('students').insert(student);
    if (error) {
      console.error(`    ❌ Failed to create student ${student.email}:`, error.message);
    } else {
      console.log(`    ✓ Created student: ${student.email}`);
    }
  }

  // Insert videos
  console.log('\n  Creating test videos...');
  for (const video of TEST_DATA.videos) {
    const { error } = await supabase.from('videos').insert(video);
    if (error) {
      console.error(`    ❌ Failed to create video ${video.title}:`, error.message);
    } else {
      console.log(`    ✓ Created video: ${video.title}`);
    }
  }

  // Insert video chunks
  console.log('\n  Creating test video chunks...');
  for (const chunk of TEST_DATA.video_chunks) {
    const { error } = await supabase.from('video_chunks').insert(chunk);
    if (error) {
      console.error(`    ❌ Failed to create video chunk:`, error.message);
    } else {
      console.log(`    ✓ Created video chunk for video ${chunk.video_id}`);
    }
  }

  // Insert learning progress
  console.log('\n  Creating test learning progress...');
  for (const progress of TEST_DATA.learning_progress) {
    const { error } = await supabase.from('learning_progress').insert(progress);
    if (error) {
      console.error(`    ❌ Failed to create progress:`, error.message);
    } else {
      console.log(`    ✓ Created progress for student ${progress.student_id}`);
    }
  }

  // Insert chat sessions
  console.log('\n  Creating test chat sessions...');
  for (const session of TEST_DATA.chat_sessions) {
    const { error } = await supabase.from('chat_sessions').insert(session);
    if (error) {
      console.error(`    ❌ Failed to create session:`, error.message);
    } else {
      console.log(`    ✓ Created chat session: ${session.title}`);
    }
  }

  // Insert chat messages
  console.log('\n  Creating test chat messages...');
  for (const message of TEST_DATA.chat_messages) {
    const { error } = await supabase.from('chat_messages').insert(message);
    if (error) {
      console.error(`    ❌ Failed to create message:`, error.message);
    } else {
      console.log(`    ✓ Created chat message in session ${message.session_id}`);
    }
  }

  // Insert quizzes
  console.log('\n  Creating test quizzes...');
  for (const quiz of TEST_DATA.quizzes) {
    const { error } = await supabase.from('quizzes').insert(quiz);
    if (error) {
      console.error(`    ❌ Failed to create quiz:`, error.message);
    } else {
      console.log(`    ✓ Created quiz: ${quiz.title}`);
    }
  }

  // Insert quiz attempts
  console.log('\n  Creating test quiz attempts...');
  for (const attempt of TEST_DATA.quiz_attempts) {
    const { error } = await supabase.from('quiz_attempts').insert(attempt);
    if (error) {
      console.error(`    ❌ Failed to create quiz attempt:`, error.message);
    } else {
      console.log(`    ✓ Created quiz attempt for student ${attempt.student_id}`);
    }
  }
}

/**
 * Verify test data was created successfully
 */
async function verifyTestData(): Promise<void> {
  console.log('\n🔍 Verifying test data...');

  const checks = [
    { table: 'creators', expected: TEST_DATA.creators.length },
    { table: 'students', expected: TEST_DATA.students.length },
    { table: 'videos', expected: TEST_DATA.videos.length },
    { table: 'video_chunks', expected: TEST_DATA.video_chunks.length },
    { table: 'learning_progress', expected: TEST_DATA.learning_progress.length },
    { table: 'chat_sessions', expected: TEST_DATA.chat_sessions.length },
    { table: 'chat_messages', expected: TEST_DATA.chat_messages.length },
    { table: 'quizzes', expected: TEST_DATA.quizzes.length },
    { table: 'quiz_attempts', expected: TEST_DATA.quiz_attempts.length },
  ];

  let allPassed = true;

  for (const check of checks) {
    const { count, error } = await supabase
      .from(check.table)
      .select('*', { count: 'exact', head: true })
      .like('id', 'test_%');

    if (error) {
      console.log(`  ❌ Error checking ${check.table}:`, error.message);
      allPassed = false;
    } else if (count !== check.expected) {
      console.log(`  ❌ ${check.table}: Expected ${check.expected}, got ${count}`);
      allPassed = false;
    } else {
      console.log(`  ✓ ${check.table}: ${count} records`);
    }
  }

  if (allPassed) {
    console.log('\n✅ All test data verified successfully!');
  } else {
    console.log('\n⚠️  Some test data verification failed');
  }
}

/**
 * Display summary of test data
 */
function displaySummary(): void {
  console.log('\n' + '='.repeat(60));
  console.log('📊 TEST DATA SUMMARY');
  console.log('='.repeat(60));

  console.log('\n🏢 Test Creators:');
  TEST_DATA.creators.forEach((creator) => {
    console.log(`  • ${creator.company_name} (${creator.subscription_tier})`);
    console.log(`    Email: ${creator.email}`);
    console.log(`    ID: ${creator.id}`);
  });

  console.log('\n👥 Test Students:');
  TEST_DATA.students.forEach((student) => {
    console.log(`  • ${student.email}`);
    console.log(`    Creator: ${student.creator_id}`);
    console.log(`    Tier: ${student.membership_tier}`);
  });

  console.log('\n🎥 Test Videos:');
  TEST_DATA.videos.forEach((video) => {
    console.log(`  • ${video.title}`);
    console.log(`    Creator: ${video.creator_id}`);
    console.log(`    Duration: ${Math.floor(video.duration_seconds / 60)} minutes`);
  });

  console.log('\n💬 Test Chat Sessions:');
  TEST_DATA.chat_sessions.forEach((session) => {
    console.log(`  • ${session.title}`);
    console.log(`    Student: ${session.student_id}`);
  });

  console.log('\n📝 Test Quizzes:');
  TEST_DATA.quizzes.forEach((quiz) => {
    console.log(`  • ${quiz.title}`);
    console.log(`    Video: ${quiz.video_id}`);
    console.log(`    Questions: ${quiz.questions.length}`);
  });

  console.log('\n' + '='.repeat(60));
  console.log('🔑 Test Credentials');
  console.log('='.repeat(60));
  console.log('\nCreator A (PRO):');
  console.log('  Email: creator.a@test.com');
  console.log('  Whop User ID: whop_creator_a_123');
  console.log('\nCreator B (BASIC):');
  console.log('  Email: creator.b@test.com');
  console.log('  Whop User ID: whop_creator_b_234');
  console.log('\nStudent A1:');
  console.log('  Email: student.a1@test.com');
  console.log('  Creator: Alpha Trading Academy');
  console.log('\n' + '='.repeat(60));
}

/**
 * Main execution
 */
async function main() {
  console.log('🚀 Test Data Setup Script');
  console.log('='.repeat(60));

  const args = process.argv.slice(2);
  const shouldClear = args.includes('--clear');

  try {
    if (shouldClear) {
      await clearTestData();
    }

    await insertTestData();
    await verifyTestData();
    displaySummary();

    console.log('\n✅ Test data setup complete!');
    console.log('\n💡 Next steps:');
    console.log('  1. Start development server: npm run dev');
    console.log('  2. Run tests: npm test');
    console.log('  3. Test OAuth flow with test creator credentials');
    console.log('  4. Test multi-tenant isolation with different creators\n');

    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error setting up test data:', error);
    process.exit(1);
  }
}

// Run script
main();
