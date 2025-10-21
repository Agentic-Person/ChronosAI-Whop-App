import { NextRequest, NextResponse } from 'next/server';
import { withFeatureGate } from '@/lib/middleware/feature-gate';
import { Feature } from '@/lib/features/types';
import { createClient } from '@/lib/utils/supabase-client';
import {
  calculateVideoXP,
  calculateQuizXP,
  calculateProjectXP,
  calculateStreakXP,
  checkLevelUp,
} from '@/lib/progress/gamification-engine';
import { checkUnlockedAchievements } from '@/lib/progress/achievement-system';

interface AwardXPRequest {
  action: 'video_complete' | 'quiz_pass' | 'project_submit' | 'daily_streak' | 'manual';
  metadata?: {
    // Video metadata
    isFirstTime?: boolean;
    watchTimeMinutes?: number;
    completionPercentage?: number;

    // Quiz metadata
    score?: number;
    passingScore?: number;
    isFirstAttempt?: boolean;
    isPerfectScore?: boolean;

    // Project metadata
    isComplete?: boolean;
    milestonesCompleted?: number;
    totalMilestones?: number;
    isEarlySubmission?: boolean;
    hasPeerReviews?: boolean;

    // Streak metadata
    streakDays?: number;

    // Manual XP
    amount?: number;
    reason?: string;
  };
}

/**
 * POST /api/progress/xp
 * Award XP to a student for completing an action
 * PRO tier feature
 */
export const POST = withFeatureGate(
  { feature: Feature.FEATURE_GAMIFICATION },
  async (req: NextRequest) => {
    try {
      const body: AwardXPRequest = await req.json();
      const { action, metadata = {} } = body;

      // Get authenticated user
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }

      // Get student record
      const { data: student, error: studentError } = await supabase
        .from('students')
        .select('id, total_xp')
        .eq('whop_user_id', user.id)
        .single();

      if (studentError || !student) {
        return NextResponse.json({ error: 'Student not found' }, { status: 404 });
      }

      // Calculate XP based on action
      let xpGain;
      switch (action) {
        case 'video_complete':
          xpGain = calculateVideoXP({
            isFirstTime: metadata.isFirstTime || false,
            watchTimeMinutes: metadata.watchTimeMinutes || 0,
            completionPercentage: metadata.completionPercentage || 100,
          });
          break;

        case 'quiz_pass':
          xpGain = calculateQuizXP({
            score: metadata.score || 0,
            passingScore: metadata.passingScore || 70,
            isFirstAttempt: metadata.isFirstAttempt || false,
            isPerfectScore: metadata.isPerfectScore || false,
          });
          break;

        case 'project_submit':
          xpGain = calculateProjectXP({
            isComplete: metadata.isComplete || false,
            milestonesCompleted: metadata.milestonesCompleted || 0,
            totalMilestones: metadata.totalMilestones || 0,
            isEarlySubmission: metadata.isEarlySubmission || false,
            hasPeerReviews: metadata.hasPeerReviews || false,
          });
          break;

        case 'daily_streak':
          xpGain = calculateStreakXP(metadata.streakDays || 1);
          break;

        case 'manual':
          xpGain = {
            amount: metadata.amount || 0,
            reason: metadata.reason || 'Manual XP award',
            source: 'bonus' as const,
          };
          break;

        default:
          return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
      }

      if (xpGain.amount === 0) {
        return NextResponse.json(
          { error: 'No XP awarded for this action' },
          { status: 400 }
        );
      }

      // Check for level up
      const levelUpInfo = checkLevelUp(student.total_xp, xpGain.amount);

      // Award XP via database function
      const { data: xpResult, error: xpError } = await supabase.rpc('award_xp', {
        p_student_id: student.id,
        p_xp_amount: xpGain.amount,
        p_action: action,
        p_metadata: {
          ...xpGain.metadata,
          source: xpGain.source,
          reason: xpGain.reason,
        },
      });

      if (xpError) {
        console.error('Error awarding XP:', xpError);
        return NextResponse.json(
          { error: 'Failed to award XP', details: xpError.message },
          { status: 500 }
        );
      }

      // Check for newly unlocked achievements
      const newAchievements = await checkUnlockedAchievements(student.id);

      // Return response
      return NextResponse.json({
        success: true,
        xp_awarded: xpGain.amount,
        new_total_xp: student.total_xp + xpGain.amount,
        level_up: levelUpInfo.leveledUp,
        old_level: levelUpInfo.oldLevel,
        new_level: levelUpInfo.newLevel,
        levels_gained: levelUpInfo.levelsGained,
        achievements_unlocked: newAchievements.map((a) => ({
          id: a.id,
          name: a.name,
          rarity: a.rarity,
          xp_reward: a.xp_reward,
        })),
        celebration_type: getCelebrationType(action, levelUpInfo.leveledUp),
      });
    } catch (error) {
      console.error('Error in POST /api/progress/xp:', error);
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }
  }
);

/**
 * Determine which celebration animation to show
 */
function getCelebrationType(
  action: string,
  leveledUp: boolean
): 'stars' | 'trophy' | 'rocket' | 'fireworks' | 'levelup' | 'confetti' {
  if (leveledUp) return 'levelup';

  switch (action) {
    case 'video_complete':
      return 'stars';
    case 'quiz_pass':
      return 'trophy';
    case 'project_submit':
      return 'rocket';
    case 'daily_streak':
      return 'fireworks';
    default:
      return 'confetti';
  }
}
