/**
 * GET /api/chronos/streak
 * Get student's current streak information
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/utils/supabase-client';
import { getStreakStats } from '@/lib/chronos/streakTracker';

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

    // Security check
    if (studentId !== user.id) {
      const { data: creator } = await supabase
        .from('creators')
        .select('id')
        .eq('whop_user_id', user.id)
        .single();

      if (!creator) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    // Get streak stats
    const stats = await getStreakStats(studentId);

    return NextResponse.json(stats);
  } catch (error) {
    console.error('Failed to get streak stats:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
