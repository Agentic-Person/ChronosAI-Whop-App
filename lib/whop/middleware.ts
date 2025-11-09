/**
 * Whop Authentication Middleware
 * Header-based authentication for Whop iframe apps
 * No cookies, no OAuth - just verify Whop proxy headers
 */

import { NextRequest, NextResponse } from 'next/server';
import { whopsdk } from './whop-sdk';
import { createClient } from '@/lib/utils/supabase-client';

export interface WhopCreatorContext {
  creatorId: string;
  whopUserId: string;
  email: string;
  membershipValid: boolean;
  currentPlan: string;
}

/**
 * Get authenticated creator from Whop proxy headers
 * Works only when app is embedded in Whop iframe (*.apps.whop.com)
 */
export async function getAuthenticatedCreator(
  req: NextRequest
): Promise<{ creator: WhopCreatorContext | null; error: NextResponse | null }> {
  try {
    // Get Whop proxy headers (automatically added by Whop when app runs in iframe)
    const whopUserId = req.headers.get('x-whop-user-id');
    const whopMembershipId = req.headers.get('x-whop-membership-id');

    console.log('[Auth] Checking Whop headers:', {
      hasWhopUserId: !!whopUserId,
      hasWhopMembershipId: !!whopMembershipId,
    });

    if (!whopUserId) {
      console.log('[Auth] No Whop user ID in headers - not authenticated');
      return {
        creator: null,
        error: NextResponse.json(
          { error: 'Unauthorized', message: 'No Whop user found. App must run in Whop iframe.' },
          { status: 401 }
        ),
      };
    }

    // Verify user with Whop SDK
    console.log('[Auth] Verifying user with Whop SDK:', whopUserId);
    const userResponse = await whopsdk.users.retrieve(whopUserId);

    // Look up or create creator in database
    const supabase = createClient();
    const { data: creator, error: dbError } = await supabase
      .from('creators')
      .select('id, whop_user_id, email, current_plan, membership_id, membership_valid')
      .eq('whop_user_id', whopUserId)
      .single();

    if (dbError || !creator) {
      console.log('[Auth] Creator not found in database, creating new creator');

      // Determine plan tier
      const planTier = whopMembershipId ? 'pro' : 'basic';

      const { data: newCreator, error: insertError } = await supabase
        .from('creators')
        .insert({
          whop_user_id: whopUserId,
          email: userResponse.email || '',
          company_name: userResponse.username || 'New Creator',
          current_plan: planTier,
          membership_id: whopMembershipId,
          membership_valid: !!whopMembershipId,
          subscription_tier: planTier,
          settings: {},
        })
        .select('id, whop_user_id, email, current_plan, membership_id, membership_valid')
        .single();

      if (insertError || !newCreator) {
        console.error('[Auth] Failed to create creator:', insertError);
        return {
          creator: null,
          error: NextResponse.json(
            { error: 'Internal Server Error', message: 'Failed to create user account' },
            { status: 500 }
          ),
        };
      }

      console.log('[Auth] Created new creator:', newCreator.id);
      return {
        creator: {
          creatorId: newCreator.id,
          whopUserId,
          email: userResponse.email || '',
          membershipValid: !!whopMembershipId,
          currentPlan: planTier,
        },
        error: null,
      };
    }

    // Return existing creator
    console.log('[Auth] Found existing creator:', creator.id);
    return {
      creator: {
        creatorId: creator.id,
        whopUserId: creator.whop_user_id,
        email: creator.email || '',
        membershipValid: creator.membership_valid,
        currentPlan: creator.current_plan || 'basic',
      },
      error: null,
    };
  } catch (error) {
    console.error('[Auth] Error:', error);
    return {
      creator: null,
      error: NextResponse.json(
        { error: 'Internal Server Error', message: 'Authentication failed' },
        { status: 500 }
      ),
    };
  }
}

/**
 * Require authentication middleware wrapper
 */
export async function requireAuth(
  req: NextRequest,
  handler: (req: NextRequest, creator: WhopCreatorContext) => Promise<NextResponse>
): Promise<NextResponse> {
  const { creator, error } = await getAuthenticatedCreator(req);

  if (error) return error;
  if (!creator) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  return handler(req, creator);
}

/**
 * Extract plan tier from membership
 */
function extractPlanTier(membership: any): string {
  const plan = membership.plan || {};
  const planName = (plan.name || '').toLowerCase();

  if (planName.includes('enterprise')) return 'enterprise';
  if (planName.includes('pro') || planName.includes('professional')) return 'pro';
  if (planName.includes('basic') || planName.includes('starter')) return 'basic';

  return 'basic';
}
