/**
 * POST /api/tokens/wallet/create
 * Create a new token wallet for a student
 * Auto-generates Solana keypair and encrypts private key
 */

import { NextRequest, NextResponse } from 'next/server';
import { WalletService } from '@/lib/tokens';
import { createClient } from '@/lib/utils/supabase-client';

export async function POST(req: NextRequest) {
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

    // Get student ID from authenticated user
    const { data: student } = await supabase
      .from('students')
      .select('id')
      .eq('whop_user_id', user.id)
      .single();

    if (!student) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 });
    }

    // Create wallet
    const wallet = await WalletService.createStudentWallet(student.id);

    return NextResponse.json(
      {
        wallet_id: wallet.id,
        solana_address: wallet.solana_address,
        balance: wallet.balance,
        created_at: wallet.last_synced_at,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Wallet creation error:', error);
    return NextResponse.json(
      {
        error: 'Failed to create wallet',
        details: (error as Error).message,
      },
      { status: 500 }
    );
  }
}
