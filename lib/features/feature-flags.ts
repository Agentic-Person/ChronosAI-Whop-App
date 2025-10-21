/**
 * Feature Flag Service
 * Core service for checking feature access based on user's plan tier
 */

import { createClient } from '@/lib/utils/supabase-client';
import { WhopPlanChecker } from '@/lib/whop/plan-checker';
import type {
  PlanTier,
  Feature,
  FeatureAccessResult,
  PlanTierConfig,
} from './types';
import {
  FEATURE_PLAN_MAPPING,
  PLAN_TIER_HIERARCHY,
  PLAN_CONFIGS,
} from './types';

/**
 * Cache for user plan tiers to reduce database calls
 * TTL: 5 minutes
 */
interface PlanCache {
  plan: PlanTier;
  timestamp: number;
}

const planCache = new Map<string, PlanCache>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

export class FeatureFlagService {
  /**
   * Check if user has access to a specific feature
   * @param userId - User ID (whop_user_id or database user id)
   * @param feature - Feature to check
   * @returns Feature access result with details
   */
  static async hasFeatureAccess(
    userId: string,
    feature: Feature
  ): Promise<FeatureAccessResult> {
    try {
      // Get user's current plan
      const userPlan = await this.getUserPlan(userId);

      // Get required plan for this feature
      const requiredPlan = FEATURE_PLAN_MAPPING[feature];

      // Compare plan tiers
      const userPlanLevel = PLAN_TIER_HIERARCHY[userPlan];
      const requiredPlanLevel = PLAN_TIER_HIERARCHY[requiredPlan];

      const hasAccess = userPlanLevel >= requiredPlanLevel;

      return {
        hasAccess,
        userPlan,
        requiredPlan,
        feature,
        upgradeRequired: !hasAccess,
      };
    } catch (error) {
      console.error('Error checking feature access:', error);
      // Default to denying access on error
      return {
        hasAccess: false,
        userPlan: 'basic' as PlanTier,
        requiredPlan: FEATURE_PLAN_MAPPING[feature],
        feature,
        upgradeRequired: true,
      };
    }
  }

  /**
   * Check if user has access to a feature (simple boolean version)
   * @param userId - User ID
   * @param feature - Feature to check
   * @returns True if user has access, false otherwise
   */
  static async canAccessFeature(
    userId: string,
    feature: Feature
  ): Promise<boolean> {
    const result = await this.hasFeatureAccess(userId, feature);
    return result.hasAccess;
  }

  /**
   * Get user's current plan tier
   * Uses caching to reduce database calls
   * @param userId - User ID
   * @returns Current plan tier
   */
  static async getUserPlan(userId: string): Promise<PlanTier> {
    // Check cache first
    const cached = planCache.get(userId);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      return cached.plan;
    }

