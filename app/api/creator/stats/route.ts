import { NextRequest, NextResponse } from 'next/server';
import { getCreatorStats } from '@/lib/creator/analytics';

/**
 * GET /api/creator/stats
 * Get creator dashboard statistics
 */
export async function GET(request: NextRequest) {
  try {
    // TODO: Get creator ID from authenticated session
    // For now, using query param for testing
    const searchParams = request.nextUrl.searchParams;
    const creatorId = searchParams.get('creatorId');

    if (!creatorId) {
      return NextResponse.json(
        { error: 'Creator ID is required' },
        { status: 400 }
      );
    }

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
