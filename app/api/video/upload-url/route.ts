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
import { createClient } from '@/lib/supabase/server';

export const POST = withInfrastructure(
  async (req: NextRequest) => {
    try {
      const body: UploadUrlRequest & { sessionToken?: string } = await req.json();

      let creatorId: string;

      // Check if this is a QR code mobile upload (has sessionToken)
      if (body.sessionToken) {
        // Validate session token and get creator ID
        const supabase = createClient();
        const { data: session, error } = await supabase
          .from('upload_sessions')
          .select('creator_id')
          .eq('session_token', body.sessionToken)
          .eq('is_active', true)
          .gte('expires_at', new Date().toISOString())
          .single();

        if (error || !session) {
          return NextResponse.json(
            { error: 'Unauthorized', message: 'Invalid or expired upload session' },
            { status: 401 }
          );
        }

        creatorId = session.creator_id;
      } else {
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

        creatorId = creator.id;
      }

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
