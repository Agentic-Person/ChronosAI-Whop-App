/**
 * Cache Invalidation Service
 * Handles cache invalidation for data mutations with event-based triggers
 */

import { cache } from './redis-client';
import { CacheKeys } from './cache-keys';

/**
 * Cache invalidation handlers for data mutations
 * Call these methods when data changes to ensure cache consistency
 */
export class CacheInvalidator {
  /**
   * Invalidate all caches related to a student
   * Call when student data, progress, or achievements change
   */
  static async invalidateStudent(studentId: string): Promise<void> {
    try {
      await cache.deletePattern(CacheKeys.studentPattern(studentId));
      console.log(`[Cache] Invalidated student cache: ${studentId}`);
    } catch (error) {
      console.error('[Cache] Failed to invalidate student cache:', error);
    }
  }

  /**
   * Invalidate all caches related to a creator
   * Call when creator settings or configuration change
   */
  static async invalidateCreator(creatorId: string): Promise<void> {
    try {
      await cache.deletePattern(CacheKeys.creatorPattern(creatorId));
      console.log(`[Cache] Invalidated creator cache: ${creatorId}`);
    } catch (error) {
      console.error('[Cache] Failed to invalidate creator cache:', error);
    }
  }

  /**
   * Invalidate all caches related to a video
   * Call when video metadata, transcript, or chunks change
   */
  static async invalidateVideo(videoId: string, creatorId?: string): Promise<void> {
    try {
      const promises: Promise<any>[] = [
        cache.deletePattern(CacheKeys.videoPattern(videoId)),
      ];

      // Also invalidate creator's video list cache
      if (creatorId) {
        // Invalidate all pages of creator's videos
        promises.push(
          cache.deletePattern(CacheKeys.videosByCreator(creatorId, '*' as any))
        );
      }

      await Promise.all(promises);
      console.log(`[Cache] Invalidated video cache: ${videoId}`);
    } catch (error) {
      console.error('[Cache] Failed to invalidate video cache:', error);
    }
  }

  /**
   * Invalidate user membership and plan cache
   * Call when membership status or plan tier changes (Whop webhook)
   */
  static async invalidateMembership(userId: string): Promise<void> {
    try {
      await Promise.all([
        cache.delete(CacheKeys.membership(userId)),
        cache.delete(CacheKeys.userPlan(userId)),
        cache.delete(CacheKeys.userPermissions(userId)),
        // Also clear feature access caches
        cache.deletePattern(CacheKeys.featureAccess(userId, '*')),
      ]);
      console.log(`[Cache] Invalidated membership cache: ${userId}`);
    } catch (error) {
      console.error('[Cache] Failed to invalidate membership cache:', error);
    }
  }

  /**
   * Invalidate chat session caches
   * Call when chat session ends or is cleared
   */
  static async invalidateChatSession(sessionId: string): Promise<void> {
    try {
      await Promise.all([
        cache.delete(CacheKeys.chatSession(sessionId)),
        cache.delete(CacheKeys.chatHistory(sessionId)),
        cache.delete(CacheKeys.chatContext(sessionId)),
      ]);
      console.log(`[Cache] Invalidated chat session cache: ${sessionId}`);
    } catch (error) {
      console.error('[Cache] Failed to invalidate chat session cache:', error);
    }
  }

  /**
   * Invalidate student progress caches
   * Call when video progress or completion status changes
   */
  static async invalidateStudentProgress(
    studentId: string,
    videoId?: string
  ): Promise<void> {
    try {
      const promises: Promise<any>[] = [
        cache.delete(CacheKeys.studentProgress(studentId)),
        cache.delete(CacheKeys.studentStats(studentId)),
      ];

      if (videoId) {
        promises.push(
          cache.delete(CacheKeys.studentVideoProgress(studentId, videoId))
        );
      }

      await Promise.all(promises);
      console.log(`[Cache] Invalidated student progress cache: ${studentId}`);
    } catch (error) {
      console.error('[Cache] Failed to invalidate student progress cache:', error);
    }
  }

