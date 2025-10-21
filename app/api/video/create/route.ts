/**
 * Create Video Record API
 *
 * POST /api/video/create
 * Creates video record and initiates processing
 */

import { NextRequest, NextResponse } from 'next/server';
import { createVideoRecord, initiateProcessing } from '@/lib/video/upload-handler';
import { CreateVideoData } from '@/lib/video/types';
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
      if (!body.title || !body.s3Key) {
        return NextResponse.json(
          { error: 'Bad Request', message: 'Missing required fields: title, s3Key' },
          { status: 400 }
        );
      }

      const videoData: CreateVideoData = {
        creatorId,
        title: body.title,
        description: body.description,
        s3Key: body.s3Key,
        fileSize: body.fileSize,
        mimeType: body.mimeType,
        durationSeconds: body.durationSeconds,
        category: body.category,
        tags: body.tags,
        difficultyLevel: body.difficultyLevel,
      };

      // Create video record
      const video = await createVideoRecord(videoData);

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
        { status: 201 }
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
