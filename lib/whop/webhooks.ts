/**
 * Whop Webhook Handler
 * CRITICAL: Webhook signature verification for security
 * Handles membership and payment events
 */

import crypto from 'crypto';
import { createClient } from '@/lib/utils/supabase-client';
import type {
  WhopWebhookPayload,
  MembershipCreatedEvent,
  MembershipExpiredEvent,
  PaymentSucceededEvent,
  PaymentFailedEvent,
} from '@/types/whop';

interface WebhookResult {
  success: boolean;
  message: string;
  processed?: boolean;
}

export class WhopWebhookHandler {
  /**
   * CRITICAL: Verify webhook signature
   * Protects against unauthorized webhook calls
   */
  static verifySignature(
    payload: string,
    signature: string,
    timestamp: string
  ): boolean {
    const webhookSecret = process.env.WHOP_WEBHOOK_SECRET;

    if (!webhookSecret) {
      console.error('WHOP_WEBHOOK_SECRET is not configured');
      return false;
    }

    try {
      // Construct the signed payload
      const signedPayload = `${timestamp}.${payload}`;

      // Compute expected signature
      const expectedSignature = crypto
        .createHmac('sha256', webhookSecret)
        .update(signedPayload)
        .digest('hex');

      // Constant-time comparison to prevent timing attacks
      return crypto.timingSafeEqual(
        Buffer.from(signature),
        Buffer.from(expectedSignature)
      );
    } catch (error) {
      console.error('Signature verification failed:', error);
      return false;
    }
  }

  /**
   * Verify timestamp to prevent replay attacks
   */
  static verifyTimestamp(timestamp: string, maxAge: number = 300000): boolean {
    const now = Date.now();
    const timestampMs = parseInt(timestamp, 10) * 1000;

    // Reject if timestamp is too old (default: 5 minutes)
    if (now - timestampMs > maxAge) {
      console.warn('Webhook timestamp is too old');
      return false;
    }

    // Reject if timestamp is in the future
    if (timestampMs > now + 60000) {
      console.warn('Webhook timestamp is in the future');
      return false;
    }

    return true;
  }

  /**
   * Check if event was already processed (idempotency)
   */
  static async isEventProcessed(eventId: string): Promise<boolean> {
    const supabase = createClient();

    const { data } = await supabase
      .from('analytics_events')
      .select('id')
      .eq('event_type', 'whop_webhook')
      .eq('id', eventId)
      .single();

    return !!data;
  }

  /**
   * Mark event as processed
   */
  static async markEventProcessed(
    eventId: string,
    eventType: string,
    eventData: any
  ): Promise<void> {
    const supabase = createClient();

    await supabase.from('analytics_events').insert({
      id: eventId,
      event_type: 'whop_webhook',
      event_data: {
        webhook_type: eventType,
        data: eventData,
      },
    });
  }

