import { NextRequest, NextResponse } from 'next/server';
import {
  getEngagementMetrics,
  getTopVideos,
  getChatInsights,
} from '@/lib/creator/analytics';

/**
 * GET /api/creator/analytics
 * Get analytics data for charts and insights
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const creatorId = searchParams.get('creatorId');
    const period = searchParams.get('period') || '30d';

    if (!creatorId) {
      return NextResponse.json(
        { error: 'Creator ID is required' },
        { status: 400 }
      );
    }

    const days = period === '7d' ? 7 : period === '30d' ? 30 : 90;

    const [metricsData, videosData, insightsData] = await Promise.all([
      getEngagementMetrics(creatorId, days),
      getTopVideos(creatorId, 10),
      getChatInsights(creatorId, 10),
    ]);

    return NextResponse.json({
      enrollmentsByDate: metricsData.enrollmentsByDate,
      messagesByDate: metricsData.messagesByDate,
      topVideos: videosData,
      chatInsights: insightsData,
    }, {
      headers: {
        'Cache-Control': 'public, s-maxage=600, stale-while-revalidate=1200',
      },
    });
  } catch (error) {
    console.error('Error fetching analytics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch analytics' },
      { status: 500 }
    );
  }
}
