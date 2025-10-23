/**
 * Whop Plan Checker
 * Extracts and validates plan tiers from Whop membership data
 *
 * ⚠️ CRITICAL: Uses MCP client for ALL Whop API operations (MCP-First Policy)
 */

import { getMembership, listMemberships, WhopMembership as MCPWhopMembership } from './mcp/client';
import type { WhopMembership } from '@/types/whop';
import { PlanTier } from '@/lib/features/types';

/**
 * Plan ID mapping configuration
 * Map Whop plan IDs to internal plan tiers
 * IMPORTANT: Update these mappings based on your actual Whop product configuration
 */
interface PlanIdMapping {
  basic: string[];
  pro: string[];
  enterprise: string[];
}

// Default plan ID patterns (customize based on your Whop setup)
const DEFAULT_PLAN_PATTERNS: PlanIdMapping = {
  basic: ['plan_basic', 'plan_starter', 'basic'],
  pro: ['plan_pro', 'professional', 'pro'],
  enterprise: ['plan_enterprise', 'plan_business', 'enterprise'],
};

export class WhopPlanChecker {
  private static planIdMapping: PlanIdMapping = DEFAULT_PLAN_PATTERNS;

  /**
   * Configure custom plan ID mappings
   * Call this during app initialization with your actual Whop plan IDs
   * @param mapping - Custom plan ID mapping
   */
  static configurePlanMapping(mapping: Partial<PlanIdMapping>): void {
    this.planIdMapping = {
      ...DEFAULT_PLAN_PATTERNS,
      ...mapping,
    };
  }

  /**
   * Extract plan tier from Whop membership
   * @param membership - Whop membership object
   * @returns Plan tier (BASIC, PRO, or ENTERPRISE)
   */
  static extractPlanTier(membership: WhopMembership): PlanTier {
    // First check metadata for explicit plan tier
    if (membership.metadata?.plan_tier) {
      return this.normalizePlanTier(membership.metadata.plan_tier);
    }

    // Check plan_id against our mappings
    const planId = membership.plan_id.toLowerCase();

    // Check for enterprise
    if (this.planIdMapping.enterprise.some(id => planId.includes(id.toLowerCase()))) {
      return PlanTier.ENTERPRISE;
    }

    // Check for pro
    if (this.planIdMapping.pro.some(id => planId.includes(id.toLowerCase()))) {
      return PlanTier.PRO;
    }

    // Check for basic/starter
    if (this.planIdMapping.basic.some(id => planId.includes(id.toLowerCase()))) {
      return PlanTier.BASIC;
    }

    // Default to basic if no match
    console.warn(`Unknown plan ID: ${membership.plan_id}, defaulting to BASIC`);
    return PlanTier.BASIC;
  }

  /**
   * Get plan tier for a user by their membership ID
   * @param membershipId - Whop membership ID
   * @returns Plan tier
   */
  static async getPlanTierByMembershipId(membershipId: string): Promise<PlanTier> {
    try {
      // Fetch membership from Whop API via MCP
      const membership = await getMembership(membershipId) as any;

      // Validate membership is active
      if (!membership.valid || membership.status !== 'active') {
        console.warn(`Membership ${membershipId} is not active, defaulting to BASIC`);
        return PlanTier.BASIC;
      }

      return this.extractPlanTier(membership);
    } catch (error) {
      console.error('Error fetching membership from Whop:', error);
      return PlanTier.BASIC;
    }
  }

  /**
   * Get plan tier for a user by their user ID
   * @param whopUserId - Whop user ID
   * @returns Plan tier from their active membership
   */
  static async getPlanTierByUserId(whopUserId: string): Promise<PlanTier> {
    try {
      // Fetch user's memberships via MCP
      const memberships = await listMemberships({ userId: whopUserId }) as any[];

      // Find active membership
      const activeMembership = memberships.find(
        m => m.valid && m.status === 'active'
      );

      if (!activeMembership) {
        console.warn(`No active membership found for user ${whopUserId}`);
        return PlanTier.BASIC;
      }

      return this.extractPlanTier(activeMembership);
    } catch (error) {
      console.error('Error fetching user memberships from Whop:', error);
      return PlanTier.BASIC;
    }
  }

  /**
   * Validate that a membership is active and valid
   * @param membershipId - Whop membership ID
   * @returns True if valid, false otherwise
   */
  static async validateMembership(membershipId: string): Promise<boolean> {
    try {
      const membership = await getMembership(membershipId) as any;

      // Check if membership is valid and active
      if (!membership.valid || membership.status !== 'active') {
        return false;
      }

      // Check if membership has expired
      if (membership.expires_at) {
        const expiresAt = new Date(membership.expires_at);
        if (expiresAt < new Date()) {
          return false;
        }
      }

      return true;
    } catch (error) {
      console.error('Error validating membership:', error);
      return false;
    }
  }

