/**
 * Video Processing Status API
 *
 * GET /api/video/status/:id
 * Returns processing status for a video
 */

import { NextRequest, NextResponse } from 'next/server';
import { getVideoById } from '@/lib/video/upload-handler';
import { withInfrastructure } from '@/lib/infrastructure/middleware/with-infrastructure';

export const GET = withInfrastructure(
  async (req: NextRequest, { params }: { params: { id: string } }) => {
    try {
      const videoId = params.id;

      if (!videoId) {
        return NextResponse.json(
          { error: 'Bad Request', message: 'Video ID required' },
          { status: 400 }
        );
      }

      const video = await getVideoById(videoId);

      if (!video) {
        return NextResponse.json(
          { error: 'Not Found', message: 'Video not found' },
          { status: 404 }
        );
      }

      return NextResponse.json({
        videoId: video.id,
        status: video.processing_status,
        progress: video.processing_progress,
        currentStep: video.processing_step,
        error: video.processing_error,
        completedAt: video.processing_status === 'completed' ? video.embedded_at : null,
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
