import { NextRequest, NextResponse } from 'next/server';
import { withFeatureGate } from '@/lib/middleware/feature-gate';
import { Feature } from '@/lib/features/types';
import { createClient } from '@/lib/utils/supabase-client';
import { getLevelInfo } from '@/lib/progress/gamification-engine';
import { getStudentAchievements } from '@/lib/progress/achievement-system';

/**
 * GET /api/progress
 * Get comprehensive progress data for the authenticated student
 * Includes: XP, level, streak, achievements, course completion
 */
export const GET = withFeatureGate(
  { feature: Feature.FEATURE_GAMIFICATION },
  async (req: NextRequest) => {
    try {
      const supabase = createClient();

      // Get authenticated user
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }

      // Get student record
      const { data: student, error: studentError } = await supabase
        .from('students')
        .select('*')
        .eq('whop_user_id', user.id)
        .single();

      if (studentError || !student) {
        return NextResponse.json({ error: 'Student not found' }, { status: 404 });
      }

      // Calculate level info
      const levelInfo = getLevelInfo(student.total_xp || 0);

      // Get achievements
      const achievements = await getStudentAchievements(student.id);

      // Get video completion stats
      const { count: videosCompleted } = await supabase
        .from('video_progress')
        .select('*', { count: 'exact', head: true })
        .eq('student_id', student.id)
        .eq('is_completed', true);

      const { count: totalVideos } = await supabase
        .from('videos')
        .select('*', { count: 'exact', head: true })
        .eq('creator_id', student.creator_id);

      // Get quiz stats
      const { count: quizzesPassed } = await supabase
        .from('quiz_attempts')
        .select('*', { count: 'exact', head: true })
        .eq('student_id', student.id)
        .gte('score', 70);

      const { count: totalQuizzes } = await supabase
        .from('quizzes')
        .select('*', { count: 'exact', head: true })
        .eq('creator_id', student.creator_id);

      // Calculate course completion percentage
      const courseCompletion =
        totalVideos && totalVideos > 0
          ? Math.round(((videosCompleted || 0) / totalVideos) * 100)
          : 0;

      // Return comprehensive progress data
      return NextResponse.json({
        // Level & XP
        current_level: levelInfo.level,
        total_xp: levelInfo.totalXP,
        current_xp: levelInfo.currentXP,
        xp_for_next_level: levelInfo.xpForNextLevel,
        level_progress: levelInfo.progress,

        // Streak
        current_streak: student.current_streak || 0,
        longest_streak: student.longest_streak || 0,
        last_active_date: student.last_activity_date,

        // Achievements
        achievements_unlocked: achievements.length,
        total_achievements: 17, // Total number of achievements in the system
        achievements: achievements.map((a) => ({
          id: a.achievement_id,
          name: a.achievement.name,
          rarity: a.achievement.rarity,
          unlocked_at: a.unlocked_at,
        })),

        // Course Progress
        course_completion: courseCompletion,
        videos_completed: videosCompleted || 0,
        total_videos: totalVideos || 0,
        quizzes_passed: quizzesPassed || 0,
        total_quizzes: totalQuizzes || 0,

        // Additional Stats
        profile: {
          name: student.name,
          avatar_url: student.avatar_url,
          joined_at: student.created_at,
        },
      });
    } catch (error) {
      console.error('Error in GET /api/progress:', error);
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }
  }
);
