/**
 * Whop OAuth Login Endpoint
 *
 * Initiates OAuth 2.0 flow with Whop using SDK
 * Agent: Agent 14 (Whop Integration Specialist)
 */

import { NextRequest, NextResponse } from 'next/server';
import { WhopServerSdk } from '@whop/api';

// Initialize Whop SDK
const whopApi = WhopServerSdk({
  appApiKey: process.env.WHOP_API_KEY!,
  appId: process.env.NEXT_PUBLIC_WHOP_APP_ID!,
});

export async function GET(req: NextRequest) {
  try {
    const WHOP_OAUTH_REDIRECT_URI = process.env.WHOP_OAUTH_REDIRECT_URI;

    if (!WHOP_OAUTH_REDIRECT_URI) {
      throw new Error('Missing Whop OAuth redirect URI');
    }

    // Use Whop SDK to get authorization URL
    const { url, state } = whopApi.oauth.getAuthorizationUrl({
      redirectUri: WHOP_OAUTH_REDIRECT_URI,
      scope: ['read_user'],
    });

    // Store state in cookie for verification
    const response = NextResponse.redirect(url);
    response.cookies.set('whop_oauth_state', state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 600, // 10 minutes
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Whop OAuth login error:', error);
    return NextResponse.json(
      { error: 'Failed to initiate OAuth flow' },
      { status: 500 }
    );
  }
}