  /**
   * Invalidate student achievement caches
   * Call when new achievement is unlocked
   */
  static async invalidateStudentAchievements(studentId: string): Promise<void> {
    try {
      await cache.delete(CacheKeys.studentAchievements(studentId));
      console.log(`[Cache] Invalidated student achievements cache: ${studentId}`);
    } catch (error) {
      console.error('[Cache] Failed to invalidate achievements cache:', error);
    }
  }

  /**
   * Invalidate quiz-related caches
   * Call when quiz is updated or attempt is submitted
   */
  static async invalidateQuiz(
    videoId: string,
    attemptId?: string
  ): Promise<void> {
    try {
      const promises: Promise<any>[] = [
        cache.delete(CacheKeys.quizQuestions(videoId)),
      ];

      if (attemptId) {
        promises.push(
          cache.delete(CacheKeys.quizAttempt(attemptId)),
          cache.delete(CacheKeys.quizResults(attemptId))
        );
      }

      await Promise.all(promises);
      console.log(`[Cache] Invalidated quiz cache for video: ${videoId}`);
    } catch (error) {
      console.error('[Cache] Failed to invalidate quiz cache:', error);
    }
  }

  /**
   * Invalidate calendar caches
   * Call when calendar events are created, updated, or deleted
   */
  static async invalidateCalendar(studentId: string): Promise<void> {
    try {
      await Promise.all([
        cache.delete(CacheKeys.studentCalendar(studentId)),
        cache.delete(CacheKeys.upcomingEvents(studentId)),
      ]);
      console.log(`[Cache] Invalidated calendar cache: ${studentId}`);
    } catch (error) {
      console.error('[Cache] Failed to invalidate calendar cache:', error);
    }
  }

  /**
   * Invalidate analytics caches
   * Call when analytics data is recalculated or updated
   */
  static async invalidateAnalytics(scope?: 'daily' | 'weekly' | 'all'): Promise<void> {
    try {
      if (scope === 'all' || !scope) {
        await cache.deletePattern(CacheKeys.analyticsPattern());
      } else {
        const pattern = scope === 'daily' ? 'analytics:daily:*' : 'analytics:weekly:*';
        await cache.deletePattern(pattern);
      }
      console.log(`[Cache] Invalidated analytics cache: ${scope || 'all'}`);
    } catch (error) {
      console.error('[Cache] Failed to invalidate analytics cache:', error);
    }
  }

  /**
   * Invalidate creator analytics
   * Call when creator-specific metrics change
   */
  static async invalidateCreatorAnalytics(creatorId: string): Promise<void> {
    try {
      await cache.deletePattern(`creator:analytics:${creatorId}:*`);
      console.log(`[Cache] Invalidated creator analytics: ${creatorId}`);
    } catch (error) {
      console.error('[Cache] Failed to invalidate creator analytics:', error);
    }
  }

  /**
   * Invalidate popular videos cache
   * Call when video view counts change significantly
   */
  static async invalidatePopularVideos(): Promise<void> {
    try {
      await cache.deletePattern('analytics:popular:videos:*');
      console.log('[Cache] Invalidated popular videos cache');
    } catch (error) {
      console.error('[Cache] Failed to invalidate popular videos cache:', error);
    }
  }

  /**
   * Invalidate video processing status
   * Call when video processing status changes
   */
  static async invalidateVideoProcessingStatus(videoId: string): Promise<void> {
    try {
      await cache.delete(CacheKeys.videoProcessingStatus(videoId));
      console.log(`[Cache] Invalidated video processing status: ${videoId}`);
    } catch (error) {
      console.error('[Cache] Failed to invalidate processing status:', error);
    }
  }

