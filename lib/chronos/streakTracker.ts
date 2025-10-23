/**
 * Daily Streak Tracker
 * Tracks student's consecutive daily activity
 * Awards streak bonuses at 7, 30, and 100 days
 */

import { createClient } from '@/lib/utils/supabase-client';
import { awardDailyStreak } from './rewardEngine';

// ============================================================================
// Streak Milestones
// ============================================================================

const STREAK_MILESTONES = [7, 30, 100];

// ============================================================================
// Core Streak Functions
// ============================================================================

/**
 * Update student's streak and award bonus if milestone reached
 * Call this whenever a student watches a video
 */
export async function updateStreak(studentId: string): Promise<{
  currentStreak: number;
  longestStreak: number;
  milestoneReached?: number;
  bonusAwarded?: number;
}> {
  const supabase = createClient();

  // Call database function to update streak
  const { data, error } = await supabase.rpc('update_student_streak', {
    p_student_id: studentId,
  });

  if (error) {
    console.error('Failed to update streak:', error);
    throw new Error('Failed to update streak');
  }

  const currentStreak = data || 0;

  // Get full streak info
  const { data: streakData } = await supabase
    .from('student_streaks')
    .select('*')
    .eq('student_id', studentId)
    .single();

  const longestStreak = streakData?.longest_streak || currentStreak;

  // Check if milestone reached and award bonus
  let milestoneReached: number | undefined;
  let bonusAwarded: number | undefined;

  if (STREAK_MILESTONES.includes(currentStreak)) {
    milestoneReached = currentStreak;

    try {
      const result = await awardDailyStreak(studentId, currentStreak);
      bonusAwarded = result.balance;
    } catch (error) {
      console.error('Failed to award streak bonus:', error);
    }
  }

  return {
    currentStreak,
    longestStreak,
    milestoneReached,
    bonusAwarded,
  };
}

/**
 * Get student's current streak information
 */
export async function getStreak(studentId: string): Promise<{
  currentStreak: number;
  longestStreak: number;
  lastActivityDate: string | null;
  nextMilestone: number | null;
  daysUntilNextMilestone: number | null;
}> {
  const supabase = createClient();

  const { data: streak, error } = await supabase
    .from('student_streaks')
    .select('*')
    .eq('student_id', studentId)
    .single();

  if (error || !streak) {
    return {
      currentStreak: 0,
      longestStreak: 0,
      lastActivityDate: null,
      nextMilestone: 7,
      daysUntilNextMilestone: 7,
    };
  }

  const currentStreak = streak.current_streak || 0;
  const longestStreak = streak.longest_streak || 0;

  // Find next milestone
  let nextMilestone: number | null = null;
  for (const milestone of STREAK_MILESTONES) {
    if (milestone > currentStreak) {
      nextMilestone = milestone;
      break;
    }
  }

  const daysUntilNextMilestone = nextMilestone
    ? nextMilestone - currentStreak
    : null;

  return {
    currentStreak,
    longestStreak,
    lastActivityDate: streak.last_activity_date,
    nextMilestone,
    daysUntilNextMilestone,
  };
}

/**
 * Check if student has activity today
 */
export async function hasActivityToday(studentId: string): Promise<boolean> {
  const supabase = createClient();

  const { data: streak } = await supabase
    .from('student_streaks')
    .select('last_activity_date')
    .eq('student_id', studentId)
    .single();

  if (!streak || !streak.last_activity_date) {
    return false;
  }

  const today = new Date().toISOString().split('T')[0];
  return streak.last_activity_date === today;
}

/**
 * Get streak statistics for display
 */
export async function getStreakStats(studentId: string): Promise<{
  currentStreak: number;
  longestStreak: number;
  milestoneProgress: {
    current: number;
    next: number | null;
    percentage: number;
  };
}> {
  const streakInfo = await getStreak(studentId);

  const percentage = streakInfo.nextMilestone
    ? (streakInfo.currentStreak / streakInfo.nextMilestone) * 100
    : 100;

  return {
    currentStreak: streakInfo.currentStreak,
    longestStreak: streakInfo.longestStreak,
    milestoneProgress: {
      current: streakInfo.currentStreak,
      next: streakInfo.nextMilestone,
      percentage: Math.min(100, percentage),
    },
  };
}

// ============================================================================
// Export
// ============================================================================

export const StreakTracker = {
  updateStreak,
  getStreak,
  hasActivityToday,
  getStreakStats,
  STREAK_MILESTONES,
};

export default StreakTracker;
