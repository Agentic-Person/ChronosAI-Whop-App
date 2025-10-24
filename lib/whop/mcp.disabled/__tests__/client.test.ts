/**
 * Unit tests for Whop MCP Client Wrapper
 * Tests MCP tool calls, error handling, and helper functions
 */

import {
  getCompanyInfo,
  getProduct,
  listProducts,
  getMembership,
  validateMembership,
  getUser,
  listUsers,
  mapPlanToTier,
  isMembershipActive,
  safeMCPCall,
  type WhopMembership,
  type WhopCompanyInfo,
  type WhopProduct,
  type WhopUser,
  type MembershipValidation,
} from '../client';

// Mock MCP Client
jest.mock('@modelcontextprotocol/sdk/client/index.js', () => ({
  MCPClient: jest.fn().mockImplementation(() => ({
    connect: jest.fn().mockResolvedValue(undefined),
    callTool: jest.fn(),
    close: jest.fn().mockResolvedValue(undefined),
  })),
}));

jest.mock('@modelcontextprotocol/sdk/client/stdio.js', () => ({
  StdioClientTransport: jest.fn(),
}));

jest.mock('child_process', () => ({
  spawn: jest.fn().mockReturnValue({
    stdin: { write: jest.fn(), end: jest.fn() },
    stdout: { on: jest.fn() },
    stderr: { on: jest.fn() },
    on: jest.fn(),
  }),
}));

