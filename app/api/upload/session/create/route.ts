import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import crypto from 'crypto';

export async function POST(req: NextRequest) {
  try {
    // PRODUCTION: Get creator ID from authenticated session
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Authentication required' },
        { status: 401 }
      );
    }

    // Get creator record from whop_user_id
    const { data: creator, error: creatorError } = await supabase
      .from('creators')
      .select('id')
      .eq('whop_user_id', user.id)
      .single();

    if (creatorError || !creator) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Creator account not found' },
        { status: 403 }
      );
    }

    const creatorId = creator.id;

    // Use admin client to bypass RLS for backend operations
    const adminClient = createAdminClient();

    // Generate unique session token
    const sessionToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes from now

    // Create session in database
    const { data: session, error } = await adminClient
      .from('upload_sessions')
      .insert({
        creator_id: creatorId,
        session_token: sessionToken,
        expires_at: expiresAt.toISOString(),
        is_active: true,
        uploaded_count: 0,
      })
      .select()
      .single();

    if (error) {
      console.error('Failed to create upload session:', error);
      return NextResponse.json(
        { error: 'Failed to create upload session' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      sessionToken,
      expiresAt: expiresAt.toISOString(),
      sessionId: session.id,
    });

  } catch (error) {
    console.error('Upload session creation error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
