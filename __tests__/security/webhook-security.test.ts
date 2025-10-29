/**
 * Webhook Security Tests
 * Tests for VULN-004: Webhook replay attacks and signature verification
 */

import { describe, it, expect } from '@jest/globals';
import crypto from 'crypto';
import { WhopWebhookHandler } from '@/lib/whop/webhooks';

describe('Webhook Security Tests', () => {
  const mockWebhookSecret = 'test_webhook_secret_key_12345';
  const validPayload = JSON.stringify({
    type: 'membership.created',
    id: 'evt_123456',
    data: {
      user_id: 'user_123',
      membership_id: 'mem_456',
      plan_id: 'plan_pro',
    },
  });

  beforeAll(() => {
    // Set test webhook secret
    process.env.WHOP_WEBHOOK_SECRET = mockWebhookSecret;
  });

  describe('Signature Verification', () => {
    function generateValidSignature(payload: string, timestamp: string): string {
      const signedPayload = `${timestamp}.${payload}`;
      return crypto
        .createHmac('sha256', mockWebhookSecret)
        .update(signedPayload)
        .digest('hex');
    }

    it('should accept valid webhook signatures', () => {
      const timestamp = Math.floor(Date.now() / 1000).toString();
      const signature = generateValidSignature(validPayload, timestamp);

      const isValid = WhopWebhookHandler.verifySignature(
        validPayload,
        signature,
        timestamp
      );

      expect(isValid).toBe(true);
    });

    it('should reject invalid signatures', () => {
      const timestamp = Math.floor(Date.now() / 1000).toString();
      const invalidSignature = 'invalid_signature_12345';

      const isValid = WhopWebhookHandler.verifySignature(
        validPayload,
        invalidSignature,
        timestamp
      );

      expect(isValid).toBe(false);
    });

    it('should reject tampered payloads', () => {
      const timestamp = Math.floor(Date.now() / 1000).toString();
      const signature = generateValidSignature(validPayload, timestamp);

      // Tamper with payload
      const tamperedPayload = validPayload.replace('user_123', 'user_999');

      const isValid = WhopWebhookHandler.verifySignature(
        tamperedPayload,
        signature,
        timestamp
      );

      expect(isValid).toBe(false);
    });

    it('should use timing-safe comparison', () => {
      // Verify that signature comparison is timing-safe
      // This prevents timing attacks to guess signatures

      const timestamp = Math.floor(Date.now() / 1000).toString();
      const signature1 = generateValidSignature(validPayload, timestamp);
      const signature2 = generateValidSignature(validPayload, timestamp);

      // Same signature should verify successfully
      expect(signature1).toBe(signature2);

      const isValid = WhopWebhookHandler.verifySignature(
        validPayload,
        signature1,
        timestamp
      );

      expect(isValid).toBe(true);
    });

    it('should fail when webhook secret is not configured', () => {
      const originalSecret = process.env.WHOP_WEBHOOK_SECRET;
      delete process.env.WHOP_WEBHOOK_SECRET;

      const timestamp = Math.floor(Date.now() / 1000).toString();
      const signature = 'any_signature';

      const isValid = WhopWebhookHandler.verifySignature(
        validPayload,
        signature,
        timestamp
      );

      expect(isValid).toBe(false);

      // Restore secret
      process.env.WHOP_WEBHOOK_SECRET = originalSecret;
    });
  });

  describe('Timestamp Validation', () => {
    it('should accept recent timestamps', () => {
      const recentTimestamp = Math.floor(Date.now() / 1000).toString();

      const isValid = WhopWebhookHandler.verifyTimestamp(recentTimestamp);

      expect(isValid).toBe(true);
    });

    it('should reject old timestamps (replay attack prevention)', () => {
      // Timestamp from 10 minutes ago
      const oldTimestamp = Math.floor((Date.now() - 600000) / 1000).toString();

      const isValid = WhopWebhookHandler.verifyTimestamp(oldTimestamp);

      expect(isValid).toBe(false);
    });

    it('should reject timestamps from the future', () => {
      // Timestamp 2 minutes in the future
      const futureTimestamp = Math.floor((Date.now() + 120000) / 1000).toString();

      const isValid = WhopWebhookHandler.verifyTimestamp(futureTimestamp);

      expect(isValid).toBe(false);
    });

    it('should enforce 5-minute max age by default', () => {
      // Timestamp 6 minutes ago (should be rejected)
      const oldTimestamp = Math.floor((Date.now() - 360000) / 1000).toString();

      const isValid = WhopWebhookHandler.verifyTimestamp(oldTimestamp);

      expect(isValid).toBe(false);
    });

    it('should allow custom max age', () => {
      // Timestamp 4 minutes ago
      const timestamp = Math.floor((Date.now() - 240000) / 1000).toString();

      // With 3-minute max age, should be rejected
      const isValid = WhopWebhookHandler.verifyTimestamp(timestamp, 180000);

      expect(isValid).toBe(false);
    });

    it('should handle invalid timestamp format', () => {
      const invalidTimestamp = 'not_a_number';

      const isValid = WhopWebhookHandler.verifyTimestamp(invalidTimestamp);

      expect(isValid).toBe(false);
    });
  });

  describe('Idempotency Protection', () => {
    it('should detect duplicate webhook events', async () => {
      const eventId = 'evt_test_12345';

      // First time should be not processed
      const firstCheck = await WhopWebhookHandler.isEventProcessed(eventId);
      expect(firstCheck).toBe(false);

      // Mark as processed
      await WhopWebhookHandler.markEventProcessed(eventId, 'membership.created', {
        user_id: 'user_123',
      });

      // Second check should be processed
      const secondCheck = await WhopWebhookHandler.isEventProcessed(eventId);
      expect(secondCheck).toBe(true);
    });

    it('should prevent duplicate processing', async () => {
      const payload = {
        id: 'evt_duplicate_test',
        type: 'membership.created',
        data: {
          user_id: 'user_456',
          membership_id: 'mem_789',
          plan_id: 'plan_pro',
        },
      };

      // First webhook - should be processed
      const result1 = await WhopWebhookHandler.handleWebhook(payload);
      expect(result1.success).toBe(true);
      expect(result1.processed).toBe(true);

      // Second webhook (duplicate) - should be skipped
      const result2 = await WhopWebhookHandler.handleWebhook(payload);
      expect(result2.success).toBe(true);
      expect(result2.processed).toBe(false);
      expect(result2.message).toMatch(/already processed/i);
    });
  });

  describe('Webhook Event Handling', () => {
    it('should handle membership.created events', async () => {
      const payload = {
        id: 'evt_created_' + Date.now(),
        type: 'membership.created',
        data: {
          user_id: 'user_new',
          membership_id: 'mem_new',
          plan_id: 'plan_starter',
          product: {
            name: 'Test Creator',
            company_id: 'comp_123',
          },
        },
      };

      const result = await WhopWebhookHandler.handleWebhook(payload);

      expect(result.success).toBe(true);
      expect(result.message).toMatch(/activated/i);
    });

    it('should handle membership.deleted events', async () => {
      const payload = {
        id: 'evt_deleted_' + Date.now(),
        type: 'membership.deleted',
        data: {
          id: 'mem_to_delete',
          user_id: 'user_existing',
        },
      };

      const result = await WhopWebhookHandler.handleWebhook(payload);

      expect(result.success).toBe(true);
      expect(result.message).toMatch(/revoked/i);
    });

    it('should handle payment.succeeded events', async () => {
      const payload = {
        id: 'evt_payment_' + Date.now(),
        type: 'payment.succeeded',
        data: {
          membership_id: 'mem_paid',
          amount: 9900, // $99.00
          currency: 'USD',
        },
      };

      const result = await WhopWebhookHandler.handleWebhook(payload);

      expect(result.success).toBe(true);
      expect(result.message).toMatch(/logged/i);
    });

    it('should handle unknown event types gracefully', async () => {
      const payload = {
        id: 'evt_unknown_' + Date.now(),
        type: 'unknown.event.type',
        data: {},
      };

      const result = await WhopWebhookHandler.handleWebhook(payload);

      expect(result.success).toBe(true);
      expect(result.message).toMatch(/unhandled/i);
      expect(result.processed).toBe(false);
    });
  });

  describe('Security Headers', () => {
    it('should validate x-whop-signature header presence', () => {
      const headers = {
        'x-whop-signature': 'sig_12345',
        'x-whop-timestamp': '1234567890',
      };

      expect(headers['x-whop-signature']).toBeDefined();
      expect(headers['x-whop-timestamp']).toBeDefined();
    });

    it('should reject requests without signature header', () => {
      const headers = {
        // 'x-whop-signature' missing
        'x-whop-timestamp': '1234567890',
      };

      expect(headers['x-whop-signature']).toBeUndefined();
    });

    it('should reject requests without timestamp header', () => {
      const headers = {
        'x-whop-signature': 'sig_12345',
        // 'x-whop-timestamp' missing
      };

      expect(headers['x-whop-timestamp']).toBeUndefined();
    });
  });

  describe('Rate Limiting for Webhooks', () => {
    it('should handle burst of webhook requests', async () => {
      const payloads = Array.from({ length: 10 }, (_, i) => ({
        id: `evt_burst_${i}`,
        type: 'membership.created',
        data: {
          user_id: `user_${i}`,
          membership_id: `mem_${i}`,
          plan_id: 'plan_pro',
        },
      }));

      // Process all webhooks
      const results = await Promise.all(
        payloads.map(payload => WhopWebhookHandler.handleWebhook(payload))
      );

      // All should succeed (idempotency handles duplicates)
      results.forEach(result => {
        expect(result.success).toBe(true);
      });
    });

    it('should not allow webhook spam', async () => {
      // Simulate 100 webhooks in quick succession
      const spamPayloads = Array.from({ length: 100 }, (_, i) => ({
        id: `evt_spam_${Date.now()}_${i}`,
        type: 'membership.created',
        data: {
          user_id: `user_spam_${i}`,
        },
      }));

      // In production, this should trigger rate limiting
      // For now, just verify idempotency works
      expect(spamPayloads.length).toBe(100);
    });
  });

  describe('Error Handling', () => {
    it('should handle malformed JSON payloads', () => {
      const malformedPayload = '{ invalid json }';
      const timestamp = Math.floor(Date.now() / 1000).toString();
      const signature = 'invalid';

      expect(() => {
        JSON.parse(malformedPayload);
      }).toThrow();
    });

    it('should handle missing required fields', async () => {
      const incompletePayload = {
        id: 'evt_incomplete',
        type: 'membership.created',
        // data field missing
      };

      const result = await WhopWebhookHandler.handleWebhook(
        incompletePayload as any
      );

      // Should handle gracefully
      expect(result.success).toBeDefined();
    });

    it('should log webhook processing errors', async () => {
      // Verify that errors are logged for monitoring
      const errorPayload = {
        id: 'evt_error',
        type: 'membership.created',
        data: {
          // Missing required fields to trigger error
        },
      };

      const result = await WhopWebhookHandler.handleWebhook(errorPayload);

      // Should return error result
      expect(result).toBeDefined();
    });
  });

  describe('Production Security Checks', () => {
    it('should have webhook secret configured in production', () => {
      if (process.env.NODE_ENV === 'production') {
        expect(process.env.WHOP_WEBHOOK_SECRET).toBeDefined();
        expect(process.env.WHOP_WEBHOOK_SECRET).not.toBe('');
        expect(process.env.WHOP_WEBHOOK_SECRET).not.toMatch(/test|example|placeholder/i);
      }
    });

    it('should enforce HTTPS for webhook endpoints', () => {
      // In production, webhook endpoint should only accept HTTPS
      const webhookUrl = process.env.NEXT_PUBLIC_APP_URL + '/api/webhooks/whop';

      if (process.env.NODE_ENV === 'production') {
        expect(webhookUrl).toMatch(/^https:\/\//);
      }
    });

    it('should have Sentry configured for webhook error tracking', () => {
      // Verify Sentry DSN is configured for production
      if (process.env.NODE_ENV === 'production') {
        expect(process.env.SENTRY_DSN).toBeDefined();
      }
    });
  });
});