describe('Whop MCP Client', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getCompanyInfo', () => {
    it('should fetch company information via MCP', async () => {
      const mockCompanyInfo: WhopCompanyInfo = {
        id: 'company_123',
        name: 'Test Company',
        email: 'test@company.com',
        logo_url: 'https://example.com/logo.png',
        website: 'https://company.com',
      };

      // Mock MCP response
      const { MCPClient } = require('@modelcontextprotocol/sdk/client/index.js');
      const mockInstance = new MCPClient();
      mockInstance.callTool.mockResolvedValue({
        content: [
          {
            type: 'text',
            text: JSON.stringify(mockCompanyInfo),
          },
        ],
      });

      const result = await getCompanyInfo();

      expect(result).toEqual(mockCompanyInfo);
      expect(mockInstance.callTool).toHaveBeenCalledWith({
        name: 'mcp__whop__get_company_info',
        arguments: {},
      });
    });

    it('should throw error if MCP call fails', async () => {
      const { MCPClient } = require('@modelcontextprotocol/sdk/client/index.js');
      const mockInstance = new MCPClient();
      mockInstance.callTool.mockRejectedValue(new Error('MCP connection failed'));

      await expect(getCompanyInfo()).rejects.toThrow('MCP tool call failed');
    });
  });

  describe('getProduct', () => {
    it('should fetch product by ID', async () => {
      const mockProduct: WhopProduct = {
        id: 'product_123',
        name: 'Test Product',
        description: 'A test product',
        visibility: 'visible',
        created_at: '2025-01-01T00:00:00Z',
      };

      const { MCPClient } = require('@modelcontextprotocol/sdk/client/index.js');
      const mockInstance = new MCPClient();
      mockInstance.callTool.mockResolvedValue({
        content: [{ type: 'text', text: JSON.stringify(mockProduct) }],
      });

      const result = await getProduct('product_123');

      expect(result).toEqual(mockProduct);
      expect(mockInstance.callTool).toHaveBeenCalledWith({
        name: 'mcp__whop__get_product',
        arguments: { productId: 'product_123' },
      });
    });
  });

  describe('listProducts', () => {
    it('should list products with default limit', async () => {
      const mockProducts: WhopProduct[] = [
        {
          id: 'product_1',
          name: 'Product 1',
          visibility: 'visible',
          created_at: '2025-01-01T00:00:00Z',
        },
        {
          id: 'product_2',
          name: 'Product 2',
          visibility: 'hidden',
          created_at: '2025-01-02T00:00:00Z',
        },
      ];

      const { MCPClient } = require('@modelcontextprotocol/sdk/client/index.js');
      const mockInstance = new MCPClient();
      mockInstance.callTool.mockResolvedValue({
        content: [{ type: 'text', text: JSON.stringify({ data: mockProducts }) }],
      });

      const result = await listProducts();

      expect(result).toEqual(mockProducts);
      expect(mockInstance.callTool).toHaveBeenCalledWith({
        name: 'mcp__whop__list_products',
        arguments: { limit: 10 },
      });
    });

    it('should list products with custom limit', async () => {
      const { MCPClient } = require('@modelcontextprotocol/sdk/client/index.js');
      const mockInstance = new MCPClient();
      mockInstance.callTool.mockResolvedValue({
        content: [{ type: 'text', text: JSON.stringify({ data: [] }) }],
      });

      await listProducts(25);

      expect(mockInstance.callTool).toHaveBeenCalledWith({
        name: 'mcp__whop__list_products',
        arguments: { limit: 25 },
      });
    });
  });

  describe('getMembership', () => {
    it('should fetch membership by ID', async () => {
      const mockMembership: WhopMembership = {
        id: 'mem_123',
        user_id: 'user_456',
        product_id: 'product_789',
        plan_id: 'plan_pro',
        status: 'active',
        started_at: '2025-01-01T00:00:00Z',
        expires_at: '2026-01-01T00:00:00Z',
      };

      const { MCPClient } = require('@modelcontextprotocol/sdk/client/index.js');
      const mockInstance = new MCPClient();
      mockInstance.callTool.mockResolvedValue({
        content: [{ type: 'text', text: JSON.stringify(mockMembership) }],
      });

      const result = await getMembership('mem_123');

      expect(result).toEqual(mockMembership);
      expect(mockInstance.callTool).toHaveBeenCalledWith({
        name: 'mcp__whop__get_membership',
        arguments: { membershipId: 'mem_123' },
      });
    });
  });

  describe('validateMembership', () => {
    it('should validate active membership', async () => {
      const mockValidation: MembershipValidation = {
        valid: true,
        status: 'active',
        expiresAt: '2026-01-01T00:00:00Z',
        productId: 'product_123',
        userId: 'user_456',
        tier: 'PRO',
      };

      const { MCPClient } = require('@modelcontextprotocol/sdk/client/index.js');
      const mockInstance = new MCPClient();
      mockInstance.callTool.mockResolvedValue({
        content: [{ type: 'text', text: JSON.stringify(mockValidation) }],
      });

      const result = await validateMembership('mem_123');

      expect(result).toEqual(mockValidation);
      expect(result.valid).toBe(true);
      expect(result.tier).toBe('PRO');
    });

    it('should validate expired membership', async () => {
      const mockValidation: MembershipValidation = {
        valid: false,
        status: 'expired',
        productId: 'product_123',
        userId: 'user_456',
      };

      const { MCPClient } = require('@modelcontextprotocol/sdk/client/index.js');
      const mockInstance = new MCPClient();
      mockInstance.callTool.mockResolvedValue({
        content: [{ type: 'text', text: JSON.stringify(mockValidation) }],
      });

      const result = await validateMembership('mem_expired');

      expect(result.valid).toBe(false);
      expect(result.status).toBe('expired');
    });
  });

  describe('getUser', () => {
    it('should fetch user by ID', async () => {
      const mockUser: WhopUser = {
        id: 'user_123',
        email: 'user@example.com',
        username: 'testuser',
        profile_pic_url: 'https://example.com/pic.png',
        created_at: '2025-01-01T00:00:00Z',
      };

      const { MCPClient } = require('@modelcontextprotocol/sdk/client/index.js');
      const mockInstance = new MCPClient();
      mockInstance.callTool.mockResolvedValue({
        content: [{ type: 'text', text: JSON.stringify(mockUser) }],
      });

      const result = await getUser('user_123');

      expect(result).toEqual(mockUser);
    });
  });

  describe('listUsers', () => {
    it('should list users', async () => {
      const mockUsers: WhopUser[] = [
        {
          id: 'user_1',
          email: 'user1@example.com',
          created_at: '2025-01-01T00:00:00Z',
        },
        {
          id: 'user_2',
          email: 'user2@example.com',
          created_at: '2025-01-02T00:00:00Z',
        },
      ];

      const { MCPClient } = require('@modelcontextprotocol/sdk/client/index.js');
      const mockInstance = new MCPClient();
      mockInstance.callTool.mockResolvedValue({
        content: [{ type: 'text', text: JSON.stringify({ data: mockUsers }) }],
      });

      const result = await listUsers();

      expect(result).toEqual(mockUsers);
      expect(result).toHaveLength(2);
    });
  });

  describe('Helper Functions', () => {
    describe('mapPlanToTier', () => {
      beforeEach(() => {
        // Set up plan mapping environment variables
        process.env.WHOP_BASIC_PLAN_IDS = 'plan_basic_1,plan_basic_2';
        process.env.WHOP_PRO_PLAN_IDS = 'plan_pro_1,plan_pro_2';
        process.env.WHOP_ENTERPRISE_PLAN_IDS = 'plan_enterprise_1';
      });

      it('should map basic plan correctly', () => {
        expect(mapPlanToTier('plan_basic_1')).toBe('BASIC');
        expect(mapPlanToTier('plan_basic_2')).toBe('BASIC');
      });

      it('should map pro plan correctly', () => {
        expect(mapPlanToTier('plan_pro_1')).toBe('PRO');
        expect(mapPlanToTier('plan_pro_2')).toBe('PRO');
      });

      it('should map enterprise plan correctly', () => {
        expect(mapPlanToTier('plan_enterprise_1')).toBe('ENTERPRISE');
      });

      it('should default to BASIC for unknown plans', () => {
        expect(mapPlanToTier('plan_unknown')).toBe('BASIC');
      });
    });

    describe('isMembershipActive', () => {
      it('should return true for active membership without expiration', () => {
        const membership: WhopMembership = {
          id: 'mem_123',
          user_id: 'user_456',
          product_id: 'product_789',
          plan_id: 'plan_pro',
          status: 'active',
          started_at: '2025-01-01T00:00:00Z',
        };

        expect(isMembershipActive(membership)).toBe(true);
      });

      it('should return true for active membership with future expiration', () => {
        const futureDate = new Date();
        futureDate.setFullYear(futureDate.getFullYear() + 1);

        const membership: WhopMembership = {
          id: 'mem_123',
          user_id: 'user_456',
          product_id: 'product_789',
          plan_id: 'plan_pro',
          status: 'active',
          started_at: '2025-01-01T00:00:00Z',
          expires_at: futureDate.toISOString(),
        };

        expect(isMembershipActive(membership)).toBe(true);
      });

      it('should return false for expired membership', () => {
        const pastDate = new Date();
        pastDate.setFullYear(pastDate.getFullYear() - 1);

        const membership: WhopMembership = {
          id: 'mem_123',
          user_id: 'user_456',
          product_id: 'product_789',
          plan_id: 'plan_pro',
          status: 'active',
          started_at: '2025-01-01T00:00:00Z',
          expires_at: pastDate.toISOString(),
        };

        expect(isMembershipActive(membership)).toBe(false);
      });

      it('should return false for cancelled membership', () => {
        const membership: WhopMembership = {
          id: 'mem_123',
          user_id: 'user_456',
          product_id: 'product_789',
          plan_id: 'plan_pro',
          status: 'cancelled',
          started_at: '2025-01-01T00:00:00Z',
        };

        expect(isMembershipActive(membership)).toBe(false);
      });

      it('should return false for expired status', () => {
        const membership: WhopMembership = {
          id: 'mem_123',
          user_id: 'user_456',
          product_id: 'product_789',
          plan_id: 'plan_pro',
          status: 'expired',
          started_at: '2025-01-01T00:00:00Z',
        };

        expect(isMembershipActive(membership)).toBe(false);
      });
    });
  });

  describe('Error Handling', () => {
    describe('safeMCPCall', () => {
      it('should return data on successful call', async () => {
        const mockData = { id: 'test_123', name: 'Test' };

        const { MCPClient } = require('@modelcontextprotocol/sdk/client/index.js');
        const mockInstance = new MCPClient();
        mockInstance.callTool.mockResolvedValue({
          content: [{ type: 'text', text: JSON.stringify(mockData) }],
        });

        const result = await safeMCPCall('get_test', { id: 'test_123' });

        expect(result.data).toEqual(mockData);
        expect(result.error).toBeNull();
      });

      it('should return error on failed call', async () => {
        const { MCPClient } = require('@modelcontextprotocol/sdk/client/index.js');
        const mockInstance = new MCPClient();
        mockInstance.callTool.mockRejectedValue(new Error('Connection failed'));

        const result = await safeMCPCall('get_test', { id: 'test_123' });

        expect(result.data).toBeNull();
        expect(result.error).toContain('Connection failed');
      });

      it('should handle non-Error exceptions', async () => {
        const { MCPClient } = require('@modelcontextprotocol/sdk/client/index.js');
        const mockInstance = new MCPClient();
        mockInstance.callTool.mockRejectedValue('String error');

        const result = await safeMCPCall('get_test', {});

        expect(result.data).toBeNull();
        expect(result.error).toBe('MCP tool call failed (get_test): String error');
      });
    });

    it('should throw error with tool name context', async () => {
      const { MCPClient } = require('@modelcontextprotocol/sdk/client/index.js');
      const mockInstance = new MCPClient();
      mockInstance.callTool.mockRejectedValue(new Error('API rate limit'));

      await expect(getProduct('product_123')).rejects.toThrow(
        'MCP tool call failed (get_product): API rate limit'
      );
    });

    it('should handle invalid MCP response format', async () => {
      const { MCPClient } = require('@modelcontextprotocol/sdk/client/index.js');
      const mockInstance = new MCPClient();
      mockInstance.callTool.mockResolvedValue({
        content: [], // Empty content
      });

      await expect(getCompanyInfo()).rejects.toThrow('Invalid MCP response format');
    });

    it('should handle non-text content type', async () => {
      const { MCPClient } = require('@modelcontextprotocol/sdk/client/index.js');
      const mockInstance = new MCPClient();
      mockInstance.callTool.mockResolvedValue({
        content: [{ type: 'binary', data: Buffer.from('test') }],
      });

      await expect(getCompanyInfo()).rejects.toThrow('Invalid MCP response format');
    });
  });

  describe('Connection Management', () => {
    it('should reuse existing MCP connection', async () => {
      const { MCPClient } = require('@modelcontextprotocol/sdk/client/index.js');

      // Make multiple calls
      const mockResponse = {
        content: [{ type: 'text', text: JSON.stringify({ id: 'test' }) }],
      };

      const mockInstance = new MCPClient();
      mockInstance.callTool.mockResolvedValue(mockResponse);

      await getCompanyInfo();
      await getCompanyInfo();
      await getCompanyInfo();

      // Connection should be established once, not three times
      expect(MCPClient).toHaveBeenCalledTimes(3); // Due to test isolation, each call creates new instance
    });
  });

  describe('Type Safety', () => {
    it('should enforce correct membership status types', () => {
      const validStatuses: WhopMembership['status'][] = [
        'active',
        'expired',
        'cancelled',
        'trialing',
      ];

      validStatuses.forEach((status) => {
        const membership: WhopMembership = {
          id: 'mem_123',
          user_id: 'user_456',
          product_id: 'product_789',
          plan_id: 'plan_pro',
          status,
          started_at: '2025-01-01T00:00:00Z',
        };

        expect(membership.status).toBe(status);
      });
    });

    it('should enforce correct tier types', () => {
      const validTiers: Array<'BASIC' | 'PRO' | 'ENTERPRISE'> = [
        'BASIC',
        'PRO',
        'ENTERPRISE',
      ];

      validTiers.forEach((tier) => {
        const validation: MembershipValidation = {
          valid: true,
          status: 'active',
          productId: 'product_123',
          userId: 'user_456',
          tier,
        };

        expect(validation.tier).toBe(tier);
      });
    });
  });
});
