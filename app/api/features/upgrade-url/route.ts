/**
 * Upgrade URL API Route
 * Returns the Whop checkout URL for upgrading to access a feature
 */

import { NextRequest, NextResponse } from 'next/server';
import { FeatureFlagService } from '@/lib/features/feature-flags';
import { WhopPlanChecker } from '@/lib/whop/plan-checker';
import { Feature } from '@/lib/features/types';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { feature, userId } = body;

    if (!feature) {
      return NextResponse.json(
        { error: 'Feature parameter is required' },
        { status: 400 }
      );
    }

    // Get user ID from request if not provided
    const effectiveUserId =
      userId ||
      req.headers.get('x-user-id') ||
      req.headers.get('x-whop-user-id');

    let requiredPlan;

    if (effectiveUserId) {
      // Get upgrade path for specific user
      requiredPlan = await FeatureFlagService.getUpgradePath(
        effectiveUserId,
        feature as Feature
      );

      if (!requiredPlan) {
        // User already has access
        return NextResponse.json({
          hasAccess: true,
          upgradeUrl: null,
        });
      }
    } else {
      // No user ID - just return required plan
      requiredPlan = FeatureFlagService.getRequiredPlan(feature as Feature);
    }

    // Get upgrade URL
    const upgradeUrl = WhopPlanChecker.getUpgradeUrl(
      requiredPlan,
      effectiveUserId || undefined
    );

    return NextResponse.json({
      hasAccess: false,
      requiredPlan,
      upgradeUrl,
    });
  } catch (error) {
    console.error('Upgrade URL error:', error);
    return NextResponse.json(
      { error: 'Failed to get upgrade URL' },
      { status: 500 }
    );
  }
}
