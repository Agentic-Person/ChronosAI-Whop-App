/**
 * Feature Check API Route
 * Checks if a user has access to a specific feature
 */

import { NextRequest, NextResponse } from 'next/server';
import { FeatureFlagService } from '@/lib/features/feature-flags';
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

    if (!effectiveUserId) {
      return NextResponse.json(
        { error: 'User identification required' },
        { status: 401 }
      );
    }

    // Check feature access
    const result = await FeatureFlagService.hasFeatureAccess(
      effectiveUserId,
      feature as Feature
    );

    return NextResponse.json(result);
  } catch (error) {
    console.error('Feature check error:', error);
    return NextResponse.json(
      { error: 'Failed to check feature access' },
      { status: 500 }
    );
  }
}
