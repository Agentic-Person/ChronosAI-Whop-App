/**
 * Chat Limits Service
 * Manages chat usage limits for different membership tiers
 * FREE tier: 3 questions total
 * BASIC tier: 100 questions per day
 * PRO tier: 500 questions per day
 * ENTERPRISE tier: Unlimited
 */

import { createClient } from '@/lib/supabase/server';
import { MembershipTier } from './types';

// ============================================================================
// TYPES
// ============================================================================

export interface ChatUsage {
  user_id: string;
  student_id?: string;
  creator_id?: string;
  tier: MembershipTier;
  questions_asked: number;
  questions_limit: number;
  daily_questions: number;
  daily_reset_at: string;
  last_question_at?: string;
  upgraded_at?: string;
}

export interface ChatUsageInfo {
  tier: MembershipTier;
  questions_asked: number;
  remaining: number;
  is_free_tier: boolean;
  upgrade_required: boolean;
  daily_limit?: number;
  daily_remaining?: number;
}

export interface ChatLimitCheckResult {
  allowed: boolean;
  usage: ChatUsageInfo;
  message?: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

export const CHAT_LIMITS = {
  FREE: 3,        // Total questions (not per day)
  BASIC: 100,     // Per day
  PRO: 500,       // Per day
  ENTERPRISE: -1, // Unlimited
} as const;

// ============================================================================
// CHAT LIMITS SERVICE
// ============================================================================

export class ChatLimitsService {
  /**
   * Get current chat usage for a user
   */
  static async getChatUsage(userId: string): Promise<ChatUsage | null> {
    const supabase = createClient();

    const { data, error } = await supabase
      .from('chat_usage')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error) {
      // No usage record means new user
      if (error.code === 'PGRST116') {
        return null;
      }
      console.error('[ChatLimits] Failed to get usage:', error);
      throw error;
    }

    return data;
  }

  /**
   * Check if user can send a chat message
   */
  static async checkChatLimit(userId: string): Promise<ChatLimitCheckResult> {
    // DEV MODE: Bypass chat limits in development
    if (process.env.NODE_ENV === 'development') {
      console.log('🔧 DEV MODE: Bypassing chat limits');
      return {
        allowed: true,
        usage: {
          tier: 'FREE',
          questions_asked: 0,
          remaining: 999,
          is_free_tier: true,
          upgrade_required: false,
        },
        message: 'Development mode - unlimited questions',
      };
    }

    const supabase = createClient();

    // Call database function
    const { data: allowed, error } = await supabase
      .rpc('check_chat_limit', { p_user_id: userId });

    if (error) {
      console.error('[ChatLimits] Failed to check limit:', error);
      throw error;
    }

    // Get current usage for detailed info
    const usage = await this.getChatUsage(userId);

    // If no usage record, this is a new FREE user
    if (!usage) {
      return {
        allowed: true,
        usage: {
          tier: 'FREE',
          questions_asked: 0,
          remaining: CHAT_LIMITS.FREE,
          is_free_tier: true,
          upgrade_required: false,
        },
        message: `Welcome! You have ${CHAT_LIMITS.FREE} free questions to try our AI chat.`,
      };
    }

    // Calculate remaining questions
    let remaining: number;
    let message: string | undefined;

    if (usage.tier === 'FREE') {
      remaining = Math.max(0, usage.questions_limit - usage.questions_asked);

      if (remaining === 0) {
        message = 'You have used all your free questions. Please upgrade to continue.';
      } else if (remaining === 1) {
        message = 'This is your last free question!';
      } else {
        message = `You have ${remaining} free questions remaining.`;
      }
    } else if (usage.tier === 'ENTERPRISE') {
      remaining = -1; // Unlimited
      message = 'Unlimited questions available.';
    } else {
      // BASIC or PRO - daily limits
      const dailyLimit = usage.tier === 'BASIC' ? CHAT_LIMITS.BASIC : CHAT_LIMITS.PRO;
      remaining = Math.max(0, dailyLimit - usage.daily_questions);

      if (remaining === 0) {
        message = `Daily limit reached (${dailyLimit} questions). Resets at midnight.`;
      } else if (remaining <= 5) {
        message = `${remaining} questions remaining today.`;
      }
    }

    return {
      allowed,
      usage: {
        tier: usage.tier as MembershipTier,
        questions_asked: usage.questions_asked,
        remaining,
        is_free_tier: usage.tier === 'FREE',
        upgrade_required: usage.tier === 'FREE' && remaining === 0,
        daily_limit: usage.tier === 'BASIC' ? CHAT_LIMITS.BASIC :
                     usage.tier === 'PRO' ? CHAT_LIMITS.PRO : undefined,
        daily_remaining: usage.tier !== 'FREE' && usage.tier !== 'ENTERPRISE' ? remaining : undefined,
      },
      message,
    };
  }

