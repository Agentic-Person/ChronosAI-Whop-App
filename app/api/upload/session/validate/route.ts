import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.json(
        { valid: false, error: 'Session token is required' },
        { status: 400 }
      );
    }

    // Use admin client to bypass RLS for session validation
    const supabase = createAdminClient();

    // Check if session exists, is active, and not expired
    const { data: session, error } = await supabase
      .from('upload_sessions')
      .select('*')
      .eq('session_token', token)
      .eq('is_active', true)
      .gte('expires_at', new Date().toISOString())
      .single();

    if (error || !session) {
      return NextResponse.json(
        { valid: false, error: 'Invalid or expired session' },
        { status: 401 }
      );
    }

    return NextResponse.json({
      valid: true,
      creatorId: session.creator_id,
      expiresAt: session.expires_at,
      uploadedCount: session.uploaded_count,
    });

  } catch (error) {
    console.error('Session validation error:', error);
    return NextResponse.json(
      { valid: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
