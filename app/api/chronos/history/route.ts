/**
 * GET /api/chronos/history
 * Get student's CHRONOS transaction history
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/utils/supabase-client';
import { getTransactionHistory } from '@/lib/chronos/rewardEngine';

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient();

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get query params
    const { searchParams } = new URL(request.url);
    const studentId = searchParams.get('studentId') || user.id;
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    // Security check: users can only view their own history
    if (studentId !== user.id) {
      // Check if user is a creator viewing their student's history
      const { data: creator } = await supabase
        .from('creators')
        .select('id')
        .eq('whop_user_id', user.id)
        .single();

      if (!creator) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    // Get transaction history
    const history = await getTransactionHistory(studentId, limit, offset);

    return NextResponse.json({
      transactions: history.transactions,
      total: history.total,
      hasMore: history.hasMore,
      limit,
      offset,
    });
  } catch (error) {
    console.error('Failed to get transaction history:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
