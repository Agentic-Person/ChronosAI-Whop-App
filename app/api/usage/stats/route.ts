/**
 * Usage Statistics API Endpoint
 *
 * Returns current usage statistics including:
 * - Daily/monthly spend
 * - Cost by provider and service
 * - API call counts
 * - Error rates
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
    const period = searchParams.get('period') as 'daily' | 'monthly' || 'daily';

    // Validate user can only access their own stats (unless admin)
    if (userId !== user.id) {
      // TODO: Add admin check
      return NextResponse.json(
        { success: false, error: 'Forbidden' },
        { status: 403 }
      );
    }

    // Get usage statistics
    const stats = await costTracker.getUsageStats(userId, creatorId);

    // Format response
    const response = {
      success: true,
      data: {
        daily_spent: stats.daily_spent,
        daily_limit: stats.daily_limit,
        monthly_spent: stats.monthly_spent,
        monthly_limit: stats.monthly_limit,
        total_api_calls: stats.total_api_calls,
        error_rate: stats.error_rate,
        cost_by_provider: stats.cost_by_provider,
        cost_by_service: stats.cost_by_service,
        period,
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Usage stats API error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch usage statistics',
      },
      { status: 500 }
    );
  }
}
