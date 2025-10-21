/**
 * Achievement System Tests
 */

import {
  ACHIEVEMENTS,
  AchievementRarity,
  AchievementCategory,
  getAchievementById,
  getAchievementsByCategory,
  getAchievementsByRarity,
} from '../achievement-system';

describe('Achievement System', () => {
  describe('Achievement Constants', () => {
    test('ACHIEVEMENTS array is defined and not empty', () => {
      expect(ACHIEVEMENTS).toBeDefined();
      expect(ACHIEVEMENTS.length).toBeGreaterThan(0);
    });

    test('all achievements have required fields', () => {
      ACHIEVEMENTS.forEach((achievement) => {
        expect(achievement.id).toBeDefined();
        expect(achievement.name).toBeDefined();
        expect(achievement.description).toBeDefined();
        expect(achievement.category).toBeDefined();
        expect(achievement.rarity).toBeDefined();
        expect(achievement.icon).toBeDefined();
        expect(achievement.xp_reward).toBeGreaterThan(0);
        expect(achievement.unlock_criteria).toBeDefined();
      });
    });

    test('achievement IDs are unique', () => {
      const ids = ACHIEVEMENTS.map((a) => a.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });

    test('all unlock criteria have valid types', () => {
      const validTypes = ['count', 'streak', 'score', 'time', 'special'];

      ACHIEVEMENTS.forEach((achievement) => {
        expect(validTypes).toContain(achievement.unlock_criteria.type);
        expect(achievement.unlock_criteria.threshold).toBeGreaterThan(0);
        expect(achievement.unlock_criteria.metric).toBeDefined();
      });
    });
  });

  describe('Achievement Categorization', () => {
    test('has video achievements', () => {
      const videoAchievements = ACHIEVEMENTS.filter(
        (a) => a.category === AchievementCategory.VIDEO
      );
      expect(videoAchievements.length).toBeGreaterThan(0);
    });

    test('has quiz achievements', () => {
      const quizAchievements = ACHIEVEMENTS.filter(
        (a) => a.category === AchievementCategory.QUIZ
      );
      expect(quizAchievements.length).toBeGreaterThan(0);
    });

    test('has project achievements', () => {
      const projectAchievements = ACHIEVEMENTS.filter(
        (a) => a.category === AchievementCategory.PROJECT
      );
      expect(projectAchievements.length).toBeGreaterThan(0);
    });

    test('has streak achievements', () => {
      const streakAchievements = ACHIEVEMENTS.filter(
        (a) => a.category === AchievementCategory.STREAK
      );
      expect(streakAchievements.length).toBeGreaterThan(0);
    });

    test('has different rarity levels', () => {
      const rarities = new Set(ACHIEVEMENTS.map((a) => a.rarity));
      expect(rarities.has(AchievementRarity.COMMON)).toBe(true);
      expect(rarities.has(AchievementRarity.RARE)).toBe(true);
      expect(rarities.has(AchievementRarity.EPIC)).toBe(true);
      expect(rarities.has(AchievementRarity.LEGENDARY)).toBe(true);
    });
  });

  describe('Achievement Queries', () => {
    test('getAchievementById returns correct achievement', () => {
      const achievement = getAchievementById('first-steps');
      expect(achievement).toBeDefined();
      expect(achievement?.id).toBe('first-steps');
      expect(achievement?.name).toBe('First Steps');
    });

    test('getAchievementById returns undefined for invalid ID', () => {
      const achievement = getAchievementById('invalid-id');
      expect(achievement).toBeUndefined();
    });

    test('getAchievementsByCategory filters correctly', () => {
      const videoAchievements = getAchievementsByCategory(AchievementCategory.VIDEO);
      expect(videoAchievements.length).toBeGreaterThan(0);
      videoAchievements.forEach((a) => {
        expect(a.category).toBe(AchievementCategory.VIDEO);
      });
    });

    test('getAchievementsByRarity filters correctly', () => {
      const legendaryAchievements = getAchievementsByRarity(AchievementRarity.LEGENDARY);
      expect(legendaryAchievements.length).toBeGreaterThan(0);
      legendaryAchievements.forEach((a) => {
        expect(a.rarity).toBe(AchievementRarity.LEGENDARY);
      });
    });
  });

  describe('Achievement XP Rewards', () => {
    test('common achievements have lower XP rewards', () => {
      const commonAchievements = getAchievementsByRarity(AchievementRarity.COMMON);
      const avgCommonXP =
        commonAchievements.reduce((sum, a) => sum + a.xp_reward, 0) /
        commonAchievements.length;

      const legendaryAchievements = getAchievementsByRarity(AchievementRarity.LEGENDARY);
      const avgLegendaryXP =
        legendaryAchievements.reduce((sum, a) => sum + a.xp_reward, 0) /
        legendaryAchievements.length;

      expect(avgLegendaryXP).toBeGreaterThan(avgCommonXP);
    });

    test('all achievements reward at least 50 XP', () => {
      ACHIEVEMENTS.forEach((achievement) => {
        expect(achievement.xp_reward).toBeGreaterThanOrEqual(50);
      });
    });

    test('legendary achievements reward at least 1000 XP', () => {
      const legendaryAchievements = getAchievementsByRarity(AchievementRarity.LEGENDARY);
      legendaryAchievements.forEach((achievement) => {
        expect(achievement.xp_reward).toBeGreaterThanOrEqual(1000);
      });
    });
  });

  describe('Specific Achievements', () => {
    test('first-steps achievement exists and is common', () => {
      const achievement = getAchievementById('first-steps');
      expect(achievement).toBeDefined();
      expect(achievement?.rarity).toBe(AchievementRarity.COMMON);
      expect(achievement?.unlock_criteria.threshold).toBe(1);
    });

    test('learning-streak achievement requires 7 days', () => {
      const achievement = getAchievementById('learning-streak');
      expect(achievement).toBeDefined();
      expect(achievement?.unlock_criteria.type).toBe('streak');
      expect(achievement?.unlock_criteria.threshold).toBe(7);
    });

    test('course-crusher achievement is legendary', () => {
      const achievement = getAchievementById('course-crusher');
      expect(achievement).toBeDefined();
      expect(achievement?.rarity).toBe(AchievementRarity.LEGENDARY);
    });

    test('quiz-master achievement rewards quiz performance', () => {
      const achievement = getAchievementById('quiz-master');
      expect(achievement).toBeDefined();
      expect(achievement?.category).toBe(AchievementCategory.QUIZ);
      expect(achievement?.unlock_criteria.type).toBe('score');
    });

    test('time-based achievements exist', () => {
      const earlyBird = getAchievementById('early-bird');
      const nightOwl = getAchievementById('night-owl');

      expect(earlyBird).toBeDefined();
      expect(nightOwl).toBeDefined();
      expect(earlyBird?.unlock_criteria.type).toBe('special');
      expect(nightOwl?.unlock_criteria.type).toBe('special');
    });
  });

  describe('Achievement Balance', () => {
    test('has achievements for beginners', () => {
      const easyAchievements = ACHIEVEMENTS.filter(
        (a) => a.unlock_criteria.threshold === 1
      );
      expect(easyAchievements.length).toBeGreaterThan(0);
    });

    test('has achievements for advanced users', () => {
      const hardAchievements = ACHIEVEMENTS.filter(
        (a) => a.unlock_criteria.threshold >= 50
      );
      expect(hardAchievements.length).toBeGreaterThan(0);
    });

    test('rarity distribution is balanced', () => {
      const common = getAchievementsByRarity(AchievementRarity.COMMON);
      const rare = getAchievementsByRarity(AchievementRarity.RARE);
      const epic = getAchievementsByRarity(AchievementRarity.EPIC);
      const legendary = getAchievementsByRarity(AchievementRarity.LEGENDARY);

      // Common should be most abundant
      expect(common.length).toBeGreaterThanOrEqual(rare.length);

      // Legendary should be rarest
      expect(legendary.length).toBeLessThanOrEqual(epic.length);
    });
  });
});
