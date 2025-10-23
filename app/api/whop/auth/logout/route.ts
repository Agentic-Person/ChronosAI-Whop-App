/**
 * Whop OAuth Logout Endpoint
 *
 * Clears user session and redirects to home
 * Agent: Agent 14 (Whop Integration Specialist)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  try {
    const supabase = createClient();

    // Sign out from Supabase
    await supabase.auth.signOut();

    // Clear session cookies
    const response = NextResponse.json({ success: true });

    response.cookies.delete('whop_oauth_state');
    response.cookies.delete('supabase-auth-token');

    return response;
  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json(
      { error: 'Logout failed' },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  // Allow GET for convenience (redirect after logout)
  await POST(req);
  return NextResponse.redirect(new URL('/', req.url));
}
