/**
 * Whop OAuth Callback Endpoint
 *
 * Handles OAuth redirect and creates user session
 * Uses Whop SDK directly for OAuth (not MCP - MCP is for AI development assistance only)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// OAuth configuration
const WHOP_CLIENT_ID = process.env.WHOP_CLIENT_ID!;
const WHOP_CLIENT_SECRET = process.env.WHOP_CLIENT_SECRET!;
const WHOP_OAUTH_REDIRECT_URI = process.env.WHOP_OAUTH_REDIRECT_URI!;

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');

    // Check for OAuth errors
    if (error) {
      console.error('Whop OAuth error:', error);
      return NextResponse.redirect(
        new URL(`/?error=${error}`, req.url)
      );
    }

    // Validate state (CSRF protection)
    const storedState = req.cookies.get('whop_oauth_state')?.value;
    if (!state || state !== storedState) {
      console.error('OAuth state mismatch');
      return NextResponse.redirect(
        new URL('/?error=invalid_state', req.url)
      );
    }

    if (!code) {
      console.error('Missing OAuth code');
      return NextResponse.redirect(
        new URL('/?error=missing_code', req.url)
      );
    }

    // Exchange the authorization code for an access token using direct API call
    const tokenResponse = await fetch('https://api.whop.com/v5/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_id: WHOP_CLIENT_ID,
        client_secret: WHOP_CLIENT_SECRET,
        code,
        redirect_uri: WHOP_OAUTH_REDIRECT_URI,
        grant_type: 'authorization_code',
      }),
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.text();
      console.error('Code exchange failed:', tokenResponse.status, errorData);
      throw new Error('Failed to exchange code for token');
    }

    const tokenData = await tokenResponse.json();
    const access_token = tokenData.access_token;

    if (!access_token) {
      console.error('No access token in response:', tokenData);
      throw new Error('No access token received');
    }

    console.log('Whop OAuth successful, access token received');

    // Redirect to dashboard with the access token stored in a cookie
    const response = NextResponse.redirect(new URL('/dashboard', req.url));

    // Store the access token in a secure cookie
    // WARNING: This is a simplified implementation for development
    // In production, you should encrypt the token and/or use server-side session storage
    response.cookies.set('whop_access_token', access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/',
    });

    // Clear the OAuth state cookie
    response.cookies.delete('whop_oauth_state');

    return response;

  } catch (error) {
    console.error('Whop OAuth callback error:', error);
    return NextResponse.redirect(
      new URL(
        `/?error=${encodeURIComponent(
          error instanceof Error ? error.message : 'oauth_failed'
        )}`,
        req.url
      )
    );
  }
}
