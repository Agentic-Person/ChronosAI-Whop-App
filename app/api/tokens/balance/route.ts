/**
 * GET /api/tokens/balance
 * Get current CHRONOS balance for authenticated user
 */

import { NextRequest, NextResponse } from 'next/server';
import { WalletService } from '@/lib/tokens';
import { createClient } from '@/lib/utils/supabase-client';

export async function GET(req: NextRequest) {
  try {
    const supabase = createClient();

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get student ID
    const { data: student } = await supabase
      .from('students')
      .select('id')
      .eq('whop_user_id', user.id)
      .single();

    if (!student) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 });
    }

    // Get wallet stats
    const stats = await WalletService.getWalletStats(student.id);

    return NextResponse.json(stats);
  } catch (error) {
    console.error('Get balance error:', error);
    return NextResponse.json(
      {
        error: 'Failed to get balance',
        details: (error as Error).message,
      },
      { status: 500 }
    );
  }
}
