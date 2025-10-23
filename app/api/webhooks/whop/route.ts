/**
 * Whop MCP Webhook Endpoint
 * Handles incoming events from Whop for creator lifecycle management
 */

import { NextRequest } from 'next/server';
import { handleWhopWebhook, handleWebhookHealthCheck } from '@/mcp/webhookHandler';

/**
 * POST /api/webhooks/whop
 * Receives webhook events from Whop MCP
 */
export async function POST(req: NextRequest) {
  return await handleWhopWebhook(req);
}

/**
 * GET /api/webhooks/whop
 * Health check endpoint
 */
export async function GET() {
  return handleWebhookHealthCheck();
}
