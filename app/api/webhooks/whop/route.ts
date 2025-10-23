/**
 * Whop Webhook Endpoint
 * Handles incoming events from Whop for creator lifecycle management
 */

import { NextRequest, NextResponse } from 'next/server';
import { WhopWebhookHandler } from '@/lib/whop/webhooks';

/**
 * POST /api/webhooks/whop
 * Receives webhook events from Whop
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.text();
    const signature = req.headers.get('x-whop-signature') || '';
    const timestamp = req.headers.get('x-whop-timestamp') || '';

    // Verify signature
    const isValid = WhopWebhookHandler.verifySignature(body, signature, timestamp);
    if (!isValid) {
      return NextResponse.json(
        { error: 'Invalid webhook signature' },
        { status: 401 }
      );
    }

    // Verify timestamp
    const isTimestampValid = WhopWebhookHandler.verifyTimestamp(timestamp);
    if (!isTimestampValid) {
      return NextResponse.json(
        { error: 'Invalid or expired timestamp' },
        { status: 401 }
      );
    }

    // Parse and handle webhook
    const payload = JSON.parse(body);
    const result = await WhopWebhookHandler.handleWebhook(payload);

    if (!result.success) {
      return NextResponse.json(
        { error: result.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, message: result.message });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/webhooks/whop
 * Health check endpoint
 */
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    service: 'whop-webhook-handler',
    timestamp: new Date().toISOString(),
  });
}
