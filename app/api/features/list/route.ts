/**
 * Features List API Route
 * Returns all features available to a user based on their plan
 */

import { NextRequest, NextResponse } from 'next/server';
import { FeatureFlagService } from '@/lib/features/feature-flags';

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
    const userPlan = await FeatureFlagService.getUserPlan(userId);

    // Get available features
    const features = FeatureFlagService.getAvailableFeatures(userPlan);

    return NextResponse.json({
      userPlan,
      features,
    });
  } catch (error) {
    console.error('Features list error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch features' },
      { status: 500 }
    );
  }
}
