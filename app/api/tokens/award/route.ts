/**
 * POST /api/tokens/award
 * Award CHRONOS tokens to a student (internal service use only)
 * Requires service role key for authentication
 */

import { NextRequest, NextResponse } from 'next/server';
import { RewardEngine } from '@/lib/tokens';
import type { AwardTokensRequest } from '@/types/tokens';

export async function POST(req: NextRequest) {
  try {
    // Verify service role key
    const authHeader = req.headers.get('authorization');
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!authHeader || !authHeader.includes(serviceKey || '')) {
      return NextResponse.json(
        { error: 'Unauthorized - Service role key required' },
        { status: 401 }
      );
    }

    // Parse request body
    const body: AwardTokensRequest = await req.json();

    const { student_id, amount, source, source_id, metadata = {} } = body;

    // Validate required fields
    if (!student_id || !amount || !source) {
      return NextResponse.json(
        {
          error: 'Missing required fields',
          required: ['student_id', 'amount', 'source'],
        },
        { status: 400 }
      );
    }

    // Award tokens using reward engine
    const result = await RewardEngine.awardDualRewards(
      student_id,
      source as any,
      {
        ...metadata,
        source_id,
      }
    );

    return NextResponse.json(
      {
        transaction_id: result.blox_transaction_id,
        new_balance: result.new_blox_balance,
        xp_awarded: result.xp_amount,
        blox_awarded: result.blox_amount,
        level_up: result.level_up,
        new_level: result.new_level,
        created_at: new Date().toISOString(),
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Award tokens error:', error);
    return NextResponse.json(
      {
        error: 'Failed to award tokens',
        details: (error as Error).message,
      },
      { status: 500 }
    );
  }
}
