/**
 * POST /api/tokens/spend
 * Spend CHRONOS tokens on in-platform items
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/utils/supabase-client';
import type { SpendTokensRequest } from '@/types/tokens';

export async function POST(req: NextRequest) {
  try {
    const supabase = createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: student } = await supabase
      .from('students')
      .select('id')
      .eq('whop_user_id', user.id)
      .single();

    if (!student) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 });
    }

    const body: SpendTokensRequest = await req.json();
    const { amount, item_type, item_id, metadata = {} } = body;

    if (!amount || !item_type) {
      return NextResponse.json(
        { error: 'Missing required fields: amount, item_type' },
        { status: 400 }
      );
    }

    // Use database function to spend tokens
    const { data: newBalance, error } = await supabase.rpc('spend_tokens', {
      p_student_id: student.id,
      p_amount: amount,
      p_source: item_type,
      p_source_id: item_id || null,
      p_metadata: metadata,
    });

    if (error) {
      throw error;
    }

    return NextResponse.json({
      transaction_id: item_id || 'spent',
      new_balance: newBalance,
      item_unlocked: {
        type: item_type,
        name: metadata.item_name || item_type,
        id: item_id || '',
      },
    });
  } catch (error) {
    console.error('Spend tokens error:', error);
    return NextResponse.json(
      { error: 'Failed to spend tokens', details: (error as Error).message },
      { status: 500 }
    );
  }
}
