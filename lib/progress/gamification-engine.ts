/**
 * Gamification Engine
 * Handles XP calculations, level progression, and gamification logic
 */

export interface LevelInfo {
  level: number;
  currentXP: number;
  xpForNextLevel: number;
  xpForCurrentLevel: number;
  progress: number; // 0-100
  totalXP: number;
}

export interface XPGain {
  amount: number;
  reason: string;
  source: 'video' | 'quiz' | 'project' | 'streak' | 'achievement' | 'bonus';
  metadata?: Record<string, any>;
}

export interface StreakInfo {
  current: number;
  longest: number;
  lastActive: Date;
  isActive: boolean;
  multiplier: number;
}

/**
 * XP Constants
 */
export const XP_VALUES = {
  // Video completion
  VIDEO_COMPLETE: 50,
  VIDEO_COMPLETE_BONUS_FIRST_TIME: 25,
  VIDEO_WATCH_TIME_PER_MINUTE: 2,

  // Quiz performance
  QUIZ_PASS: 100,
  QUIZ_PERFECT_SCORE: 50, // Bonus for 100%
  QUIZ_FIRST_ATTEMPT_PASS: 30,
  QUIZ_RETRY_MULTIPLIER: 0.7, // 70% XP on retries

  // Project submissions
  PROJECT_SUBMIT: 200,
  PROJECT_MILESTONE: 50,
  PROJECT_EARLY_SUBMISSION: 40,
  PROJECT_PEER_REVIEW: 30,

  // Streak bonuses
  STREAK_DAILY_BASE: 10,
  STREAK_WEEK_BONUS: 50,
  STREAK_MONTH_BONUS: 200,

  // Social engagement
  HELP_PEER: 20,
  PEER_REVIEW_GIVE: 25,
  SHARE_PROJECT: 15,

  // Daily/Weekly goals
  DAILY_GOAL_COMPLETE: 30,
  WEEKLY_GOAL_COMPLETE: 100,
} as const;

/**
 * Level progression follows exponential growth
 * Formula: XP = BASE * (MULTIPLIER ^ level)
 */
const LEVEL_BASE_XP = 100;
const LEVEL_MULTIPLIER = 1.5;

/**
 * Calculate XP required for a specific level
 */
export function getXPForLevel(level: number): number {
  if (level <= 1) return 0;
  return Math.floor(LEVEL_BASE_XP * Math.pow(LEVEL_MULTIPLIER, level - 1));
}

/**
 * Calculate total XP needed to reach a level
 */
export function getTotalXPForLevel(level: number): number {
  let total = 0;
  for (let i = 1; i < level; i++) {
    total += getXPForLevel(i);
  }
  return total;
}

/**
 * Calculate level info from total XP
 */
export function getLevelInfo(totalXP: number): LevelInfo {
  let level = 1;
  let xpAccumulated = 0;

  // Find current level
  while (xpAccumulated + getXPForLevel(level + 1) <= totalXP) {
    xpAccumulated += getXPForLevel(level + 1);
    level++;
  }

  const currentXP = totalXP - xpAccumulated;
  const xpForNextLevel = getXPForLevel(level + 1);
  const xpForCurrentLevel = getXPForLevel(level);
  const progress = xpForNextLevel > 0 ? (currentXP / xpForNextLevel) * 100 : 100;

  return {
    level,
    currentXP,
    xpForNextLevel,
    xpForCurrentLevel,
    progress: Math.min(progress, 100),
    totalXP,
  };
}

/**
 * Calculate if XP gain causes level up
 */
export function checkLevelUp(
  currentTotalXP: number,
  xpGain: number
): { leveledUp: boolean; oldLevel: number; newLevel: number; levelsGained: number } {
  const oldLevelInfo = getLevelInfo(currentTotalXP);
  const newLevelInfo = getLevelInfo(currentTotalXP + xpGain);

  return {
    leveledUp: newLevelInfo.level > oldLevelInfo.level,
    oldLevel: oldLevelInfo.level,
    newLevel: newLevelInfo.level,
    levelsGained: newLevelInfo.level - oldLevelInfo.level,
  };
}

/**
 * Calculate XP for video completion
 */
