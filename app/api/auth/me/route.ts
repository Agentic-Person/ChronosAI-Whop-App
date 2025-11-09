/**
 * GET /api/auth/me
 * Returns the current authenticated creator's info
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedCreatorDev } from '@/lib/whop/middleware';

// Force dynamic rendering (uses cookies for auth)
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    // DEBUG: Log all headers to see what Whop is sending
    console.log('[/api/auth/me] Request headers:', {
      'x-whop-user-id': req.headers.get('x-whop-user-id'),
      'x-whop-membership-id': req.headers.get('x-whop-membership-id'),
      'x-whop-company-id': req.headers.get('x-whop-company-id'),
      'x-forwarded-for': req.headers.get('x-forwarded-for'),
      'user-agent': req.headers.get('user-agent'),
      'referer': req.headers.get('referer'),
      'host': req.headers.get('host'),
      'all-headers': Array.from(req.headers.entries()).map(([k, v]) => `${k}: ${v}`).join(', ')
    });

    const { creator, error } = await getAuthenticatedCreatorDev(req);

    if (error) {
      console.log('[/api/auth/me] Auth error:', error);
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
