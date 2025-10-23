/**
 * TypeScript types for CHRONOS Token Reward System
 * Covers wallets, transactions, redemptions, and leaderboards
 */

// ============================================================================
// Core Token Types
// ============================================================================

/**
 * Token wallet with Solana integration
 */
export interface TokenWallet {
  id: string;
  student_id: string;
  solana_address: string;
  private_key_encrypted: string; // Never expose to client
  balance: number; // Cached balance in CHRONOS
  total_earned: number;
  total_spent: number;
  total_redeemed: number;
  last_synced_at: string; // ISO timestamp
  created_at: string;
  updated_at: string;
}

/**
 * Public wallet info (safe for client consumption)
 */
export interface TokenWalletPublic {
  id: string;
  student_id: string;
  solana_address: string;
  balance: number;
  total_earned: number;
  total_spent: number;
  total_redeemed: number;
  usd_value: number; // Calculated: balance * 0.001
  last_synced_at: string;
}

/**
 * Transaction types
 */
export type TokenTransactionType = 'earn' | 'spend' | 'redeem';

/**
 * Transaction sources (earn)
 */
export type TokenEarnSource =
  | 'video_milestone'
  | 'video_complete'
  | 'quiz_complete'
  | 'achievement_unlock'
  | 'practice_task'
  | 'project_complete'
  | 'week_complete'
  | 'module_complete'
  | 'course_complete'
  | 'streak_bonus'
  | 'daily_bonus'
  | 'referral_bonus'
  | 'manual_award';

/**
 * Transaction sources (spend)
 */
export type TokenSpendSource =
  | 'custom_badge'
  | 'profile_theme'
  | 'priority_ai_chat'
  | 'certificate'
  | 'discord_role'
  | 'custom_item';

/**
 * Token transaction record
 */
export interface TokenTransaction {
  id: string;
  wallet_id: string;
  student_id: string;
  amount: number;
  type: TokenTransactionType;
  source: TokenEarnSource | TokenSpendSource | string;
  source_id?: string; // video_id, quiz_id, achievement_id, etc.
  signature?: string; // Solana transaction signature
  metadata: Record<string, any>;
  created_at: string;
}

/**
 * Transaction with student details (for admin views)
 */
export interface TokenTransactionWithStudent extends TokenTransaction {
  student: {
    id: string;
    full_name: string;
    avatar_url?: string;
  };
}

// ============================================================================
// Redemption Types
// ============================================================================

/**
 * Redemption types
 */
export type RedemptionType = 'paypal' | 'gift_card' | 'platform_credit';

/**
 * Redemption status
 */
export type RedemptionStatus =
  | 'pending'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'cancelled';

/**
 * PayPal payout details
 */
export interface PayPalPayoutDetails {
  email: string;
  note?: string;
}

/**
 * Gift card payout details
 */
export interface GiftCardPayoutDetails {
  provider: 'amazon' | 'steam' | 'google_play' | 'apple';
  email: string;
}

/**
 * Platform credit payout details
 */
export interface PlatformCreditPayoutDetails {
  apply_to_subscription?: boolean;
  notes?: string;
}

/**
 * Union of all payout detail types
 */
export type PayoutDetails =
  | PayPalPayoutDetails
  | GiftCardPayoutDetails
  | PlatformCreditPayoutDetails;

/**
 * Redemption request
 */
export interface RedemptionRequest {
  id: string;
  wallet_id: string;
  student_id: string;
  amount: number;
  redemption_type: RedemptionType;
  status: RedemptionStatus;
  payout_details: PayoutDetails;
  transaction_id?: string; // External transaction ID (PayPal, gift card provider)
  admin_notes?: string;
  processed_by?: string; // Creator ID
  processed_at?: string;
  created_at: string;
  updated_at: string;
}

/**
 * Redemption request with student info
 */
export interface RedemptionRequestWithStudent extends RedemptionRequest {
  student: {
    id: string;
    full_name: string;
    email: string;
    avatar_url?: string;
  };
}

// ============================================================================
// Leaderboard Types
// ============================================================================

/**
 * Leaderboard entry
 */
export interface LeaderboardEntry {
  rank: number;
  student_id: string;
  full_name: string;
  avatar_url?: string;
  current_balance: number;
  total_earned: number;
  total_spent: number;
  total_redeemed: number;
  is_current_user?: boolean;
}

