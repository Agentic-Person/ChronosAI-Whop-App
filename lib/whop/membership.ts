/**
 * Whop Membership Validator
 * Validates membership status with caching and plan tier extraction
 */

import { whopClient } from './api-client';
import { WhopPlanChecker } from './plan-checker';
import { createClient } from '@/lib/utils/supabase-client';
import type { WhopMembership } from '@/types/whop';
import { PlanTier } from '@/lib/features/types';

/**
 * Membership validation result
 */
export interface MembershipValidationResult {
  valid: boolean;
  status: 'active' | 'expired' | 'cancelled' | 'not_found';
  planTier: PlanTier;
  expiresAt?: Date;
  reason?: string;
}

/**
 * Membership details
 */
export interface MembershipDetails {
  id: string;
  userId: string;
  planId: string;
  planTier: PlanTier;
  status: string;
  valid: boolean;
  expiresAt?: Date;
  renewalPeriodStart?: Date;
  renewalPeriodEnd?: Date;
  metadata: Record<string, any>;
}

/**
 * Usage limits for a plan
 */
export interface UsageLimits {
  maxVideos: number;
  maxStudents: number;
  maxStorageGB: number;
  maxProjects: number;
  maxQuizzes: number;
  aiMessagesPerMonth: number;
  customBranding: boolean;
  prioritySupport: boolean;
}

/**
 * Membership cache entry
 */
interface MembershipCacheEntry {
  data: MembershipValidationResult;
  timestamp: number;
}

/**
 * Membership validation service with caching
 */
export class MembershipValidator {
  // Cache TTL: 5 minutes
  private static readonly CACHE_TTL_MS = 5 * 60 * 1000;

  // In-memory cache (will be replaced with Agent 1's cache service later)
  private static cache = new Map<string, MembershipCacheEntry>();

  /**
   * Validate membership by user ID
   * Checks if user has valid, active membership
   */
  static async validateMembership(userId: string): Promise<MembershipValidationResult> {
    // Check cache first
    const cached = this.getCachedResult(userId);
    if (cached) {
      return cached;
    }

    try {
      const supabase = createClient();

      // Get user's membership ID from database
      const { data: user, error } = await supabase
        .from('creators')
        .select('membership_id, whop_user_id, current_plan, plan_expires_at')
        .eq('id', userId)
        .single();

      if (error || !user) {
        // Try by whop_user_id
        const { data: userByWhopId } = await supabase
          .from('creators')
          .select('membership_id, whop_user_id, current_plan, plan_expires_at')
          .eq('whop_user_id', userId)
          .single();

        if (!userByWhopId) {
          const result: MembershipValidationResult = {
            valid: false,
            status: 'not_found',
            planTier: PlanTier.BASIC,
            reason: 'User not found',
          };
          this.setCacheResult(userId, result);
          return result;
        }

        // Continue with whop user data
        return await this.validateByMembershipId(
          userByWhopId.membership_id,
          userId,
          userByWhopId.current_plan as PlanTier
        );
      }

      // Validate membership
      return await this.validateByMembershipId(
        user.membership_id,
        userId,
        user.current_plan as PlanTier
      );
    } catch (error) {
      console.error('Membership validation failed:', error);

      const result: MembershipValidationResult = {
        valid: false,
        status: 'not_found',
        planTier: PlanTier.BASIC,
        reason: error instanceof Error ? error.message : 'Unknown error',
      };

      return result;
    }
  }

  /**
   * Validate membership by membership ID
   */
  private static async validateByMembershipId(
    membershipId: string | null,
    userId: string,
    cachedPlanTier: PlanTier
  ): Promise<MembershipValidationResult> {
    if (!membershipId) {
      const result: MembershipValidationResult = {
        valid: false,
        status: 'not_found',
        planTier: PlanTier.BASIC,
        reason: 'No membership found',
      };
      this.setCacheResult(userId, result);
      return result;
    }

    try {
      // Fetch fresh membership data from Whop API
      const membership = await whopClient.getMembership(membershipId);

      // Validate membership status
      if (!membership.valid) {
        const result: MembershipValidationResult = {
          valid: false,
          status: 'expired',
          planTier: cachedPlanTier,
          reason: 'Membership is not valid',
        };
        this.setCacheResult(userId, result);
        return result;
      }

      if (membership.status !== 'active') {
        const result: MembershipValidationResult = {
          valid: false,
          status: membership.status as any,
          planTier: cachedPlanTier,
          reason: `Membership status is ${membership.status}`,
        };
        this.setCacheResult(userId, result);
        return result;
      }

      // Check expiration
      if (membership.expires_at) {
        const expiresAt = new Date(membership.expires_at);
        if (expiresAt < new Date()) {
          const result: MembershipValidationResult = {
            valid: false,
            status: 'expired',
            planTier: cachedPlanTier,
            expiresAt,
            reason: 'Membership has expired',
          };
          this.setCacheResult(userId, result);
          return result;
        }
      }

      // Extract current plan tier
      const planTier = WhopPlanChecker.extractPlanTier(membership);

      const result: MembershipValidationResult = {
        valid: true,
        status: 'active',
        planTier,
        expiresAt: membership.expires_at ? new Date(membership.expires_at) : undefined,
      };

      this.setCacheResult(userId, result);
      return result;
    } catch (error) {
      console.error('Error validating membership:', error);

      // Return cached plan tier on API error
      const result: MembershipValidationResult = {
        valid: false,
        status: 'not_found',
        planTier: cachedPlanTier,
        reason: 'API error',
      };

      return result;
    }
  }

