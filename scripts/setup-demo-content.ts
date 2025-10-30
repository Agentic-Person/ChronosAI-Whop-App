/**
 * Demo Content Setup Script
 *
 * Processes 6 YouTube videos to serve as demo content for 7-day trials:
 * - 4 Whop tutorials
 * - 2 general online course creation videos
 *
 * Run this script ONCE to set up demo content in production:
 * $ npx tsx scripts/setup-demo-content.ts
 */

import 'openai/shims/node';

const DEMO_VIDEOS = [
  // Course 1: Getting Started with Whop
  {
    url: 'https://youtu.be/e6NKN9QlirM',
    title: 'Whop Tutorial For Beginners 2025 (Step-By-Step)',
    description: 'Complete beginner-friendly tutorial for setting up and selling on Whop',
    course: 'Getting Started with Whop',
    courseDescription: 'Learn the fundamentals of selling digital products on Whop',
    order: 1,
    tags: ['whop', 'tutorial', 'beginner', 'setup'],
    difficulty: 'beginner',
  },
  {
    url: 'https://www.youtube.com/watch?v=tnEAjKoTD64',
    title: 'How to Sell Digital Downloads on Whop',
    description: 'Step-by-step guide to selling digital downloads on the Whop platform',
    course: 'Getting Started with Whop',
    order: 2,
    tags: ['whop', 'digital downloads', 'sales', 'tutorial'],
    difficulty: 'beginner',
  },
  {
    url: 'https://www.youtube.com/watch?v=A7_-EqnstnQ',
    title: 'Whop: Sell Courses - Start your Online Shop',
    description: 'Crash course on launching your online shop and selling courses on Whop',
    course: 'Getting Started with Whop',
    order: 3,
    tags: ['whop', 'online shop', 'courses', 'crash course'],
    difficulty: 'beginner',
  },
  {
    url: 'https://www.youtube.com/watch?v=vMZHiBhr0SM',
    title: 'How To Make $100,000 Per Month With Whop',
    description: 'Advanced strategies for scaling your Whop business to 6 figures',
    course: 'Getting Started with Whop',
    order: 4,
    tags: ['whop', 'business', 'scaling', 'revenue'],
    difficulty: 'intermediate',
  },

  // Course 2: Building Online Courses
  {
    url: 'https://www.youtube.com/watch?v=oTQPxPFROck',
    title: 'How to Build a LEGIT Online Course (Works in 2025) - Alex Hormozi',
    description: 'Alex Hormozi shares his framework for creating high-value online courses',
    course: 'Building Online Courses',
    courseDescription: 'Master the fundamentals of creating successful online courses',
    order: 1,
    tags: ['online course', 'course creation', 'education', 'business'],
    difficulty: 'intermediate',
  },
  {
    url: 'https://www.youtube.com/watch?v=TmuDsq4m4Ts',
    title: "A Beginner's Guide to Making Money with Online Courses",
    description: 'Complete beginner guide to monetizing your knowledge through online courses',
    course: 'Building Online Courses',
    order: 2,
    tags: ['online course', 'monetization', 'beginner guide', 'passive income'],
    difficulty: 'beginner',
  },
];

// System demo creator ID (use a consistent UUID for the demo account)
const SYSTEM_DEMO_CREATOR_ID = '00000000-0000-0000-0000-000000000001';

interface VideoImportResponse {
  success: boolean;
  video?: {
    id: string;
    title: string;
    duration_seconds: number;
  };
  error?: string;
}