/**
 * Leaderboard response
 */
export interface LeaderboardResponse {
  scope: 'global' | 'course';
  total_entries: number;
  leaderboard: LeaderboardEntry[];
  current_user?: {
    rank: number;
    in_top_results: boolean;
    total_earned: number;
  };
}

// ============================================================================
// Reward Engine Types
// ============================================================================

/**
 * Reward action types
 */
export type RewardAction =
  | 'video_milestone'
  | 'video_complete'
  | 'quiz_complete'
  | 'achievement_unlock'
  | 'practice_task'
  | 'project_complete'
  | 'week_complete'
  | 'module_complete'
  | 'course_complete'
  | 'streak_bonus';

/**
 * Video milestone percentages
 */
export type VideoMilestone = 25 | 50 | 75 | 100;

/**
 * Achievement rarity (from Agent 6)
 */
export type AchievementRarity =
  | 'COMMON'
  | 'UNCOMMON'
  | 'RARE'
  | 'EPIC'
  | 'LEGENDARY';

/**
 * Reward calculation metadata
 */
export interface RewardMetadata {
  // Video rewards
  video_id?: string;
  video_title?: string;
  milestone?: VideoMilestone;
  completion_percentage?: number;
  is_first_time?: boolean;

  // Quiz rewards
  quiz_id?: string;
  quiz_title?: string;
  score?: number;
  passing_score?: number;
  is_perfect_score?: boolean;

  // Achievement rewards
  achievement_id?: string;
  achievement_name?: string;
  rarity?: AchievementRarity;

  // Creator multiplier
  creator_id?: string;
  multiplier?: number;

  // General
  [key: string]: any;
}

/**
 * Dual reward result (XP + CHRONOS)
 */
export interface DualRewardResult {
  xp_amount: number;
  blox_amount: number;
  xp_transaction_id?: string;
  blox_transaction_id: string;
  new_xp_total?: number;
  new_blox_balance: number;
  level_up?: boolean;
  new_level?: number;
}

/**
 * Creator multiplier settings
 */
export interface CreatorMultiplierSettings {
  creator_id: string;
  multiplier: number; // 0.5 - 2.0
  active: boolean;
  start_date?: string;
  end_date?: string;
  reason?: string; // "promotional", "special_event", etc.
}

// ============================================================================
// API Request/Response Types
// ============================================================================

/**
 * Create wallet request
 */
export interface CreateWalletRequest {
  student_id: string;
}

/**
 * Create wallet response
 */
export interface CreateWalletResponse {
  wallet_id: string;
  solana_address: string;
  balance: number;
  created_at: string;
}

/**
 * Get balance response
 */
export interface GetBalanceResponse {
  balance: number;
  total_earned: number;
  total_spent: number;
  total_redeemed: number;
  usd_value: number;
}

/**
 * Award tokens request (internal service use)
 */
export interface AwardTokensRequest {
  student_id: string;
  amount: number;
  source: TokenEarnSource | string;
  source_id?: string;
  metadata?: Record<string, any>;
}

/**
 * Award tokens response
 */
export interface AwardTokensResponse {
  transaction_id: string;
  new_balance: number;
  signature?: string; // Solana transaction signature
  created_at: string;
}

/**
 * Spend tokens request
 */
export interface SpendTokensRequest {
  amount: number;
  item_type: TokenSpendSource | string;
  item_id?: string;
  metadata?: Record<string, any>;
}

/**
 * Spend tokens response
 */
export interface SpendTokensResponse {
  transaction_id: string;
  new_balance: number;
  item_unlocked?: {
    type: string;
    name: string;
    id: string;
  };
}

/**
 * Redeem tokens request
 */
export interface RedeemTokensRequest {
  amount: number;
  redemption_type: RedemptionType;
  payout_details: PayoutDetails;
}

/**
 * Redeem tokens response
 */
export interface RedeemTokensResponse {
  request_id: string;
  status: RedemptionStatus;
  amount: number;
  usd_value: number;
  estimated_processing: string;
  created_at: string;
}

/**
 * Transaction history query params
 */
