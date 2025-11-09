/**
 * Whop Authentication Middleware
 * Single source of truth for Whop-only authentication
 * Validates sessions from cookies and provides creator context
 */

import { NextRequest, NextResponse } from 'next/server';
import { WhopServerSdk } from '@whop/api';
import { createClient } from '@/lib/utils/supabase-client';

// Initialize Whop SDK
const whopApi = WhopServerSdk({
  appApiKey: process.env.WHOP_API_KEY!,
  appId: process.env.NEXT_PUBLIC_WHOP_APP_ID!,
});

export interface WhopCreatorContext {
  creatorId: string;
  whopUserId: string;
  email: string;
  accessToken: string;
  membershipId?: string;
  membershipValid: boolean;
  currentPlan: string;
}

/**
 * Authenticate using Whop proxy headers (when embedded in Whop)
 * Whop automatically adds these headers when the app runs through their proxy (*.apps.whop.com)
 */
async function authenticateFromWhopHeaders(
  whopUserId: string,
  whopMembershipId: string | null,
  whopCompanyId: string | null
): Promise<{ creator: WhopCreatorContext | null; error: NextResponse | null }> {
  try {
    // Look up creator in database by Whop user ID
    const supabase = createClient();
    const { data: creator, error: dbError } = await supabase
      .from('creators')
      .select('id, whop_user_id, email, current_plan, membership_id, membership_valid')
      .eq('whop_user_id', whopUserId)
      .single();

    if (dbError || !creator) {
      // Creator doesn't exist yet - create it
      console.log(`[Auth] Creating new creator for Whop user ${whopUserId}`);

      // Fetch user info from Whop API using app API key
      const userResponse = await whopApi.users.getUser(whopUserId);

      if (!userResponse.ok) {
        console.error('[Auth] Failed to fetch Whop user:', userResponse.error);
        return {
          creator: null,
          error: NextResponse.json(
            { error: 'Unauthorized', message: 'Failed to verify Whop user' },
            { status: 401 }
          ),
        };
      }

      const whopUser = userResponse.user;

      // Determine plan tier from membership
      let planTier = 'basic';
      if (whopMembershipId) {
        const membershipResponse = await whopApi.memberships.getMembership(whopMembershipId);
        if (membershipResponse.ok) {
          planTier = extractPlanTier(membershipResponse.membership);
        }
      }

      const newCreatorData = {
        whop_user_id: whopUserId,
        email: whopUser.email || '',
        company_name: whopUser.username || 'New Creator',
        current_plan: planTier,
        membership_id: whopMembershipId,
        membership_valid: !!whopMembershipId,
        subscription_tier: planTier,
        settings: {},
      };

      const { data: newCreator, error: insertError } = await supabase
        .from('creators')
        .insert(newCreatorData)
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

      return {
        creator: {
          creatorId: newCreator.id,
          whopUserId,
          email: whopUser.email || '',
          accessToken: 'proxy_auth', // Not using OAuth in proxy mode
          membershipId: whopMembershipId || undefined,
          membershipValid: !!whopMembershipId,
          currentPlan: planTier,
        },
        error: null,
      };
    }

    // Return existing creator
    return {
      creator: {
        creatorId: creator.id,
        whopUserId: creator.whop_user_id,
        email: creator.email || '',
        accessToken: 'proxy_auth', // Not using OAuth in proxy mode
        membershipId: creator.membership_id || undefined,
        membershipValid: creator.membership_valid,
        currentPlan: creator.current_plan || 'basic',
      },
      error: null,
    };
  } catch (error) {
    console.error('[Auth] Proxy header authentication error:', error);
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
 * Get authenticated creator from Whop proxy headers or OAuth cookie
 * Supports both embedded (proxy headers) and standalone (OAuth) contexts
 */
export async function getAuthenticatedCreator(
  req: NextRequest
): Promise<{ creator: WhopCreatorContext | null; error: NextResponse | null }> {
  try {
    // Check for Whop proxy headers first (when embedded in Whop)
    const whopUserId = req.headers.get('x-whop-user-id');
    const whopMembershipId = req.headers.get('x-whop-membership-id');
    const whopCompanyId = req.headers.get('x-whop-company-id');

    // If running through Whop's proxy (*.apps.whop.com), use headers
    if (whopUserId) {
      console.log('[Auth] Using Whop proxy headers for authentication');
      return await authenticateFromWhopHeaders(whopUserId, whopMembershipId, whopCompanyId);
    }

    // Otherwise, fall back to OAuth cookie authentication
    console.log('[Auth] Using OAuth cookie for authentication');
    const accessToken = req.cookies.get('whop_access_token')?.value;
    const cookieWhopUserId = req.cookies.get('whop_user_id')?.value;

    console.log('🍪 [Auth] Cookie check:', {
      hasAccessToken: !!accessToken,
      hasWhopUserId: !!cookieWhopUserId,
      accessTokenLength: accessToken?.length || 0,
      allCookies: req.cookies.getAll().map(c => c.name),
    });

    if (!accessToken) {
      console.log('❌ [Auth] No access token cookie found - returning 401');
      return {
        creator: null,
        error: NextResponse.json(
          { error: 'Unauthorized', message: 'No session found. Please sign in.' },
          { status: 401 }
        ),
      };
    }

    // Verify token with Whop API
    const userResponse = await whopApi.users.getCurrentUser({
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!userResponse.ok) {
      // Token is invalid or expired
      return {
        creator: null,
        error: NextResponse.json(
          { error: 'Unauthorized', message: 'Session expired. Please sign in again.' },
          { status: 401 }
        ),
      };
    }

    const whopUser = userResponse.user;

    // Get user's memberships to determine plan
    const membershipsResponse = await whopApi.memberships.listMemberships({
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    const memberships = membershipsResponse.ok ? membershipsResponse.memberships : [];
    const activeMembership = memberships.find(
      (m: any) => m.valid && m.status === 'active'
    );

    // Look up creator in database
    const supabase = createClient();
    const { data: creator, error: dbError } = await supabase
      .from('creators')
      .select('id, whop_user_id, email, current_plan, membership_id, membership_valid')
      .eq('whop_user_id', whopUser.id)
      .single();

    if (dbError || !creator) {
      // Creator doesn't exist yet - this should have been created during OAuth
      // Create it now as a fallback
      const newCreatorData = {
        whop_user_id: whopUser.id,
        email: whopUser.email || '',
        company_name: whopUser.username || 'New Creator',
        current_plan: activeMembership ? extractPlanTier(activeMembership) : 'basic',
        membership_id: activeMembership?.id,
        membership_valid: !!activeMembership?.valid,
        subscription_tier: activeMembership ? extractPlanTier(activeMembership) : 'basic',
        settings: {},
      };

      const { data: newCreator, error: insertError } = await supabase
        .from('creators')
        .insert(newCreatorData)
        .select('id, whop_user_id, email, current_plan, membership_id, membership_valid')
        .single();

      if (insertError || !newCreator) {
        console.error('Failed to create creator:', insertError);
        return {
          creator: null,
          error: NextResponse.json(
            { error: 'Internal Server Error', message: 'Failed to create user account' },
            { status: 500 }
          ),
        };
      }

      return {
        creator: {
          creatorId: newCreator.id,
          whopUserId: whopUser.id,
          email: whopUser.email || '',
          accessToken,
          membershipId: activeMembership?.id,
          membershipValid: !!activeMembership?.valid,
          currentPlan: newCreator.current_plan || 'basic',
        },
        error: null,
      };
    }

    // Return existing creator
    return {
      creator: {
        creatorId: creator.id,
        whopUserId: creator.whop_user_id,
        email: creator.email || '',
        accessToken,
        membershipId: creator.membership_id,
        membershipValid: creator.membership_valid,
        currentPlan: creator.current_plan || 'basic',
      },
      error: null,
    };
  } catch (error) {
    console.error('Authentication error:', error);
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
 * Use this to protect API routes
 */
export async function requireAuth(
  req: NextRequest,
  handler: (req: NextRequest, creator: WhopCreatorContext) => Promise<NextResponse>
): Promise<NextResponse> {
  const { creator, error } = await getAuthenticatedCreator(req);

  if (error) {
    return error;
  }

  if (!creator) {
    return NextResponse.json(
      { error: 'Unauthorized', message: 'Authentication required' },
      { status: 401 }
    );
  }

  return handler(req, creator);
}

/**
 * Extract plan tier from membership
 * Matches logic from WhopPlanChecker
 */
function extractPlanTier(membership: any): string {
  const plan = membership.plan || {};
  const planName = (plan.name || '').toLowerCase();

  if (planName.includes('enterprise')) return 'enterprise';
  if (planName.includes('pro') || planName.includes('professional')) return 'pro';
  if (planName.includes('basic') || planName.includes('starter')) return 'basic';

  // Default to basic
  return 'basic';
}

/**
 * Development mode bypass for testing
 * Only works in development environment
 */
export async function getAuthenticatedCreatorDev(
  req: NextRequest
): Promise<{ creator: WhopCreatorContext | null; error: NextResponse | null }> {
  if (process.env.NODE_ENV !== 'development') {
    return getAuthenticatedCreator(req);
  }

  // Check if dev mode is requested
  const { searchParams } = new URL(req.url);
  const devCreatorId = searchParams.get('creatorId');

  if (!devCreatorId) {
    return getAuthenticatedCreator(req);
  }

  // Return mock creator for development
  const supabase = createClient();
  const { data: creator } = await supabase
    .from('creators')
    .select('id, whop_user_id, email, current_plan, membership_id, membership_valid')
    .eq('id', devCreatorId)
    .single();

  if (!creator) {
    return {
      creator: null,
      error: NextResponse.json(
        { error: 'Not Found', message: 'Dev creator not found' },
        { status: 404 }
      ),
    };
  }

  return {
    creator: {
      creatorId: creator.id,
      whopUserId: creator.whop_user_id,
      email: creator.email || '',
      accessToken: 'dev_token',
      membershipId: creator.membership_id,
      membershipValid: creator.membership_valid,
      currentPlan: creator.current_plan || 'basic',
    },
    error: null,
  };
}

/**
 * Server-side helper to get creator from cookies (for Server Components)
 * Use this in Server Components that need creator info
 */
export async function getServerSideCreator(): Promise<WhopCreatorContext | null> {
  try {
    const { cookies } = await import('next/headers');
    const cookieStore = cookies();
    const accessToken = cookieStore.get('whop_access_token')?.value;

    if (!accessToken) {
      return null;
    }

    // Verify token with Whop API
    const userResponse = await whopApi.users.getCurrentUser({
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!userResponse.ok) {
      return null;
    }

    const whopUser = userResponse.user;

    // Get creator from database
    const supabase = createClient();
    const { data: creator } = await supabase
      .from('creators')
      .select('id, whop_user_id, email, current_plan, membership_id, membership_valid')
      .eq('whop_user_id', whopUser.id)
      .single();

    if (!creator) {
      return null;
    }

    return {
      creatorId: creator.id,
      whopUserId: creator.whop_user_id,
      email: creator.email || '',
      accessToken,
      membershipId: creator.membership_id,
      membershipValid: creator.membership_valid,
      currentPlan: creator.current_plan || 'basic',
    };
  } catch (error) {
    console.error('Error getting server-side creator:', error);
    return null;
  }
}
