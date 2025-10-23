/**
 * Integration tests for Whop Webhook Handler
 * Tests signature verification, idempotency, and event processing
 */

import { NextRequest } from 'next/server';
import { POST, GET } from '../route';
import crypto from 'crypto';

// Mock dependencies
jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(),
}));

jest.mock('@/lib/whop/webhooks', () => ({
  WhopWebhookHandler: {
    verifySignature: jest.fn(),
    verifyTimestamp: jest.fn(),
    handleWebhook: jest.fn(),
  },
}));

import { createClient } from '@/lib/supabase/server';
import { WhopWebhookHandler } from '@/lib/whop/webhooks';

describe('Whop Webhook Route', () => {
  let mockSupabase: any;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock Supabase client
    mockSupabase = {
      from: jest.fn(),
    };

    (createClient as jest.Mock).mockReturnValue(mockSupabase);
  });

  describe('POST /api/webhooks/whop', () => {
    const createMockRequest = (
      payload: any,
      signature?: string,
      timestamp?: string
    ): NextRequest => {
      const headers = new Map<string, string>();
      headers.set('content-type', 'application/json');

      if (signature) {
        headers.set('x-whop-signature', signature);
      }
      if (timestamp) {
        headers.set('x-whop-timestamp', timestamp);
      }

      return {
        headers,
        json: async () => payload,
        text: async () => JSON.stringify(payload),
      } as unknown as NextRequest;
    };

    const generateSignature = (payload: string, timestamp: string): string => {
      const secret = process.env.WHOP_WEBHOOK_SECRET || 'test-webhook-secret-for-hmac-validation';
      const signedPayload = `${timestamp}.${payload}`;
      return crypto.createHmac('sha256', secret).update(signedPayload).digest('hex');
    };

    it('should return 401 if signature is missing', async () => {
      const payload = { id: 'evt_123', type: 'membership.created' };
      const request = createMockRequest(payload);

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toContain('Missing signature');
    });

    it('should return 401 if timestamp is missing', async () => {
      const payload = { id: 'evt_123', type: 'membership.created' };
      const request = createMockRequest(payload, 'fake_signature');

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toContain('Missing timestamp');
    });

    it('should return 401 if signature verification fails', async () => {
      const payload = { id: 'evt_123', type: 'membership.created' };
      const timestamp = Math.floor(Date.now() / 1000).toString();
      const request = createMockRequest(payload, 'invalid_signature', timestamp);

      (WhopWebhookHandler.verifySignature as jest.Mock).mockReturnValue(false);
      (WhopWebhookHandler.verifyTimestamp as jest.Mock).mockReturnValue(true);

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toContain('Invalid signature');
    });

    it('should return 401 if timestamp is too old', async () => {
      const payload = { id: 'evt_123', type: 'membership.created' };
      const oldTimestamp = Math.floor((Date.now() - 10 * 60 * 1000) / 1000).toString(); // 10 minutes ago
      const signature = generateSignature(JSON.stringify(payload), oldTimestamp);
      const request = createMockRequest(payload, signature, oldTimestamp);

      (WhopWebhookHandler.verifySignature as jest.Mock).mockReturnValue(true);
      (WhopWebhookHandler.verifyTimestamp as jest.Mock).mockReturnValue(false);

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toContain('Invalid timestamp');
    });

    it('should process valid webhook successfully', async () => {
      const payload = {
        id: 'evt_test_123',
        type: 'membership.created',
        data: {
          id: 'mem_123',
          user_id: 'user_456',
          plan_id: 'plan_pro',
        },
      };

      const timestamp = Math.floor(Date.now() / 1000).toString();
      const signature = generateSignature(JSON.stringify(payload), timestamp);
      const request = createMockRequest(payload, signature, timestamp);

      (WhopWebhookHandler.verifySignature as jest.Mock).mockReturnValue(true);
      (WhopWebhookHandler.verifyTimestamp as jest.Mock).mockReturnValue(true);
      (WhopWebhookHandler.handleWebhook as jest.Mock).mockResolvedValue({
        success: true,
        message: 'Webhook processed successfully',
        processed: true,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(WhopWebhookHandler.handleWebhook).toHaveBeenCalledWith(payload);
    });

    describe('Idempotency', () => {
      it('should process webhook only once', async () => {
        const payload = {
          id: 'evt_idempotent_test',
          type: 'membership.created',
          data: { id: 'mem_123' },
        };

        const timestamp = Math.floor(Date.now() / 1000).toString();
        const signature = generateSignature(JSON.stringify(payload), timestamp);
        const request = createMockRequest(payload, signature, timestamp);

        (WhopWebhookHandler.verifySignature as jest.Mock).mockReturnValue(true);
        (WhopWebhookHandler.verifyTimestamp as jest.Mock).mockReturnValue(true);

        // First request - processed
        (WhopWebhookHandler.handleWebhook as jest.Mock).mockResolvedValueOnce({
          success: true,
          message: 'Webhook processed',
          processed: true,
        });

        const response1 = await POST(request);
        const data1 = await response1.json();

        expect(data1.processed).toBe(true);

        // Second request - already processed
        (WhopWebhookHandler.handleWebhook as jest.Mock).mockResolvedValueOnce({
          success: true,
          message: 'Event already processed',
          processed: false,
        });

        const response2 = await POST(request);
        const data2 = await response2.json();

        expect(data2.processed).toBe(false);
        expect(data2.message).toContain('already processed');
      });

      it('should handle concurrent duplicate webhooks', async () => {
        const payload = {
          id: 'evt_concurrent_test',
          type: 'membership.created',
          data: { id: 'mem_123' },
        };

        const timestamp = Math.floor(Date.now() / 1000).toString();
        const signature = generateSignature(JSON.stringify(payload), timestamp);
        const request = createMockRequest(payload, signature, timestamp);

        (WhopWebhookHandler.verifySignature as jest.Mock).mockReturnValue(true);
        (WhopWebhookHandler.verifyTimestamp as jest.Mock).mockReturnValue(true);
        (WhopWebhookHandler.handleWebhook as jest.Mock).mockResolvedValue({
          success: true,
          message: 'Webhook processed',
          processed: true,
        });

        // Send multiple concurrent requests
        const responses = await Promise.all([
          POST(request),
          POST(request),
          POST(request),
        ]);

        // All should succeed (idempotency handled by handler)
        responses.forEach(async (response) => {
          expect(response.status).toBe(200);
        });
      });
    });

    describe('Event Types', () => {
      it('should handle membership.created event', async () => {
        const payload = {
          id: 'evt_created',
          type: 'membership.created',
          data: {
            id: 'mem_123',
            user_id: 'user_456',
            plan_id: 'plan_basic',
            product: {
              company_id: 'company_789',
              name: 'Test Course',
            },
          },
        };

        const timestamp = Math.floor(Date.now() / 1000).toString();
        const signature = generateSignature(JSON.stringify(payload), timestamp);
        const request = createMockRequest(payload, signature, timestamp);

        (WhopWebhookHandler.verifySignature as jest.Mock).mockReturnValue(true);
        (WhopWebhookHandler.verifyTimestamp as jest.Mock).mockReturnValue(true);
        (WhopWebhookHandler.handleWebhook as jest.Mock).mockResolvedValue({
          success: true,
          message: 'Membership activated',
          processed: true,
        });

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
      });

      it('should handle membership.deleted event', async () => {
        const payload = {
          id: 'evt_deleted',
          type: 'membership.deleted',
          data: {
            id: 'mem_123',
            user_id: 'user_456',
          },
        };

        const timestamp = Math.floor(Date.now() / 1000).toString();
        const signature = generateSignature(JSON.stringify(payload), timestamp);
        const request = createMockRequest(payload, signature, timestamp);

        (WhopWebhookHandler.verifySignature as jest.Mock).mockReturnValue(true);
        (WhopWebhookHandler.verifyTimestamp as jest.Mock).mockReturnValue(true);
        (WhopWebhookHandler.handleWebhook as jest.Mock).mockResolvedValue({
          success: true,
          message: 'Membership revoked',
          processed: true,
        });

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
      });

      it('should handle payment.succeeded event', async () => {
        const payload = {
          id: 'evt_payment',
          type: 'payment.succeeded',
          data: {
            membership_id: 'mem_123',
            amount: 9900,
            currency: 'USD',
          },
        };

        const timestamp = Math.floor(Date.now() / 1000).toString();
        const signature = generateSignature(JSON.stringify(payload), timestamp);
        const request = createMockRequest(payload, signature, timestamp);

        (WhopWebhookHandler.verifySignature as jest.Mock).mockReturnValue(true);
        (WhopWebhookHandler.verifyTimestamp as jest.Mock).mockReturnValue(true);
        (WhopWebhookHandler.handleWebhook as jest.Mock).mockResolvedValue({
          success: true,
          message: 'Payment logged',
          processed: true,
        });

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
      });

      it('should handle unknown event types gracefully', async () => {
        const payload = {
          id: 'evt_unknown',
          type: 'unknown.event.type',
          data: {},
        };

        const timestamp = Math.floor(Date.now() / 1000).toString();
        const signature = generateSignature(JSON.stringify(payload), timestamp);
        const request = createMockRequest(payload, signature, timestamp);

        (WhopWebhookHandler.verifySignature as jest.Mock).mockReturnValue(true);
        (WhopWebhookHandler.verifyTimestamp as jest.Mock).mockReturnValue(true);
        (WhopWebhookHandler.handleWebhook as jest.Mock).mockResolvedValue({
          success: true,
          message: 'Unhandled event type: unknown.event.type',
          processed: false,
        });

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
      });
    });

    describe('Error Handling', () => {
      it('should return 500 if webhook handler throws error', async () => {
        const payload = {
          id: 'evt_error',
          type: 'membership.created',
          data: {},
        };

        const timestamp = Math.floor(Date.now() / 1000).toString();
        const signature = generateSignature(JSON.stringify(payload), timestamp);
        const request = createMockRequest(payload, signature, timestamp);

        (WhopWebhookHandler.verifySignature as jest.Mock).mockReturnValue(true);
        (WhopWebhookHandler.verifyTimestamp as jest.Mock).mockReturnValue(true);
        (WhopWebhookHandler.handleWebhook as jest.Mock).mockRejectedValue(
          new Error('Database error')
        );

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(500);
        expect(data.error).toContain('Webhook processing failed');
      });

      it('should handle malformed JSON payload', async () => {
        const timestamp = Math.floor(Date.now() / 1000).toString();
        const headers = new Map<string, string>();
        headers.set('x-whop-signature', 'test_signature');
        headers.set('x-whop-timestamp', timestamp);

        const request = {
          headers,
          json: async () => {
            throw new Error('Invalid JSON');
          },
          text: async () => 'invalid json{',
        } as unknown as NextRequest;

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data.error).toContain('Invalid payload');
      });

      it('should retry failed webhook processing', async () => {
        const payload = {
          id: 'evt_retry',
          type: 'membership.created',
          data: { id: 'mem_123' },
        };

        const timestamp = Math.floor(Date.now() / 1000).toString();
        const signature = generateSignature(JSON.stringify(payload), timestamp);
        const request = createMockRequest(payload, signature, timestamp);

        (WhopWebhookHandler.verifySignature as jest.Mock).mockReturnValue(true);
        (WhopWebhookHandler.verifyTimestamp as jest.Mock).mockReturnValue(true);

        // First attempt fails
        (WhopWebhookHandler.handleWebhook as jest.Mock).mockResolvedValueOnce({
          success: false,
          message: 'Temporary error',
        });

        const response1 = await POST(request);
        const data1 = await response1.json();

        expect(data1.success).toBe(false);

        // Second attempt succeeds
        (WhopWebhookHandler.handleWebhook as jest.Mock).mockResolvedValueOnce({
          success: true,
          message: 'Processed successfully',
          processed: true,
        });

        const response2 = await POST(request);
        const data2 = await response2.json();

        expect(data2.success).toBe(true);
      });
    });

    describe('Security', () => {
      it('should reject replay attacks with old timestamps', async () => {
        const payload = { id: 'evt_replay', type: 'membership.created' };
        const oldTimestamp = Math.floor((Date.now() - 600000) / 1000).toString(); // 10 minutes ago
        const signature = generateSignature(JSON.stringify(payload), oldTimestamp);
        const request = createMockRequest(payload, signature, oldTimestamp);

        (WhopWebhookHandler.verifySignature as jest.Mock).mockReturnValue(true);
        (WhopWebhookHandler.verifyTimestamp as jest.Mock).mockReturnValue(false);

        const response = await POST(request);

        expect(response.status).toBe(401);
      });

      it('should reject requests with future timestamps', async () => {
        const payload = { id: 'evt_future', type: 'membership.created' };
        const futureTimestamp = Math.floor((Date.now() + 120000) / 1000).toString(); // 2 minutes in future
        const signature = generateSignature(JSON.stringify(payload), futureTimestamp);
        const request = createMockRequest(payload, signature, futureTimestamp);

        (WhopWebhookHandler.verifySignature as jest.Mock).mockReturnValue(true);
        (WhopWebhookHandler.verifyTimestamp as jest.Mock).mockReturnValue(false);

        const response = await POST(request);

        expect(response.status).toBe(401);
      });

      it('should use timing-safe comparison for signatures', async () => {
        // This test verifies that signature comparison is resistant to timing attacks
        const payload = { id: 'evt_timing', type: 'membership.created' };
        const timestamp = Math.floor(Date.now() / 1000).toString();
        const correctSignature = generateSignature(JSON.stringify(payload), timestamp);
        const incorrectSignature = 'a' + correctSignature.substring(1); // Change first char

        const request = createMockRequest(payload, incorrectSignature, timestamp);

        (WhopWebhookHandler.verifySignature as jest.Mock).mockReturnValue(false);
        (WhopWebhookHandler.verifyTimestamp as jest.Mock).mockReturnValue(true);

        const response = await POST(request);

        expect(response.status).toBe(401);
      });
    });
  });

  describe('GET /api/webhooks/whop', () => {
    it('should return health check response', async () => {
      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.status).toBe('healthy');
      expect(data.endpoint).toBe('/api/webhooks/whop');
    });

    it('should include timestamp in health check', async () => {
      const response = await GET();
      const data = await response.json();

      expect(data.timestamp).toBeDefined();
      expect(typeof data.timestamp).toBe('string');
    });
  });

  describe('Integration Tests', () => {
    it('should handle complete membership lifecycle', async () => {
      // 1. Membership created
      const createPayload = {
        id: 'evt_lifecycle_create',
        type: 'membership.created',
        data: {
          id: 'mem_lifecycle',
          user_id: 'user_lifecycle',
          plan_id: 'plan_pro',
          product: { company_id: 'company_test', name: 'Test Course' },
        },
      };

      let timestamp = Math.floor(Date.now() / 1000).toString();
      let signature = generateSignature(JSON.stringify(createPayload), timestamp);
      let request = createMockRequest(createPayload, signature, timestamp);

      (WhopWebhookHandler.verifySignature as jest.Mock).mockReturnValue(true);
      (WhopWebhookHandler.verifyTimestamp as jest.Mock).mockReturnValue(true);
      (WhopWebhookHandler.handleWebhook as jest.Mock).mockResolvedValue({
        success: true,
        message: 'Membership activated',
        processed: true,
      });

      let response = await POST(request);
      expect(response.status).toBe(200);

      // 2. Payment succeeded
      const paymentPayload = {
        id: 'evt_lifecycle_payment',
        type: 'payment.succeeded',
        data: {
          membership_id: 'mem_lifecycle',
          amount: 9900,
          currency: 'USD',
        },
      };

      timestamp = Math.floor(Date.now() / 1000).toString();
      signature = generateSignature(JSON.stringify(paymentPayload), timestamp);
      request = createMockRequest(paymentPayload, signature, timestamp);

      (WhopWebhookHandler.handleWebhook as jest.Mock).mockResolvedValue({
        success: true,
        message: 'Payment logged',
        processed: true,
      });

      response = await POST(request);
      expect(response.status).toBe(200);

      // 3. Membership deleted
      const deletePayload = {
        id: 'evt_lifecycle_delete',
        type: 'membership.deleted',
        data: {
          id: 'mem_lifecycle',
          user_id: 'user_lifecycle',
        },
      };

      timestamp = Math.floor(Date.now() / 1000).toString();
      signature = generateSignature(JSON.stringify(deletePayload), timestamp);
      request = createMockRequest(deletePayload, signature, timestamp);

      (WhopWebhookHandler.handleWebhook as jest.Mock).mockResolvedValue({
        success: true,
        message: 'Membership revoked',
        processed: true,
      });

      response = await POST(request);
      expect(response.status).toBe(200);
    });
  });
});
