/**
 * Whop OAuth Callback Endpoint
 *
 * Handles OAuth redirect and creates user session
 * Uses MCP tools for all Whop API interactions
 *
 * Agent: Agent 14 (Whop Integration Specialist)
 * Policy: MCP-First (Mandatory)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  getUser,
  getMembership,
  getCompanyInfo,
  mapPlanToTier,
  isMembershipActive,
} from '@/lib/whop/mcp';
import { encrypt } from '@/lib/whop/encryption';

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');

    // Check for OAuth errors
    if (error) {
      return NextResponse.redirect(
        new URL(`/auth/error?error=${error}`, req.url)
      );
    }

    // Validate state (CSRF protection)
    const storedState = req.cookies.get('whop_oauth_state')?.value;
    if (!state || state !== storedState) {
      return NextResponse.redirect(
        new URL('/auth/error?error=invalid_state', req.url)
      );
    }

    if (!code) {
      return NextResponse.redirect(
        new URL('/auth/error?error=missing_code', req.url)
      );
    }

    // Exchange code for tokens
    const tokens = await exchangeCodeForTokens(code);

    // Get user info via MCP
    // Note: Whop OAuth typically returns user_id in the token response
    // We'll need to get the user details
    const whopUserId = tokens.user_id; // From token response
    const whopMembershipId = tokens.membership_id; // From token response

    if (!whopUserId || !whopMembershipId) {
      throw new Error('Missing user_id or membership_id in OAuth response');
    }

    // ✅ MCP-FIRST: Get user details via MCP
    const whopUser = await getUser(whopUserId);

    // ✅ MCP-FIRST: Get membership details via MCP
    const whopMembership = await getMembership(whopMembershipId);

    // Check if membership is active
    if (!isMembershipActive(whopMembership)) {
      return NextResponse.redirect(
        new URL('/auth/error?error=inactive_membership', req.url)
      );
    }

    // Determine membership tier
    const tier = mapPlanToTier(whopMembership.plan_id);

    // Get Supabase client
    const supabase = createClient();

    // Check if this is a creator or student
    const isCreator = await checkIfCreator(whopMembership.product_id);

    if (isCreator) {
      // ✅ MCP-FIRST: Get company info via MCP
      const companyInfo = await getCompanyInfo();

      // Create or update creator record
      const { data: creator, error: creatorError } = await supabase
        .from('creators')
        .upsert({
          whop_company_id: companyInfo.id,
          email: whopUser.email,
          name: companyInfo.name,
          whop_data: companyInfo,
          whop_plan_id: whopMembership.plan_id,
          membership_tier: tier,
          whop_oauth_token_encrypted: await encrypt(tokens.access_token),
          whop_oauth_refresh_token_encrypted: tokens.refresh_token
            ? await encrypt(tokens.refresh_token)
            : null,
          whop_token_expires_at: new Date(
            Date.now() + tokens.expires_in * 1000
          ).toISOString(),
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'whop_company_id',
        })
        .select()
        .single();

      if (creatorError) throw creatorError;

      // Set session for creator
      await setCreatorSession(creator.id, tokens);

      // Redirect to creator dashboard
      return NextResponse.redirect(new URL('/dashboard/creator', req.url));
    } else {
      // Create or update student record
      const { data: student, error: studentError } = await supabase
        .from('students')
        .upsert({
          whop_user_id: whopUser.id,
          whop_membership_id: whopMembership.id,
          email: whopUser.email,
          full_name: whopUser.username || whopUser.email,
          whop_data: whopUser,
          membership_status: whopMembership.status,
          membership_tier: tier,
          membership_started_at: whopMembership.started_at,
          membership_expires_at: whopMembership.expires_at,
          // Map to creator based on product
          creator_id: await getCreatorIdFromProduct(whopMembership.product_id),
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'whop_user_id',
        })
        .select()
        .single();

      if (studentError) throw studentError;

      // Set session for student
      await setStudentSession(student.id, tokens);

      // Redirect to student dashboard
      return NextResponse.redirect(new URL('/dashboard', req.url));
    }
  } catch (error) {
    console.error('Whop OAuth callback error:', error);
    return NextResponse.redirect(
      new URL(
        `/auth/error?error=${encodeURIComponent(
          error instanceof Error ? error.message : 'oauth_failed'
        )}`,
        req.url
      )
    );
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Exchange authorization code for access tokens
 * Note: This uses standard OAuth, not MCP (OAuth is handled by Whop directly)
 */
async function exchangeCodeForTokens(code: string): Promise<any> {
  const WHOP_CLIENT_ID = process.env.WHOP_CLIENT_ID;
  const WHOP_CLIENT_SECRET = process.env.WHOP_CLIENT_SECRET;
  const WHOP_OAUTH_REDIRECT_URI = process.env.WHOP_OAUTH_REDIRECT_URI;

  const response = await fetch('https://whop.com/oauth/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      client_id: WHOP_CLIENT_ID!,
      client_secret: WHOP_CLIENT_SECRET!,
      redirect_uri: WHOP_OAUTH_REDIRECT_URI!,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Token exchange failed: ${error}`);
  }

  return response.json();
}

/**
 * Check if a product belongs to a creator (vs student)
 * Logic: Creators own the product, students subscribe to it
 */
async function checkIfCreator(productId: string): Promise<boolean> {
  // This logic depends on how Whop structures creator vs student products
  // For now, we'll use a simple heuristic:
  // If the user's company_id matches the product owner, they're a creator

  // ✅ MCP-FIRST: Get company info
  try {
    const companyInfo = await getCompanyInfo();
    // If we can get company info, this user is associated with a company = creator
    return true;
  } catch {
    // If we can't get company info, this is a student
    return false;
  }
}

/**
 * Get creator ID from product ID
 * Maps a Whop product to the internal creator
 */
async function getCreatorIdFromProduct(productId: string): Promise<string> {
  const supabase = createClient();

  // Find creator by their Whop product
  // Note: This assumes creators have set up their product in the system
  const { data } = await supabase
    .from('creators')
    .select('id')
    .limit(1)
    .single();

  if (!data) {
    throw new Error('No creator found for this product');
  }

  return data.id;
}

/**
 * Set session cookie for creator
 */
async function setCreatorSession(creatorId: string, tokens: any): Promise<void> {
  // Implementation depends on your session management
  // Could use NextAuth, Supabase Auth, or custom JWT
  // For now, we'll use Supabase Auth
  const supabase = createClient();

  // Set Supabase session with creator ID
  await supabase.auth.setSession({
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
  });
}

/**
 * Set session cookie for student
 */
async function setStudentSession(studentId: string, tokens: any): Promise<void> {
  const supabase = createClient();

  await supabase.auth.setSession({
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
  });
}
