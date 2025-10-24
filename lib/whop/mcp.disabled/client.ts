/**
 * Whop MCP Client Wrapper
 *
 * ⚠️ CRITICAL: This is the ONLY authorized way to interact with Whop API.
 * ALL Whop operations MUST go through the global MCP server.
 *
 * Agent: Agent 14 (Whop Integration Specialist)
 * Policy: MCP-First (Mandatory)
 * Server: ~/.mcp/servers/whop/
 */

import { MCPClient } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { spawn } from 'child_process';

// ============================================================================
// Types
// ============================================================================

export interface WhopCompanyInfo {
  id: string;
  name: string;
  email: string;
  logo_url?: string;
  website?: string;
  description?: string;
}

export interface WhopMembership {
  id: string;
  user_id: string;
  product_id: string;
  plan_id: string;
  status: 'active' | 'expired' | 'cancelled' | 'trialing';
  started_at: string;
  expires_at?: string;
  metadata?: Record<string, any>;
}

export interface WhopUser {
  id: string;
  email: string;
  username?: string;
  profile_pic_url?: string;
  created_at: string;
}

export interface WhopProduct {
  id: string;
  name: string;
  description?: string;
  visibility: 'visible' | 'hidden';
  created_at: string;
}

export interface WhopPlan {
  id: string;
  product_id: string;
  name: string;
  price: number;
  currency: string;
  billing_period: 'monthly' | 'yearly' | 'lifetime';
}

export interface MembershipValidation {
  valid: boolean;
  status: string;
  expiresAt?: string;
  productId: string;
  userId: string;
  tier?: 'BASIC' | 'PRO' | 'ENTERPRISE';
}

// ============================================================================
// MCP Client Singleton
// ============================================================================

let mcpClient: MCPClient | null = null;
let isConnecting = false;
let connectionPromise: Promise<MCPClient> | null = null;

/**
 * Connect to the global Whop MCP server
 * Location: ~/.mcp/servers/whop/
 */
async function connectToMCPServer(): Promise<MCPClient> {
  // Return existing client if already connected
  if (mcpClient) {
    return mcpClient;
  }

  // Wait for existing connection attempt
  if (isConnecting && connectionPromise) {
    return connectionPromise;
  }

  // Start new connection
  isConnecting = true;
  connectionPromise = (async () => {
    try {
      // Determine MCP server path based on OS
      const isWindows = process.platform === 'win32';
      const homeDir = process.env.HOME || process.env.USERPROFILE || '';
      const mcpServerPath = isWindows
        ? `${homeDir}\\.mcp\\servers\\whop\\index.ts`
        : `${homeDir}/.mcp/servers/whop/index.ts`;

      // Spawn MCP server process
      const serverProcess = spawn('node', [
        '--import',
        'tsx/esm',
        mcpServerPath,
      ], {
        env: {
          ...process.env,
          WHOP_API_KEY: process.env.WHOP_API_KEY,
        },
      });

      // Create stdio transport
      const transport = new StdioClientTransport({
        command: serverProcess,
      });

      // Create and connect client
      const client = new MCPClient({
        name: 'whop-integration-client',
        version: '1.0.0',
      });

      await client.connect(transport);

      mcpClient = client;
      isConnecting = false;
      connectionPromise = null;

      return client;
    } catch (error) {
      isConnecting = false;
      connectionPromise = null;
      throw new Error(`Failed to connect to Whop MCP server: ${error instanceof Error ? error.message : String(error)}`);
    }
  })();

  return connectionPromise;
}

/**
 * Call a tool on the Whop MCP server
 *
 * ⚠️ CRITICAL: This is the ONLY way to call Whop API operations.
 * NEVER use @whop/api directly.
 */
async function callMCPTool<T = any>(
  toolName: string,
  params: Record<string, any> = {}
): Promise<T> {
  try {
    const client = await connectToMCPServer();

    const result = await client.callTool({
      name: `mcp__whop__${toolName}`,
      arguments: params,
    });

    // Parse result
    if (result.content && result.content.length > 0) {
      const content = result.content[0];
      if (content.type === 'text') {
        return JSON.parse(content.text) as T;
      }
    }

    throw new Error('Invalid MCP response format');
  } catch (error) {
    throw new Error(`MCP tool call failed (${toolName}): ${error instanceof Error ? error.message : String(error)}`);
  }
}

// ============================================================================
// Whop API Wrappers (MCP-First)
// ============================================================================

/**
 * Get company information
 * MCP Tool: mcp__whop__get_company_info
 */
