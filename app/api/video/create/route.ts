/**
 * Confirm Video Upload API
 *
 * POST /api/video/confirm
 * Confirms successful upload and initiates processing
 */

import { NextRequest, NextResponse } from 'next/server';
import { confirmVideoUpload, initiateProcessing } from '@/lib/video/upload-handler';
import { withInfrastructure } from '@/lib/infrastructure/middleware/with-infrastructure';
import { createClient } from '@/lib/supabase/server';

export const POST = withInfrastructure(
  async (req: NextRequest) => {
    try {
      const body: { videoId: string; sessionToken?: string; courseId?: string } = await req.json();

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

      // Validate required fields
      if (!body.videoId) {
        return NextResponse.json(
          { error: 'Bad Request', message: 'Missing required field: videoId' },
          { status: 400 }
        );
      }

      // Confirm upload (updates storage usage)
      const video = await confirmVideoUpload(body.videoId, creatorId);

      // Update video with course_id if provided
      if (body.courseId) {
        const supabase = createClient();
        await supabase
          .from('videos')
          .update({ course_id: body.courseId })
          .eq('id', body.videoId);
      }

      // Initiate background processing
      await initiateProcessing(video.id);

      return NextResponse.json(
        {
          success: true,
          video: {
            id: video.id,
            title: video.title,
            processingStatus: video.processing_status,
            courseId: body.courseId,
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
