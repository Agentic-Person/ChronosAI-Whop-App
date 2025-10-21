/**
 * Enhanced Whop Webhook Handler with Feature Gating Integration
 * Extends base webhook handler with plan tier management
 */

import { WhopWebhookHandler } from './webhooks';
import { WhopPlanChecker } from './plan-checker';
import { invalidatePlanCache } from '@/lib/features/feature-flags';
import { PlanTier } from '@/lib/features/types';
import { createClient } from '@/lib/utils/supabase-client';
import type {
  MembershipCreatedEvent,
  MembershipExpiredEvent,
  WhopMembership,
} from '@/types/whop';

export class EnhancedWhopWebhookHandler extends WhopWebhookHandler {
  /**
   * Enhanced membership created handler
   * Updates plan tier using WhopPlanChecker
   */
  static async handleMembershipCreatedEnhanced(
    event: MembershipCreatedEvent
  ): Promise<{ success: boolean; message: string }> {
    const supabase = createClient();

    try {
      // Extract plan tier from membership
      const membership: WhopMembership = {
        id: event.id,
        user_id: event.user_id,
        product_id: event.product_id,
        plan_id: event.plan_id,
        status: event.status as any,
        valid: event.valid,
        created_at: event.user.created_at,
        metadata: {},
      };

      const planTier = WhopPlanChecker.extractPlanTier(membership);

      // Get plan expiration if available
      const expiration = event.product?.renewal_period_end
        ? new Date(event.product.renewal_period_end)
        : null;

      // Check if creator exists
      const { data: creator } = await supabase
        .from('creators')
        .select('id, whop_user_id')
        .eq('whop_user_id', event.user_id)
        .single();

      const planData = {
        current_plan: planTier,
        plan_expires_at: expiration?.toISOString() || null,
        plan_metadata: {
          plan_id: event.plan_id,
          product_id: event.product_id,
          membership_id: event.id,
          whop_status: event.status,
          updated_at: new Date().toISOString(),
        },
        subscription_tier: planTier === PlanTier.BASIC ? 'starter' : planTier,
        membership_valid: event.valid,
      };

      if (!creator) {
        // Create new creator account with plan
        const { error: createError } = await supabase.from('creators').insert({
          whop_user_id: event.user_id,
          whop_company_id: event.product.company_id,
          company_name: event.product.name,
          ...planData,
          settings: {},
        });

        if (createError) {
          throw createError;
        }

        console.log(`Created new creator with ${planTier} plan for user ${event.user_id}`);
      } else {
        // Update existing creator with new plan
        await supabase
          .from('creators')
          .update({
            whop_company_id: event.product.company_id,
            ...planData,
            updated_at: new Date().toISOString(),
          })
          .eq('whop_user_id', event.user_id);

        console.log(`Updated creator plan to ${planTier} for user ${event.user_id}`);

        // Invalidate plan cache for this user
        invalidatePlanCache(creator.id);
        invalidatePlanCache(event.user_id);
      }

      // Log analytics event with plan tier
      await supabase.from('analytics_events').insert({
        event_type: 'membership_activated',
        event_data: {
          whop_user_id: event.user_id,
          membership_id: event.id,
          plan_id: event.plan_id,
          plan_tier: planTier,
          expires_at: expiration?.toISOString(),
        },
      });

      return {
        success: true,
        message: `Membership activated with ${planTier} plan`,
      };
    } catch (error) {
      console.error('Failed to handle enhanced membership created:', error);
      return {
        success: false,
        message: 'Failed to provision access with plan tier',
      };
    }
  }

