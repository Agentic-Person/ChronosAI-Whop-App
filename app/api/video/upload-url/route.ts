/**
 * Generate Upload URL API
 *
 * POST /api/video/upload-url
 * Generates presigned S3 URL for direct video upload
 */

import { NextRequest, NextResponse } from 'next/server';
import { generateUploadUrl } from '@/lib/video/upload-handler';
import { UploadUrlRequest, UploadError } from '@/lib/video/types';
import { withInfrastructure } from '@/lib/infrastructure/middleware/with-infrastructure';
import { getSupabaseAdmin } from '@/lib/infrastructure/database/connection-pool';

export const POST = withInfrastructure(
  async (req: NextRequest) => {
    try {
      // TODO: Get creator ID from authenticated session
      // For now, using placeholder
      const creatorId = req.headers.get('x-creator-id');

      if (!creatorId) {
        return NextResponse.json(
          { error: 'Unauthorized', message: 'Creator ID required' },
          { status: 401 }
        );
      }

      const body: UploadUrlRequest = await req.json();

      // Validate request
      if (!body.filename || !body.contentType || !body.fileSize) {
        return NextResponse.json(
          {
            error: 'Bad Request',
            message: 'Missing required fields: filename, contentType, fileSize',
          },
          { status: 400 }
        );
      }

      // Generate upload URL
      const response = await generateUploadUrl(creatorId, body);

      return NextResponse.json(response, { status: 200 });
    } catch (error: any) {
      if (error instanceof UploadError) {
        return NextResponse.json(
          { error: error.code, message: error.message, details: error.details },
          { status: 403 }
        );
      }

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