  /**
   * Handle webhook event
   */
  static async handleWebhook(payload: WhopWebhookPayload): Promise<WebhookResult> {
    try {
      // Check idempotency
      const alreadyProcessed = await this.isEventProcessed(payload.id);
      if (alreadyProcessed) {
        return {
          success: true,
          message: 'Event already processed',
          processed: false,
        };
      }

      // Route to specific handler
      let result: WebhookResult;

      switch (payload.type) {
        case 'membership.created':
        case 'membership.went_valid':
          result = await this.handleMembershipCreated(
            payload.data as MembershipCreatedEvent
          );
          break;

        case 'membership.deleted':
        case 'membership.went_invalid':
          result = await this.handleMembershipExpired(
            payload.data as MembershipExpiredEvent
          );
          break;

        case 'payment.succeeded':
          result = await this.handlePaymentSucceeded(
            payload.data as PaymentSucceededEvent
          );
          break;

        case 'payment.failed':
          result = await this.handlePaymentFailed(
            payload.data as PaymentFailedEvent
          );
          break;

        default:
          return {
            success: true,
            message: `Unhandled event type: ${payload.type}`,
            processed: false,
          };
      }

      // Mark event as processed
      if (result.success) {
        await this.markEventProcessed(payload.id, payload.type, payload.data);
      }

      return result;
    } catch (error) {
      console.error('Webhook handling failed:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Handle membership created/activated event
   * Provisions student access
   */
  private static async handleMembershipCreated(
    event: MembershipCreatedEvent
  ): Promise<WebhookResult> {
    const supabase = createClient();

    try {
      // Check if creator exists
      const { data: creator } = await supabase
        .from('creators')
        .select('id')
        .eq('whop_user_id', event.user_id)
        .single();

      if (!creator) {
        // Create new creator account
        const { error: createError } = await supabase.from('creators').insert({
          whop_user_id: event.user_id,
          whop_company_id: event.product.company_id,
          company_name: event.product.name,
          subscription_tier: this.determineTier(event.plan_id),
          settings: {},
        });

        if (createError) {
          throw createError;
        }
      } else {
        // Update existing creator
        await supabase
          .from('creators')
          .update({
            whop_company_id: event.product.company_id,
            subscription_tier: this.determineTier(event.plan_id),
            updated_at: new Date().toISOString(),
          })
          .eq('whop_user_id', event.user_id);
      }

      // Log analytics event
      await supabase.from('analytics_events').insert({
        event_type: 'membership_activated',
        event_data: {
          whop_user_id: event.user_id,
          membership_id: event.id,
          plan_id: event.plan_id,
        },
      });

      return {
        success: true,
        message: 'Membership activated successfully',
        processed: true,
      };
    } catch (error) {
      console.error('Failed to handle membership created:', error);
      return {
        success: false,
        message: 'Failed to provision access',
      };
    }
  }

  /**
   * Handle membership expired/cancelled event
   * Revokes student access
   */
  private static async handleMembershipExpired(
    event: MembershipExpiredEvent
  ): Promise<WebhookResult> {
    const supabase = createClient();

    try {
      // Update creator membership status
      await supabase
        .from('creators')
        .update({
          membership_valid: false,
          updated_at: new Date().toISOString(),
        })
        .eq('whop_user_id', event.user_id);

      // Log analytics event
      await supabase.from('analytics_events').insert({
        event_type: 'membership_expired',
        event_data: {
          whop_user_id: event.user_id,
          membership_id: event.id,
        },
      });

      return {
        success: true,
        message: 'Membership access revoked',
        processed: true,
      };
    } catch (error) {
      console.error('Failed to handle membership expired:', error);
      return {
        success: false,
        message: 'Failed to revoke access',
      };
    }
  }

  /**
   * Handle payment succeeded event
   * Logs for analytics
   */
  private static async handlePaymentSucceeded(
    event: PaymentSucceededEvent
  ): Promise<WebhookResult> {
    const supabase = createClient();

    try {
      // Log payment event for analytics
      await supabase.from('analytics_events').insert({
        event_type: 'payment_succeeded',
        event_data: {
          membership_id: event.membership_id,
          amount: event.amount,
          currency: event.currency,
        },
      });

      return {
        success: true,
        message: 'Payment logged successfully',
        processed: true,
      };
    } catch (error) {
      console.error('Failed to log payment:', error);
      return {
        success: false,
        message: 'Failed to log payment',
      };
    }
  }

  /**
   * Handle payment failed event
   * Logs failure for monitoring
   */
  private static async handlePaymentFailed(
    event: PaymentFailedEvent
  ): Promise<WebhookResult> {
    const supabase = createClient();

    try {
      // Log payment failure
      await supabase.from('analytics_events').insert({
        event_type: 'payment_failed',
        event_data: {
          membership_id: event.membership_id,
          amount: event.amount,
          currency: event.currency,
          error_message: event.error_message,
        },
      });

      // TODO: Send notification to user about payment failure

      return {
        success: true,
        message: 'Payment failure logged',
        processed: true,
      };
    } catch (error) {
      console.error('Failed to log payment failure:', error);
      return {
        success: false,
        message: 'Failed to log payment failure',
      };
    }
  }

  /**
   * Determine subscription tier from plan ID
   */
  private static determineTier(planId: string): 'starter' | 'pro' | 'enterprise' {
    // This should be customized based on your actual plan IDs
    const planIdLower = planId.toLowerCase();

    if (planIdLower.includes('enterprise')) {
      return 'enterprise';
    } else if (planIdLower.includes('pro')) {
      return 'pro';
    } else {
      return 'starter';
    }
  }
}
