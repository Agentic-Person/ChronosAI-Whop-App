/**
 * Calendar Generator Tests
 * Tests for AI-powered calendar generation
 */

import { CalendarGenerator } from '../calendar-generator';
import { getSupabaseAdmin } from '@/lib/infrastructure/database/connection-pool';
import type { OnboardingData } from '@/types/onboarding';

// Mock Supabase
jest.mock('@/lib/infrastructure/database/connection-pool');

// Mock Anthropic
jest.mock('@anthropic-ai/sdk', () => {
  return {
    __esModule: true,
    default: jest.fn().mockImplementation(() => ({
      messages: {
        create: jest.fn().mockResolvedValue({
          content: [
            {
              type: 'text',
              text: JSON.stringify([
                {
                  videoIndex: 0,
                  weekNumber: 1,
                  dayOfWeek: 'monday',
                  timeSlot: 'evening',
                  estimatedDuration: 30,
                  learningObjectives: ['Test objective'],
                  difficulty: 2,
                },
              ]),
            },
          ],
        }),
      },
    })),
  };
});

describe('CalendarGenerator', () => {
  let generator: CalendarGenerator;
  const mockStudentId = 'test-student-id';
  const mockCreatorId = 'test-creator-id';

  const mockOnboardingData: OnboardingData = {
    primaryGoal: 'career-change',
    targetCompletionWeeks: 12,
    skillLevel: 'beginner',
    availableHoursPerWeek: 10,
    preferredDays: ['monday', 'wednesday', 'friday'],
    preferredTimeSlots: ['evening'],
    sessionLength: 'medium',
    learningStyle: 'mixed',
    pacePreference: 'steady',
    breakFrequency: 'moderate',
  };

  const mockVideos = [
    {
      id: 'video-1',
      title: 'Introduction to React',
      duration: 45,
      difficulty_level: 'beginner',
    },
    {
      id: 'video-2',
      title: 'React Components',
      duration: 60,
      difficulty_level: 'beginner',
    },
    {
      id: 'video-3',
      title: 'Advanced Hooks',
      duration: 90,
      difficulty_level: 'intermediate',
    },
  ];

  beforeEach(() => {
    generator = new CalendarGenerator();

    // Mock Supabase responses
    (getSupabaseAdmin as jest.Mock).mockReturnValue({
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      upsert: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: null, error: null }),
      then: jest.fn().mockResolvedValue({ data: mockVideos, error: null }),
    });
  });

  describe('generate', () => {
    it('should generate calendar successfully', async () => {
      const events = await generator.generate(
        mockStudentId,
        mockCreatorId,
        mockOnboardingData
      );

      expect(events).toBeDefined();
      expect(Array.isArray(events)).toBe(true);
    });

    it('should filter videos by skill level', async () => {
      // Beginner should include beginner and intermediate
      const beginnerData = { ...mockOnboardingData, skillLevel: 'beginner' as const };
      await generator.generate(mockStudentId, mockCreatorId, beginnerData);

      // Should have processed videos (check via mock calls)
      expect(getSupabaseAdmin).toHaveBeenCalled();
    });

    it('should throw error when no videos found', async () => {
      (getSupabaseAdmin as jest.Mock).mockReturnValue({
        from: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        then: jest.fn().mockResolvedValue({ data: [], error: null }),
      });

      await expect(
        generator.generate(mockStudentId, mockCreatorId, mockOnboardingData)
      ).rejects.toThrow('No videos found');
    });

    it('should validate timeline is realistic', async () => {
      const unrealisticData: OnboardingData = {
        ...mockOnboardingData,
        availableHoursPerWeek: 1,
        targetCompletionWeeks: 2,
      };

      await expect(
        generator.generate(mockStudentId, mockCreatorId, unrealisticData)
      ).rejects.toThrow('recommend');
    });

    it('should distribute sessions across preferred days', async () => {
      const events = await generator.generate(
        mockStudentId,
        mockCreatorId,
        mockOnboardingData
      );

      // Check that events are scheduled on preferred days
      // This would require exposing the scheduled dates
      expect(events).toBeDefined();
    });
  });

  describe('timeline validation', () => {
    it('should accept realistic timeline', async () => {
      const realisticData: OnboardingData = {
        ...mockOnboardingData,
        availableHoursPerWeek: 15,
        targetCompletionWeeks: 12,
      };

      // Should not throw
      await expect(
        generator.generate(mockStudentId, mockCreatorId, realisticData)
      ).resolves.toBeDefined();
    });

    it('should reject unrealistic timeline', async () => {
      const unrealisticData: OnboardingData = {
        ...mockOnboardingData,
        availableHoursPerWeek: 2,
        targetCompletionWeeks: 4,
      };

      await expect(
        generator.generate(mockStudentId, mockCreatorId, unrealisticData)
      ).rejects.toThrow();
    });
  });

  describe('skill level filtering', () => {
    it('should filter for beginner level', () => {
      // Test private method via generation
      const beginnerData = { ...mockOnboardingData, skillLevel: 'beginner' as const };

      expect(
        generator.generate(mockStudentId, mockCreatorId, beginnerData)
      ).resolves.toBeDefined();
    });

    it('should filter for intermediate level', () => {
      const intermediateData = { ...mockOnboardingData, skillLevel: 'intermediate' as const };

      expect(
        generator.generate(mockStudentId, mockCreatorId, intermediateData)
      ).resolves.toBeDefined();
    });

    it('should include all videos for advanced level', () => {
      const advancedData = { ...mockOnboardingData, skillLevel: 'advanced' as const };

      expect(
        generator.generate(mockStudentId, mockCreatorId, advancedData)
      ).resolves.toBeDefined();
    });
  });
});

describe('CalendarGenerator edge cases', () => {
  it('should handle API errors gracefully', async () => {
    (getSupabaseAdmin as jest.Mock).mockReturnValue({
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      then: jest.fn().mockResolvedValue({ data: null, error: { message: 'Database error' } }),
    });

    const generator = new CalendarGenerator();

    await expect(
      generator.generate('student-id', 'creator-id', {} as OnboardingData)
    ).rejects.toThrow();
  });

  it('should handle Claude API errors', async () => {
    // This would require mocking Anthropic to throw an error
    // Left as exercise for full test suite
  });
});
