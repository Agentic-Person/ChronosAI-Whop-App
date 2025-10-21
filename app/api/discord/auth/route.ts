/**
 * Discord OAuth Initiation Route
 *
 * Starts the Discord OAuth flow by redirecting to Discord's authorization page.
 */

import { NextRequest, NextResponse } from 'next/server';
import { DiscordOAuthService } from '@/lib/discord/oauth-service';
import { cookies } from 'next/headers';
import crypto from 'crypto';

export async function GET(request: NextRequest) {
  try {
    const oauthService = new DiscordOAuthService();

    // Generate state for CSRF protection
    const state = crypto.randomBytes(16).toString('hex');

    // Store state in cookie (expires in 10 minutes)
    cookies().set('discord_oauth_state', state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 600, // 10 minutes
    });

    // Generate authorization URL
    const authUrl = oauthService.getAuthorizationUrl(state);

    // Redirect to Discord
    return NextResponse.redirect(authUrl);
  } catch (error: any) {
    console.error('Discord OAuth init error:', error);
    return NextResponse.json(
      { error: 'Failed to initialize Discord OAuth', details: error.message },
      { status: 500 }
    );
  }
}
