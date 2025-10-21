/**
 * Discord Notification Service Tests
 */

import { describe, it, expect, beforeEach, vi } from '@jest/globals';
import { DiscordNotificationService } from '../notification-service';

// Mock Discord bot
vi.mock('../bot', () => ({
  getDiscordBot: vi.fn(() => ({
    getClient: vi.fn(() => ({
      guilds: {
        cache: new Map(),
      },
    })),
  })),
}));

// Mock Supabase
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => ({
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() => ({
            data: null,
            error: null,
          })),
        })),
      })),
      insert: vi.fn(() => ({
        data: null,
        error: null,
      })),
    })),
  })),
}));

describe('DiscordNotificationService', () => {
  let service: DiscordNotificationService;

  beforeEach(() => {
    service = new DiscordNotificationService();
    vi.clearAllMocks();
  });

  describe('notifyXPGain', () => {
    it('should not throw when posting XP notification', async () => {
      await expect(
        service.notifyXPGain('TestUser', 100, 'completing a video', 'discord_id')
      ).resolves.not.toThrow();
    });
  });

  describe('notifyLevelUp', () => {
    it('should not throw when posting level up notification', async () => {
      await expect(
        service.notifyLevelUp('TestUser', 15, 'discord_id')
      ).resolves.not.toThrow();
    });
  });

  describe('notifyAchievementUnlock', () => {
    it('should not throw when posting achievement notification', async () => {
      await expect(
        service.notifyAchievementUnlock(
          'TestUser',
          'Quiz Master',
          'Pass 10 quizzes',
          '🏆',
          'epic',
          'discord_id'
        )
      ).resolves.not.toThrow();
    });
  });

  describe('notifyPerfectQuiz', () => {
    it('should not throw when posting perfect quiz notification', async () => {
      await expect(
        service.notifyPerfectQuiz('TestUser', 'React Basics', 'discord_id')
      ).resolves.not.toThrow();
    });
  });

  describe('sendDM', () => {
    it('should not throw when sending DM', async () => {
      await expect(
        service.sendDM('discord_id', 'Test message')
      ).resolves.not.toThrow();
    });
  });

  describe('getDiscordUserId', () => {
    it('should return null when student has no Discord link', async () => {
      const result = await service.getDiscordUserId('student_id');
      expect(result).toBeNull();
    });
  });
});
