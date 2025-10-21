/**
 * Plan Info API Route
 * Returns detailed plan information for a user
 */

import { NextRequest, NextResponse } from 'next/server';
import { FeatureFlagService } from '@/lib/features/feature-flags';
import { WhopPlanChecker } from '@/lib/whop/plan-checker';
import { createClient } from '@/lib/utils/supabase-client';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId =
      searchParams.get('userId') ||
      req.headers.get('x-user-id') ||
      req.headers.get('x-whop-user-id');

    if (!userId) {
      return NextResponse.json(
        { error: 'User identification required' },
        { status: 401 }
      );
    }

    // Get user's plan
    const plan = await FeatureFlagService.getUserPlan(userId);
    const planConfig = FeatureFlagService.getPlanConfig(plan);

    // Get plan expiration info
    const supabase = createClient();
    const { data: creator } = await supabase
      .from('creators')
      .select('plan_expires_at, whop_user_id, membership_id')
      .or(`id.eq.${userId},whop_user_id.eq.${userId}`)
      .single();

    let expiresAt = null;
    let daysUntilExpiration = null;

    if (creator?.plan_expires_at) {
      expiresAt = creator.plan_expires_at;
      const expiration = new Date(creator.plan_expires_at);
      const now = new Date();
      const diffMs = expiration.getTime() - now.getTime();
      daysUntilExpiration = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    } else if (creator?.membership_id) {
      // Try to get expiration from Whop
      try {
        const whopExpiration = await WhopPlanChecker.getPlanExpiration(
          creator.membership_id
        );
        if (whopExpiration) {
          expiresAt = whopExpiration.toISOString();
          const now = new Date();
          const diffMs = whopExpiration.getTime() - now.getTime();
          daysUntilExpiration = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
        }
      } catch (error) {
        console.warn('Could not fetch Whop expiration:', error);
      }
    }

    return NextResponse.json({
      plan,
      planConfig: {
        displayName: planConfig.displayName,
        description: planConfig.description,
        price: planConfig.price,
      },
      limits: planConfig.limits,
      expiresAt,
      daysUntilExpiration,
    });
  } catch (error) {
    console.error('Plan info error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch plan information' },
      { status: 500 }
    );
  }
}
