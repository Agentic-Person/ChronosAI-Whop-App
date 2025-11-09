/**
 * GET /api/auth/me
 * Returns the current authenticated creator's info
 * Uses header-based authentication (no cookies)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedCreator } from '@/lib/whop/middleware';

// Force dynamic rendering (uses headers for auth)
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { creator, error } = await getAuthenticatedCreator(req);

    if (error) return error;

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
