/**
 * Video List API
 *
 * GET /api/video/list
 * Returns list of videos for a creator with filtering
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCreatorVideos } from '@/lib/video/upload-handler';
import { withInfrastructure } from '@/lib/infrastructure/middleware/with-infrastructure';

export const GET = withInfrastructure(
  async (req: NextRequest) => {
    try {
      const creatorId = req.headers.get('x-creator-id');

      if (!creatorId) {
        return NextResponse.json(
          { error: 'Unauthorized', message: 'Creator ID required' },
          { status: 401 }
        );
      }

      // Get query parameters
      const { searchParams } = new URL(req.url);
      const status = searchParams.get('status') || undefined;
      const limit = parseInt(searchParams.get('limit') || '20');
      const offset = parseInt(searchParams.get('offset') || '0');

      const result = await getCreatorVideos(creatorId, {
        status,
        limit,
        offset,
      });

      return NextResponse.json({
        videos: result.videos,
        total: result.total,
        page: Math.floor(offset / limit) + 1,
        limit,
        hasMore: offset + result.videos.length < result.total,
      });
    } catch (error: any) {
      return NextResponse.json(
        { error: 'Internal Server Error', message: error.message },
        { status: 500 }
      );
    }
  },
  {
    logging: true,
    errorTracking: true,
  }
);
