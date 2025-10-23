/**
 * Whop OAuth Login Endpoint
 *
 * Initiates OAuth 2.0 flow with Whop
 * Agent: Agent 14 (Whop Integration Specialist)
 */

import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    const WHOP_CLIENT_ID = process.env.WHOP_CLIENT_ID;
    const WHOP_OAUTH_REDIRECT_URI = process.env.WHOP_OAUTH_REDIRECT_URI;

    if (!WHOP_CLIENT_ID || !WHOP_OAUTH_REDIRECT_URI) {
      throw new Error('Missing Whop OAuth configuration');
    }

    // Generate state for CSRF protection
    const state = crypto.randomUUID();

    // Build Whop OAuth URL
    const whopAuthUrl = new URL('https://whop.com/oauth');
    whopAuthUrl.searchParams.set('client_id', WHOP_CLIENT_ID);
    whopAuthUrl.searchParams.set('redirect_uri', WHOP_OAUTH_REDIRECT_URI);
    whopAuthUrl.searchParams.set('response_type', 'code');
    whopAuthUrl.searchParams.set('scope', 'openid profile email');
    whopAuthUrl.searchParams.set('state', state);

    // Store state in cookie for verification
    const response = NextResponse.redirect(whopAuthUrl.toString());
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
