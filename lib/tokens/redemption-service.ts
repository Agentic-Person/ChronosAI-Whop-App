/**
 * Token Redemption Service
 * Handles real-world redemptions of CHRONOS tokens
 * - PayPal cash payouts
 * - Gift card generation (Amazon, Steam, etc.)
 * - Platform credit conversion
 * - Redemption request management
 */

import { createClient } from '@/lib/utils/supabase-client';
import { WalletService } from './wallet-service';
import type {
  RedemptionType,
  RedemptionStatus,
  RedemptionRequest,
  PayoutDetails,
  PayPalPayoutDetails,
  GiftCardPayoutDetails,
  PlatformCreditPayoutDetails,
  TOKEN_CONVERSION,
  REDEMPTION_FEES,
} from '@/types/tokens';

// ============================================================================
// Constants
// ============================================================================

const CHRONOS_TO_USD = 0.001; // 1 CHRONOS = $0.001 USD
const MIN_REDEMPTION_AMOUNTS = {
  paypal: 5000, // 5,000 CHRONOS = $5 USD
  gift_card: 10000, // 10,000 CHRONOS = $10 USD
  platform_credit: 5000, // 5,000 CHRONOS = $5 credit
};

const REDEMPTION_FEES_MAP = {
  paypal: 0.05, // 5% fee
  gift_card: 0, // No fee
  platform_credit: 0, // No fee
};

// ============================================================================
// Redemption Request Management
// ============================================================================

/**
 * Create a new redemption request
 * Validates balance, creates request, deducts tokens
 */
export async function createRedemptionRequest(
  studentId: string,
  amount: number,
  redemptionType: RedemptionType,
  payoutDetails: PayoutDetails
): Promise<RedemptionRequest> {
  const supabase = createClient();

  // Validate minimum amount
  const minAmount = MIN_REDEMPTION_AMOUNTS[redemptionType];
  if (amount < minAmount) {
    throw new Error(
      `Minimum redemption amount is ${minAmount} CHRONOS for ${redemptionType}`
    );
  }

  // Validate payout details
  validatePayoutDetails(redemptionType, payoutDetails);

  // Get wallet and check balance
  const wallet = await WalletService.getWallet(studentId);
  if (!wallet) {
    throw new Error('Wallet not found');
  }

  if (wallet.balance < amount) {
    throw new Error(
      `Insufficient balance. Current: ${wallet.balance} CHRONOS, Required: ${amount} CHRONOS`
    );
  }

  // Use database function to redeem tokens (deducts balance and creates request)
  const { data: requestId, error } = await supabase.rpc('redeem_tokens', {
    p_student_id: studentId,
    p_amount: amount,
    p_redemption_type: redemptionType,
    p_payout_details: payoutDetails,
  });

  if (error || !requestId) {
    console.error('Failed to create redemption request:', error);
    throw new Error('Failed to create redemption request');
  }

  // Fetch the created request
  const { data: request } = await supabase
    .from('redemption_requests')
    .select('*')
    .eq('id', requestId)
    .single();

  if (!request) {
    throw new Error('Failed to retrieve redemption request');
  }

  return request as RedemptionRequest;
}

/**
 * Get redemption request by ID
 */
export async function getRedemptionRequest(
  requestId: string
): Promise<RedemptionRequest | null> {
  const supabase = createClient();

  const { data: request } = await supabase
    .from('redemption_requests')
    .select('*')
    .eq('id', requestId)
    .single();

  return request as RedemptionRequest | null;
}

/**
 * Get all redemption requests for a student
 */
export async function getStudentRedemptions(
  studentId: string,
  status?: RedemptionStatus
): Promise<RedemptionRequest[]> {
  const supabase = createClient();

  let query = supabase
    .from('redemption_requests')
    .select('*')
    .eq('student_id', studentId);

  if (status) {
    query = query.eq('status', status);
  }

  const { data: requests } = await query.order('created_at', {
    ascending: false,
  });

  return (requests || []) as RedemptionRequest[];
}

/**
 * Update redemption request status
 */
export async function updateRedemptionStatus(
  requestId: string,
  status: RedemptionStatus,
  adminNotes?: string,
  processedBy?: string,
  transactionId?: string
): Promise<void> {
  const supabase = createClient();

  const updates: any = {
    status,
    updated_at: new Date().toISOString(),
  };

  if (adminNotes) {
    updates.admin_notes = adminNotes;
  }

  if (processedBy) {
    updates.processed_by = processedBy;
    updates.processed_at = new Date().toISOString();
  }

  if (transactionId) {
    updates.transaction_id = transactionId;
  }

  const { error } = await supabase
    .from('redemption_requests')
    .update(updates)
    .eq('id', requestId);

  if (error) {
    console.error('Failed to update redemption status:', error);
    throw new Error('Failed to update redemption status');
  }
}

