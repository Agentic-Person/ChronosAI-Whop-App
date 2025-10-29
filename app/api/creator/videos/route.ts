import { NextRequest, NextResponse } from 'next/server';
import {
  getCreatorVideosWithStats,
  searchVideos,
  filterVideosByStatus,
  updateVideoMetadata,
  deleteVideo,
  bulkDeleteVideos,
} from '@/lib/creator/videoManager';

/**
 * GET /api/creator/videos
 * Get all videos for a creator with optional filters
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const creatorId = searchParams.get('creatorId');
    const courseId = searchParams.get('courseId');
    const search = searchParams.get('search');
    const status = searchParams.get('status') as 'all' | 'processing' | 'completed' | 'failed' | null;

    if (!creatorId) {
      return NextResponse.json(
        { error: 'Creator ID is required' },
        { status: 400 }
      );
    }

    let videos;

    if (search) {
      videos = await searchVideos(creatorId, search);
    } else if (status) {
      videos = await filterVideosByStatus(creatorId, status);
    } else {
      videos = await getCreatorVideosWithStats(creatorId, courseId);
    }

    // Filter by courseId if provided (for searches and status filters)
    if (courseId && videos) {
      videos = videos.filter((v: any) => v.course_id === courseId);
    }

    return NextResponse.json(videos, {
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
      },
    });
  } catch (error) {
    console.error('Error fetching videos:', error);
    return NextResponse.json(
      { error: 'Failed to fetch videos' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/creator/videos
 * Update video metadata
 */
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { videoId, title, description } = body;

    if (!videoId) {
      return NextResponse.json(
        { error: 'Video ID is required' },
        { status: 400 }
      );
    }

    const updates: any = {};
    if (title) updates.title = title;
    if (description !== undefined) updates.description = description;

    const updatedVideo = await updateVideoMetadata(videoId, updates);

    return NextResponse.json(updatedVideo);
  } catch (error) {
    console.error('Error updating video:', error);
    return NextResponse.json(
      { error: 'Failed to update video' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/creator/videos
 * Delete video(s)
 */
export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { videoId, videoIds } = body;

    if (videoIds && Array.isArray(videoIds)) {
      // Bulk delete
      await bulkDeleteVideos(videoIds);
      return NextResponse.json({ success: true, count: videoIds.length });
    } else if (videoId) {
      // Single delete
      await deleteVideo(videoId);
      return NextResponse.json({ success: true });
    } else {
      return NextResponse.json(
        { error: 'Video ID or IDs required' },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Error deleting video:', error);
    return NextResponse.json(
      { error: 'Failed to delete video' },
      { status: 500 }
    );
  }
}
