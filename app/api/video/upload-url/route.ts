/**
 * Generate Upload URL API
 *
 * POST /api/video/upload-url
 * Generates presigned Supabase Storage URL for direct video upload with:
 * - Storage limit enforcement
 * - Multi-tenant isolation
 * - Tier-based quota checks
 */

import { NextRequest, NextResponse } from 'next/server';
import { generateUploadUrl } from '@/lib/video/upload-handler';
import { UploadUrlRequest, UploadError } from '@/lib/video/types';
import { withInfrastructure } from '@/lib/infrastructure/middleware/with-infrastructure';
import { getStorageUsageSummary } from '@/lib/features/storage-limits';

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

      // Generate upload URL (includes storage limit check)
      const response = await generateUploadUrl(creatorId, body);

      // Get storage usage summary to include in response
      const usageSummary = await getStorageUsageSummary(creatorId);

      return NextResponse.json(
        {
          ...response,
          storage: usageSummary,
        },
        { status: 200 }
      );
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