export async function getCompanyInfo(): Promise<WhopCompanyInfo> {
  return callMCPTool<WhopCompanyInfo>('get_company_info', {});
}

/**
 * Get product details
 * MCP Tool: mcp__whop__get_product
 */
export async function getProduct(productId: string): Promise<WhopProduct> {
  return callMCPTool<WhopProduct>('get_product', { productId });
}

/**
 * List all products
 * MCP Tool: mcp__whop__list_products
 */
export async function listProducts(limit: number = 10): Promise<WhopProduct[]> {
  const result = await callMCPTool<{ data: WhopProduct[] }>('list_products', { limit });
  return result.data || [];
}

/**
 * Create a new product
 * MCP Tool: mcp__whop__create_product
 */
export async function createProduct(params: {
  name: string;
  description?: string;
  price: number;
}): Promise<WhopProduct> {
  return callMCPTool<WhopProduct>('create_product', params);
}

/**
 * Get membership details
 * MCP Tool: mcp__whop__get_membership
 */
export async function getMembership(membershipId: string): Promise<WhopMembership> {
  return callMCPTool<WhopMembership>('get_membership', { membershipId });
}

/**
 * List memberships with optional filters
 * MCP Tool: mcp__whop__list_memberships
 */
export async function listMemberships(params?: {
  userId?: string;
  productId?: string;
  status?: 'active' | 'expired' | 'cancelled';
  limit?: number;
}): Promise<WhopMembership[]> {
  const result = await callMCPTool<{ data: WhopMembership[] }>('list_memberships', params || {});
  return result.data || [];
}

/**
 * Validate membership status
 * MCP Tool: mcp__whop__validate_membership
 *
 * Returns validation result with tier mapping
 */
export async function validateMembership(membershipId: string): Promise<MembershipValidation> {
  return callMCPTool<MembershipValidation>('validate_membership', { membershipId });
}

/**
 * Get user details
 * MCP Tool: mcp__whop__get_user
 */
export async function getUser(userId: string): Promise<WhopUser> {
  return callMCPTool<WhopUser>('get_user', { userId });
}

/**
 * List users
 * MCP Tool: mcp__whop__list_users
 */
export async function listUsers(limit: number = 10): Promise<WhopUser[]> {
  const result = await callMCPTool<{ data: WhopUser[] }>('list_users', { limit });
  return result.data || [];
}

/**
 * List pricing plans for a product
 * MCP Tool: mcp__whop__list_plans
 */
export async function listPlans(productId: string): Promise<WhopPlan[]> {
  const result = await callMCPTool<{ data: WhopPlan[] }>('list_plans', { productId });
  return result.data || [];
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Map Whop plan ID to internal membership tier
 */
export function mapPlanToTier(planId: string): 'BASIC' | 'PRO' | 'ENTERPRISE' {
  // Map based on environment variables or plan ID patterns
  const basicPlans = process.env.WHOP_BASIC_PLAN_IDS?.split(',') || [];
  const proPlan = process.env.WHOP_PRO_PLAN_IDS?.split(',') || [];
  const enterprisePlans = process.env.WHOP_ENTERPRISE_PLAN_IDS?.split(',') || [];

  if (basicPlans.includes(planId)) return 'BASIC';
  if (proPlan.includes(planId)) return 'PRO';
  if (enterprisePlans.includes(planId)) return 'ENTERPRISE';

  // Default to BASIC if unknown
  return 'BASIC';
}

/**
 * Check if membership is currently active
 */
export function isMembershipActive(membership: WhopMembership): boolean {
  if (membership.status !== 'active') return false;

  // Check expiration
  if (membership.expires_at) {
    const expiresAt = new Date(membership.expires_at);
    if (expiresAt < new Date()) return false;
  }

  return true;
}

/**
 * Disconnect from MCP server (cleanup)
 */
export async function disconnectMCPServer(): Promise<void> {
  if (mcpClient) {
    await mcpClient.close();
    mcpClient = null;
  }
}

// ============================================================================
// Error Handling
// ============================================================================

export class WhopMCPError extends Error {
  constructor(
    message: string,
    public readonly tool: string,
    public readonly originalError?: Error
  ) {
    super(message);
    this.name = 'WhopMCPError';
  }
}

/**
 * Wrap MCP calls with error handling
 */
export async function safeMCPCall<T>(
  toolName: string,
  params: Record<string, any> = {}
): Promise<{ data: T | null; error: string | null }> {
  try {
    const data = await callMCPTool<T>(toolName, params);
    return { data, error: null };
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