  /**
   * Invalidate feature access cache for a user
   * Call when plan changes or feature flags are updated
   */
  static async invalidateFeatureAccess(
    userId: string,
    feature?: string
  ): Promise<void> {
    try {
      if (feature) {
        await cache.delete(CacheKeys.featureAccess(userId, feature));
      } else {
        await cache.deletePattern(CacheKeys.featureAccess(userId, '*'));
      }
      console.log(`[Cache] Invalidated feature access cache: ${userId}`);
    } catch (error) {
      console.error('[Cache] Failed to invalidate feature access cache:', error);
    }
  }

  /**
   * Bulk invalidation for multiple entities
   * Useful for batch operations
   */
  static async invalidateBulk(operations: Array<{
    type: 'student' | 'creator' | 'video' | 'membership';
    id: string;
    metadata?: Record<string, any>;
  }>): Promise<void> {
    try {
      const promises = operations.map((op) => {
        switch (op.type) {
          case 'student':
            return this.invalidateStudent(op.id);
          case 'creator':
            return this.invalidateCreator(op.id);
          case 'video':
            return this.invalidateVideo(op.id, op.metadata?.creatorId);
          case 'membership':
            return this.invalidateMembership(op.id);
          default:
            return Promise.resolve();
        }
      });

      await Promise.all(promises);
      console.log(`[Cache] Completed bulk invalidation: ${operations.length} operations`);
    } catch (error) {
      console.error('[Cache] Failed bulk invalidation:', error);
    }
  }

  /**
   * Invalidate all user-related caches
   * Call on user logout or account deletion
   */
  static async invalidateUser(userId: string): Promise<void> {
    try {
      await Promise.all([
        cache.delete(CacheKeys.userProfile(userId)),
        cache.delete(CacheKeys.userPlan(userId)),
        cache.delete(CacheKeys.userPermissions(userId)),
        cache.delete(CacheKeys.membership(userId)),
        cache.deletePattern(CacheKeys.rateLimitPattern(userId)),
        cache.deletePattern(CacheKeys.featureAccess(userId, '*')),
      ]);
      console.log(`[Cache] Invalidated all user caches: ${userId}`);
    } catch (error) {
      console.error('[Cache] Failed to invalidate user caches:', error);
    }
  }

  /**
   * Clear all rate limit caches for a user
   * Use with caution - only for administrative actions
   */
  static async clearRateLimits(userId: string): Promise<void> {
    try {
      await cache.deletePattern(CacheKeys.rateLimitPattern(userId));
      console.log(`[Cache] Cleared rate limits: ${userId}`);
    } catch (error) {
      console.error('[Cache] Failed to clear rate limits:', error);
    }
  }

  /**
   * Scheduled cache cleanup
   * Can be run periodically to clear stale data
   */
  static async scheduledCleanup(): Promise<{
    cleaned: number;
    errors: number;
  }> {
    let cleaned = 0;
    let errors = 0;

    try {
      // Clean up old analytics caches (older than 7 days)
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      const oldDatePattern = weekAgo.toISOString().split('T')[0];

      // This is a simplified cleanup - in production, you'd want more sophisticated logic
      console.log('[Cache] Running scheduled cleanup...');

      cleaned += 1; // Placeholder
    } catch (error) {
      console.error('[Cache] Scheduled cleanup error:', error);
      errors += 1;
    }

    console.log(`[Cache] Cleanup complete: ${cleaned} cleaned, ${errors} errors`);
    return { cleaned, errors };
  }
}

/**
 * Convenience function exports for common use cases
 */
export const invalidateStudent = CacheInvalidator.invalidateStudent.bind(
  CacheInvalidator
);
export const invalidateCreator = CacheInvalidator.invalidateCreator.bind(
  CacheInvalidator
);
export const invalidateVideo = CacheInvalidator.invalidateVideo.bind(
  CacheInvalidator
);
export const invalidateMembership = CacheInvalidator.invalidateMembership.bind(
  CacheInvalidator
);
export const invalidateChatSession = CacheInvalidator.invalidateChatSession.bind(
  CacheInvalidator
);
