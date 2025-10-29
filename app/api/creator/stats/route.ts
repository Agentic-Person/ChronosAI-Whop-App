import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getCreatorStats } from '@/lib/creator/analytics';

/**
 * GET /api/creator/stats
 * Get creator dashboard statistics
 */
export async function GET(request: NextRequest) {
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

    const stats = await getCreatorStats(creatorId);

    return NextResponse.json(stats, {
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
      },
    });
  } catch (error) {
    console.error('Error fetching creator stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch creator stats' },
      { status: 500 }
    );
  }
}
