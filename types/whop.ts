/**
 * Whop Platform Types
 * Type definitions for Whop API integration
 */

export interface WhopUser {
  id: string;
  email: string;
  username?: string;
  profile_pic_url?: string;
  created_at: string;
}

export interface WhopMembership {
  id: string;
  user_id: string;
  product_id: string;
  plan_id: string;
  status: 'active' | 'trialing' | 'past_due' | 'canceled' | 'expired';
  valid: boolean;
  expires_at?: string;
  renewal_period_start?: string;
  renewal_period_end?: string;
  created_at: string;
  metadata?: Record<string, any>;
}

export interface WhopCompany {
  id: string;
  name: string;
  image_url?: string;
  created_at: string;
}

export interface WhopProduct {
  id: string;
  company_id: string;
  name: string;
  visibility: 'visible' | 'hidden';
  created_at: string;
}

export interface WhopPlan {
  id: string;
  product_id: string;
  plan_type: 'one_time' | 'month' | 'year' | 'lifetime';
  price: number;
  currency: string;
  created_at: string;
}

export interface WhopOAuthTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token: string;
  scope: string;
}

export interface WhopWebhookEvent {
  id: string;
  type: WhopWebhookEventType;
  action: string;
  data: any;
  created_at: string;
}

export type WhopWebhookEventType =
  | 'membership.created'
  | 'membership.updated'
  | 'membership.deleted'
  | 'membership.went_valid'
  | 'membership.went_invalid'
  | 'payment.succeeded'
  | 'payment.failed';

export interface MembershipCreatedEvent {
  id: string;
  user_id: string;
  product_id: string;
  plan_id: string;
  status: string;
  valid: boolean;
  email: string;
  user: WhopUser;
  product: WhopProduct;
  plan: WhopPlan;
}

export interface MembershipExpiredEvent {
  id: string;
  user_id: string;
  status: string;
  valid: boolean;
}

export interface PaymentSucceededEvent {
  id: string;
  membership_id: string;
  amount: number;
  currency: string;
  status: string;
}

export interface PaymentFailedEvent {
  id: string;
  membership_id: string;
  amount: number;
  currency: string;
  error_message?: string;
}

export interface WhopSession {
  userId: string;
  email: string;
  membershipId?: string;
  membershipValid: boolean;
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

export interface WhopMembershipTier {
  tier: 'starter' | 'pro' | 'enterprise';
  features: string[];
  limits: {
    maxStudents?: number;
    maxVideos?: number;
    maxProjects?: number;
    aiAssistantAccess: boolean;
    analyticsAccess: boolean;
    customBranding: boolean;
  };
}

export interface WhopAPIError {
  error: string;
  message: string;
  status_code: number;
}

export interface WhopWebhookPayload {
  id: string;
  type: WhopWebhookEventType;
  action: string;
  data: MembershipCreatedEvent | MembershipExpiredEvent | PaymentSucceededEvent | PaymentFailedEvent;
  timestamp: number;
}

// Webhook signature verification
export interface WhopWebhookHeaders {
  'x-whop-signature': string;
  'x-whop-timestamp': string;
}

// Session storage in database
export interface WhopSessionRecord {
  user_id: string;
  whop_user_id: string;
  access_token: string;
  refresh_token: string;
  expires_at: string;
  membership_id?: string;
  membership_valid: boolean;
  created_at: string;
  updated_at: string;
}
