/**
 * Whop MCP Module
 *
 * Central export for all Whop MCP functionality
 * ⚠️ ALL Whop API interactions MUST use this module
 *
 * Agent: Agent 14 (Whop Integration Specialist)
 * Policy: MCP-First (Mandatory)
 */

//Export all MCP client functions
export {
  getCompanyInfo,
  getProduct,
  listProducts,
  createProduct,
  getMembership,
  listMemberships,
  validateMembership,
  getUser,
  listUsers,
  listPlans,
  mapPlanToTier,
  isMembershipActive,
  disconnectMCPServer,
  safeMCPCall,
  WhopMCPError,
} from './client';

// Export all types
export type {
  WhopCompanyInfo,
  WhopMembership,
  WhopUser,
  WhopProduct,
  WhopPlan,
  MembershipValidation,
  MembershipTier,
  MembershipStatus,
  WhopSession,
  WhopWebhookEvent,
  WhopOAuthTokens,
} from './types';
