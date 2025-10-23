/**
 * Token Wallet Service
 * Manages token wallets, balances, and transaction history
 * - Create wallets for new students
 * - Query wallet balances and stats
 * - Sync on-chain balances with database cache
 * - Retrieve transaction history with filtering
 */

import { createClient } from '@/lib/utils/supabase-client';
import { SolanaService } from './solana-service';
import type {
  TokenWallet,
  TokenWalletPublic,
  TokenTransaction,
  TransactionHistoryParams,
  TransactionHistoryResponse,
  LeaderboardEntry,
  TOKEN_CONVERSION,
} from '@/types/tokens';

// ============================================================================
// Wallet Management
// ============================================================================

/**
 * Create a new token wallet for a student
 * Generates Solana keypair, encrypts private key, stores in database
 */
export async function createStudentWallet(
  studentId: string
): Promise<TokenWalletPublic> {
  const supabase = createClient();

  // Check if wallet already exists
  const { data: existing } = await supabase
    .from('token_wallets')
    .select('*')
    .eq('student_id', studentId)
    .single();

  if (existing) {
    return toPublicWallet(existing);
  }

  // Generate Solana wallet
  const { publicKey, privateKey } = await SolanaService.createWallet();

  // Encrypt private key
  const encryptedKey = await SolanaService.encryptPrivateKey(privateKey);

  // Store in database
  const { data: wallet, error } = await supabase
    .from('token_wallets')
    .insert({
      student_id: studentId,
      solana_address: publicKey,
      private_key_encrypted: encryptedKey,
      balance: 0,
      total_earned: 0,
      total_spent: 0,
      total_redeemed: 0,
    })
    .select()
    .single();

  if (error || !wallet) {
    console.error('Failed to create wallet:', error);
    throw new Error('Failed to create token wallet');
  }

  // For devnet, airdrop some SOL for gas fees
  try {
    if (process.env.SOLANA_NETWORK === 'devnet') {
      await SolanaService.airdropSol(publicKey, 1);
    }
  } catch (error) {
    console.warn('SOL airdrop failed (non-critical):', error);
  }

  return toPublicWallet(wallet);
}

/**
 * Get wallet by student ID
 */
export async function getWallet(
  studentId: string
): Promise<TokenWalletPublic | null> {
  const supabase = createClient();

  const { data: wallet } = await supabase
    .from('token_wallets')
    .select('*')
    .eq('student_id', studentId)
    .single();

  if (!wallet) {
    return null;
  }

  return toPublicWallet(wallet);
}

/**
 * Get wallet by ID
 */
export async function getWalletById(
  walletId: string
): Promise<TokenWalletPublic | null> {
  const supabase = createClient();

  const { data: wallet } = await supabase
    .from('token_wallets')
    .select('*')
    .eq('id', walletId)
    .single();

  if (!wallet) {
    return null;
  }

  return toPublicWallet(wallet);
}

/**
 * Get or create wallet (convenience method)
 */
export async function getOrCreateWallet(
  studentId: string
): Promise<TokenWalletPublic> {
  const existing = await getWallet(studentId);
  if (existing) {
    return existing;
  }
  return createStudentWallet(studentId);
}

// ============================================================================
// Balance Operations
// ============================================================================

/**
 * Sync wallet balance from on-chain Solana balance
 * Updates database cache with current blockchain state
 */
export async function syncBalance(walletId: string): Promise<number> {
  const supabase = createClient();

  // Get wallet
  const { data: wallet } = await supabase
    .from('token_wallets')
    .select('*')
    .eq('id', walletId)
    .single();

  if (!wallet) {
    throw new Error('Wallet not found');
  }

  // Query on-chain balance
  const onChainBalance = await SolanaService.getBalance(wallet.solana_address);

  // Update database
  const { error } = await supabase.rpc('sync_wallet_balance', {
    p_wallet_id: walletId,
    p_on_chain_balance: onChainBalance,
  });

  if (error) {
    console.error('Failed to sync balance:', error);
    throw new Error('Failed to sync wallet balance');
  }

  return onChainBalance;
}

/**
 * Get wallet balance (from cache)
 */
export async function getBalance(studentId: string): Promise<number> {
  const wallet = await getWallet(studentId);
  if (!wallet) {
    return 0;
  }
  return wallet.balance;
}

/**
 * Get wallet statistics
 */
export async function getWalletStats(studentId: string): Promise<{
  balance: number;
  total_earned: number;
  total_spent: number;
  total_redeemed: number;
  usd_value: number;
}> {
  const wallet = await getWallet(studentId);

  if (!wallet) {
    return {
      balance: 0,
      total_earned: 0,
      total_spent: 0,
      total_redeemed: 0,
      usd_value: 0,
    };
  }

  return {
    balance: wallet.balance,
    total_earned: wallet.total_earned,
    total_spent: wallet.total_spent,
    total_redeemed: wallet.total_redeemed,
    usd_value: wallet.usd_value,
  };
}

// ============================================================================
// Transaction History
// ============================================================================

/**
 * Get transaction history for a student
 */
