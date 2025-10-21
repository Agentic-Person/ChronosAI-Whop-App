/**
 * Rate Limiting Service
 * Implements sliding window rate limiting with plan-based tiers
 */

import { Ratelimit } from '@upstash/ratelimit';
import { kv } from '@vercel/kv';
import { RateLimitError } from '../errors';
import { getUserPlan } from '@/lib/features/feature-flags';
import type { PlanTier } from '@/lib/features/types';

/**
 * Rate limit configuration for different endpoints
 */
export interface RateLimitConfig {
  /** Maximum requests allowed */
  limit: number;
  /** Time window (e.g., '1 m', '1 h') */
  window: string;
  /** Limit type: 'slidingWindow' or 'fixedWindow' */
  type?: 'slidingWindow' | 'fixedWindow';
}

/**
 * Rate limit result
 */
export interface RateLimitResult {
  /** Whether the request is allowed */
  allowed: boolean;
  /** Maximum requests in the window */
  limit: number;
  /** Remaining requests in the window */
  remaining: number;
  /** Reset time as Date */
  reset: Date;
  /** Retry after (if not allowed) */
  retryAfter?: Date;
}

/**
 * Plan-based rate limits
 * Different limits for different plan tiers
 */
const PLAN_RATE_LIMITS: Record<
  PlanTier,
  Record<string, RateLimitConfig>
> = {
  basic: {
    chat: { limit: 10, window: '1 m' },
    videoUpload: { limit: 5, window: '1 h', type: 'fixedWindow' },
    quizGeneration: { limit: 3, window: '1 h', type: 'fixedWindow' },
    api: { limit: 100, window: '1 m' },
  },
  pro: {
    chat: { limit: 50, window: '1 m' },
    videoUpload: { limit: 20, window: '1 h', type: 'fixedWindow' },
    quizGeneration: { limit: 15, window: '1 h', type: 'fixedWindow' },
    api: { limit: 500, window: '1 m' },
  },
  enterprise: {
    chat: { limit: -1, window: '1 m' }, // Unlimited
    videoUpload: { limit: -1, window: '1 h' },
    quizGeneration: { limit: -1, window: '1 h' },
    api: { limit: -1, window: '1 m' },
  },
};

/**
 * Default rate limits (when plan can't be determined)
 */
const DEFAULT_RATE_LIMITS: Record<string, RateLimitConfig> = {
  chat: { limit: 20, window: '1 m' },
  videoUpload: { limit: 10, window: '1 h', type: 'fixedWindow' },
  quizGeneration: { limit: 5, window: '1 h', type: 'fixedWindow' },
  auth: { limit: 5, window: '5 m' },
  api: { limit: 100, window: '1 m' },
};

/**
 * Global rate limiters (for common endpoints)
 */
const globalRateLimiters = {
  webhooks: new Ratelimit({
    redis: kv,
    limiter: Ratelimit.slidingWindow(1000, '1 m'),
    analytics: true,
    prefix: 'ratelimit:webhooks',
  }),
  auth: new Ratelimit({
    redis: kv,
    limiter: Ratelimit.slidingWindow(5, '5 m'),
    analytics: true,
    prefix: 'ratelimit:auth',
  }),
};

/**
 * Cache for rate limiter instances
 * Reuse limiters to avoid creating too many connections
 */
const rateLimiterCache = new Map<string, Ratelimit>();

/**
 * Get or create a rate limiter for a specific configuration
 */
function getRateLimiter(config: RateLimitConfig, prefix: string): Ratelimit {
  const cacheKey = `${prefix}:${config.limit}:${config.window}:${config.type || 'slidingWindow'}`;

  if (rateLimiterCache.has(cacheKey)) {
    return rateLimiterCache.get(cacheKey)!;
  }

  const limiter =
    config.type === 'fixedWindow'
      ? Ratelimit.fixedWindow(config.limit, config.window)
      : Ratelimit.slidingWindow(config.limit, config.window);

  const ratelimit = new Ratelimit({
    redis: kv,
    limiter,
    analytics: true,
    prefix,
  });

  rateLimiterCache.set(cacheKey, ratelimit);
  return ratelimit;
}

/**
 * Rate Limiting Service
 */
export class RateLimiterService {
  /**
   * Check rate limit for a user and endpoint
   * @param identifier - User ID or IP address
   * @param endpointType - Type of endpoint (chat, videoUpload, etc.)
   * @param planTier - User's plan tier (optional, will be fetched if not provided)
   * @returns Rate limit result
   */
  static async checkLimit(
    identifier: string,
    endpointType: keyof typeof DEFAULT_RATE_LIMITS,
    planTier?: PlanTier
  ): Promise<RateLimitResult> {
    try {
      // Get user's plan if not provided
      let userPlan = planTier;
      if (!userPlan && identifier.length > 7) {
        // Likely a user ID, not an IP
        try {
          userPlan = await getUserPlan(identifier);
        } catch (error) {
          console.warn('[RateLimit] Could not fetch user plan:', error);
        }
      }

      // Get rate limit config for this plan
      const config =
        userPlan && PLAN_RATE_LIMITS[userPlan]?.[endpointType]
          ? PLAN_RATE_LIMITS[userPlan][endpointType]
          : DEFAULT_RATE_LIMITS[endpointType];

      if (!config) {
        throw new Error(`No rate limit config found for endpoint: ${endpointType}`);
      }

      // Enterprise users have unlimited access
      if (config.limit === -1) {
        return {
          allowed: true,
          limit: -1,
          remaining: -1,
          reset: new Date(Date.now() + 60000), // 1 minute from now
        };
      }

      // Check rate limit
      const ratelimit = getRateLimiter(config, `ratelimit:${endpointType}`);
      const { success, limit, remaining, reset } = await ratelimit.limit(identifier);

      const result: RateLimitResult = {
        allowed: success,
        limit,
        remaining,
        reset: new Date(reset),
      };

      if (!success) {
        result.retryAfter = new Date(reset);
      }

      return result;
    } catch (error) {
      console.error('[RateLimit] Error checking limit:', error);
      // On error, allow the request (fail open)
      return {
        allowed: true,
        limit: 0,
        remaining: 0,
        reset: new Date(),
      };
    }
  }