  /**
   * Enhanced membership expired handler
   * Downgrades to BASIC plan on expiration
   */
  static async handleMembershipExpiredEnhanced(
    event: MembershipExpiredEvent
  ): Promise<{ success: boolean; message: string }> {
    const supabase = createClient();

    try {
      // Get creator info
      const { data: creator } = await supabase
        .from('creators')
        .select('id, current_plan')
        .eq('whop_user_id', event.user_id)
        .single();

      if (!creator) {
        console.warn(`Creator not found for expired membership: ${event.user_id}`);
        return {
          success: false,
          message: 'Creator not found',
        };
      }

      const previousPlan = creator.current_plan;

      // Downgrade to BASIC plan
      await supabase
        .from('creators')
        .update({
          current_plan: PlanTier.BASIC,
          plan_expires_at: new Date().toISOString(), // Mark as expired
          membership_valid: false,
          plan_metadata: {
            previous_plan: previousPlan,
            expired_at: new Date().toISOString(),
            membership_id: event.id,
          },
          updated_at: new Date().toISOString(),
        })
        .eq('whop_user_id', event.user_id);

      console.log(`Downgraded user ${event.user_id} from ${previousPlan} to BASIC due to expiration`);

      // Invalidate plan cache
      invalidatePlanCache(creator.id);
      invalidatePlanCache(event.user_id);

      // Log analytics event
      await supabase.from('analytics_events').insert({
        event_type: 'membership_expired',
        event_data: {
          whop_user_id: event.user_id,
          membership_id: event.id,
          previous_plan: previousPlan,
          new_plan: PlanTier.BASIC,
        },
      });

      // TODO: Send notification to user about plan downgrade
      // TODO: Trigger cleanup of features no longer accessible

      return {
        success: true,
        message: 'Membership expired, downgraded to BASIC plan',
      };
    } catch (error) {
      console.error('Failed to handle enhanced membership expired:', error);
      return {
        success: false,
        message: 'Failed to downgrade plan on expiration',
      };
    }
  }

  /**
   * Handle plan upgrade/change event
   * Called when user changes between plan tiers
   */
  static async handlePlanChange(
    userId: string,
    newPlanTier: PlanTier,
    membershipId: string
  ): Promise<{ success: boolean; message: string }> {
    const supabase = createClient();

    try {
      // Get current plan
      const { data: creator } = await supabase
        .from('creators')
        .select('id, current_plan')
        .eq('whop_user_id', userId)
        .single();

      if (!creator) {
        return {
          success: false,
          message: 'Creator not found',
        };
      }

      const previousPlan = creator.current_plan;

      // Update plan
      await supabase
        .from('creators')
        .update({
          current_plan: newPlanTier,
          plan_metadata: {
            previous_plan: previousPlan,
            changed_at: new Date().toISOString(),
            membership_id: membershipId,
          },
          updated_at: new Date().toISOString(),
        })
        .eq('id', creator.id);

      console.log(`Plan changed for user ${userId}: ${previousPlan} -> ${newPlanTier}`);

      // Invalidate cache
      invalidatePlanCache(creator.id);
      invalidatePlanCache(userId);

      // Log analytics
      await supabase.from('analytics_events').insert({
        event_type: 'plan_changed',
        event_data: {
          whop_user_id: userId,
          previous_plan: previousPlan,
          new_plan: newPlanTier,
          membership_id: membershipId,
        },
      });

      return {
        success: true,
        message: `Plan changed from ${previousPlan} to ${newPlanTier}`,
      };
    } catch (error) {
      console.error('Failed to handle plan change:', error);
      return {
        success: false,
        message: 'Failed to update plan',
      };
    }
  }
}

/**
 * Convenience exports
 */
export const handleMembershipCreated =
  EnhancedWhopWebhookHandler.handleMembershipCreatedEnhanced.bind(
    EnhancedWhopWebhookHandler
  );
export const handleMembershipExpired =
  EnhancedWhopWebhookHandler.handleMembershipExpiredEnhanced.bind(
    EnhancedWhopWebhookHandler
  );
export const handlePlanChange = EnhancedWhopWebhookHandler.handlePlanChange.bind(
  EnhancedWhopWebhookHandler
);