async function importVideo(
  video: typeof DEMO_VIDEOS[0],
  apiKey: string
): Promise<VideoImportResponse> {
  console.log(`\n📹 Importing: ${video.title}`);
  console.log(`   URL: ${video.url}`);

  try {
    const response = await fetch('http://localhost:3000/api/video/youtube-import', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'x-creator-id': SYSTEM_DEMO_CREATOR_ID, // Force assignment to system demo account
      },
      body: JSON.stringify({
        youtubeUrl: video.url,
        title: video.title,
        description: video.description,
        tags: video.tags,
        difficulty_level: video.difficulty,
        is_demo_content: true,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error(`   ❌ Error: ${errorData.error || response.statusText}`);
      return { success: false, error: errorData.error };
    }

    const data = await response.json();
    console.log(`   ✅ Imported successfully!`);
    console.log(`   Duration: ${Math.round(data.video.duration_seconds / 60)} minutes`);

    return { success: true, video: data.video };
  } catch (error) {
    console.error(`   ❌ Failed:`, error);
    return { success: false, error: String(error) };
  }
}

async function createCourse(
  courseName: string,
  description: string,
  videoIds: string[],
  apiKey: string
): Promise<{ success: boolean; courseId?: string }> {
  console.log(`\n📚 Creating course: ${courseName}`);

  try {
    const response = await fetch('http://localhost:3000/api/courses', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'x-creator-id': SYSTEM_DEMO_CREATOR_ID,
      },
      body: JSON.stringify({
        title: courseName,
        description: description,
        video_ids: videoIds,
        is_demo: true,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error(`   ❌ Error: ${errorData.error || response.statusText}`);
      return { success: false };
    }

    const data = await response.json();
    console.log(`   ✅ Course created successfully!`);
    console.log(`   Course ID: ${data.course.id}`);

    return { success: true, courseId: data.course.id };
  } catch (error) {
    console.error(`   ❌ Failed:`, error);
    return { success: false };
  }
}

async function main() {
  console.log('🚀 Demo Content Setup Script');
  console.log('================================\n');

  // Check for API key
  const apiKey = process.env.DEMO_SETUP_API_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!apiKey) {
    console.error('❌ Error: DEMO_SETUP_API_KEY or SUPABASE_SERVICE_ROLE_KEY not found');
    console.error('   Set environment variable and try again.');
    process.exit(1);
  }

  console.log('✅ API key found');
  console.log(`📦 Processing ${DEMO_VIDEOS.length} videos\n`);

  const results: { course: string; videos: string[] }[] = [];
  const courseGroups = new Map<string, typeof DEMO_VIDEOS>();

  // Group videos by course
  for (const video of DEMO_VIDEOS) {
    if (!courseGroups.has(video.course)) {
      courseGroups.set(video.course, []);
    }
    courseGroups.get(video.course)!.push(video);
  }

  // Process each course
  for (const [courseName, videos] of courseGroups.entries()) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`📚 COURSE: ${courseName}`);
    console.log(`${'='.repeat(60)}`);

    const videoIds: string[] = [];

    // Import all videos for this course
    for (const video of videos) {
      const result = await importVideo(video, apiKey);

      if (result.success && result.video) {
        videoIds.push(result.video.id);
        // Wait 2 seconds between imports to avoid rate limits
        await new Promise(resolve => setTimeout(resolve, 2000));
      } else {
        console.error(`   ⚠️  Skipping due to error`);
      }
    }

    // Create course with all videos
    if (videoIds.length > 0) {
      const courseDescription = videos[0].courseDescription || `Demo course: ${courseName}`;
      const courseResult = await createCourse(courseName, courseDescription, videoIds, apiKey);

      if (courseResult.success) {
        results.push({ course: courseName, videos: videoIds });
      }
    }
  }

  // Summary
  console.log('\n\n' + '='.repeat(60));
  console.log('📊 SUMMARY');
  console.log('='.repeat(60));
  console.log(`✅ Successfully processed ${results.reduce((sum, r) => sum + r.videos.length, 0)} videos`);
  console.log(`✅ Created ${results.length} courses:\n`);

  for (const result of results) {
    console.log(`   📚 ${result.course}`);
    console.log(`      └─ ${result.videos.length} videos`);
  }

  console.log('\n🎉 Demo content setup complete!');
  console.log('\nNext steps:');
  console.log('  1. Run migration: npx supabase db push');
  console.log('  2. Deploy trial system code');
  console.log('  3. Test trial flow on staging\n');
}

// Run script
main().catch(console.error);
