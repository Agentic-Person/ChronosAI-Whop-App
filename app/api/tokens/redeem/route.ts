/**
 * POST /api/tokens/redeem
 * Request real-world redemption of CHRONOS tokens
 */

import { NextRequest, NextResponse } from 'next/server';
import { RedemptionService, WalletService } from '@/lib/tokens';
import { createClient } from '@/lib/utils/supabase-client';
import type { RedeemTokensRequest } from '@/types/tokens';

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

    // Get student ID
    const { data: student } = await supabase
      .from('students')
      .select('id')
      .eq('whop_user_id', user.id)
      .single();

    if (!student) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 });
    }

    // Parse request body
    const body: RedeemTokensRequest = await req.json();
    const { amount, redemption_type, payout_details } = body;

    // Validate required fields
    if (!amount || !redemption_type || !payout_details) {
      return NextResponse.json(
        {
          error: 'Missing required fields',
          required: ['amount', 'redemption_type', 'payout_details'],
        },
        { status: 400 }
      );
    }

    // Create redemption request
    const request = await RedemptionService.createRedemptionRequest(
      student.id,
      amount,
      redemption_type,
      payout_details
    );

    // Calculate estimated processing time
    const estimatedProcessing =
      redemption_type === 'platform_credit'
        ? 'Instant'
        : redemption_type === 'gift_card'
          ? '1-2 business days'
          : '3-5 business days';

    return NextResponse.json(
      {
        request_id: request.id,
        status: request.status,
        amount: request.amount,
        usd_value: WalletService.calculateUsdValue(request.amount),
        estimated_processing: estimatedProcessing,
        created_at: request.created_at,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Redeem tokens error:', error);
    return NextResponse.json(
      {
        error: 'Failed to redeem tokens',
        details: (error as Error).message,
      },
      { status: 500 }
    );
  }
}