export function calculateVideoXP(params: {
  isFirstTime: boolean;
  watchTimeMinutes: number;
  completionPercentage: number;
}): XPGain {
  let amount = 0;
  const metadata: Record<string, any> = {};

  // Base completion XP
  if (params.completionPercentage >= 90) {
    amount += XP_VALUES.VIDEO_COMPLETE;

    if (params.isFirstTime) {
      amount += XP_VALUES.VIDEO_COMPLETE_BONUS_FIRST_TIME;
      metadata.firstTimeBonus = true;
    }
  }

  // Watch time bonus
  const watchTimeXP = Math.floor(params.watchTimeMinutes * XP_VALUES.VIDEO_WATCH_TIME_PER_MINUTE);
  amount += watchTimeXP;

  metadata.watchTimeMinutes = params.watchTimeMinutes;
  metadata.completionPercentage = params.completionPercentage;

  return {
    amount,
    reason: `Completed video${params.isFirstTime ? ' (first time!)' : ''}`,
    source: 'video',
    metadata,
  };
}

/**
 * Calculate XP for quiz completion
 */
export function calculateQuizXP(params: {
  score: number;
  passingScore: number;
  isFirstAttempt: boolean;
  isPerfectScore: boolean;
}): XPGain {
  let amount = 0;
  const metadata: Record<string, any> = {};

  // Base pass XP
  if (params.score >= params.passingScore) {
    amount += XP_VALUES.QUIZ_PASS;

    // First attempt bonus
    if (params.isFirstAttempt) {
      amount += XP_VALUES.QUIZ_FIRST_ATTEMPT_PASS;
      metadata.firstAttemptBonus = true;
    } else {
      // Retry penalty
      amount = Math.floor(amount * XP_VALUES.QUIZ_RETRY_MULTIPLIER);
      metadata.retryPenalty = true;
    }

    // Perfect score bonus
    if (params.isPerfectScore) {
      amount += XP_VALUES.QUIZ_PERFECT_SCORE;
      metadata.perfectScore = true;
    }
  }

  metadata.score = params.score;
  metadata.passingScore = params.passingScore;

  return {
    amount,
    reason: `${params.isPerfectScore ? 'Perfect score on' : 'Passed'} quiz${params.isFirstAttempt ? ' (first try!)' : ''}`,
    source: 'quiz',
    metadata,
  };
}

/**
 * Calculate XP for project submission
 */
export function calculateProjectXP(params: {
  isComplete: boolean;
  milestonesCompleted: number;
  totalMilestones: number;
  isEarlySubmission: boolean;
  hasPeerReviews: boolean;
}): XPGain {
  let amount = 0;
  const metadata: Record<string, any> = {};

  // Milestone XP
  amount += params.milestonesCompleted * XP_VALUES.PROJECT_MILESTONE;

  // Completion bonus
  if (params.isComplete) {
    amount += XP_VALUES.PROJECT_SUBMIT;

    if (params.isEarlySubmission) {
      amount += XP_VALUES.PROJECT_EARLY_SUBMISSION;
      metadata.earlySubmission = true;
    }
  }

  // Peer review bonus
  if (params.hasPeerReviews) {
    amount += XP_VALUES.PEER_REVIEW_GIVE;
    metadata.peerReviewBonus = true;
  }

  metadata.milestonesCompleted = params.milestonesCompleted;
  metadata.totalMilestones = params.totalMilestones;

  return {
    amount,
    reason: params.isComplete ? 'Project completed!' : 'Milestone reached',
    source: 'project',
    metadata,
  };
}

/**
 * Calculate streak bonus and multiplier
 */
export function calculateStreakInfo(params: {
  currentStreak: number;
  longestStreak: number;
  lastActiveDate: Date;
}): StreakInfo {
  const now = new Date();
  const lastActive = params.lastActiveDate;
  const daysSince = Math.floor((now.getTime() - lastActive.getTime()) / (1000 * 60 * 60 * 24));

  // Check if streak is still active (within 24 hours)
  const isActive = daysSince <= 1;

  // Calculate multiplier (max 2x at 30 day streak)
  const multiplier = Math.min(1 + (params.currentStreak / 60), 2);

  return {
    current: isActive ? params.currentStreak : 0,
    longest: params.longestStreak,
    lastActive,
    isActive,
    multiplier,
  };
}

/**
 * Calculate daily streak XP
 */
export function calculateStreakXP(streakDays: number): XPGain {
  let amount = XP_VALUES.STREAK_DAILY_BASE;
  const metadata: Record<string, any> = { streakDays };

  // Week milestone
  if (streakDays % 7 === 0) {
    amount += XP_VALUES.STREAK_WEEK_BONUS;
    metadata.weekMilestone = true;
  }

  // Month milestone
  if (streakDays % 30 === 0) {
    amount += XP_VALUES.STREAK_MONTH_BONUS;
    metadata.monthMilestone = true;
  }

  return {
    amount,
    reason: `${streakDays} day streak!`,
    source: 'streak',
    metadata,
  };
}

