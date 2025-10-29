/**
 * Generate Test Data for Load Testing
 * Creates users, videos, and content in the test environment
 */

import { createClient } from '@supabase/supabase-js';
import { faker } from '@faker-js/faker';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase credentials. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
}

const supabase = createClient(supabaseUrl, supabaseKey);

interface TestCreator {
  id: string;
  email: string;
  name: string;
  tier: 'basic' | 'pro' | 'enterprise';
}

interface TestStudent {
  id: string;
  email: string;
  name: string;
  creator_id: string;
}

interface TestVideo {
  id: string;
  creator_id: string;
  title: string;
  url: string;
  transcript: string;
}

/**
 * Generate test creators across different tiers
 */
async function generateCreators(count: number = 10): Promise<TestCreator[]> {
  console.log(`\n🎭 Generating ${count} test creators...`);

  const tiers: Array<'basic' | 'pro' | 'enterprise'> = ['basic', 'pro', 'enterprise'];
  const creators: TestCreator[] = [];

  for (let i = 0; i < count; i++) {
    const tier = tiers[i % tiers.length];
    const email = `loadtest-creator-${i}-${faker.string.alphanumeric(8)}@test.com`;

    const creator: TestCreator = {
      id: faker.string.uuid(),
      email,
      name: faker.person.fullName(),
      tier,
    };

    creators.push(creator);
  }

  // Insert into database
  const { data, error } = await supabase
    .from('creators')
    .upsert(creators.map(c => ({
      id: c.id,
      email: c.email,
      name: c.name,
      tier: c.tier,
      storage_used_bytes: 0,
      storage_limit_bytes: getStorageLimit(c.tier),
      created_at: new Date().toISOString(),
    })))
    .select();

  if (error) {
    console.error('❌ Failed to create creators:', error);
    throw error;
  }

  console.log(`✅ Created ${data?.length || 0} creators`);
  return creators;
}

/**
 * Generate test students enrolled with creators
 */
async function generateStudents(creators: TestCreator[], studentsPerCreator: number = 20): Promise<TestStudent[]> {
  console.log(`\n👥 Generating students (${studentsPerCreator} per creator)...`);

  const students: TestStudent[] = [];

  for (const creator of creators) {
    for (let i = 0; i < studentsPerCreator; i++) {
      const student: TestStudent = {
        id: faker.string.uuid(),
        email: `loadtest-student-${creator.id}-${i}@test.com`,
        name: faker.person.fullName(),
        creator_id: creator.id,
      };

      students.push(student);
    }
  }

  // Insert students
  const { data: studentData, error: studentError } = await supabase
    .from('students')
    .upsert(students.map(s => ({
      id: s.id,
      email: s.email,
      name: s.name,
      enrollment_status: 'active',
      created_at: new Date().toISOString(),
    })))
    .select();

  if (studentError) {
    console.error('❌ Failed to create students:', studentError);
    throw studentError;
  }

  // Create enrollments
  const enrollments = students.map(s => ({
    student_id: s.id,
    creator_id: s.creator_id,
    status: 'active',
    enrolled_at: new Date().toISOString(),
  }));

  const { error: enrollmentError } = await supabase
    .from('enrollments')
    .upsert(enrollments);

  if (enrollmentError) {
    console.error('❌ Failed to create enrollments:', enrollmentError);
    throw enrollmentError;
  }

  console.log(`✅ Created ${students.length} students with enrollments`);
  return students;
}

/**
 * Generate test videos with transcripts
 */
async function generateVideos(creators: TestCreator[], videosPerCreator: number = 10): Promise<TestVideo[]> {
  console.log(`\n🎥 Generating videos (${videosPerCreator} per creator)...`);

  const videos: TestVideo[] = [];

  for (const creator of creators) {
    for (let i = 0; i < videosPerCreator; i++) {
      const video: TestVideo = {
        id: faker.string.uuid(),
        creator_id: creator.id,
        title: `${faker.company.buzzVerb()} ${faker.company.buzzNoun()} - Part ${i + 1}`,
        url: `https://storage.test.com/videos/${faker.string.uuid()}.mp4`,
        transcript: generateRealisticTranscript(),
      };

      videos.push(video);
    }
  }

  // Insert videos
  const { data, error } = await supabase
    .from('videos')
    .upsert(videos.map(v => ({
      id: v.id,
      creator_id: v.creator_id,
      title: v.title,
      url: v.url,
      transcript: v.transcript,
      duration_seconds: faker.number.int({ min: 300, max: 3600 }),
      file_size_bytes: faker.number.int({ min: 5000000, max: 25000000 }),
      processing_status: 'completed',
      created_at: new Date().toISOString(),
    })))
    .select();

  if (error) {
    console.error('❌ Failed to create videos:', error);
    throw error;
  }

  console.log(`✅ Created ${data?.length || 0} videos`);
  return videos;
}

/**
 * Generate video chunks with embeddings
 */
