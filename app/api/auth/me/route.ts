/**
 * GET /api/auth/me
 * Returns the current authenticated creator's info
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedCreatorDev } from '@/lib/whop/middleware';

export async function GET(req: NextRequest) {
  try {
    const { creator, error } = await getAuthenticatedCreatorDev(req);

    if (error) {
      return error;
    }

    if (!creator) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Not authenticated' },
        { status: 401 }
      );
    }

    return NextResponse.json({
      creatorId: creator.creatorId,
      whopUserId: creator.whopUserId,
      email: creator.email,
      membershipValid: creator.membershipValid,
      currentPlan: creator.currentPlan,
    });
  } catch (error) {
    console.error('Error getting current user:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', message: 'Failed to get user info' },
      { status: 500 }
    );
  }
}
