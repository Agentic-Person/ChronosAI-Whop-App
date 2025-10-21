/**
 * Discord Account Linking Route (via verification code)
 *
 * Links a Discord account to a student account using a verification code.
 * Used with the /connect command in Discord.
 *
 * ENTERPRISE TIER ONLY
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { withFeatureGate } from '@/lib/middleware/feature-gate';
import { Feature } from '@/lib/features/types';

/**
 * POST /api/discord/link
 * Body: { discord_id, discord_username, verification_code }
 */
export const POST = withFeatureGate(
  { feature: Feature.FEATURE_DISCORD_INTEGRATION },
  async (request: NextRequest) => {
    try {
      const body = await request.json();
      const { discord_id, discord_username, verification_code } = body;

      if (!discord_id || !verification_code) {
        return NextResponse.json(
          { error: 'Missing required fields' },
          { status: 400 }
        );
      }

      const supabase = createClient();

      // Find verification code
      const { data: verificationData, error: verifyError } = await supabase
        .from('discord_verification_codes')
        .select('student_id, used, expires_at')
        .eq('code', verification_code.toUpperCase())
        .single();

      if (verifyError || !verificationData) {
        return NextResponse.json(
          { error: 'Invalid or expired verification code' },
          { status: 404 }
        );
      }

      // Check if code is already used
      if (verificationData.used) {
        return NextResponse.json(
          { error: 'Verification code already used' },
          { status: 400 }
        );
      }

      // Check if code is expired
      if (new Date(verificationData.expires_at) < new Date()) {
        return NextResponse.json(
          { error: 'Verification code expired' },
          { status: 400 }
        );
      }

      // Check if Discord account is already linked
      const { data: existingIntegration } = await supabase
        .from('discord_integrations')
        .select('student_id')
        .eq('discord_user_id', discord_id)
        .single();

      if (existingIntegration) {
        return NextResponse.json(
          { error: 'Discord account already linked to another student' },
          { status: 400 }
        );
      }

      // Create Discord integration
      const { error: integrationError } = await supabase
        .from('discord_integrations')
        .insert({
          student_id: verificationData.student_id,
          discord_user_id: discord_id,
          discord_username,
          guild_joined_at: new Date().toISOString(),
        });

      if (integrationError) {
        console.error('Failed to create integration:', integrationError);
        return NextResponse.json(
          { error: 'Failed to link account' },
          { status: 500 }
        );
      }

      // Update student with Discord ID
      await supabase
        .from('students')
        .update({ discord_id })
        .eq('id', verificationData.student_id);

      // Mark verification code as used
      await supabase
        .from('discord_verification_codes')
        .update({
          used: true,
          used_at: new Date().toISOString(),
        })
        .eq('code', verification_code.toUpperCase());

      // Get student info to return
      const { data: student } = await supabase
        .from('students')
        .select('id, name, email')
        .eq('id', verificationData.student_id)
        .single();

      return NextResponse.json({
        success: true,
        message: 'Discord account linked successfully',
        student: {
          id: student?.id,
          name: student?.name,
        },
      });
    } catch (error: any) {
      console.error('Discord link error:', error);
      return NextResponse.json(
        { error: 'Internal server error', details: error.message },
        { status: 500 }
      );
    }
  }
);

/**
 * GET /api/discord/link
 * Generate a verification code for the current user
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = createClient();

    // Get current user
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    // Get student
    const { data: student } = await supabase
      .from('students')
      .select('id')
      .eq('whop_user_id', user.id)
      .single();

    if (!student) {
      return NextResponse.json(
        { error: 'Student not found' },
        { status: 404 }
      );
    }

    // Generate verification code
    const { data: codeData, error: codeError } = await supabase.rpc(
      'generate_discord_verification_code'
    );

    if (codeError || !codeData) {
      return NextResponse.json(
        { error: 'Failed to generate code' },
        { status: 500 }
      );
    }

    const code = codeData;

    // Insert verification code
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    await supabase.from('discord_verification_codes').insert({
      code,
      student_id: student.id,
      expires_at: expiresAt.toISOString(),
    });

    return NextResponse.json({
      code,
      expires_at: expiresAt.toISOString(),
      instructions: 'Use /connect <code> in Discord to link your account',
    });
  } catch (error: any) {
    console.error('Generate code error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