export interface TransactionHistoryParams {
  type?: TokenTransactionType;
  limit?: number;
  offset?: number;
  start_date?: string;
  end_date?: string;
}

/**
 * Transaction history response
 */
export interface TransactionHistoryResponse {
  transactions: TokenTransaction[];
  total: number;
  has_more: boolean;
  limit: number;
  offset: number;
}

/**
 * Leaderboard query params
 */
export interface LeaderboardParams {
  scope?: 'global' | 'course';
  limit?: number;
  period?: 'all_time' | 'monthly' | 'weekly';
}

/**
 * Sync balance response
 */
export interface SyncBalanceResponse {
  on_chain_balance: number;
  cached_balance: number;
  synced_at: string;
  discrepancy: number;
}

// ============================================================================
// Solana Service Types
// ============================================================================

/**
 * Solana wallet keypair info
 */
export interface SolanaWalletKeypair {
  publicKey: string;
  privateKey: string; // Base58 encoded
}

/**
 * Solana network type
 */
export type SolanaNetwork = 'devnet' | 'mainnet-beta' | 'testnet';

/**
 * Mint tokens result
 */
export interface MintTokensResult {
  signature: string;
  amount: number;
  recipient: string;
  confirmations: number;
}

/**
 * Transfer tokens result
 */
export interface TransferTokensResult {
  signature: string;
  amount: number;
  from: string;
  to: string;
  confirmations: number;
}

// ============================================================================
// Constants
// ============================================================================

/**
 * Token conversion rates
 */
export const TOKEN_CONVERSION = {
  CHRONOS_TO_USD: 0.001, // 1 CHRONOS = $0.001 USD
  MIN_REDEMPTION: 5000, // 5,000 CHRONOS minimum for redemption
  PAYPAL_MIN: 5000, // 5,000 CHRONOS = $5 USD
  GIFT_CARD_MIN: 10000, // 10,000 CHRONOS = $10 USD
  PLATFORM_CREDIT_MIN: 5000, // 5,000 CHRONOS = $5 credit
} as const;

/**
 * Redemption fees
 */
export const REDEMPTION_FEES = {
  paypal: 0.05, // 5% fee
  gift_card: 0, // No fee
  platform_credit: 0, // No fee
} as const;

/**
 * Video completion rewards (4-hour daily limit)
 */
export const VIDEO_REWARDS = {
  MILESTONE_25: 25,
  MILESTONE_50: 50,
  MILESTONE_75: 75,
  MILESTONE_100: 100,
  DAILY_COMPLETION_BONUS: 50,
  MAX_DAILY_TOTAL: 150, // 100 + 50 bonus
} as const;

/**
 * Quiz completion rewards
 */
export const QUIZ_REWARDS = {
  SCORE_0_59: 50,
  SCORE_60_79: 100,
  SCORE_80_94: 150,
  SCORE_95_100: 200,
  PRACTICE_TASK: 100,
  PROJECT_COMPLETE: 300,
  CODE_REVIEW: 50,
} as const;

/**
 * Achievement rarity rewards
 */
export const ACHIEVEMENT_REWARDS = {
  COMMON: 50,
  UNCOMMON: 100,
  RARE: 200,
  EPIC: 350,
  LEGENDARY: 500,
} as const;

/**
 * Milestone bonuses
 */
export const MILESTONE_BONUSES = {
  WEEK_COMPLETE: 500,
  MODULE_COMPLETE: 2000,
  COURSE_COMPLETE: 10000,
  STREAK_7_DAYS: 200,
  STREAK_30_DAYS: 1000,
} as const;

/**
 * Creator multiplier limits
 */
export const MULTIPLIER_LIMITS = {
  MIN: 0.5,
  DEFAULT: 1.0,
  MAX: 2.0,
} as const;

/**
 * In-platform purchase catalog
 */
export const PLATFORM_ITEMS = {
  CUSTOM_BADGE: { cost: 500, name: 'Custom Badge' },
  PROFILE_THEME: { cost: 1000, name: 'Profile Theme' },
  PRIORITY_AI_CHAT: { cost: 2000, name: 'Priority AI Chat (1 month)' },
  CERTIFICATE: { cost: 5000, name: 'Certificate of Completion' },
  DISCORD_ROLE: { cost: 1500, name: 'Discord Role Upgrade' },
} as const;
