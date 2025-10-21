/**
 * Integration Tests for Feature Gate Middleware
 */

import { NextRequest, NextResponse } from 'next/server';
import { withFeatureGate, withPlanLimit, withMultipleFeatureGates } from '../feature-gate';
import { Feature, PlanTier } from '@/lib/features/types';
import { FeatureFlagService } from '@/lib/features/feature-flags';

// Mock FeatureFlagService
jest.mock('@/lib/features/feature-flags', () => ({
  FeatureFlagService: {
    hasFeatureAccess: jest.fn(),
    checkMultipleFeatures: jest.fn(),
    getUserPlan: jest.fn(),
    getPlanConfig: jest.fn(),
    checkPlanLimit: jest.fn(),
    logFeatureAccess: jest.fn(),
  },
}));

// Helper to create mock request
function createMockRequest(
  userId?: string,
  url: string = 'http://localhost/api/test'
): NextRequest {
  const headers = new Headers();
  if (userId) {
    headers.set('x-user-id', userId);
  }

  return new NextRequest(url, {
    headers,
  });
}

describe('Feature Gate Middleware', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('withFeatureGate', () => {
    it('should allow access when user has required plan', async () => {
      (FeatureFlagService.hasFeatureAccess as jest.Mock).mockResolvedValue({
        hasAccess: true,
        userPlan: PlanTier.PRO,
        requiredPlan: PlanTier.PRO,
        feature: Feature.FEATURE_LEARNING_CALENDAR,
        upgradeRequired: false,
      });

      const handler = withFeatureGate(
        { feature: Feature.FEATURE_LEARNING_CALENDAR },
        async () => NextResponse.json({ success: true })
      );

      const req = createMockRequest('user_pro');
      const response = await handler(req);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(FeatureFlagService.hasFeatureAccess).toHaveBeenCalledWith(
        'user_pro',
        Feature.FEATURE_LEARNING_CALENDAR
      );
    });

    it('should block access when user lacks required plan', async () => {
      (FeatureFlagService.hasFeatureAccess as jest.Mock).mockResolvedValue({
        hasAccess: false,
        userPlan: PlanTier.BASIC,
        requiredPlan: PlanTier.PRO,
        feature: Feature.FEATURE_LEARNING_CALENDAR,
        upgradeRequired: true,
      });

      const handler = withFeatureGate(
        { feature: Feature.FEATURE_LEARNING_CALENDAR },
        async () => NextResponse.json({ success: true })
      );

      const req = createMockRequest('user_basic');
      const response = await handler(req);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.code).toBe('FEATURE_GATED');
      expect(data.details.currentPlan).toBe(PlanTier.BASIC);
      expect(data.details.requiredPlan).toBe(PlanTier.PRO);
      expect(data.details.upgradeUrl).toBeDefined();
    });

    it('should return 401 when no user ID provided', async () => {
      const handler = withFeatureGate(
        { feature: Feature.FEATURE_LEARNING_CALENDAR },
        async () => NextResponse.json({ success: true })
      );

      const req = createMockRequest(); // No user ID
      const response = await handler(req);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.code).toBe('MISSING_USER_ID');
    });

    it('should log feature access when enabled', async () => {
      (FeatureFlagService.hasFeatureAccess as jest.Mock).mockResolvedValue({
        hasAccess: true,
        userPlan: PlanTier.PRO,
        requiredPlan: PlanTier.PRO,
        feature: Feature.FEATURE_LEARNING_CALENDAR,
        upgradeRequired: false,
      });

      const handler = withFeatureGate(
        {
          feature: Feature.FEATURE_LEARNING_CALENDAR,
          logAccess: true,
        },
        async () => NextResponse.json({ success: true })
      );

      const req = createMockRequest('user_pro');
      await handler(req);

      expect(FeatureFlagService.logFeatureAccess).toHaveBeenCalledWith(
        'user_pro',
        Feature.FEATURE_LEARNING_CALENDAR,
        true
      );
    });

    it('should use custom error message when provided', async () => {
      (FeatureFlagService.hasFeatureAccess as jest.Mock).mockResolvedValue({
        hasAccess: false,
        userPlan: PlanTier.BASIC,
        requiredPlan: PlanTier.PRO,
        feature: Feature.FEATURE_LEARNING_CALENDAR,
        upgradeRequired: true,
      });

      const customMessage = 'You need a premium subscription for this';

      const handler = withFeatureGate(
        {
          feature: Feature.FEATURE_LEARNING_CALENDAR,
          errorMessage: customMessage,
        },
        async () => NextResponse.json({ success: true })
      );

      const req = createMockRequest('user_basic');
      const response = await handler(req);
      const data = await response.json();

      expect(data.message).toBe(customMessage);
    });

    it('should handle custom getUserId function', async () => {
      (FeatureFlagService.hasFeatureAccess as jest.Mock).mockResolvedValue({
        hasAccess: true,
        userPlan: PlanTier.PRO,
        requiredPlan: PlanTier.PRO,
        feature: Feature.FEATURE_LEARNING_CALENDAR,
        upgradeRequired: false,
      });

      const customGetUserId = async (req: NextRequest) => {
        return 'custom_user_id';
      };

      const handler = withFeatureGate(
        {
          feature: Feature.FEATURE_LEARNING_CALENDAR,
          getUserId: customGetUserId,
        },
        async () => NextResponse.json({ success: true })
      );

      const req = createMockRequest();
      await handler(req);

      expect(FeatureFlagService.hasFeatureAccess).toHaveBeenCalledWith(
        'custom_user_id',
        Feature.FEATURE_LEARNING_CALENDAR
      );
    });
  });

  describe('withPlanLimit', () => {
    it('should allow action when within plan limits', async () => {
      (FeatureFlagService.checkPlanLimit as jest.Mock).mockResolvedValue(true);

      const getCurrentUsage = async (userId: string) => 25;

      const handler = withPlanLimit(
        'maxVideos',
        getCurrentUsage,
        async () => NextResponse.json({ success: true })
      );

      const req = createMockRequest('user_basic');
      const response = await handler(req);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(FeatureFlagService.checkPlanLimit).toHaveBeenCalledWith(
        'user_basic',
        'maxVideos',
        25
      );
    });

    it('should block action when limit exceeded', async () => {
      (FeatureFlagService.checkPlanLimit as jest.Mock).mockResolvedValue(false);
      (FeatureFlagService.getUserPlan as jest.Mock).mockResolvedValue(PlanTier.BASIC);
      (FeatureFlagService.getPlanConfig as jest.Mock).mockReturnValue({
        limits: { maxVideos: 50 },
      });

      const getCurrentUsage = async (userId: string) => 50;

      const handler = withPlanLimit(
        'maxVideos',
        getCurrentUsage,
        async () => NextResponse.json({ success: true })
      );

      const req = createMockRequest('user_basic');
      const response = await handler(req);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.code).toBe('PLAN_LIMIT_EXCEEDED');
      expect(data.details.currentUsage).toBe(50);
      expect(data.details.limit).toBe(50);
    });
  });

  describe('withMultipleFeatureGates', () => {
    it('should allow access when user has all required features', async () => {
      const featuresMap = new Map([
        [Feature.FEATURE_QUIZZES, true],
        [Feature.FEATURE_PROJECTS, true],
      ]);

      (FeatureFlagService.checkMultipleFeatures as jest.Mock).mockResolvedValue(featuresMap);

      const handler = withMultipleFeatureGates(
        [Feature.FEATURE_QUIZZES, Feature.FEATURE_PROJECTS],
        async () => NextResponse.json({ success: true })
      );

      const req = createMockRequest('user_pro');
      const response = await handler(req);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it('should block access when user lacks any required feature', async () => {
      const featuresMap = new Map([
        [Feature.FEATURE_QUIZZES, true],
        [Feature.FEATURE_PROJECTS, false], // Missing this one
      ]);

      (FeatureFlagService.checkMultipleFeatures as jest.Mock).mockResolvedValue(featuresMap);
      (FeatureFlagService.getUserPlan as jest.Mock).mockResolvedValue(PlanTier.BASIC);
      (FeatureFlagService.getRequiredPlan as jest.Mock).mockReturnValue(PlanTier.PRO);

      const handler = withMultipleFeatureGates(
        [Feature.FEATURE_QUIZZES, Feature.FEATURE_PROJECTS],
        async () => NextResponse.json({ success: true })
      );

      const req = createMockRequest('user_basic');
      const response = await handler(req);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.code).toBe('MULTIPLE_FEATURES_REQUIRED');
    });
  });

  describe('Error Handling', () => {
    it('should return 500 on unexpected error', async () => {
      (FeatureFlagService.hasFeatureAccess as jest.Mock).mockRejectedValue(
        new Error('Database connection failed')
      );

      const handler = withFeatureGate(
        { feature: Feature.FEATURE_LEARNING_CALENDAR },
        async () => NextResponse.json({ success: true })
      );

      const req = createMockRequest('user_pro');
      const response = await handler(req);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.code).toBe('FEATURE_GATE_ERROR');
    });

    it('should handle malformed getUserId function', async () => {
      const brokenGetUserId = async () => {
        throw new Error('Custom error');
      };

      const handler = withFeatureGate(
        {
          feature: Feature.FEATURE_LEARNING_CALENDAR,
          getUserId: brokenGetUserId,
        },
        async () => NextResponse.json({ success: true })
      );

      const req = createMockRequest('user_pro');
      const response = await handler(req);

      expect(response.status).toBe(500);
    });
  });
});