async function generateVideoChunks(videos: TestVideo[]): Promise<void> {
  console.log(`\n📝 Generating video chunks with embeddings...`);

  const chunks: any[] = [];

  for (const video of videos) {
    // Split transcript into chunks (500-1000 words)
    const words = video.transcript.split(' ');
    const chunkSize = 500;
    const numChunks = Math.ceil(words.length / chunkSize);

    for (let i = 0; i < numChunks; i++) {
      const start = i * chunkSize;
      const end = Math.min((i + 1) * chunkSize, words.length);
      const chunkText = words.slice(start, end).join(' ');

      // Generate a mock embedding (1536 dimensions for OpenAI ada-002)
      // In real testing, you'd generate actual embeddings
      const embedding = generateMockEmbedding(1536);

      chunks.push({
        video_id: video.id,
        creator_id: video.creator_id,
        chunk_index: i,
        start_time: Math.floor(start / words.length * 3600), // Approximate timestamp
        end_time: Math.floor(end / words.length * 3600),
        text: chunkText,
        word_count: chunkText.split(' ').length,
        embedding: JSON.stringify(embedding),
      });
    }
  }

  // Insert in batches to avoid overwhelming the database
  const batchSize = 100;
  for (let i = 0; i < chunks.length; i += batchSize) {
    const batch = chunks.slice(i, i + batchSize);

    const { error } = await supabase
      .from('video_chunks')
      .upsert(batch);

    if (error) {
      console.error(`❌ Failed to create chunk batch ${i / batchSize}:`, error);
      throw error;
    }

    console.log(`  ✓ Inserted batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(chunks.length / batchSize)}`);
  }

  console.log(`✅ Created ${chunks.length} video chunks`);
}

/**
 * Helper: Generate realistic transcript
 */
function generateRealisticTranscript(): string {
  const paragraphs: string[] = [];

  for (let i = 0; i < faker.number.int({ min: 10, max: 30 }); i++) {
    paragraphs.push(faker.lorem.paragraph({ min: 5, max: 15 }));
  }

  return paragraphs.join('\n\n');
}

/**
 * Helper: Generate mock embedding vector
 */
function generateMockEmbedding(dimensions: number): number[] {
  const embedding: number[] = [];

  for (let i = 0; i < dimensions; i++) {
    embedding.push(Math.random() * 2 - 1); // Random float between -1 and 1
  }

  // Normalize to unit length
  const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
  return embedding.map(val => val / magnitude);
}

/**
 * Helper: Get storage limit by tier
 */
function getStorageLimit(tier: 'basic' | 'pro' | 'enterprise'): number {
  const limits = {
    basic: 5 * 1024 * 1024 * 1024, // 5GB
    pro: 50 * 1024 * 1024 * 1024, // 50GB
    enterprise: 500 * 1024 * 1024 * 1024, // 500GB
  };

  return limits[tier];
}

/**
 * Clean up test data
 */
async function cleanupTestData(): Promise<void> {
  console.log('\n🧹 Cleaning up old test data...');

  // Delete in reverse order of dependencies
  const tables = [
    'video_chunks',
    'chat_messages',
    'chat_sessions',
    'enrollments',
    'videos',
    'students',
    'creators',
  ];

  for (const table of tables) {
    const { error } = await supabase
      .from(table)
      .delete()
      .like('email', 'loadtest-%');

    if (error && error.code !== 'PGRST116') { // Ignore "no rows deleted"
      console.warn(`⚠️  Warning cleaning ${table}:`, error.message);
    } else {
      console.log(`  ✓ Cleaned ${table}`);
    }
  }

  console.log('✅ Cleanup complete');
}

/**
 * Main execution
 */
async function main() {
  console.log('🚀 Starting test data generation...\n');
  console.log('⚙️  Configuration:');
  console.log(`   - Supabase URL: ${supabaseUrl}`);
  console.log(`   - Creators: 10`);
  console.log(`   - Students per creator: 20`);
  console.log(`   - Videos per creator: 10`);

  try {
    // Clean up old data first
    await cleanupTestData();

    // Generate test data
    const creators = await generateCreators(10);
    const students = await generateStudents(creators, 20);
    const videos = await generateVideos(creators, 10);
    await generateVideoChunks(videos);

    console.log('\n✨ Test data generation complete!\n');
    console.log('📊 Summary:');
    console.log(`   - Creators: ${creators.length}`);
    console.log(`   - Students: ${students.length}`);
    console.log(`   - Videos: ${videos.length}`);
    console.log(`   - Total users: ${creators.length + students.length}`);

    console.log('\n💡 Next steps:');
    console.log('   1. Run load tests: npm run load-test:chat');
    console.log('   2. Monitor metrics in real-time');
    console.log('   3. Check results in load-tests/results/');

  } catch (error) {
    console.error('\n❌ Error generating test data:', error);
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  main();
}

export { generateCreators, generateStudents, generateVideos, generateVideoChunks, cleanupTestData };
