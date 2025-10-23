/**
 * Token Reward Engine
 * Calculates and awards CHRONOS tokens alongside XP
 * - Dual reward system (XP + CHRONOS simultaneously)
 * - Creator multiplier support (0.5x - 2.0x for CHRONOS only)
 * - Video completion milestones
 * - Quiz and assessment rewards
 * - Achievement unlock rewards
 * - Milestone bonuses
 */

import { createClient } from '@/lib/utils/supabase-client';
import { SolanaService } from './solana-service';
import { WalletService } from './wallet-service';
import type {
  RewardAction,
  RewardMetadata,
  DualRewardResult,
  VideoMilestone,
  AchievementRarity,
  CreatorMultiplierSettings,
  VIDEO_REWARDS,
  QUIZ_REWARDS,
  ACHIEVEMENT_REWARDS,
  MILESTONE_BONUSES,
  MULTIPLIER_LIMITS,
} from '@/types/tokens';

// ============================================================================
// Reward Calculation Functions
// ============================================================================

/**
 * Calculate video completion reward
 */
export function calculateVideoReward(milestone: VideoMilestone): number {
  const rewards = {
    25: 25,
    50: 50,
    75: 75,
    100: 100,
  };

  return rewards[milestone] || 0;
}

/**
 * Calculate quiz completion reward based on score
 */
export function calculateQuizReward(score: number): number {
  if (score >= 95) return 200; // SCORE_95_100
  if (score >= 80) return 150; // SCORE_80_94
  if (score >= 60) return 100; // SCORE_60_79
  return 50; // SCORE_0_59
}

/**
 * Calculate achievement unlock reward based on rarity
 */
export function calculateAchievementReward(rarity: AchievementRarity): number {
  const rarityMap = {
    COMMON: 50,
    UNCOMMON: 100,
    RARE: 200,
    EPIC: 350,
    LEGENDARY: 500,
  };

  return rarityMap[rarity] || 50;
}

/**
 * Calculate milestone bonus reward
 */
export function calculateMilestoneBonus(
  milestoneType:
    | 'week_complete'
    | 'module_complete'
    | 'course_complete'
    | 'streak_7'
    | 'streak_30'
): number {
  const bonuses = {
    week_complete: 500,
    module_complete: 2000,
    course_complete: 10000,
    streak_7: 200,
    streak_30: 1000,
  };

  return bonuses[milestoneType] || 0;
}

/**
 * Master reward calculation function
 * Returns base CHRONOS amount (before multiplier)
 */
export function calculateReward(
  action: RewardAction,
  metadata: RewardMetadata
): number {
  switch (action) {
    case 'video_milestone':
      return calculateVideoReward(metadata.milestone || 100);

    case 'video_complete':
      // Daily completion bonus
      return 50; // DAILY_COMPLETION_BONUS

    case 'quiz_complete':
      return calculateQuizReward(metadata.score || 0);

    case 'achievement_unlock':
      return calculateAchievementReward(metadata.rarity || 'COMMON');

    case 'practice_task':
      return 100; // PRACTICE_TASK

    case 'project_complete':
      return 300; // PROJECT_COMPLETE

    case 'week_complete':
      return 500; // WEEK_COMPLETE

    case 'module_complete':
      return 2000; // MODULE_COMPLETE

    case 'course_complete':
      return 10000; // COURSE_COMPLETE

    case 'streak_bonus':
      const streakDays = metadata.streak_days || 0;
      if (streakDays >= 30) return 1000;
      if (streakDays >= 7) return 200;
      return 0;

    default:
      console.warn(`Unknown reward action: ${action}`);
      return 0;
  }
}

// ============================================================================
// Creator Multiplier System
// ============================================================================

/**
 * Get creator's CHRONOS multiplier setting
 * Returns 1.0 if no custom multiplier is set
 */
export async function getCreatorMultiplier(
  creatorId: string
): Promise<number> {
  const supabase = createClient();

  // Query creator settings (assuming multiplier stored in creators table)
  const { data: creator } = await supabase
    .from('creators')
    .select('blox_multiplier')
    .eq('id', creatorId)
    .single();

  if (!creator || !creator.blox_multiplier) {
    return 1.0; // Default multiplier
  }

  // Enforce limits
  const multiplier = creator.blox_multiplier;
  return Math.max(0.5, Math.min(2.0, multiplier));
}

