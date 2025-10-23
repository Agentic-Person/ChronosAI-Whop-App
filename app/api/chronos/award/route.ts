/**
 * POST /api/chronos/award
 * Manually award CHRONOS tokens (internal/backend use only)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/utils/supabase-client';
import {
  awardVideoCompletion,
  awardChatMessage,
  awardDailyStreak,
} from '@/lib/chronos/rewardEngine';

export async function POST(request: NextRequest) {
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

    // Parse request body
    const body = await request.json();
    const { studentId, reason, metadata } = body;

    if (!studentId || !reason) {
      return NextResponse.json(
        { error: 'Missing required fields: studentId, reason' },
        { status: 400 }
      );
    }

    // Award tokens based on reason
    let result;

    switch (reason) {
      case 'video_completion':
        if (!metadata?.videoId) {
          return NextResponse.json(
            { error: 'videoId required for video_completion' },
            { status: 400 }
          );
        }
        result = await awardVideoCompletion(
          studentId,
          metadata.videoId,
          metadata.creatorId
        );
        break;

      case 'chat_message':
        if (!metadata?.messageId || !metadata?.creatorId) {
          return NextResponse.json(
            { error: 'messageId and creatorId required for chat_message' },
            { status: 400 }
          );
        }
        result = await awardChatMessage(
          studentId,
          metadata.creatorId,
          metadata.messageId
        );
        break;

      case 'daily_streak':
        if (!metadata?.streakDays) {
          return NextResponse.json(
            { error: 'streakDays required for daily_streak' },
            { status: 400 }
          );
        }
        result = await awardDailyStreak(studentId, metadata.streakDays);
        break;

      default:
        return NextResponse.json(
          { error: 'Invalid reason. Must be: video_completion, chat_message, or daily_streak' },
          { status: 400 }
        );
    }

    return NextResponse.json({
      success: true,
      balance: result.balance,
      transactionId: result.transactionId,
    });
  } catch (error) {
    console.error('Failed to award tokens:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
