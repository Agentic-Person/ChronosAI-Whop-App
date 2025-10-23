/**
 * POST /api/tokens/sync
 * Sync on-chain Solana balance with database cache
 */

import { NextRequest, NextResponse } from 'next/server';
import { WalletService } from '@/lib/tokens';
import { createClient } from '@/lib/utils/supabase-client';

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

    // Get wallet
    const wallet = await WalletService.getWallet(student.id);
    if (!wallet) {
      return NextResponse.json({ error: 'Wallet not found' }, { status: 404 });
    }

    // Sync balance
    const onChainBalance = await WalletService.syncBalance(wallet.id);

    return NextResponse.json({
      on_chain_balance: onChainBalance,
      cached_balance: wallet.balance,
      synced_at: new Date().toISOString(),
      discrepancy: onChainBalance - wallet.balance,
    });
  } catch (error) {
    console.error('Sync balance error:', error);
    return NextResponse.json(
      { error: 'Failed to sync balance', details: (error as Error).message },
      { status: 500 }
    );
  }
}