  /**
   * Get plan expiration date from membership
   * @param membershipId - Whop membership ID
   * @returns Expiration date or null if no expiration
   */
  static async getPlanExpiration(membershipId: string): Promise<Date | null> {
    try {
      const membership = await getMembership(membershipId) as any;

      if (membership.expires_at) {
        return new Date(membership.expires_at);
      }

      // If no expires_at, check renewal_period_end
      if (membership.renewal_period_end) {
        return new Date(membership.renewal_period_end);
      }

      return null; // No expiration (lifetime access)
    } catch (error) {
      console.error('Error fetching plan expiration:', error);
      return null;
    }
  }

  /**
   * Check if user can upgrade to a higher plan
   * @param currentTier - Current plan tier
   * @param targetTier - Target plan tier
   * @returns True if upgrade is possible
   */
  static canUpgrade(currentTier: PlanTier, targetTier: PlanTier): boolean {
    const tierLevels = {
      [PlanTier.BASIC]: 1,
      [PlanTier.PRO]: 2,
      [PlanTier.ENTERPRISE]: 3,
    };

    return tierLevels[targetTier] > tierLevels[currentTier];
  }

  /**
   * Get upgrade URL for Whop checkout
   * @param targetTier - Plan tier to upgrade to
   * @param userId - Whop user ID (for pre-filling)
   * @returns Checkout URL
   */
  static getUpgradeUrl(targetTier: PlanTier, userId?: string): string {
    // Map plan tiers to Whop checkout URLs
    // IMPORTANT: Replace these with your actual Whop product checkout URLs
    const checkoutUrls: Record<PlanTier, string> = {
      [PlanTier.BASIC]: process.env.NEXT_PUBLIC_WHOP_BASIC_CHECKOUT_URL || '#',
      [PlanTier.PRO]: process.env.NEXT_PUBLIC_WHOP_PRO_CHECKOUT_URL || '#',
      [PlanTier.ENTERPRISE]: process.env.NEXT_PUBLIC_WHOP_ENTERPRISE_CHECKOUT_URL || '#',
    };

    let url = checkoutUrls[targetTier];

    // Append user ID for pre-filling if available
    if (userId) {
      const separator = url.includes('?') ? '&' : '?';
      url += `${separator}user_id=${userId}`;
    }

    return url;
  }

  /**
   * Normalize plan tier string to PlanTier enum
   * Handles various formats: "basic", "BASIC", "Basic", "starter", etc.
   * @param planString - Plan tier string
   * @returns Normalized PlanTier
   */
  private static normalizePlanTier(planString: string): PlanTier {
    const normalized = planString.toLowerCase().trim();

    // Map common variations to plan tiers
    if (normalized.includes('enterprise') || normalized.includes('business')) {
      return PlanTier.ENTERPRISE;
    }

    if (normalized.includes('pro') || normalized.includes('professional')) {
      return PlanTier.PRO;
    }

    // Default to basic for any other value
    return PlanTier.BASIC;
  }

  /**
   * Get plan metadata from Whop membership
   * Extracts useful metadata for analytics and display
   * @param membership - Whop membership
   * @returns Plan metadata object
   */
  static getPlanMetadata(membership: WhopMembership): Record<string, any> {
    return {
      plan_id: membership.plan_id,
      product_id: membership.product_id,
      status: membership.status,
      valid: membership.valid,
      created_at: membership.created_at,
      expires_at: membership.expires_at,
      renewal_period_start: membership.renewal_period_start,
      renewal_period_end: membership.renewal_period_end,
      metadata: membership.metadata,
    };
  }

  /**
   * Check if membership is in trial period
   * @param membership - Whop membership
   * @returns True if in trial, false otherwise
   */
  static isTrialMembership(membership: WhopMembership): boolean {
    return membership.status === 'trialing';
  }

  /**
   * Get days remaining until plan expires
   * @param membershipId - Whop membership ID
   * @returns Days remaining or null if no expiration
   */
  static async getDaysUntilExpiration(membershipId: string): Promise<number | null> {
    const expiration = await this.getPlanExpiration(membershipId);

    if (!expiration) {
      return null; // No expiration
    }

    const now = new Date();
    const diffMs = expiration.getTime() - now.getTime();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    return diffDays;
  }

  /**
   * Check if plan is about to expire (within warning threshold)
   * @param membershipId - Whop membership ID
   * @param warningDays - Number of days before expiration to warn (default: 7)
   * @returns True if expiring soon
   */
  static async isPlanExpiringSoon(
    membershipId: string,
    warningDays: number = 7
  ): Promise<boolean> {
    const daysRemaining = await this.getDaysUntilExpiration(membershipId);

    if (daysRemaining === null) {
      return false; // No expiration
    }

    return daysRemaining <= warningDays && daysRemaining > 0;
  }
}

/**
 * Convenience exports
 */
export const extractPlanTier = WhopPlanChecker.extractPlanTier.bind(WhopPlanChecker);
export const getPlanTierByMembershipId = WhopPlanChecker.getPlanTierByMembershipId.bind(
  WhopPlanChecker
);
export const getPlanTierByUserId = WhopPlanChecker.getPlanTierByUserId.bind(
  WhopPlanChecker
);
export const validateMembership = WhopPlanChecker.validateMembership.bind(
  WhopPlanChecker
);
export const getUpgradeUrl = WhopPlanChecker.getUpgradeUrl.bind(WhopPlanChecker);