/**
 * Cancel a pending redemption request
 * Refunds tokens back to wallet
 */
export async function cancelRedemption(
  requestId: string,
  reason?: string
): Promise<void> {
  const supabase = createClient();

  // Get request
  const request = await getRedemptionRequest(requestId);
  if (!request) {
    throw new Error('Redemption request not found');
  }

  // Only pending requests can be cancelled
  if (request.status !== 'pending') {
    throw new Error('Only pending requests can be cancelled');
  }

  // Refund tokens using spend_tokens with negative amount (refund)
  const { error: refundError } = await supabase.rpc('award_tokens', {
    p_student_id: request.student_id,
    p_amount: request.amount,
    p_source: 'redemption_cancelled',
    p_source_id: requestId,
    p_metadata: { reason },
  });

  if (refundError) {
    console.error('Failed to refund tokens:', refundError);
    throw new Error('Failed to refund tokens');
  }

  // Update request status
  await updateRedemptionStatus(requestId, 'cancelled', reason);
}

// ============================================================================
// Payment Processing
// ============================================================================

/**
 * Process PayPal redemption
 * Integrates with PayPal Payouts API
 */
export async function processPayPalRedemption(
  requestId: string
): Promise<void> {
  const request = await getRedemptionRequest(requestId);
  if (!request) {
    throw new Error('Redemption request not found');
  }

  if (request.redemption_type !== 'paypal') {
    throw new Error('Not a PayPal redemption request');
  }

  const payoutDetails = request.payout_details as PayPalPayoutDetails;
  const grossAmount = request.amount * CHRONOS_TO_USD;
  const fee = grossAmount * REDEMPTION_FEES_MAP.paypal;
  const netAmount = grossAmount - fee;

  // Update status to processing
  await updateRedemptionStatus(requestId, 'processing');

  try {
    // TODO: Integrate with PayPal Payouts API
    // This is a placeholder for the actual PayPal integration
    const paypalTransactionId = await mockPayPalPayout(
      payoutDetails.email,
      netAmount
    );

    // Update status to completed
    await updateRedemptionStatus(
      requestId,
      'completed',
      `PayPal payout successful. Net amount: $${netAmount.toFixed(2)}`,
      undefined,
      paypalTransactionId
    );
  } catch (error) {
    console.error('PayPal payout failed:', error);

    // Update status to failed
    await updateRedemptionStatus(
      requestId,
      'failed',
      `PayPal payout failed: ${(error as Error).message}`
    );

    // Refund tokens
    await cancelRedemption(
      requestId,
      'PayPal payout failed, tokens refunded'
    );

    throw error;
  }
}

/**
 * Generate gift card for redemption
 * Integrates with gift card provider API (e.g., Tremendous, Giftbit)
 */
export async function generateGiftCard(
  requestId: string
): Promise<string> {
  const request = await getRedemptionRequest(requestId);
  if (!request) {
    throw new Error('Redemption request not found');
  }

  if (request.redemption_type !== 'gift_card') {
    throw new Error('Not a gift card redemption request');
  }

  const payoutDetails = request.payout_details as GiftCardPayoutDetails;
  const amount = request.amount * CHRONOS_TO_USD;

  // Update status to processing
  await updateRedemptionStatus(requestId, 'processing');

  try {
    // TODO: Integrate with gift card provider API
    // This is a placeholder for the actual gift card integration
    const giftCardCode = await mockGiftCardGeneration(
      payoutDetails.provider,
      amount,
      payoutDetails.email
    );

    // Update status to completed
    await updateRedemptionStatus(
      requestId,
      'completed',
      `Gift card generated and sent to ${payoutDetails.email}`,
      undefined,
      giftCardCode
    );

    return giftCardCode;
  } catch (error) {
    console.error('Gift card generation failed:', error);

    // Update status to failed
    await updateRedemptionStatus(
      requestId,
      'failed',
      `Gift card generation failed: ${(error as Error).message}`
    );

    // Refund tokens
    await cancelRedemption(
      requestId,
      'Gift card generation failed, tokens refunded'
    );

    throw error;
  }
}

/**
 * Convert to platform credit
 * Instantly applies credit to student's account
 */
