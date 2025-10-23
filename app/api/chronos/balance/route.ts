/**
 * GET /api/chronos/balance
 * Get student's CHRONOS token balance
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/utils/supabase-client';
import { getWalletStats } from '@/lib/chronos/rewardEngine';

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

    // Get student ID from URL params or use auth user ID
    const { searchParams } = new URL(request.url);
    const studentId = searchParams.get('studentId') || user.id;

    // Security check: users can only view their own balance
    if (studentId !== user.id) {
      // Check if user is a creator viewing their student's balance
      const { data: creator } = await supabase
        .from('creators')
        .select('id')
        .eq('whop_user_id', user.id)
        .single();

      if (!creator) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    // Get wallet stats
    const stats = await getWalletStats(studentId);

    return NextResponse.json({
      balance: stats.balance,
      totalEarned: stats.totalEarned,
      totalSpent: stats.totalSpent,
      totalRedeemed: stats.totalRedeemed,
      usdValue: stats.balance * 0.001, // CHRONOS to USD conversion
    });
  } catch (error) {
    console.error('Failed to get balance:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
