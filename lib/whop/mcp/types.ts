/**
 * Whop MCP Type Definitions
 *
 * Shared types for Whop integration via MCP server
 * Agent: Agent 14 (Whop Integration Specialist)
 */

// Re-export types from client for convenience
export type {
  WhopCompanyInfo,
  WhopMembership,
  WhopUser,
  WhopProduct,
  WhopPlan,
  MembershipValidation,
} from './client';

// Additional types for Whop integration

export type MembershipTier = 'BASIC' | 'PRO' | 'ENTERPRISE';

export type MembershipStatus = 'active' | 'expired' | 'cancelled' | 'trialing';

export interface WhopSession {
  userId: string;
  membershipId: string;
  companyId?: string;
  tier: MembershipTier;
  expiresAt?: Date;
}

export interface WhopWebhookEvent {
  id: string;
  type: string;
  data: any;
  created_at: string;
}

export interface WhopOAuthTokens {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  token_type: string;
}