  /**
   * Check rate limit and throw error if exceeded
   * Convenience method for middleware
   */
  static async enforceLimit(
    identifier: string,
    endpointType: keyof typeof DEFAULT_RATE_LIMITS,
    planTier?: PlanTier
  ): Promise<void> {
    const result = await this.checkLimit(identifier, endpointType, planTier);

    if (!result.allowed) {
      throw new RateLimitError(
        result.limit,
        DEFAULT_RATE_LIMITS[endpointType]?.window || '1 m',
        result.retryAfter || result.reset,
        {
          remaining: result.remaining,
          identifier,
          endpointType,
        }
      );
    }
  }

  /**
   * Get remaining requests for a user
   * @param identifier - User ID or IP
   * @param endpointType - Endpoint type
   * @param planTier - User's plan tier
   * @returns Remaining requests
   */
  static async getRemainingRequests(
    identifier: string,
    endpointType: keyof typeof DEFAULT_RATE_LIMITS,
    planTier?: PlanTier
  ): Promise<number> {
    const result = await this.checkLimit(identifier, endpointType, planTier);
    return result.remaining;
  }

  /**
   * Reset rate limit for a user (admin operation)
   * @param identifier - User ID or IP
   * @param endpointType - Endpoint type
   */
  static async resetLimit(
    identifier: string,
    endpointType: keyof typeof DEFAULT_RATE_LIMITS
  ): Promise<void> {
    try {
      const pattern = `ratelimit:${endpointType}:${identifier}*`;
      const keys: string[] = [];
      let cursor = 0;

      // Scan for keys
      do {
        const result = await kv.scan(cursor, { match: pattern, count: 100 });
        cursor = result[0];
        keys.push(...result[1]);
      } while (cursor !== 0);

      // Delete all matching keys
      if (keys.length > 0) {
        await kv.del(...keys);
      }

      console.log(`[RateLimit] Reset limit for ${identifier} on ${endpointType}`);
    } catch (error) {
      console.error('[RateLimit] Error resetting limit:', error);
    }
  }

  /**
   * Get rate limit configuration for a plan and endpoint
   */
  static getLimitConfig(
    endpointType: keyof typeof DEFAULT_RATE_LIMITS,
    planTier?: PlanTier
  ): RateLimitConfig {
    if (planTier && PLAN_RATE_LIMITS[planTier]?.[endpointType]) {
      return PLAN_RATE_LIMITS[planTier][endpointType];
    }
    return DEFAULT_RATE_LIMITS[endpointType] || { limit: 100, window: '1 m' };
  }

  /**
   * Check global rate limit (for webhooks, etc.)
   */
  static async checkGlobalLimit(
    limitType: keyof typeof globalRateLimiters,
    identifier: string
  ): Promise<RateLimitResult> {
    const ratelimit = globalRateLimiters[limitType];
    const { success, limit, remaining, reset } = await ratelimit.limit(identifier);

    return {
      allowed: success,
      limit,
      remaining,
      reset: new Date(reset),
      retryAfter: success ? undefined : new Date(reset),
    };
  }

  /**
   * Manually increment rate limit counter
   * Useful for custom rate limiting logic
   */
  static async incrementCounter(
    identifier: string,
    endpointType: string,
    ttl: number
  ): Promise<number> {
    try {
      const key = `ratelimit:custom:${endpointType}:${identifier}`;
      const pipeline = kv.pipeline();
      pipeline.incr(key);
      pipeline.expire(key, ttl);
      const results = await pipeline.exec();
      return (results[0] as number) || 1;
    } catch (error) {
      console.error('[RateLimit] Error incrementing counter:', error);
      return 1;
    }
  }

  /**
   * Get analytics for rate limiting
   * Returns usage statistics for monitoring
   */
  static async getAnalytics(
    identifier: string,
    endpointType: keyof typeof DEFAULT_RATE_LIMITS
  ): Promise<{
    identifier: string;
    endpointType: string;
    currentUsage: number;
    limit: number;
    resetAt: Date;
  }> {
    const result = await this.checkLimit(identifier, endpointType);
    const config = this.getLimitConfig(endpointType);

    return {
      identifier,
      endpointType,
      currentUsage: result.limit - result.remaining,
      limit: result.limit,
      resetAt: result.reset,
    };
  }
}

/**
 * Convenience function exports
 */
export const checkRateLimit = RateLimiterService.checkLimit.bind(RateLimiterService);
export const enforceRateLimit = RateLimiterService.enforceLimit.bind(RateLimiterService);
export const getRemainingRequests = RateLimiterService.getRemainingRequests.bind(
  RateLimiterService
);
export const resetRateLimit = RateLimiterService.resetLimit.bind(RateLimiterService);
