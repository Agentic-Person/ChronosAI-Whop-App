/**
 * Confirm Video Upload API
 *
 * POST /api/video/confirm
 * Confirms successful upload and initiates processing
 */

import { NextRequest, NextResponse } from 'next/server';
import { confirmVideoUpload, initiateProcessing } from '@/lib/video/upload-handler';
import { withInfrastructure } from '@/lib/infrastructure/middleware/with-infrastructure';

export const POST = withInfrastructure(
  async (req: NextRequest) => {
    try {
      const creatorId = req.headers.get('x-creator-id');

      if (!creatorId) {
        return NextResponse.json(
          { error: 'Unauthorized', message: 'Creator ID required' },
          { status: 401 }
        );
      }

      const body = await req.json();

      // Validate required fields
      if (!body.videoId) {
        return NextResponse.json(
          { error: 'Bad Request', message: 'Missing required field: videoId' },
          { status: 400 }
        );
      }

      // Confirm upload (updates storage usage)
      const video = await confirmVideoUpload(body.videoId, creatorId);

      // Initiate background processing
      await initiateProcessing(video.id);

      return NextResponse.json(
        {
          success: true,
          video: {
            id: video.id,
            title: video.title,
            processingStatus: video.processing_status,
          },
        },
        { status: 200 }
      );
    } catch (error: any) {
      return NextResponse.json(
        { error: 'Internal Server Error', message: error.message },
        { status: 500 }
      );
    }
  },
  {
    rateLimit: {
      enabled: true,
      endpoint: 'videoUpload',
    },
    logging: true,
    errorTracking: true,
  }
);