  /**
   * Get full membership details
   */
  static async getMembershipDetails(userId: string): Promise<MembershipDetails | null> {
    try {
      const supabase = createClient();

      // Get user's membership ID
      const { data: user } = await supabase
        .from('creators')
        .select('membership_id, whop_user_id')
        .eq('id', userId)
        .single();

      if (!user || !user.membership_id) {
        // Try by whop_user_id
        const { data: userByWhopId } = await supabase
          .from('creators')
          .select('membership_id, whop_user_id')
          .eq('whop_user_id', userId)
          .single();

        if (!userByWhopId || !userByWhopId.membership_id) {
          return null;
        }

        const membership = await whopClient.getMembership(userByWhopId.membership_id);
        return this.formatMembershipDetails(membership);
      }

      const membership = await whopClient.getMembership(user.membership_id);
      return this.formatMembershipDetails(membership);
    } catch (error) {
      console.error('Error fetching membership details:', error);
      return null;
    }
  }

  /**
   * Format membership data for display
   */
  private static formatMembershipDetails(membership: WhopMembership): MembershipDetails {
    return {
      id: membership.id,
      userId: membership.user_id,
      planId: membership.plan_id,
      planTier: WhopPlanChecker.extractPlanTier(membership),
      status: membership.status,
      valid: membership.valid,
      expiresAt: membership.expires_at ? new Date(membership.expires_at) : undefined,
      renewalPeriodStart: membership.renewal_period_start
        ? new Date(membership.renewal_period_start)
        : undefined,
      renewalPeriodEnd: membership.renewal_period_end
        ? new Date(membership.renewal_period_end)
        : undefined,
      metadata: membership.metadata || {},
    };
  }

  /**
   * Get membership tier for a user
   */
  static async getMembershipTier(userId: string): Promise<PlanTier> {
    const validation = await this.validateMembership(userId);
    return validation.planTier;
  }

  /**
   * Check if user can access a specific resource
   * This is a placeholder for resource-level access control
   */
  static async checkMembershipAccess(
    userId: string,
    resourceId: string
  ): Promise<boolean> {
    const validation = await this.validateMembership(userId);

    if (!validation.valid) {
      return false;
    }

    // Add resource-level access logic here
    // For now, just check if membership is valid
    return true;
  }

  /**
   * Get usage limits for user's current plan
   */
  static async getMembershipLimits(userId: string): Promise<UsageLimits> {
    const planTier = await this.getMembershipTier(userId);

    // Define limits based on plan tier
    const limitsMap: Record<PlanTier, UsageLimits> = {
      [PlanTier.BASIC]: {
        maxVideos: 50,
        maxStudents: 100,
        maxStorageGB: 10,
        maxProjects: 10,
        maxQuizzes: 20,
        aiMessagesPerMonth: 1000,
        customBranding: false,
        prioritySupport: false,
      },
      [PlanTier.PRO]: {
        maxVideos: 500,
        maxStudents: 1000,
        maxStorageGB: 100,
        maxProjects: 50,
        maxQuizzes: 100,
        aiMessagesPerMonth: 10000,
        customBranding: false,
        prioritySupport: true,
      },
      [PlanTier.ENTERPRISE]: {
        maxVideos: -1, // Unlimited
        maxStudents: -1,
        maxStorageGB: -1,
        maxProjects: -1,
        maxQuizzes: -1,
        aiMessagesPerMonth: -1,
        customBranding: true,
        prioritySupport: true,
      },
    };

    return limitsMap[planTier];
  }

  /**
   * Check if user is within a specific limit
   */
  static async checkLimit(
    userId: string,
    limitType: keyof UsageLimits,
    currentUsage: number
  ): Promise<boolean> {
    const limits = await this.getMembershipLimits(userId);
    const limit = limits[limitType];

    // -1 means unlimited
    if (typeof limit === 'number' && limit === -1) {
      return true;
    }

    // Boolean limits
    if (typeof limit === 'boolean') {
      return limit;
    }

    // Numeric limits
    if (typeof limit === 'number') {
      return currentUsage < limit;
    }

    return false;
  }

  /**
   * Invalidate cache for a user
   * Call this when membership changes via webhook
   */
  static invalidateCache(userId: string): void {
    this.cache.delete(userId);
  }

  /**
   * Clear all cached membership data
   */
  static clearAllCache(): void {
    this.cache.clear();
  }

  /**
   * Get cached validation result
   */
  private static getCachedResult(userId: string): MembershipValidationResult | null {
    const cached = this.cache.get(userId);

    if (!cached) {
      return null;
    }

    // Check if cache is expired
    const now = Date.now();
    if (now - cached.timestamp > this.CACHE_TTL_MS) {
      this.cache.delete(userId);
      return null;
    }

    return cached.data;
  }

  /**
   * Set cache result
   */
  private static setCacheResult(userId: string, result: MembershipValidationResult): void {
    this.cache.set(userId, {
      data: result,
      timestamp: Date.now(),
    });
  }

  /**
   * Get cache statistics (for debugging)
   */
  static getCacheStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
    };
  }
}

/**
 * Convenience exports
 */
export const validateMembership = MembershipValidator.validateMembership.bind(
  MembershipValidator
);
export const getMembershipDetails = MembershipValidator.getMembershipDetails.bind(
  MembershipValidator
);
export const getMembershipTier = MembershipValidator.getMembershipTier.bind(
  MembershipValidator
);
export const checkMembershipAccess = MembershipValidator.checkMembershipAccess.bind(
  MembershipValidator
);
export const getMembershipLimits = MembershipValidator.getMembershipLimits.bind(
  MembershipValidator
);
export const invalidateMembershipCache = MembershipValidator.invalidateCache.bind(
  MembershipValidator
);