  /**
   * Increment chat usage after successful message
   */
  static async incrementChatUsage(userId: string): Promise<ChatUsageInfo> {
    // DEV MODE: Bypass in development
    if (process.env.NODE_ENV === 'development') {
      return {
        tier: 'FREE',
        questions_asked: 0,
        remaining: 999,
        is_free_tier: true,
        upgrade_required: false,
      };
    }

    const supabase = createClient();

    // Call database function
    const { data, error } = await supabase
      .rpc('increment_chat_usage', { p_user_id: userId });

    if (error) {
      console.error('[ChatLimits] Failed to increment usage:', error);
      throw error;
    }

    // Parse the JSONB response
    const result = data as {
      tier: string;
      questions_asked: number;
      remaining: number;
      is_free_tier: boolean;
      upgrade_required: boolean;
    };

    return {
      tier: result.tier as MembershipTier,
      questions_asked: result.questions_asked,
      remaining: result.remaining === -1 ? Infinity : result.remaining,
      is_free_tier: result.is_free_tier,
      upgrade_required: result.upgrade_required,
    };
  }

  /**
   * Initialize usage record for new user
   */
  static async initializeUsage(
    userId: string,
    tier: MembershipTier = 'FREE',
    studentId?: string,
    creatorId?: string
  ): Promise<void> {
    const supabase = createClient();

    const limit = CHAT_LIMITS[tier] || CHAT_LIMITS.FREE;
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);

    const { error } = await supabase
      .from('chat_usage')
      .insert({
        user_id: userId,
        student_id: studentId,
        creator_id: creatorId,
        tier,
        questions_asked: 0,
        questions_limit: tier === 'FREE' ? limit : null,
        daily_questions: 0,
        daily_reset_at: tomorrow.toISOString(),
      });

    if (error && error.code !== '23505') { // Ignore unique constraint violation
      console.error('[ChatLimits] Failed to initialize usage:', error);
      throw error;
    }
  }

  /**
   * Update user's tier (e.g., after upgrade)
   */
  static async updateUserTier(userId: string, newTier: MembershipTier): Promise<void> {
    const supabase = createClient();

    const newLimit = CHAT_LIMITS[newTier];

    const { error } = await supabase
      .from('chat_usage')
      .update({
        tier: newTier,
        questions_limit: newTier === 'FREE' ? newLimit : null,
        upgraded_at: new Date().toISOString(),
      })
      .eq('user_id', userId);

    if (error) {
      console.error('[ChatLimits] Failed to update tier:', error);
      throw error;
    }
  }

  /**
   * Get tier-specific chat limit
   */
  static getChatLimitForTier(tier: MembershipTier): number | null {
    return CHAT_LIMITS[tier] === -1 ? null : CHAT_LIMITS[tier];
  }

  /**
   * Check if tier has daily limits
   */
  static hasDailyLimit(tier: MembershipTier): boolean {
    return tier === 'BASIC' || tier === 'PRO';
  }

  /**
   * Format usage message for UI
   */
  static formatUsageMessage(usage: ChatUsageInfo): string {
    if (usage.tier === 'FREE') {
      if (usage.upgrade_required) {
        return 'You\'ve used all your free questions. Upgrade to continue!';
      }
      if (usage.remaining === 1) {
        return '⚠️ Last free question! Use it wisely.';
      }
      return `${usage.remaining} free questions remaining`;
    }

    if (usage.tier === 'ENTERPRISE') {
      return 'Unlimited questions';
    }

    // BASIC or PRO
    if (usage.daily_remaining === 0) {
      return `Daily limit reached. Resets at midnight.`;
    }
    if (usage.daily_remaining && usage.daily_remaining <= 10) {
      return `${usage.daily_remaining} questions left today`;
    }

    return `${usage.daily_remaining} / ${usage.daily_limit} daily questions remaining`;
  }
}

// ============================================================================
// CONVENIENCE EXPORTS
// ============================================================================

export const getChatUsage = ChatLimitsService.getChatUsage.bind(ChatLimitsService);
export const checkChatLimit = ChatLimitsService.checkChatLimit.bind(ChatLimitsService);
export const incrementChatUsage = ChatLimitsService.incrementChatUsage.bind(ChatLimitsService);
export const initializeUsage = ChatLimitsService.initializeUsage.bind(ChatLimitsService);
export const updateUserTier = ChatLimitsService.updateUserTier.bind(ChatLimitsService);
export const getChatLimitForTier = ChatLimitsService.getChatLimitForTier.bind(ChatLimitsService);
export const formatUsageMessage = ChatLimitsService.formatUsageMessage.bind(ChatLimitsService);