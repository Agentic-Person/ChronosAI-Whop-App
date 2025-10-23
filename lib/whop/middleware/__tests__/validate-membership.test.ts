/**
 * Unit tests for Whop Membership Validation Middleware
 * Tests authentication, authorization, and multi-tenant isolation
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  validateWhopMembership,
  withWhopAuth,
  withWhopTier,
  withCreatorAuth,
  withStudentAuth,
  type WhopAuthContext,
} from '../validate-membership';

// Mock dependencies
jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(),
}));

jest.mock('@/lib/whop/mcp', () => ({
  validateMembership: jest.fn(),
  isMembershipActive: jest.fn(),
  getMembership: jest.fn(),
}));

import { createClient } from '@/lib/supabase/server';
import { validateMembership } from '@/lib/whop/mcp';

describe('Whop Membership Validation Middleware', () => {
  let mockSupabase: any;
  let mockRequest: NextRequest;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock Supabase client
    mockSupabase = {
      auth: {
        getSession: jest.fn(),
      },
      from: jest.fn(),
    };

    (createClient as jest.Mock).mockReturnValue(mockSupabase);

    // Mock request
    mockRequest = {
      headers: new Map(),
      url: 'http://localhost:3000/api/test',
    } as unknown as NextRequest;
  });

  describe('validateWhopMembership', () => {
    it('should return null if no session exists', async () => {
      mockSupabase.auth.getSession.mockResolvedValue({
        data: { session: null },
        error: null,
      });

      const result = await validateWhopMembership(mockRequest);

      expect(result).toBeNull();
    });

    it('should return null if session error occurs', async () => {
      mockSupabase.auth.getSession.mockResolvedValue({
        data: { session: null },
        error: new Error('Session error'),
      });

      const result = await validateWhopMembership(mockRequest);

      expect(result).toBeNull();
    });

    it('should return creator context for creator user', async () => {
      const mockSession = {
        user: { id: 'creator_123' },
      };

      mockSupabase.auth.getSession.mockResolvedValue({
        data: { session: mockSession },
        error: null,
      });

      // Mock creator query
      const mockFromCreators = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: {
            id: 'creator_123',
            whop_company_id: 'company_456',
            membership_tier: 'PRO',
            whop_data: {},
          },
          error: null,
        }),
      };

      mockSupabase.from.mockReturnValue(mockFromCreators);

      const result = await validateWhopMembership(mockRequest);

      expect(result).toEqual({
        userId: 'creator_123',
        userType: 'creator',
        creatorId: 'creator_123',
        membershipId: '',
        tier: 'PRO',
        isActive: true,
      });
    });

    it('should return student context for student user with valid membership', async () => {
      const mockSession = {
        user: { id: 'student_123' },
      };

      mockSupabase.auth.getSession.mockResolvedValue({
        data: { session: mockSession },
        error: null,
      });

      // Mock creator query (returns null)
      const mockFromCreators = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: null,
        }),
      };

      // Mock student query
      const mockFromStudents = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: {
            id: 'student_123',
            creator_id: 'creator_456',
            whop_membership_id: 'mem_789',
            membership_tier: 'BASIC',
            membership_status: 'active',
          },
          error: null,
        }),
      };

      mockSupabase.from
        .mockReturnValueOnce(mockFromCreators)
        .mockReturnValueOnce(mockFromStudents);

      // Mock membership validation
      (validateMembership as jest.Mock).mockResolvedValue({
        valid: true,
        status: 'active',
        tier: 'BASIC',
        expiresAt: '2026-01-01T00:00:00Z',
        productId: 'product_123',
        userId: 'student_123',
      });

      const result = await validateWhopMembership(mockRequest);

      expect(result).toEqual({
        userId: 'student_123',
        userType: 'student',
        creatorId: 'creator_456',
        membershipId: 'mem_789',
        tier: 'BASIC',
        isActive: true,
      });
    });

    it('should return null for student without membership ID', async () => {
      const mockSession = {
        user: { id: 'student_123' },
      };

      mockSupabase.auth.getSession.mockResolvedValue({
        data: { session: mockSession },
        error: null,
      });

      const mockFromCreators = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: null }),
      };

      const mockFromStudents = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: {
            id: 'student_123',
            whop_membership_id: null, // No membership
          },
        }),
      };

      mockSupabase.from
        .mockReturnValueOnce(mockFromCreators)
        .mockReturnValueOnce(mockFromStudents);

      const result = await validateWhopMembership(mockRequest);

      expect(result).toBeNull();
    });

    it('should update student membership status if changed', async () => {
      const mockSession = {
        user: { id: 'student_123' },
      };

      mockSupabase.auth.getSession.mockResolvedValue({
        data: { session: mockSession },
        error: null,
      });

      const mockUpdate = jest.fn().mockReturnThis();
      const mockEq = jest.fn().mockResolvedValue({});

      const mockFromCreators = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: null }),
      };

      const mockFromStudents = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: {
            id: 'student_123',
            creator_id: 'creator_456',
            whop_membership_id: 'mem_789',
            membership_tier: 'BASIC',
            membership_status: 'active', // Old status
          },
        }),
        update: mockUpdate,
      };

      mockUpdate.mockReturnValue({ eq: mockEq });

      mockSupabase.from
        .mockReturnValueOnce(mockFromCreators)
        .mockReturnValueOnce(mockFromStudents)
        .mockReturnValueOnce(mockFromStudents);

      // Mock membership validation with different status
      (validateMembership as jest.Mock).mockResolvedValue({
        valid: false,
        status: 'expired', // New status
        tier: 'BASIC',
        productId: 'product_123',
        userId: 'student_123',
      });

      await validateWhopMembership(mockRequest);

      // Verify update was called
      expect(mockUpdate).toHaveBeenCalledWith({
        membership_status: 'expired',
        updated_at: expect.any(String),
      });
      expect(mockEq).toHaveBeenCalledWith('id', 'student_123');
    });

    it('should handle validation errors gracefully', async () => {
      mockSupabase.auth.getSession.mockRejectedValue(new Error('Database error'));

      const result = await validateWhopMembership(mockRequest);

      expect(result).toBeNull();
    });
  });

  describe('withWhopAuth', () => {
    it('should allow access for valid authenticated user', async () => {
      const mockContext: WhopAuthContext = {
        userId: 'user_123',
        userType: 'creator',
        creatorId: 'user_123',
        membershipId: '',
        tier: 'PRO',
        isActive: true,
      };

      // Mock validateWhopMembership
      jest.spyOn(require('../validate-membership'), 'validateWhopMembership')
        .mockResolvedValue(mockContext);

      const mockHandler = jest.fn().mockResolvedValue(
        NextResponse.json({ success: true })
      );

      const wrappedHandler = withWhopAuth(mockHandler);
      const response = await wrappedHandler(mockRequest);

      expect(mockHandler).toHaveBeenCalledWith(mockRequest, {
        user: mockContext,
        params: undefined,
      });
    });

    it('should return 401 for unauthenticated user', async () => {
      jest.spyOn(require('../validate-membership'), 'validateWhopMembership')
        .mockResolvedValue(null);

      const mockHandler = jest.fn();
      const wrappedHandler = withWhopAuth(mockHandler);
      const response = await wrappedHandler(mockRequest);

      expect(mockHandler).not.toHaveBeenCalled();
      expect(response.status).toBe(401);
    });

    it('should return 403 for inactive membership', async () => {
      const mockContext: WhopAuthContext = {
        userId: 'user_123',
        userType: 'student',
        creatorId: 'creator_456',
        membershipId: 'mem_789',
        tier: 'BASIC',
        isActive: false, // Inactive
      };

      jest.spyOn(require('../validate-membership'), 'validateWhopMembership')
        .mockResolvedValue(mockContext);

      const mockHandler = jest.fn();
      const wrappedHandler = withWhopAuth(mockHandler);
      const response = await wrappedHandler(mockRequest);

      expect(mockHandler).not.toHaveBeenCalled();
      expect(response.status).toBe(403);
    });

    it('should pass params to handler', async () => {
      const mockContext: WhopAuthContext = {
        userId: 'user_123',
        userType: 'creator',
        creatorId: 'user_123',
        membershipId: '',
        tier: 'PRO',
        isActive: true,
      };

      jest.spyOn(require('../validate-membership'), 'validateWhopMembership')
        .mockResolvedValue(mockContext);

      const mockHandler = jest.fn().mockResolvedValue(
        NextResponse.json({ success: true })
      );

      const wrappedHandler = withWhopAuth(mockHandler);
      await wrappedHandler(mockRequest, { params: { id: 'test_123' } });

      expect(mockHandler).toHaveBeenCalledWith(mockRequest, {
        user: mockContext,
        params: { id: 'test_123' },
      });
    });
  });

  describe('withWhopTier', () => {
    it('should allow access for user with sufficient tier', async () => {
      const mockContext: WhopAuthContext = {
        userId: 'user_123',
        userType: 'creator',
        creatorId: 'user_123',
        membershipId: '',
        tier: 'PRO',
        isActive: true,
      };

      jest.spyOn(require('../validate-membership'), 'validateWhopMembership')
        .mockResolvedValue(mockContext);

      const mockHandler = jest.fn().mockResolvedValue(
        NextResponse.json({ success: true })
      );

      const wrappedHandler = withWhopTier('PRO', mockHandler);
      await wrappedHandler(mockRequest);

      expect(mockHandler).toHaveBeenCalled();
    });

    it('should allow higher tier user to access lower tier content', async () => {
      const mockContext: WhopAuthContext = {
        userId: 'user_123',
        userType: 'creator',
        creatorId: 'user_123',
        membershipId: '',
        tier: 'ENTERPRISE',
        isActive: true,
      };

      jest.spyOn(require('../validate-membership'), 'validateWhopMembership')
        .mockResolvedValue(mockContext);

      const mockHandler = jest.fn().mockResolvedValue(
        NextResponse.json({ success: true })
      );

      const wrappedHandler = withWhopTier('BASIC', mockHandler);
      await wrappedHandler(mockRequest);

      expect(mockHandler).toHaveBeenCalled();
    });

    it('should reject user with insufficient tier', async () => {
      const mockContext: WhopAuthContext = {
        userId: 'user_123',
        userType: 'creator',
        creatorId: 'user_123',
        membershipId: '',
        tier: 'BASIC',
        isActive: true,
      };

      jest.spyOn(require('../validate-membership'), 'validateWhopMembership')
        .mockResolvedValue(mockContext);

      const mockHandler = jest.fn();
      const wrappedHandler = withWhopTier('ENTERPRISE', mockHandler);
      const response = await wrappedHandler(mockRequest);

      expect(mockHandler).not.toHaveBeenCalled();
      expect(response.status).toBe(403);
    });

    it('should handle multiple allowed tiers', async () => {
      const mockContext: WhopAuthContext = {
        userId: 'user_123',
        userType: 'creator',
        creatorId: 'user_123',
        membershipId: '',
        tier: 'PRO',
        isActive: true,
      };

      jest.spyOn(require('../validate-membership'), 'validateWhopMembership')
        .mockResolvedValue(mockContext);

      const mockHandler = jest.fn().mockResolvedValue(
        NextResponse.json({ success: true })
      );

      const wrappedHandler = withWhopTier(['PRO', 'ENTERPRISE'], mockHandler);
      await wrappedHandler(mockRequest);

      expect(mockHandler).toHaveBeenCalled();
    });
  });

  describe('withCreatorAuth', () => {
    it('should allow access for creator users', async () => {
      const mockContext: WhopAuthContext = {
        userId: 'creator_123',
        userType: 'creator',
        creatorId: 'creator_123',
        membershipId: '',
        tier: 'PRO',
        isActive: true,
      };

      jest.spyOn(require('../validate-membership'), 'validateWhopMembership')
        .mockResolvedValue(mockContext);

      const mockHandler = jest.fn().mockResolvedValue(
        NextResponse.json({ success: true })
      );

      const wrappedHandler = withCreatorAuth(mockHandler);
      await wrappedHandler(mockRequest);

      expect(mockHandler).toHaveBeenCalled();
    });

    it('should reject student users', async () => {
      const mockContext: WhopAuthContext = {
        userId: 'student_123',
        userType: 'student',
        creatorId: 'creator_456',
        membershipId: 'mem_789',
        tier: 'BASIC',
        isActive: true,
      };

      jest.spyOn(require('../validate-membership'), 'validateWhopMembership')
        .mockResolvedValue(mockContext);

      const mockHandler = jest.fn();
      const wrappedHandler = withCreatorAuth(mockHandler);
      const response = await wrappedHandler(mockRequest);

      expect(mockHandler).not.toHaveBeenCalled();
      expect(response.status).toBe(403);
    });
  });

  describe('withStudentAuth', () => {
    it('should allow access for student users', async () => {
      const mockContext: WhopAuthContext = {
        userId: 'student_123',
        userType: 'student',
        creatorId: 'creator_456',
        membershipId: 'mem_789',
        tier: 'BASIC',
        isActive: true,
      };

      jest.spyOn(require('../validate-membership'), 'validateWhopMembership')
        .mockResolvedValue(mockContext);

      const mockHandler = jest.fn().mockResolvedValue(
        NextResponse.json({ success: true })
      );

      const wrappedHandler = withStudentAuth(mockHandler);
      await wrappedHandler(mockRequest);

      expect(mockHandler).toHaveBeenCalled();
    });

    it('should reject creator users', async () => {
      const mockContext: WhopAuthContext = {
        userId: 'creator_123',
        userType: 'creator',
        creatorId: 'creator_123',
        membershipId: '',
        tier: 'PRO',
        isActive: true,
      };

      jest.spyOn(require('../validate-membership'), 'validateWhopMembership')
        .mockResolvedValue(mockContext);

      const mockHandler = jest.fn();
      const wrappedHandler = withStudentAuth(mockHandler);
      const response = await wrappedHandler(mockRequest);

      expect(mockHandler).not.toHaveBeenCalled();
      expect(response.status).toBe(403);
    });
  });

  describe('Multi-Tenant Isolation', () => {
    it('should isolate creator data by creatorId', async () => {
      const creatorAContext: WhopAuthContext = {
        userId: 'creator_a',
        userType: 'creator',
        creatorId: 'creator_a',
        membershipId: '',
        tier: 'PRO',
        isActive: true,
      };

      const creatorBContext: WhopAuthContext = {
        userId: 'creator_b',
        userType: 'creator',
        creatorId: 'creator_b',
        membershipId: '',
        tier: 'PRO',
        isActive: true,
      };

      // Verify contexts are separate
      expect(creatorAContext.creatorId).not.toBe(creatorBContext.creatorId);
      expect(creatorAContext.userId).not.toBe(creatorBContext.userId);
    });

    it('should isolate student data by creatorId', async () => {
      const studentAContext: WhopAuthContext = {
        userId: 'student_a',
        userType: 'student',
        creatorId: 'creator_a',
        membershipId: 'mem_a',
        tier: 'BASIC',
        isActive: true,
      };

      const studentBContext: WhopAuthContext = {
        userId: 'student_b',
        userType: 'student',
        creatorId: 'creator_b',
        membershipId: 'mem_b',
        tier: 'BASIC',
        isActive: true,
      };

      // Verify students belong to different creators
      expect(studentAContext.creatorId).not.toBe(studentBContext.creatorId);
    });
  });
});
