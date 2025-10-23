import { NextRequest, NextResponse } from 'next/server';
import { getProcessingVideos } from '@/lib/creator/analytics';
import { retryProcessing, getVideoProcessingStatus } from '@/lib/creator/videoManager';

/**
 * GET /api/creator/processing
 * Get currently processing videos
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const creatorId = searchParams.get('creatorId');
    const videoId = searchParams.get('videoId');

    if (!creatorId) {
      return NextResponse.json(
        { error: 'Creator ID is required' },
        { status: 400 }
      );
    }

    if (videoId) {
      // Get status for specific video
      const status = await getVideoProcessingStatus(videoId);
      return NextResponse.json(status);
    }

    // Get all processing videos
    const processingVideos = await getProcessingVideos(creatorId);

    return NextResponse.json(processingVideos, {
      headers: {
        'Cache-Control': 'public, s-maxage=10, stale-while-revalidate=20',
      },
    });
  } catch (error) {
    console.error('Error fetching processing status:', error);
    return NextResponse.json(
      { error: 'Failed to fetch processing status' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/creator/processing
 * Retry processing for a failed video
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { videoId } = body;

    if (!videoId) {
      return NextResponse.json(
        { error: 'Video ID is required' },
        { status: 400 }
      );
    }

    await retryProcessing(videoId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error retrying processing:', error);
    return NextResponse.json(
      { error: 'Failed to retry processing' },
      { status: 500 }
    );
  }
}