export async function convertToPlatformCredit(
  requestId: string
): Promise<void> {
  const supabase = createClient();
  const request = await getRedemptionRequest(requestId);

  if (!request) {
    throw new Error('Redemption request not found');
  }

  if (request.redemption_type !== 'platform_credit') {
    throw new Error('Not a platform credit redemption request');
  }

  const creditAmount = request.amount * CHRONOS_TO_USD;

  try {
    // Add credit to student's account
    // TODO: Update student's platform_credit_balance field
    const { error } = await supabase
      .from('students')
      .update({
        platform_credit_balance:
          supabase.rpc('COALESCE', ['platform_credit_balance', 0]) +
          creditAmount,
        updated_at: new Date().toISOString(),
      })
      .eq('id', request.student_id);

    if (error) {
      throw error;
    }

    // Update status to completed
    await updateRedemptionStatus(
      requestId,
      'completed',
      `Platform credit applied: $${creditAmount.toFixed(2)}`
    );
  } catch (error) {
    console.error('Platform credit conversion failed:', error);

    // Update status to failed
    await updateRedemptionStatus(
      requestId,
      'failed',
      `Platform credit conversion failed: ${(error as Error).message}`
    );

    // Refund tokens
    await cancelRedemption(
      requestId,
      'Platform credit conversion failed, tokens refunded'
    );

    throw error;
  }
}

// ============================================================================
// Validation & Utility Functions
// ============================================================================

/**
 * Validate payout details for redemption type
 */
function validatePayoutDetails(
  redemptionType: RedemptionType,
  payoutDetails: PayoutDetails
): void {
  switch (redemptionType) {
    case 'paypal':
      const paypalDetails = payoutDetails as PayPalPayoutDetails;
      if (!paypalDetails.email || !isValidEmail(paypalDetails.email)) {
        throw new Error('Valid PayPal email required');
      }
      break;

    case 'gift_card':
      const giftCardDetails = payoutDetails as GiftCardPayoutDetails;
      if (!giftCardDetails.provider) {
        throw new Error('Gift card provider required');
      }
      if (!giftCardDetails.email || !isValidEmail(giftCardDetails.email)) {
        throw new Error('Valid email required for gift card delivery');
      }
      break;

    case 'platform_credit':
      // No special validation needed
      break;

    default:
      throw new Error(`Invalid redemption type: ${redemptionType}`);
  }
}

/**
 * Validate email format
 */
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Calculate redemption fee
 */
export function calculateRedemptionFee(
  amount: number,
  redemptionType: RedemptionType
): number {
  const grossAmount = amount * CHRONOS_TO_USD;
  const feeRate = REDEMPTION_FEES_MAP[redemptionType];
  return grossAmount * feeRate;
}

/**
 * Calculate net amount after fees
 */
export function calculateNetAmount(
  amount: number,
  redemptionType: RedemptionType
): number {
  const grossAmount = amount * CHRONOS_TO_USD;
  const fee = calculateRedemptionFee(amount, redemptionType);
  return grossAmount - fee;
}

// ============================================================================
// Mock Payment Integrations (Placeholders)
// ============================================================================

/**
 * Mock PayPal payout (replace with actual PayPal API integration)
 */
async function mockPayPalPayout(
  email: string,
  amount: number
): Promise<string> {
  // TODO: Replace with actual PayPal Payouts API
  console.log(`[MOCK] PayPal payout: $${amount} to ${email}`);

  // Simulate API call delay
  await new Promise(resolve => setTimeout(resolve, 1000));

  // Return mock transaction ID
  return `PAYPAL_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Mock gift card generation (replace with actual provider API)
 */
async function mockGiftCardGeneration(
  provider: string,
  amount: number,
  email: string
): Promise<string> {
  // TODO: Replace with actual gift card provider API
  console.log(
    `[MOCK] Gift card: ${provider} $${amount} sent to ${email}`
  );

  // Simulate API call delay
  await new Promise(resolve => setTimeout(resolve, 1000));

  // Return mock gift card code
  return `${provider.toUpperCase()}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// ============================================================================
// Export Service Object
// ============================================================================

export const RedemptionService = {
  // Request management
  createRedemptionRequest,
  getRedemptionRequest,
  getStudentRedemptions,
  updateRedemptionStatus,
  cancelRedemption,

  // Payment processing
  processPayPalRedemption,
  generateGiftCard,
  convertToPlatformCredit,

  // Utilities
  calculateRedemptionFee,
  calculateNetAmount,
};

export default RedemptionService;
