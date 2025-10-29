import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { Innertube } from 'youtubei.js';
import { chunkTranscript, storeChunks } from '@/lib/video/chunking';
import { generateEmbeddings, storeEmbeddings } from '@/lib/video/embedding-generator';
import type { Transcript } from '@/lib/video/types';

// Helper: Extract YouTube video ID from various URL formats
function extractYouTubeId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
    /^([a-zA-Z0-9_-]{11})$/, // Direct video ID
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }

  return null;
}

// Helper: Convert ISO 8601 duration (PT15M33S) to MM:SS format
function parseYouTubeDuration(isoDuration: string): string {
  const match = isoDuration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);

  if (!match) return '0:00';

  const hours = parseInt(match[1] || '0', 10);
  const minutes = parseInt(match[2] || '0', 10);
  const seconds = parseInt(match[3] || '0', 10);

  const totalMinutes = hours * 60 + minutes;
  const paddedSeconds = seconds.toString().padStart(2, '0');

  return `${totalMinutes}:${paddedSeconds}`;
}

export async function POST(req: NextRequest) {
  try {
    const { youtubeUrl, courseId } = await req.json();

    if (!youtubeUrl || typeof youtubeUrl !== 'string') {
      return NextResponse.json(
        { error: 'YouTube URL is required' },
        { status: 400 }
      );
    }

    // Extract video ID
    const videoId = extractYouTubeId(youtubeUrl);
    if (!videoId) {
      return NextResponse.json(
        { error: 'Invalid YouTube URL format' },
        { status: 400 }
      );
    }

    // Check if API key is configured
    const apiKey = process.env.YOUTUBE_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'YouTube API key not configured. Please add YOUTUBE_API_KEY to .env.local' },
        { status: 500 }
      );
    }

    // Fetch metadata from YouTube Data API v3
    const youtubeApiUrl = `https://www.googleapis.com/youtube/v3/videos?id=${videoId}&part=snippet,contentDetails&key=${apiKey}`;

    const response = await fetch(youtubeApiUrl);

    if (!response.ok) {
      const errorData = await response.json();
      console.error('YouTube API error:', errorData);

      if (response.status === 403) {
        return NextResponse.json(
          { error: 'YouTube API key invalid or quota exceeded' },
          { status: 403 }
        );
      }

      return NextResponse.json(
        { error: 'Failed to fetch video metadata from YouTube' },
        { status: 500 }
      );
    }

    const data = await response.json();

    if (!data.items || data.items.length === 0) {
      return NextResponse.json(
        { error: 'Video not found or is private/deleted' },
        { status: 404 }
      );
    }

    const video = data.items[0];
    const snippet = video.snippet;
    const contentDetails = video.contentDetails;

    // Parse duration
    const duration = parseYouTubeDuration(contentDetails.duration);

    // Fetch transcript from YouTube using youtubei.js
    let transcript: string | null = null;
    let transcriptItems: any[] = [];
    try {
      console.log(`\n========================================`);
      console.log(`🎬 Fetching transcript for video ${videoId} using youtubei.js...`);
      console.log(`========================================\n`);

      // Initialize YouTube client
      console.log('📝 Initializing YouTube client...');
      const youtube = await Innertube.create();

      // Get video info
      console.log('📝 Fetching video info...');
      const info = await youtube.getInfo(videoId);

      // Try to get transcript/captions
      console.log('📝 Fetching transcript data...');
      const transcriptData = await info.getTranscript();

      if (transcriptData && transcriptData.transcript && transcriptData.transcript.content) {
        console.log('📝 Transcript found! Processing segments...');
        const segments = transcriptData.transcript.content.body?.initial_segments || [];

        if (segments.length > 0) {
          transcriptItems = segments.map((segment: any) => ({
            text: segment.snippet?.text || '',
            offset: segment.start_ms ? segment.start_ms / 1000 : 0,
            duration: segment.end_ms && segment.start_ms
              ? (segment.end_ms - segment.start_ms) / 1000
              : 0
          }));

          // Combine all transcript segments into full text
          transcript = transcriptItems.map(item => item.text).join(' ');
          console.log(`✅ SUCCESS: Transcript fetched! Length: ${transcript.length} characters`);
          console.log(`✅ Number of segments: ${transcriptItems.length}`);
          console.log(`First 100 chars: ${transcript.substring(0, 100)}...`);
          console.log(`Sample segment:`, JSON.stringify(transcriptItems[0]));
        } else {
          console.log('⚠️  WARNING: No transcript segments found in response');
        }
      } else {
        console.log('⚠️  WARNING: No transcript available for this video');
      }
    } catch (transcriptError: any) {
      console.error('\n❌ TRANSCRIPT FETCH ERROR:');
      console.error('Error message:', transcriptError?.message);
      console.error('Error type:', transcriptError?.constructor?.name);
      console.log('\n💡 This usually means:');
      console.log('  - Video has no captions/subtitles');
      console.log('  - Captions are disabled for this video');
      console.log('  - Video is age-restricted or private');
      console.log('  - Network or API issues');
      console.log('');
      // Continue without transcript - not a critical error
    }

    // PRODUCTION: Get creator ID from authenticated session
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Authentication required' },
        { status: 401 }
      );
    }

    // Get creator record from whop_user_id
    const { data: creator, error: creatorError } = await supabase
      .from('creators')
      .select('id')
      .eq('whop_user_id', user.id)
      .single();

    if (creatorError || !creator) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Creator account not found' },
        { status: 403 }
      );
    }

    const creatorId = creator.id;
    // PRODUCTION: Get creator ID from authenticated session
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Authentication required' },
        { status: 401 }
      );
    }

    // Get creator record from whop_user_id
    const { data: creator, error: creatorError } = await supabase
      .from('creators')
      .select('id')
      .eq('whop_user_id', user.id)
      .single();

    if (creatorError || !creator) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Creator account not found' },
        { status: 403 }
      );
    }

    const creatorId = creator.id;
    // PRODUCTION: Get creator ID from authenticated session
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Authentication required' },
        { status: 401 }
      );
    }

    // Get creator record from whop_user_id
    const { data: creator, error: creatorError } = await supabase
      .from('creators')
      .select('id')
      .eq('whop_user_id', user.id)
      .single();

    if (creatorError || !creator) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Creator account not found' },
        { status: 403 }
      );
    }

    const creatorId = creator.id;

    // Store video in database - using ONLY columns from original schema
    // Use admin client to bypass RLS for backend video creation
    const supabase = createAdminClient();
    const youtubeUrlFull = `https://www.youtube.com/watch?v=${videoId}`;

    const { data: videoRecord, error: dbError } = await supabase
      .from('videos')
      .insert({
        creator_id: creatorId,
        course_id: courseId || null, // Add course_id if provided
        title: snippet.title,
        description: snippet.description?.substring(0, 500) || '',
        video_url: youtubeUrlFull,
        thumbnail_url: snippet.thumbnails?.high?.url || snippet.thumbnails?.default?.url || null,
        duration_seconds: parseDurationToSeconds(contentDetails.duration),
        category: `youtube:${videoId}`, // Store YouTube ID here as workaround
        transcript: transcript, // Save YouTube transcript
        transcript_processed: transcript ? true : false, // Mark as processed if we got transcript
      })
      .select('id, title, thumbnail_url, video_url, category, duration_seconds, transcript')
      .single();

    if (dbError) {
      console.error('Database error:', dbError);
      return NextResponse.json(
        { error: 'Failed to save video to database', details: dbError.message },
        { status: 500 }
      );
    }

    console.log('✅ VIDEO SAVED TO DATABASE:');
    console.log('Video ID:', videoRecord.id);
    console.log('Title:', videoRecord.title);
    console.log('URL:', videoRecord.video_url);

    // Process transcript: chunk and generate embeddings (if transcript exists)
    if (transcript && transcriptItems && transcriptItems.length > 0) {
      try {
        console.log('\n🔄 Processing transcript for RAG search...');

        // Convert YouTube transcript to our Transcript format
        const transcriptData: Transcript = {
          text: transcript,
          segments: transcriptItems.map((item, index) => ({
            id: index,
            start: item.offset || 0, // youtube-transcript uses "offset" in seconds
            end: (item.offset + item.duration) || 0, // calculate end time
            text: item.text,
          })),
          language: 'en',
          duration: parseDurationToSeconds(contentDetails.duration),
        };

        // Chunk the transcript
        console.log('📦 Chunking transcript...');
        const chunks = chunkTranscript(transcriptData);
        console.log(`✅ Created ${chunks.length} chunks`);

        // Store chunks in database first
        console.log('💾 Storing chunks in database...');
        await storeChunks(videoRecord.id, creatorId, chunks);
        console.log(`✅ Stored ${chunks.length} chunks`);

        // Generate embeddings
        console.log('🧮 Generating embeddings...');
        const embeddingResult = await generateEmbeddings(chunks);
        console.log(`✅ Generated ${embeddingResult.embeddings.length} embeddings`);

        // Store embeddings
        console.log('💾 Storing embeddings...');
        await storeEmbeddings(videoRecord.id, embeddingResult.embeddings);
        console.log('✅ Video fully processed and ready for AI chat!');

      } catch (processingError) {
        console.error('❌ Error processing transcript:', processingError);
        // Don't fail the import - video is still usable
        console.log('⚠️  Video imported but RAG processing failed');
      }
    } else {
      console.log('ℹ️  No transcript available - skipping RAG processing');
    }

    // Return video object in format expected by frontend
    return NextResponse.json({
      id: videoRecord.id,
      title: snippet.title,
      duration,
      thumbnail: snippet.thumbnails?.high?.url || snippet.thumbnails?.default?.url,
      source: 'youtube',
      youtube_id: videoId,
      status: 'ready',
      uploadedAt: new Date().toISOString().split('T')[0],
      views: 0,
      completions: 0,
    });

  } catch (error) {
    console.error('YouTube import error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Helper: Convert ISO 8601 duration to total seconds
function parseDurationToSeconds(isoDuration: string): number {
  const match = isoDuration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);

  if (!match) return 0;

  const hours = parseInt(match[1] || '0', 10);
  const minutes = parseInt(match[2] || '0', 10);
  const seconds = parseInt(match[3] || '0', 10);

  return hours * 3600 + minutes * 60 + seconds;
}
