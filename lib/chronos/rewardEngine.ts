/**
 * Simplified CHRONOS Reward Engine
 * Universal token system - students earn CHRONOS across all creators
 * Simple, engagement-based rewards for videos and chat
 */

import { createClient } from '@/lib/utils/supabase-client';

// ============================================================================
// Constants
// ============================================================================

export const REWARD_AMOUNTS = {
  VIDEO_COMPLETION: 100,
  CHAT_MESSAGE: 10,
  DAILY_STREAK: 50,
  WEEKLY_MILESTONE: 200,
  COURSE_COMPLETION: 500,
} as const;

// ============================================================================
// Core Reward Functions
// ============================================================================

/**
 * Award tokens for video completion
 * Universal - works across all creators
 */
export async function awardVideoCompletion(
  studentId: string,
  videoId: string,
  creatorId?: string
): Promise<{ balance: number; transactionId: string }> {
  const supabase = createClient();
  const amount = REWARD_AMOUNTS.VIDEO_COMPLETION;

  // Call database function to award tokens
  const { data, error } = await supabase.rpc('award_tokens', {
    p_student_id: studentId,
    p_amount: amount,
    p_source: 'video_complete',
    p_source_id: videoId,
    p_metadata: {
      video_id: videoId,
      creator_id: creatorId,
      timestamp: new Date().toISOString(),
    },
  });

  if (error) {
    console.error('Failed to award video completion tokens:', error);
    throw new Error('Failed to award tokens');
  }

  // Get updated balance
  const balance = await getBalance(studentId);

  return {
    balance,
    transactionId: videoId, // Using video ID as reference
  };
}

/**
 * Award tokens for asking a question in chat
 * Encourages engagement and learning
 */
export async function awardChatMessage(
  studentId: string,
  creatorId: string,
  messageId: string
): Promise<{ balance: number; transactionId: string }> {
  const supabase = createClient();
  const amount = REWARD_AMOUNTS.CHAT_MESSAGE;

  // Call database function to award tokens
  const { data, error } = await supabase.rpc('award_tokens', {
    p_student_id: studentId,
    p_amount: amount,
    p_source: 'chat_message',
    p_source_id: messageId,
    p_metadata: {
      message_id: messageId,
      creator_id: creatorId,
      timestamp: new Date().toISOString(),
    },
  });

  if (error) {
    console.error('Failed to award chat message tokens:', error);
    throw new Error('Failed to award tokens');
  }

  // Get updated balance
  const balance = await getBalance(studentId);

  return {
    balance,
    transactionId: messageId,
  };
}

/**
 * Award streak bonus (7, 30, or 100 days)
 */
export async function awardDailyStreak(
  studentId: string,
  streakDays: number
): Promise<{ balance: number; transactionId: string }> {
  const supabase = createClient();
  const amount = REWARD_AMOUNTS.DAILY_STREAK;

  // Call database function to award tokens
  const { data, error } = await supabase.rpc('award_tokens', {
    p_student_id: studentId,
    p_amount: amount,
    p_source: 'streak_bonus',
    p_source_id: null,
    p_metadata: {
      streak_days: streakDays,
      timestamp: new Date().toISOString(),
    },
  });

  if (error) {
    console.error('Failed to award streak bonus:', error);
    throw new Error('Failed to award streak bonus');
  }

  // Get updated balance
  const balance = await getBalance(studentId);

  return {
    balance,
    transactionId: `streak-${streakDays}`,
  };
}

/**
 * Get student's current CHRONOS balance
 */
export async function getBalance(studentId: string): Promise<number> {
  const supabase = createClient();

  const { data: wallet, error } = await supabase
    .from('token_wallets')
    .select('balance')
    .eq('student_id', studentId)
    .single();

  if (error || !wallet) {
    // Wallet doesn't exist yet, return 0
    return 0;
  }

  return wallet.balance || 0;
}

/**
 * Get transaction history for a student
 */
export async function getTransactionHistory(
  studentId: string,
  limit: number = 50,
  offset: number = 0
): Promise<{
  transactions: Array<{
    id: string;
    amount: number;
    type: string;
    source: string;
    source_id: string | null;
    metadata: Record<string, any>;
    created_at: string;
  }>;
  total: number;
  hasMore: boolean;
}> {
  const supabase = createClient();

  // Get transactions with count
  const { data: transactions, error, count } = await supabase
    .from('token_transactions')
    .select('*', { count: 'exact' })
    .eq('student_id', studentId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    console.error('Failed to fetch transaction history:', error);
    throw new Error('Failed to fetch transactions');
  }

  return {
    transactions: transactions || [],
    total: count || 0,
    hasMore: (count || 0) > offset + limit,
  };
}

/**
 * Get wallet statistics (total earned, spent, etc.)
 */
export async function getWalletStats(studentId: string): Promise<{
  balance: number;
  totalEarned: number;
  totalSpent: number;
  totalRedeemed: number;
}> {
  const supabase = createClient();

  const { data: wallet, error } = await supabase
    .from('token_wallets')
    .select('balance, total_earned, total_spent, total_redeemed')
    .eq('student_id', studentId)
    .single();

  if (error || !wallet) {
    return {
      balance: 0,
      totalEarned: 0,
      totalSpent: 0,
      totalRedeemed: 0,
    };
  }

  return {
    balance: wallet.balance || 0,
    totalEarned: wallet.total_earned || 0,
    totalSpent: wallet.total_spent || 0,
    totalRedeemed: wallet.total_redeemed || 0,
  };
}

// ============================================================================
// Export
// ============================================================================

export const RewardEngine = {
  awardVideoCompletion,
  awardChatMessage,
  awardDailyStreak,
  getBalance,
  getTransactionHistory,
  getWalletStats,
  REWARD_AMOUNTS,
};

export default RewardEngine;
