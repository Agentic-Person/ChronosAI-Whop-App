/**
 * Discord OAuth Callback Route
 *
 * Handles the OAuth callback from Discord after user authorization.
 * Exchanges code for tokens, gets user info, and links account.
 */

import { NextRequest, NextResponse } from 'next/server';
import { DiscordOAuthService } from '@/lib/discord/oauth-service';
import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state');

  // Verify state (CSRF protection)
  const storedState = cookies().get('discord_oauth_state')?.value;
  if (!state || state !== storedState) {
    return NextResponse.redirect(
      new URL('/dashboard?error=invalid_state', request.url)
    );
  }

  // Clear state cookie
  cookies().delete('discord_oauth_state');

  if (!code) {
    return NextResponse.redirect(
      new URL('/dashboard?error=no_code', request.url)
    );
  }

  const oauthService = new DiscordOAuthService();
  const supabase = createClient();

  try {
    // Exchange code for tokens
    const tokens = await oauthService.exchangeCodeForTokens(code);

    // Get user info
    const discordUser = await oauthService.getUserInfo(tokens.access_token);

    // Add user to Discord server
    await oauthService.addGuildMember(discordUser.id, tokens.access_token);

    // Check if Discord integration exists
    const { data: existingIntegration } = await supabase
      .from('discord_integrations')
      .select('student_id, students(*)')
      .eq('discord_user_id', discordUser.id)
      .single();

    if (existingIntegration) {
      // Update existing integration
      await supabase
        .from('discord_integrations')
        .update({
          discord_username: discordUser.username,
          discord_avatar: discordUser.avatar,
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token,
          token_expires_at: new Date(
            Date.now() + tokens.expires_in * 1000
          ).toISOString(),
          guild_joined_at: new Date().toISOString(),
        })
        .eq('discord_user_id', discordUser.id);

      // Update student discord_id
      await supabase
        .from('students')
        .update({ discord_id: discordUser.id })
        .eq('id', existingIntegration.student_id);

      return NextResponse.redirect(
        new URL('/dashboard?discord=linked', request.url)
      );
    } else {
      // Check if there's a student session (user already logged in)
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        // No user session - need to link via verification code
        return NextResponse.redirect(
          new URL('/dashboard?error=no_session', request.url)
        );
      }

      // Get student from user
      const { data: student } = await supabase
        .from('students')
        .select('id')
        .eq('whop_user_id', user.id)
        .single();

      if (!student) {
        return NextResponse.redirect(
          new URL('/dashboard?error=student_not_found', request.url)
        );
      }

      // Create new Discord integration
      await supabase.from('discord_integrations').insert({
        student_id: student.id,
        discord_user_id: discordUser.id,
        discord_username: discordUser.username,
        discord_avatar: discordUser.avatar,
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        token_expires_at: new Date(
          Date.now() + tokens.expires_in * 1000
        ).toISOString(),
        guild_joined_at: new Date().toISOString(),
      });

      // Update student discord_id
      await supabase
        .from('students')
        .update({ discord_id: discordUser.id })
        .eq('id', student.id);

      return NextResponse.redirect(
        new URL('/dashboard?discord=linked', request.url)
      );
    }
  } catch (error: any) {
    console.error('Discord OAuth callback error:', error);
    return NextResponse.redirect(
      new URL('/dashboard?error=oauth_failed', request.url)
    );
  }
}
