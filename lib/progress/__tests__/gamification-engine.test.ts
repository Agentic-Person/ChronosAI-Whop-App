/**
 * Gamification Engine Tests
 */

import {
  getLevelInfo,
  getXPForLevel,
  getTotalXPForLevel,
  checkLevelUp,
  calculateVideoXP,
  calculateQuizXP,
  calculateProjectXP,
  calculateStreakXP,
  calculateStreakInfo,
  calculateCompletionPercentage,
  XP_VALUES,
} from '../gamification-engine';

describe('Gamification Engine', () => {
  describe('Level Calculations', () => {
    test('getXPForLevel returns correct XP for level 1', () => {
      const xp = getXPForLevel(1);
      expect(xp).toBe(0); // Level 1 requires 0 XP
    });

    test('getXPForLevel returns correct XP for level 2', () => {
      const xp = getXPForLevel(2);
      expect(xp).toBe(100); // Level 2 requires 100 XP
    });

    test('getXPForLevel follows exponential growth', () => {
      const level2 = getXPForLevel(2);
      const level3 = getXPForLevel(3);
      const level4 = getXPForLevel(4);

      expect(level3).toBe(Math.floor(level2 * 1.5)); // 150
      expect(level4).toBe(Math.floor(level3 * 1.5)); // 225
    });

    test('getTotalXPForLevel calculates cumulative XP correctly', () => {
      const totalForLevel5 = getTotalXPForLevel(5);
      const sum = getXPForLevel(1) + getXPForLevel(2) + getXPForLevel(3) + getXPForLevel(4);
      expect(totalForLevel5).toBe(sum);
    });

    test('getLevelInfo returns correct info at level 1', () => {
      const info = getLevelInfo(0);
      expect(info.level).toBe(1);
      expect(info.currentXP).toBe(0);
      expect(info.totalXP).toBe(0);
      expect(info.progress).toBe(0);
    });

    test('getLevelInfo returns correct info with 150 XP (level 2)', () => {
      const info = getLevelInfo(150);
      expect(info.level).toBe(2);
      expect(info.currentXP).toBe(50); // 150 - 100 (level 2 threshold)
      expect(info.xpForNextLevel).toBe(150); // Level 3 requires 150 XP
    });

    test('getLevelInfo calculates progress percentage correctly', () => {
      const info = getLevelInfo(150); // Level 2, 50 XP into it
      const expectedProgress = (50 / 150) * 100; // 33.33%
      expect(info.progress).toBeCloseTo(expectedProgress, 1);
    });
  });

  describe('Level Up Detection', () => {
    test('checkLevelUp detects no level up', () => {
      const result = checkLevelUp(50, 20);
      expect(result.leveledUp).toBe(false);
      expect(result.oldLevel).toBe(1);
      expect(result.newLevel).toBe(1);
    });

    test('checkLevelUp detects single level up', () => {
      const result = checkLevelUp(50, 60); // 110 total XP
      expect(result.leveledUp).toBe(true);
      expect(result.oldLevel).toBe(1);
      expect(result.newLevel).toBe(2);
      expect(result.levelsGained).toBe(1);
    });

    test('checkLevelUp detects multiple level ups', () => {
      const result = checkLevelUp(0, 500);
      expect(result.leveledUp).toBe(true);
      expect(result.oldLevel).toBe(1);
      expect(result.newLevel).toBeGreaterThan(2);
      expect(result.levelsGained).toBeGreaterThan(1);
    });
  });

  describe('Video XP Calculation', () => {
    test('calculateVideoXP awards base XP for completion', () => {
      const xp = calculateVideoXP({
        isFirstTime: false,
        watchTimeMinutes: 10,
        completionPercentage: 100,
      });

      expect(xp.amount).toBeGreaterThanOrEqual(XP_VALUES.VIDEO_COMPLETE);
      expect(xp.source).toBe('video');
    });

    test('calculateVideoXP awards bonus for first time', () => {
      const xp = calculateVideoXP({
        isFirstTime: true,
        watchTimeMinutes: 10,
        completionPercentage: 100,
      });

      expect(xp.amount).toBeGreaterThan(XP_VALUES.VIDEO_COMPLETE);
      expect(xp.metadata?.firstTimeBonus).toBe(true);
    });

    test('calculateVideoXP awards watch time bonus', () => {
      const xp = calculateVideoXP({
        isFirstTime: false,
        watchTimeMinutes: 30,
        completionPercentage: 100,
      });

      const expectedWatchTimeXP = 30 * XP_VALUES.VIDEO_WATCH_TIME_PER_MINUTE;
      expect(xp.amount).toBeGreaterThanOrEqual(expectedWatchTimeXP);
    });

    test('calculateVideoXP awards no completion XP for partial watch', () => {
      const xp = calculateVideoXP({
        isFirstTime: false,
        watchTimeMinutes: 5,
        completionPercentage: 50,
      });

      expect(xp.amount).toBeLessThan(XP_VALUES.VIDEO_COMPLETE);
    });
  });

  describe('Quiz XP Calculation', () => {
    test('calculateQuizXP awards base XP for passing', () => {
      const xp = calculateQuizXP({
        score: 80,
        passingScore: 70,
        isFirstAttempt: false,
        isPerfectScore: false,
      });

      expect(xp.amount).toBeGreaterThan(0);
      expect(xp.source).toBe('quiz');
    });

    test('calculateQuizXP awards first attempt bonus', () => {
      const firstAttempt = calculateQuizXP({
        score: 80,
        passingScore: 70,
        isFirstAttempt: true,
        isPerfectScore: false,
      });

      const retry = calculateQuizXP({
        score: 80,
        passingScore: 70,
        isFirstAttempt: false,
        isPerfectScore: false,
      });

      expect(firstAttempt.amount).toBeGreaterThan(retry.amount);
    });

    test('calculateQuizXP awards perfect score bonus', () => {
      const perfect = calculateQuizXP({
        score: 100,
        passingScore: 70,
        isFirstAttempt: true,
        isPerfectScore: true,
      });

      const nonPerfect = calculateQuizXP({
        score: 90,
        passingScore: 70,
        isFirstAttempt: true,
        isPerfectScore: false,
      });

      expect(perfect.amount).toBeGreaterThan(nonPerfect.amount);
    });

    test('calculateQuizXP awards no XP for failing', () => {
      const xp = calculateQuizXP({
        score: 60,
        passingScore: 70,
        isFirstAttempt: true,
        isPerfectScore: false,
      });

      expect(xp.amount).toBe(0);
    });
  });

  describe('Project XP Calculation', () => {
    test('calculateProjectXP awards milestone XP', () => {
      const xp = calculateProjectXP({
        isComplete: false,
        milestonesCompleted: 3,
        totalMilestones: 5,
        isEarlySubmission: false,
        hasPeerReviews: false,
      });

      expect(xp.amount).toBe(3 * XP_VALUES.PROJECT_MILESTONE);
    });

    test('calculateProjectXP awards completion bonus', () => {
      const xp = calculateProjectXP({
        isComplete: true,
        milestonesCompleted: 5,
        totalMilestones: 5,
        isEarlySubmission: false,
        hasPeerReviews: false,
      });

      expect(xp.amount).toBeGreaterThanOrEqual(XP_VALUES.PROJECT_SUBMIT);
    });

    test('calculateProjectXP awards early submission bonus', () => {
      const early = calculateProjectXP({
        isComplete: true,
        milestonesCompleted: 5,
        totalMilestones: 5,
        isEarlySubmission: true,
        hasPeerReviews: false,
      });

      const onTime = calculateProjectXP({
        isComplete: true,
        milestonesCompleted: 5,
        totalMilestones: 5,
        isEarlySubmission: false,
        hasPeerReviews: false,
      });

      expect(early.amount).toBeGreaterThan(onTime.amount);
    });
  });

  describe('Streak Calculations', () => {
    test('calculateStreakXP awards base daily XP', () => {
      const xp = calculateStreakXP(1);
      expect(xp.amount).toBe(XP_VALUES.STREAK_DAILY_BASE);
      expect(xp.source).toBe('streak');
    });

    test('calculateStreakXP awards week milestone bonus', () => {
      const xp = calculateStreakXP(7);
      expect(xp.amount).toBe(XP_VALUES.STREAK_DAILY_BASE + XP_VALUES.STREAK_WEEK_BONUS);
      expect(xp.metadata?.weekMilestone).toBe(true);
    });

    test('calculateStreakXP awards month milestone bonus', () => {
      const xp = calculateStreakXP(30);
      const expected =
        XP_VALUES.STREAK_DAILY_BASE +
        XP_VALUES.STREAK_WEEK_BONUS +
        XP_VALUES.STREAK_MONTH_BONUS;
      expect(xp.amount).toBe(expected);
      expect(xp.metadata?.monthMilestone).toBe(true);
    });

    test('calculateStreakInfo detects active streak', () => {
      const now = new Date();
      const info = calculateStreakInfo({
        currentStreak: 5,
        longestStreak: 10,
        lastActiveDate: now,
      });

      expect(info.isActive).toBe(true);
      expect(info.current).toBe(5);
    });

    test('calculateStreakInfo detects broken streak', () => {
      const twoDaysAgo = new Date();
      twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

      const info = calculateStreakInfo({
        currentStreak: 5,
        longestStreak: 10,
        lastActiveDate: twoDaysAgo,
      });

      expect(info.isActive).toBe(false);
      expect(info.current).toBe(0);
    });

    test('calculateStreakInfo calculates multiplier correctly', () => {
      const info = calculateStreakInfo({
        currentStreak: 30,
        longestStreak: 30,
        lastActiveDate: new Date(),
      });

      expect(info.multiplier).toBeGreaterThan(1);
      expect(info.multiplier).toBeLessThanOrEqual(2);
    });
  });

  describe('Completion Percentage', () => {
    test('calculateCompletionPercentage returns 0 for no progress', () => {
      const percentage = calculateCompletionPercentage({
        videosCompleted: 0,
        totalVideos: 10,
        quizzesPassed: 0,
        totalQuizzes: 5,
        projectsCompleted: 0,
        totalProjects: 3,
      });

      expect(percentage).toBe(0);
    });

    test('calculateCompletionPercentage returns 100 for full completion', () => {
      const percentage = calculateCompletionPercentage({
        videosCompleted: 10,
        totalVideos: 10,
        quizzesPassed: 5,
        totalQuizzes: 5,
        projectsCompleted: 3,
        totalProjects: 3,
      });

      expect(percentage).toBe(100);
    });

    test('calculateCompletionPercentage weighs components correctly', () => {
      // Only videos complete (40% weight)
      const videoOnly = calculateCompletionPercentage({
        videosCompleted: 10,
        totalVideos: 10,
        quizzesPassed: 0,
        totalQuizzes: 5,
        projectsCompleted: 0,
        totalProjects: 3,
      });

      expect(videoOnly).toBe(40); // 100% * 0.4
    });
  });
});