    try {
      const supabase = createClient();

      // Query database for user's plan
      const { data: creator, error } = await supabase
        .from('creators')
        .select('current_plan, plan_expires_at, whop_user_id, subscription_tier')
        .eq('id', userId)
        .single();

      if (error) {
        // Try by whop_user_id if not found by id
        const { data: creatorByWhopId, error: whopError } = await supabase
          .from('creators')
          .select('current_plan, plan_expires_at, whop_user_id, subscription_tier')
          .eq('whop_user_id', userId)
          .single();

        if (whopError || !creatorByWhopId) {
          console.warn('User not found, defaulting to BASIC plan');
          return 'basic' as PlanTier;
        }

        // Check if plan is expired
        if (
          creatorByWhopId.plan_expires_at &&
          new Date(creatorByWhopId.plan_expires_at) < new Date()
        ) {
          console.warn('User plan expired, defaulting to BASIC');
          return 'basic' as PlanTier;
        }

        // Use current_plan if available, fallback to subscription_tier
        const plan = (creatorByWhopId.current_plan || creatorByWhopId.subscription_tier || 'basic') as PlanTier;

        // Cache the result
        planCache.set(userId, {
          plan,
          timestamp: Date.now(),
        });

        return plan;
      }

      // Check if plan is expired
      if (creator.plan_expires_at && new Date(creator.plan_expires_at) < new Date()) {
        console.warn('User plan expired, defaulting to BASIC');
        return 'basic' as PlanTier;
      }

      // Use current_plan if available, fallback to subscription_tier
      const plan = (creator.current_plan || creator.subscription_tier || 'basic') as PlanTier;

      // Cache the result
      planCache.set(userId, {
        plan,
        timestamp: Date.now(),
      });

      return plan;
    } catch (error) {
      console.error('Error fetching user plan:', error);
      return 'basic' as PlanTier;
    }
  }

  /**
   * Get all features available to user based on their plan
   * @param planTier - Plan tier to check
   * @returns Array of available features
   */
  static getAvailableFeatures(planTier: PlanTier): Feature[] {
    const planLevel = PLAN_TIER_HIERARCHY[planTier];

    // Get all features that require this plan level or lower
    return Object.entries(FEATURE_PLAN_MAPPING)
      .filter(([_, requiredPlan]) => {
        const requiredLevel = PLAN_TIER_HIERARCHY[requiredPlan];
        return planLevel >= requiredLevel;
      })
      .map(([feature, _]) => feature as Feature);
  }

  /**
   * Get features available to a specific user
   * @param userId - User ID
   * @returns Array of available features
   */
  static async getUserFeatures(userId: string): Promise<Feature[]> {
    const userPlan = await this.getUserPlan(userId);
    return this.getAvailableFeatures(userPlan);
  }

  /**
   * Get plan configuration for a specific tier
   * @param planTier - Plan tier
   * @returns Plan configuration
   */
  static getPlanConfig(planTier: PlanTier): PlanTierConfig {
    return PLAN_CONFIGS[planTier];
  }

  /**
   * Check if user's plan has sufficient limits for an action
   * @param userId - User ID
   * @param limitType - Type of limit to check
   * @param currentUsage - Current usage count
   * @returns True if within limits, false otherwise
   */
  static async checkPlanLimit(
    userId: string,
    limitType: keyof PlanTierConfig['limits'],
    currentUsage: number
  ): Promise<boolean> {
    const userPlan = await this.getUserPlan(userId);
    const planConfig = this.getPlanConfig(userPlan);
    const limit = planConfig.limits[limitType];

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

    // If limit type not found, allow action
    return true;
  }

  /**
   * Invalidate plan cache for a user
   * Call this when a user's plan changes
   * @param userId - User ID
   */
  static invalidateCache(userId: string): void {
    planCache.delete(userId);
  }

  /**
   * Clear all cached plan data
   * Useful for testing or when significant plan changes occur
   */
  static clearAllCache(): void {
    planCache.clear();
  }

  /**
   * Get required plan for a feature
   * @param feature - Feature to check
   * @returns Required plan tier
   */
  static getRequiredPlan(feature: Feature): PlanTier {
    return FEATURE_PLAN_MAPPING[feature];
  }

  /**
   * Check multiple features at once
   * @param userId - User ID
   * @param features - Array of features to check
   * @returns Map of features to access results
   */
  static async checkMultipleFeatures(
    userId: string,
    features: Feature[]
  ): Promise<Map<Feature, boolean>> {
    const userPlan = await this.getUserPlan(userId);
    const userPlanLevel = PLAN_TIER_HIERARCHY[userPlan];

    const results = new Map<Feature, boolean>();

    for (const feature of features) {
      const requiredPlan = FEATURE_PLAN_MAPPING[feature];
      const requiredPlanLevel = PLAN_TIER_HIERARCHY[requiredPlan];
      results.set(feature, userPlanLevel >= requiredPlanLevel);
    }

    return results;
  }

  /**
   * Get upgrade path for a user to access a feature
   * @param userId - User ID
   * @param feature - Feature they want to access
   * @returns Recommended plan to upgrade to
   */
  static async getUpgradePath(
    userId: string,
    feature: Feature
  ): Promise<PlanTier | null> {
    const result = await this.hasFeatureAccess(userId, feature);

    if (result.hasAccess) {
      return null; // Already has access
    }

    return result.requiredPlan;
  }

  /**
   * Log feature access attempt for analytics
   * @param userId - User ID
   * @param feature - Feature accessed
   * @param accessGranted - Whether access was granted
   */
  static async logFeatureAccess(
    userId: string,
    feature: Feature,
    accessGranted: boolean
  ): Promise<void> {
    try {
      const supabase = createClient();

      await supabase.from('analytics_events').insert({
        student_id: userId,
        event_type: 'feature_access',
        event_data: {
          feature,
          access_granted: accessGranted,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      console.error('Error logging feature access:', error);
      // Don't throw - logging should not break functionality
    }
  }
}

/**
 * Convenience function exports for common use cases
 */

export const hasFeatureAccess = FeatureFlagService.hasFeatureAccess.bind(
  FeatureFlagService
);
export const canAccessFeature = FeatureFlagService.canAccessFeature.bind(
  FeatureFlagService
);
export const getUserPlan = FeatureFlagService.getUserPlan.bind(FeatureFlagService);
export const getAvailableFeatures = FeatureFlagService.getAvailableFeatures.bind(
  FeatureFlagService
);
export const getUserFeatures = FeatureFlagService.getUserFeatures.bind(
  FeatureFlagService
);
export const invalidatePlanCache = FeatureFlagService.invalidateCache.bind(
  FeatureFlagService
);
