/**
 * GET /api/tokens/leaderboard
 * Get token leaderboard (global or course-specific)
 */

import { NextRequest, NextResponse } from 'next/server';
import { WalletService } from '@/lib/tokens';
import { createClient } from '@/lib/utils/supabase-client';

export async function GET(req: NextRequest) {
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

    // Get student ID
    const { data: student } = await supabase
      .from('students')
      .select('id, creator_id')
      .eq('whop_user_id', user.id)
      .single();

    if (!student) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 });
    }

    // Parse query parameters
    const searchParams = req.nextUrl.searchParams;
    const scope = searchParams.get('scope') || 'global';
    const limit = parseInt(searchParams.get('limit') || '10');

    // Get leaderboard based on scope
    let leaderboard;
    if (scope === 'course' && student.creator_id) {
      leaderboard = await WalletService.getCourseLeaderboard(
        student.creator_id,
        limit
      );
    } else {
      leaderboard = await WalletService.getTopEarners(limit);
    }

    // Get current user's rank and stats
    const userRank = await WalletService.getLeaderboardRank(student.id);
    const userStats = await WalletService.getWalletStats(student.id);
    const inTopResults = leaderboard.some(
      entry => entry.student_id === student.id
    );

    // Mark current user in leaderboard
    const leaderboardWithHighlight = leaderboard.map(entry => ({
      ...entry,
      is_current_user: entry.student_id === student.id,
    }));

    return NextResponse.json({
      scope,
      total_entries: leaderboard.length,
      leaderboard: leaderboardWithHighlight,
      current_user: {
        rank: userRank,
        in_top_results: inTopResults,
        total_earned: userStats.total_earned,
      },
    });
  } catch (error) {
    console.error('Get leaderboard error:', error);
    return NextResponse.json(
      {
        error: 'Failed to get leaderboard',
        details: (error as Error).message,
      },
      { status: 500 }
    );
  }
}