/**
 * Apply streak multiplier to XP
 */
export function applyStreakMultiplier(xp: number, streakMultiplier: number): number {
  return Math.floor(xp * streakMultiplier);
}

/**
 * Calculate leaderboard rank
 */
export function calculateRank(
  userXP: number,
  allUsersXP: number[]
): { rank: number; total: number; percentile: number } {
  const sorted = [...allUsersXP].sort((a, b) => b - a);
  const rank = sorted.indexOf(userXP) + 1;
  const total = sorted.length;
  const percentile = ((total - rank) / total) * 100;

  return { rank, total, percentile };
}

/**
 * Calculate completion percentage for a learning path
 */
export function calculateCompletionPercentage(params: {
  videosCompleted: number;
  totalVideos: number;
  quizzesPassed: number;
  totalQuizzes: number;
  projectsCompleted: number;
  totalProjects: number;
}): number {
  const videoWeight = 0.4;
  const quizWeight = 0.3;
  const projectWeight = 0.3;

  const videoProgress = params.totalVideos > 0 ? params.videosCompleted / params.totalVideos : 0;
  const quizProgress = params.totalQuizzes > 0 ? params.quizzesPassed / params.totalQuizzes : 0;
  const projectProgress = params.totalProjects > 0 ? params.projectsCompleted / params.totalProjects : 0;

  return Math.floor(
    (videoProgress * videoWeight + quizProgress * quizWeight + projectProgress * projectWeight) * 100
  );
}

/**
 * Predict completion date based on current pace
 */
export function predictCompletionDate(params: {
  currentProgress: number; // 0-100
  dailyAverageProgress: number; // percentage points per day
  startDate: Date;
}): { estimatedDate: Date; daysRemaining: number; confidence: 'high' | 'medium' | 'low' } {
  const remainingProgress = 100 - params.currentProgress;
  const daysRemaining = params.dailyAverageProgress > 0
    ? Math.ceil(remainingProgress / params.dailyAverageProgress)
    : Infinity;

  const estimatedDate = new Date();
  estimatedDate.setDate(estimatedDate.getDate() + daysRemaining);

  // Calculate confidence based on data consistency
  const daysSinceStart = Math.floor(
    (Date.now() - params.startDate.getTime()) / (1000 * 60 * 60 * 24)
  );

  let confidence: 'high' | 'medium' | 'low' = 'low';
  if (daysSinceStart >= 14 && params.dailyAverageProgress > 0.5) {
    confidence = 'high';
  } else if (daysSinceStart >= 7 && params.dailyAverageProgress > 0.2) {
    confidence = 'medium';
  }

  return { estimatedDate, daysRemaining, confidence };
}

/**
 * Generate motivational message based on progress
 */
export function getMotivationalMessage(levelInfo: LevelInfo, streakInfo: StreakInfo): string {
  const messages = {
    levelUp: [
      `You're crushing it! Level ${levelInfo.level} achieved!`,
      `Incredible! You've reached level ${levelInfo.level}!`,
      `You're unstoppable! Welcome to level ${levelInfo.level}!`,
    ],
    nearLevelUp: [
      `So close! Just ${levelInfo.xpForNextLevel - levelInfo.currentXP} XP until level ${levelInfo.level + 1}!`,
      `Almost there! Level ${levelInfo.level + 1} is within reach!`,
      `Keep going! You're ${Math.floor(levelInfo.progress)}% to the next level!`,
    ],
    streak: [
      `${streakInfo.current} days strong! Don't break the chain!`,
      `Fire streak! You're on day ${streakInfo.current}!`,
      `Amazing consistency! ${streakInfo.current} day streak!`,
    ],
    encouragement: [
      `Every step counts! Keep learning!`,
      `You're making great progress!`,
      `Learning is a journey, and you're doing great!`,
    ],
  };

  if (levelInfo.progress >= 90) {
    return messages.nearLevelUp[Math.floor(Math.random() * messages.nearLevelUp.length)];
  }

  if (streakInfo.isActive && streakInfo.current >= 3) {
    return messages.streak[Math.floor(Math.random() * messages.streak.length)];
  }

  return messages.encouragement[Math.floor(Math.random() * messages.encouragement.length)];
}
