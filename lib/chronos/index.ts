/**
 * CHRONOS Token Reward System - Unified Export
 * Simplified universal token system for student engagement
 */

export {
  awardVideoCompletion,
  awardChatMessage,
  awardDailyStreak,
  getBalance,
  getTransactionHistory,
  getWalletStats,
  RewardEngine,
  REWARD_AMOUNTS,
} from './rewardEngine';

export {
  updateStreak,
  getStreak,
  hasActivityToday,
  getStreakStats,
  StreakTracker,
} from './streakTracker';
