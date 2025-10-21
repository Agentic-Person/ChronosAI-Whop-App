/**
 * Progress & Gamification System
 * Central export file for all progress-related functionality
 */

// Gamification Engine
export {
  getLevelInfo,
  getXPForLevel,
  getTotalXPForLevel,
  checkLevelUp,
  calculateVideoXP,
  calculateQuizXP,
  calculateProjectXP,
  calculateStreakXP,
  calculateStreakInfo,
  applyStreakMultiplier,
  calculateRank,
  calculateCompletionPercentage,
  predictCompletionDate,
  getMotivationalMessage,
  XP_VALUES,
  type LevelInfo,
  type XPGain,
  type StreakInfo,
} from './gamification-engine';

// Achievement System
export {
  ACHIEVEMENTS,
  AchievementRarity,
  AchievementCategory,
  getStudentAchievements,
  checkUnlockedAchievements,
  awardAchievement,
  getAchievementProgress,
  getAchievementById,
  getAchievementsByCategory,
  getAchievementsByRarity,
  checkTimeBasedAchievements,
  type Achievement,
  type AchievementCriteria,
  type StudentAchievement,
  type AchievementProgress,
} from './achievement-system';
