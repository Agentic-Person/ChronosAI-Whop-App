/**
 * Video List API
 *
 * GET /api/video/list
 * Returns list of videos for a creator with filtering
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCreatorVideos } from '@/lib/video/upload-handler';
import { withInfrastructure } from '@/lib/infrastructure/middleware/with-infrastructure';
import { createClient } from '@/lib/supabase/server';

export const GET = withInfrastructure(
  async (req: NextRequest) => {
    try {
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

      const creatorId = creator.id;

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