/**
 * Apply creator multiplier to CHRONOS reward
 * XP remains unchanged
 */
export async function applyMultiplier(
  creatorId: string,
  baseAmount: number
): Promise<number> {
  const multiplier = await getCreatorMultiplier(creatorId);
  return Math.floor(baseAmount * multiplier);
}

/**
 * Set creator multiplier
 * Only creators can set their own multiplier
 */
export async function setCreatorMultiplier(
  creatorId: string,
  multiplier: number,
  reason?: string
): Promise<void> {
  const supabase = createClient();

  // Validate multiplier range
  if (multiplier < 0.5 || multiplier > 2.0) {
    throw new Error('Multiplier must be between 0.5 and 2.0');
  }

  // Update creator settings
  const { error } = await supabase
    .from('creators')
    .update({
      blox_multiplier: multiplier,
      blox_multiplier_reason: reason || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', creatorId);

  if (error) {
    console.error('Failed to set creator multiplier:', error);
    throw new Error('Failed to update multiplier');
  }
}

// ============================================================================
// Dual Reward System (XP + CHRONOS)
// ============================================================================

/**
 * Award both XP and CHRONOS simultaneously
 * XP is platform-standard (non-adjustable)
 * CHRONOS can be adjusted by creator multiplier
 */
export async function awardDualRewards(
  studentId: string,
  action: RewardAction,
  metadata: RewardMetadata
): Promise<DualRewardResult> {
  const supabase = createClient();

  // Calculate base rewards (1:1 ratio by default)
  const baseAmount = calculateReward(action, metadata);

  // XP is always the base amount (no multiplier)
  const xpAmount = baseAmount;

  // CHRONOS can be adjusted by creator multiplier
  let bloxAmount = baseAmount;

  if (metadata.creator_id) {
    bloxAmount = await applyMultiplier(metadata.creator_id, baseAmount);
  }

  // Get or create wallet
  const wallet = await WalletService.getOrCreateWallet(studentId);

  // Award XP (using existing gamification system from Agent 6)
  let xpTransactionId: string | undefined;
  let newXpTotal: number | undefined;
  let levelUp = false;
  let newLevel: number | undefined;

  try {
    // Call XP award function from Agent 6
    const { data: xpResult } = await supabase.rpc('award_xp', {
      p_student_id: studentId,
      p_xp_amount: xpAmount,
      p_action: action,
      p_metadata: metadata,
    });

    if (xpResult) {
      newXpTotal = xpResult.new_total_xp;
      levelUp = xpResult.level_up || false;
      newLevel = xpResult.new_level;
    }
  } catch (error) {
    console.error('XP award failed (non-critical):', error);
  }

  // Award CHRONOS tokens
  const { data: bloxResult, error: bloxError } = await supabase.rpc(
    'award_tokens',
    {
      p_student_id: studentId,
      p_amount: bloxAmount,
      p_source: action,
      p_source_id: metadata.video_id || metadata.quiz_id || metadata.achievement_id || null,
      p_metadata: {
        ...metadata,
        xp_awarded: xpAmount,
        base_amount: baseAmount,
        multiplier: metadata.creator_id
          ? await getCreatorMultiplier(metadata.creator_id)
          : 1.0,
      },
    }
  );

  if (bloxError) {
    console.error('CHRONOS award failed:', bloxError);
    throw new Error('Failed to award CHRONOS tokens');
  }

  const newBloxBalance = bloxResult || wallet.balance + bloxAmount;

  // Mint tokens on Solana (async, best-effort)
  try {
    await SolanaService.mintTokens(wallet.solana_address, bloxAmount);
  } catch (error) {
    console.error('Solana mint failed (non-critical):', error);
    // Database transaction already logged, Solana can be synced later
  }

  return {
    xp_amount: xpAmount,
    blox_amount: bloxAmount,
    xp_transaction_id: xpTransactionId,
    blox_transaction_id: wallet.id, // Using wallet ID as transaction reference
    new_xp_total: newXpTotal,
    new_blox_balance: newBloxBalance,
    level_up: levelUp,
    new_level: newLevel,
  };
}

// ============================================================================
// Specific Reward Functions (Convenience Wrappers)
// ============================================================================

/**
 * Award tokens for video completion milestone
 */
export async function awardVideoCompletion(
  studentId: string,
  videoId: string,
  milestone: VideoMilestone,
  metadata: Partial<RewardMetadata> = {}
): Promise<DualRewardResult> {
  return awardDualRewards(studentId, 'video_milestone', {
    video_id: videoId,
    milestone,
    completion_percentage: milestone,
    ...metadata,
  });
}

/**
 * Award tokens for quiz completion
 */
export async function awardQuizCompletion(
  studentId: string,
  quizId: string,
  score: number,
  metadata: Partial<RewardMetadata> = {}
): Promise<DualRewardResult> {
  return awardDualRewards(studentId, 'quiz_complete', {
    quiz_id: quizId,
    score,
    is_perfect_score: score >= 95,
    ...metadata,
  });
}

/**
 * Award tokens for achievement unlock
 */
export async function awardAchievement(
  studentId: string,
  achievementId: string,
  rarity: AchievementRarity,
  metadata: Partial<RewardMetadata> = {}
): Promise<DualRewardResult> {
  return awardDualRewards(studentId, 'achievement_unlock', {
    achievement_id: achievementId,
    rarity,
    ...metadata,
  });
}

/**
 * Award tokens for practice task submission
 */
export async function awardPracticeTask(
  studentId: string,
  taskId: string,
  metadata: Partial<RewardMetadata> = {}
): Promise<DualRewardResult> {
  return awardDualRewards(studentId, 'practice_task', {
    source_id: taskId,
    ...metadata,
  });
}

/**
 * Award tokens for project completion
 */
export async function awardProjectCompletion(
  studentId: string,
  projectId: string,
  metadata: Partial<RewardMetadata> = {}
): Promise<DualRewardResult> {
  return awardDualRewards(studentId, 'project_complete', {
    source_id: projectId,
    ...metadata,
  });
}

/**
 * Award tokens for week completion
 */
export async function awardWeekCompletion(
  studentId: string,
  weekNumber: number,
  metadata: Partial<RewardMetadata> = {}
): Promise<DualRewardResult> {
  return awardDualRewards(studentId, 'week_complete', {
    week_number: weekNumber,
    ...metadata,
  });
}

/**
 * Award tokens for module completion
 */
export async function awardModuleCompletion(
  studentId: string,
  moduleId: string,
  metadata: Partial<RewardMetadata> = {}
): Promise<DualRewardResult> {
  return awardDualRewards(studentId, 'module_complete', {
    source_id: moduleId,
    ...metadata,
  });
}

/**
 * Award tokens for course completion
 */
export async function awardCourseCompletion(
  studentId: string,
  courseId: string,
  metadata: Partial<RewardMetadata> = {}
): Promise<DualRewardResult> {
  return awardDualRewards(studentId, 'course_complete', {
    source_id: courseId,
    ...metadata,
  });
}

/**
 * Award streak bonus tokens
 */
export async function awardStreakBonus(
  studentId: string,
  streakDays: number,
  metadata: Partial<RewardMetadata> = {}
): Promise<DualRewardResult> {
  return awardDualRewards(studentId, 'streak_bonus', {
    streak_days: streakDays,
    ...metadata,
  });
}

// ============================================================================
// Export Service Object
// ============================================================================

export const RewardEngine = {
  // Calculation functions
  calculateReward,
  calculateVideoReward,
  calculateQuizReward,
  calculateAchievementReward,
  calculateMilestoneBonus,

  // Multiplier management
  getCreatorMultiplier,
  applyMultiplier,
  setCreatorMultiplier,

  // Dual reward system
  awardDualRewards,

  // Specific reward functions
  awardVideoCompletion,
  awardQuizCompletion,
  awardAchievement,
  awardPracticeTask,
  awardProjectCompletion,
  awardWeekCompletion,
  awardModuleCompletion,
  awardCourseCompletion,
  awardStreakBonus,
};

export default RewardEngine;