export async function getTransactionHistory(
  studentId: string,
  params: TransactionHistoryParams = {}
): Promise<TransactionHistoryResponse> {
  const supabase = createClient();

  const {
    type,
    limit = 20,
    offset = 0,
    start_date,
    end_date,
  } = params;

  // Build query
  let query = supabase
    .from('token_transactions')
    .select('*', { count: 'exact' })
    .eq('student_id', studentId);

  // Apply filters
  if (type) {
    query = query.eq('type', type);
  }

  if (start_date) {
    query = query.gte('created_at', start_date);
  }

  if (end_date) {
    query = query.lte('created_at', end_date);
  }

  // Apply pagination
  query = query
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  const { data: transactions, error, count } = await query;

  if (error) {
    console.error('Failed to fetch transactions:', error);
    throw new Error('Failed to fetch transaction history');
  }

  return {
    transactions: (transactions || []) as TokenTransaction[],
    total: count || 0,
    has_more: (count || 0) > offset + limit,
    limit,
    offset,
  };
}

/**
 * Get total earnings for a student
 */
export async function getTotalEarnings(studentId: string): Promise<number> {
  const wallet = await getWallet(studentId);
  return wallet?.total_earned || 0;
}

/**
 * Get transaction count by type
 */
export async function getTransactionCounts(studentId: string): Promise<{
  earned: number;
  spent: number;
  redeemed: number;
}> {
  const supabase = createClient();

  const [earned, spent, redeemed] = await Promise.all([
    supabase
      .from('token_transactions')
      .select('*', { count: 'exact', head: true })
      .eq('student_id', studentId)
      .eq('type', 'earn'),
    supabase
      .from('token_transactions')
      .select('*', { count: 'exact', head: true })
      .eq('student_id', studentId)
      .eq('type', 'spend'),
    supabase
      .from('token_transactions')
      .select('*', { count: 'exact', head: true })
      .eq('student_id', studentId)
      .eq('type', 'redeem'),
  ]);

  return {
    earned: earned.count || 0,
    spent: spent.count || 0,
    redeemed: redeemed.count || 0,
  };
}

// ============================================================================
// Leaderboard
// ============================================================================

/**
 * Get leaderboard position for a student
 */
export async function getLeaderboardRank(studentId: string): Promise<number> {
  const supabase = createClient();

  const { data } = await supabase
    .from('token_leaderboard')
    .select('rank')
    .eq('student_id', studentId)
    .single();

  return data?.rank || 0;
}

/**
 * Get top earners (global leaderboard)
 */
export async function getTopEarners(limit: number = 10): Promise<LeaderboardEntry[]> {
  const supabase = createClient();

  const { data: entries } = await supabase
    .from('token_leaderboard')
    .select('*')
    .limit(limit);

  if (!entries) {
    return [];
  }

  return entries.map((entry: any) => ({
    rank: entry.rank,
    student_id: entry.student_id,
    full_name: entry.full_name,
    avatar_url: entry.avatar_url,
    current_balance: entry.current_balance,
    total_earned: entry.total_earned,
    total_spent: entry.total_spent,
    total_redeemed: entry.total_redeemed,
  }));
}

/**
 * Get course-specific leaderboard (students in same creator's courses)
 */
export async function getCourseLeaderboard(
  creatorId: string,
  limit: number = 10
): Promise<LeaderboardEntry[]> {
  const supabase = createClient();

  // Get students for this creator
  const { data: students } = await supabase
    .from('students')
    .select('id')
    .eq('creator_id', creatorId);

  if (!students || students.length === 0) {
    return [];
  }

  const studentIds = students.map(s => s.id);

  // Get leaderboard entries for these students
  const { data: entries } = await supabase
    .from('token_leaderboard')
    .select('*')
    .in('student_id', studentIds)
    .limit(limit);

  if (!entries) {
    return [];
  }

  // Re-rank within course scope
  return entries
    .sort((a: any, b: any) => b.total_earned - a.total_earned)
    .map((entry: any, index: number) => ({
      rank: index + 1,
      student_id: entry.student_id,
      full_name: entry.full_name,
      avatar_url: entry.avatar_url,
      current_balance: entry.current_balance,
      total_earned: entry.total_earned,
      total_spent: entry.total_spent,
      total_redeemed: entry.total_redeemed,
    }));
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Convert internal wallet to public wallet (remove private key)
 */
function toPublicWallet(wallet: any): TokenWalletPublic {
  const CHRONOS_TO_USD = 0.001; // From TOKEN_CONVERSION constant

  return {
    id: wallet.id,
    student_id: wallet.student_id,
    solana_address: wallet.solana_address,
    balance: wallet.balance,
    total_earned: wallet.total_earned,
    total_spent: wallet.total_spent,
    total_redeemed: wallet.total_redeemed,
    usd_value: wallet.balance * CHRONOS_TO_USD,
    last_synced_at: wallet.last_synced_at,
  };
}

/**
 * Calculate USD value from CHRONOS amount
 */
export function calculateUsdValue(bloxAmount: number): number {
  const CHRONOS_TO_USD = 0.001;
  return bloxAmount * CHRONOS_TO_USD;
}

/**
 * Calculate CHRONOS amount from USD value
 */
export function calculateBloxAmount(usdValue: number): number {
  const CHRONOS_TO_USD = 0.001;
  return Math.floor(usdValue / CHRONOS_TO_USD);
}

// ============================================================================
// Export Service Object
// ============================================================================

export const WalletService = {
  // Wallet management
  createStudentWallet,
  getWallet,
  getWalletById,
  getOrCreateWallet,

  // Balance operations
  syncBalance,
  getBalance,
  getWalletStats,

  // Transaction history
  getTransactionHistory,
  getTotalEarnings,
  getTransactionCounts,

  // Leaderboard
  getLeaderboardRank,
  getTopEarners,
  getCourseLeaderboard,

  // Utilities
  calculateUsdValue,
  calculateBloxAmount,
};

export default WalletService;
