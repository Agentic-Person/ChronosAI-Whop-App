/**
 * Whop Webhooks Endpoint
 *
 * Handles webhook events from Whop:
 * - payment.succeeded: Convert trial to paid subscription
 * - membership.created: New student joins
 * - membership.deleted: Student leaves
 * - membership.went_valid/invalid: Membership status changes
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { TrialManager } from '@/lib/trial/trial-manager';
import { PlanTier } from '@/lib/features/types';
import { logInfo, logError } from '@/lib/infrastructure/monitoring/logger';
import crypto from 'crypto';

// Map Whop product IDs to our plan tiers
// TODO: Update these with actual Whop product IDs after creating products in Whop dashboard
const WHOP_PLAN_MAPPING: Record<string, PlanTier> = {
  'prod_basic_monthly': PlanTier.BASIC,
  'prod_pro_monthly': PlanTier.PRO,
  'prod_enterprise_monthly': PlanTier.ENTERPRISE,
};

/**
 * Verify webhook signature from Whop
 */
function verifyWebhookSignature(
  payload: string,
  signature: string | null,
  secret: string
): boolean {
  if (!signature) {
    return false;
  }

  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');

  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}

export async function POST(req: NextRequest) {
  try {
    // Get webhook signature from headers
    const signature = req.headers.get('x-whop-signature');
    const webhookSecret = process.env.WHOP_WEBHOOK_SECRET;

    if (!webhookSecret) {
      logError('WHOP_WEBHOOK_SECRET not configured');
      return NextResponse.json(
        { error: 'Webhook secret not configured' },
        { status: 500 }
      );
    }

    // Get raw body for signature verification
    const rawBody = await req.text();

    // Verify signature
    if (!verifyWebhookSignature(rawBody, signature, webhookSecret)) {
      logError('Invalid webhook signature');
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 401 }
      );
    }

    // Parse webhook payload
    const event = JSON.parse(rawBody);
    const { type, data } = event;

    logInfo('Received Whop webhook', { type, event_id: event.id });

    const supabase = createAdminClient();

    // Handle different webhook events
    switch (type) {
      case 'payment.succeeded': {
        const { company_id, product_id, amount } = data;

        // Get creator by company_id
        const { data: creator } = await supabase
          .from('creators')
          .select('id, trial_status')
          .eq('whop_company_id', company_id)
          .single();

        if (!creator) {
          logError('Creator not found for payment', { company_id });
          return NextResponse.json({ error: 'Creator not found' }, { status: 404 });
        }

        // Map Whop product to plan tier
        const tier = WHOP_PLAN_MAPPING[product_id] || PlanTier.BASIC;

        logInfo('Processing successful payment', {
          creator_id: creator.id,
          company_id,
          product_id,
          tier,
          amount,
        });

        // If creator is on trial, convert to paid
        if (creator.trial_status === 'active') {
          const result = await TrialManager.convertTrial(creator.id, tier);

          logInfo('Trial converted to paid', {
            creator_id: creator.id,
            tier,
            demo_removed: result.demoContentRemoved,
          });

          return NextResponse.json({
            success: true,
            message: 'Trial converted to paid subscription',
            tier,
          });
        } else {
          // Update existing subscription tier
          await supabase
            .from('creators')
            .update({
              subscription_tier: tier,
              current_plan: tier,
            })
            .eq('id', creator.id);

          logInfo('Subscription tier updated', {
            creator_id: creator.id,
            new_tier: tier,
          });

          return NextResponse.json({
            success: true,
            message: 'Subscription updated',
            tier,
          });
        }
      }

      case 'membership.created': {
        const { user_id, membership_id, company_id, user_email, user_name } = data;

        // Get creator by company_id
        const { data: creator } = await supabase
          .from('creators')
          .select('id')
          .eq('whop_company_id', company_id)
          .single();

        if (!creator) {
          logError('Creator not found for new membership', { company_id });
          return NextResponse.json({ error: 'Creator not found' }, { status: 404 });
        }

        // Check if student already exists
        const { data: existingStudent } = await supabase
          .from('students')
          .select('id')
          .eq('whop_user_id', user_id)
          .single();

        if (existingStudent) {
          logInfo('Student already exists', { student_id: existingStudent.id });
          return NextResponse.json({ success: true, student_id: existingStudent.id });
        }

        // Create new student
        const { data: newStudent, error: studentError } = await supabase
          .from('students')
          .insert({
            whop_user_id: user_id,
            whop_membership_id: membership_id,
            creator_id: creator.id,
            email: user_email,
            name: user_name,
          })
          .select('id')
          .single();

        if (studentError || !newStudent) {
          throw new Error(`Failed to create student: ${studentError?.message}`);
        }

        logInfo('New student created', {
          student_id: newStudent.id,
          creator_id: creator.id,
          membership_id,
        });

        return NextResponse.json({
          success: true,
          message: 'Student created',
          student_id: newStudent.id,
        });
      }

      case 'membership.deleted': {
        const { membership_id } = data;

        // Soft delete student (mark as inactive)
        const { error: deleteError } = await supabase
          .from('students')
          .update({ last_active: new Date().toISOString() })
          .eq('whop_membership_id', membership_id);

        if (deleteError) {
          throw new Error(`Failed to deactivate student: ${deleteError.message}`);
        }

        logInfo('Student membership deleted', { membership_id });

        return NextResponse.json({
          success: true,
          message: 'Student membership deleted',
        });
      }

      case 'membership.went_valid':
      case 'membership.went_invalid': {
        const { membership_id, user_id } = data;
        const isValid = type === 'membership.went_valid';

        // Update student status
        await supabase
          .from('students')
          .update({
            last_active: isValid ? new Date().toISOString() : null,
          })
          .eq('whop_membership_id', membership_id);

        logInfo('Membership status changed', {
          membership_id,
          user_id,
          valid: isValid,
        });

        return NextResponse.json({
          success: true,
          message: `Membership ${isValid ? 'activated' : 'deactivated'}`,
        });
      }

      default:
        logInfo('Unhandled webhook event type', { type });
        return NextResponse.json({
          success: true,
          message: 'Event received but not handled',
        });
    }

  } catch (error) {
    logError('Webhook processing failed', { error });

    return NextResponse.json(
      {
        error: 'Webhook processing failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
