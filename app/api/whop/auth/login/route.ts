/**
 * Whop OAuth Login Endpoint
 *
 * Initiates OAuth 2.0 flow with Whop using SDK
 * Based on: https://docs.whop.com/apps/features/oauth-guide
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
    // Always build redirect URI dynamically from request URL (ignores env var for local dev)
    const requestUrl = new URL(req.url);
    const baseUrl = `${requestUrl.protocol}//${requestUrl.host}`;
    // Force localhost:3008 for local development, use env var only in production
    const redirectUri = process.env.NODE_ENV === 'production' 
      ? (process.env.WHOP_OAUTH_REDIRECT_URI || `${baseUrl}/api/whop/auth/callback`)
      : `${baseUrl}/api/whop/auth/callback`;

    console.log('🔑 [OAuth Login] Starting OAuth flow:', {
      requestUrl: req.url,
      redirectUri: redirectUri,
      nodeEnv: process.env.NODE_ENV,
    });

    // Use Whop SDK to get authorization URL
    const { url, state } = whopApi.oauth.getAuthorizationUrl({
      redirectUri: redirectUri,
      scope: ['read_user'],
    });

    // Determine cookie settings based on environment
    const isProduction = process.env.NODE_ENV === 'production';
    const isHttps = req.url.startsWith('https://');

    console.log('🍪 [OAuth Login] Setting state cookie:', {
      state: state.substring(0, 10) + '...',
      willUseSecure: isProduction || isHttps,
      willUseSameSite: (isProduction || isHttps) ? 'none' : 'lax',
    });

    // Store state in cookie for verification
    const response = NextResponse.redirect(url);
    response.cookies.set('whop_oauth_state', state, {
      httpOnly: true,
      secure: isProduction || isHttps, // Match callback cookie settings
      sameSite: (isProduction || isHttps) ? 'none' : 'lax', // 'none' needed for cross-site OAuth
      maxAge: 600, // 10 minutes
      path: '/',
    });

    console.log('✅ [OAuth Login] Redirecting to Whop OAuth');
    return response;
  } catch (error) {
    console.error('Whop OAuth login error:', error);
    return NextResponse.json(
      { error: 'Failed to initiate OAuth flow' },
      { status: 500 }
    );
  }
}