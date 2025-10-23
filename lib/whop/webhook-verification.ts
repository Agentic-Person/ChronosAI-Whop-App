/**
 * Whop Webhook Signature Verification
 *
 * Verifies HMAC-SHA256 signatures from Whop webhooks
 * Agent: Agent 14 (Whop Integration Specialist)
 */

import crypto from 'crypto';

/**
 * Verify Whop webhook signature
 *
 * @param payload - Raw request body (string)
 * @param signature - x-whop-signature header value
 * @returns true if signature is valid
 */
export function verifyWhopSignature(payload: string, signature: string): boolean {
  const webhookSecret = process.env.WHOP_WEBHOOK_SECRET;

  if (!webhookSecret) {
    throw new Error('WHOP_WEBHOOK_SECRET is not configured');
  }

  try {
    // Compute HMAC-SHA256 signature
    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(payload, 'utf8')
      .digest('hex');

    // Compare signatures (timing-safe comparison)
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  } catch (error) {
    console.error('Signature verification error:', error);
    return false;
  }
}
