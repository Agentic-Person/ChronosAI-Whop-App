/**
 * GET /api/tokens/transactions
 * Get transaction history for authenticated user
 * Supports filtering by type, pagination
 */

import { NextRequest, NextResponse } from 'next/server';
import { WalletService } from '@/lib/tokens';
import { createClient } from '@/lib/utils/supabase-client';
import type { TransactionHistoryParams } from '@/types/tokens';

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

    // Parse query parameters
    const searchParams = req.nextUrl.searchParams;
    const params: TransactionHistoryParams = {
      type: (searchParams.get('type') as any) || undefined,
      limit: parseInt(searchParams.get('limit') || '20'),
      offset: parseInt(searchParams.get('offset') || '0'),
      start_date: searchParams.get('start_date') || undefined,
      end_date: searchParams.get('end_date') || undefined,
    };

    // Get transaction history
    const history = await WalletService.getTransactionHistory(
      student.id,
      params
    );

    return NextResponse.json(history);
  } catch (error) {
    console.error('Get transactions error:', error);
    return NextResponse.json(
      {
        error: 'Failed to get transactions',
        details: (error as Error).message,
      },
      { status: 500 }
    );
  }
}
