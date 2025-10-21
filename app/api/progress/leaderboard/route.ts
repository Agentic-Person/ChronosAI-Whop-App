import { NextRequest, NextResponse } from 'next/server';
import { withFeatureGate } from '@/lib/middleware/feature-gate';
import { Feature } from '@/lib/features/types';
import { createClient } from '@/lib/utils/supabase-client';
import { getLevelInfo } from '@/lib/progress/gamification-engine';

interface LeaderboardEntry {
  rank: number;
  student_id: string;
  name: string;
  avatar_url?: string;
  total_xp: number;
  current_level: number;
  current_streak: number;
  is_current_user: boolean;
}

/**
 * GET /api/progress/leaderboard
 * Get XP leaderboard with ranking
 * Query params:
 * - scope: 'global' | 'course' (default: 'global')
 * - limit: number (default: 100, max: 500)
 */
export const GET = withFeatureGate(
  { feature: Feature.FEATURE_GAMIFICATION },
  async (req: NextRequest) => {
    try {
      const { searchParams } = new URL(req.url);
      const scope = searchParams.get('scope') || 'global';
      const limit = Math.min(parseInt(searchParams.get('limit') || '100'), 500);

      const supabase = createClient();

      // Get authenticated user
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }

      // Get current student
      const { data: currentStudent } = await supabase
        .from('students')
        .select('id, creator_id')
        .eq('whop_user_id', user.id)
        .single();

      if (!currentStudent) {
        return NextResponse.json({ error: 'Student not found' }, { status: 404 });
      }

      // Build query based on scope
      let query = supabase
        .from('students')
        .select('id, name, avatar_url, total_xp, current_streak, creator_id')
        .order('total_xp', { ascending: false })
        .limit(limit);

      // Filter by creator (course scope)
      if (scope === 'course' && currentStudent.creator_id) {
        query = query.eq('creator_id', currentStudent.creator_id);
      }

      const { data: students, error } = await query;

      if (error) {
        console.error('Error fetching leaderboard:', error);
        return NextResponse.json(
          { error: 'Failed to fetch leaderboard' },
          { status: 500 }
        );
      }

      // Build leaderboard with rankings
      const leaderboard: LeaderboardEntry[] = students.map((student, index) => {
        const levelInfo = getLevelInfo(student.total_xp || 0);

        return {
          rank: index + 1,
          student_id: student.id,
          name: student.name || 'Anonymous',
          avatar_url: student.avatar_url,
          total_xp: student.total_xp || 0,
          current_level: levelInfo.level,
          current_streak: student.current_streak || 0,
          is_current_user: student.id === currentStudent.id,
        };
      });

      // Get current user's rank if not in top results
      const currentUserEntry = leaderboard.find((entry) => entry.is_current_user);
      let currentUserRank = null;

      if (!currentUserEntry) {
        // Query to find current user's rank
        const { count: higherRanked } = await supabase
          .from('students')
          .select('*', { count: 'exact', head: true })
          .gt('total_xp', currentStudent.total_xp || 0);

        currentUserRank = (higherRanked || 0) + 1;
      }

      return NextResponse.json({
        scope,
        total_entries: students.length,
        leaderboard,
        current_user: {
          rank: currentUserEntry?.rank || currentUserRank,
          in_top_results: !!currentUserEntry,
        },
      });
    } catch (error) {
      console.error('Error in GET /api/progress/leaderboard:', error);
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }
  }
);
