/**
 * Cost Breakdown API Endpoint
 *
 * Returns detailed cost breakdowns by:
 * - Service (chat, embeddings, transcription, storage)
 * - Provider (openai, anthropic, aws, supabase)
 * - Day (daily time series)
 */

import { NextRequest, NextResponse } from 'next/server';
import { costTracker } from '@/lib/usage';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // Get authenticated user
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('user_id') || user.id;
    const creatorId = searchParams.get('creator_id') || undefined;
    const startDateStr = searchParams.get('start_date');
    const endDateStr = searchParams.get('end_date');
    const groupBy = searchParams.get('group_by') as 'service' | 'provider' | 'day' || 'service';

    // Validate user can only access their own data
    if (userId !== user.id) {
      // TODO: Add admin check
      return NextResponse.json(
        { success: false, error: 'Forbidden' },
        { status: 403 }
      );
    }

    // Parse dates if provided
    const startDate = startDateStr ? new Date(startDateStr) : undefined;
    const endDate = endDateStr ? new Date(endDateStr) : undefined;

    // Get breakdown based on groupBy parameter
    let data;

    if (groupBy === 'day') {
      // Get daily usage time series
      data = await costTracker.getDailyUsage(userId, creatorId);
    } else {
      // Get cost breakdown by service or provider
      const breakdown = await costTracker.getCostBreakdown(userId, creatorId, startDate, endDate);

      // Calculate total cost for percentage
      const totalCost = breakdown.reduce((sum, item) => sum + item.cost, 0);

      // Add percentage to each item
      data = breakdown.map(item => ({
        ...item,
        percentage: totalCost > 0 ? (item.cost / totalCost) * 100 : 0,
      }));
    }

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error('Cost breakdown API error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch cost breakdown',
      },
      { status: 500 }
    );
  }
}
