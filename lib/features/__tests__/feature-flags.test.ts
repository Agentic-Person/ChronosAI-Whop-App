/**
 * Unit Tests for Feature Flag Service
 */

import { FeatureFlagService } from '../feature-flags';
import { Feature, PlanTier, PLAN_TIER_HIERARCHY } from '../types';
import { createClient } from '@/lib/utils/supabase-client';

// Mock Supabase
jest.mock('@/lib/utils/supabase-client', () => ({
  createClient: jest.fn(),
}));

describe('FeatureFlagService', () => {
  let mockSupabase: any;

  beforeEach(() => {
    // Reset cache before each test
    FeatureFlagService.clearAllCache();

    // Setup mock Supabase client
    mockSupabase = {
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn(),
      insert: jest.fn(),
    };

    (createClient as jest.Mock).mockReturnValue(mockSupabase);
  });

  describe('getUserPlan', () => {
    it('should return user plan from database', async () => {
      mockSupabase.single.mockResolvedValue({
        data: {
          id: 'user123',
          current_plan: PlanTier.PRO,
          plan_expires_at: null,
        },
        error: null,
      });

      const plan = await FeatureFlagService.getUserPlan('user123');

      expect(plan).toBe(PlanTier.PRO);
      expect(mockSupabase.from).toHaveBeenCalledWith('creators');
      expect(mockSupabase.select).toHaveBeenCalled();
      expect(mockSupabase.eq).toHaveBeenCalledWith('id', 'user123');
    });

    it('should return BASIC plan if user not found', async () => {
      mockSupabase.single.mockResolvedValue({
        data: null,
        error: { message: 'Not found' },
      });

      // Second query by whop_user_id also fails
      mockSupabase.single.mockResolvedValueOnce({
        data: null,
        error: { message: 'Not found' },
      });

      const plan = await FeatureFlagService.getUserPlan('unknown_user');

      expect(plan).toBe(PlanTier.BASIC);
    });

    it('should cache plan lookups', async () => {
      mockSupabase.single.mockResolvedValue({
        data: {
          id: 'user123',
          current_plan: PlanTier.PRO,
          plan_expires_at: null,
        },
        error: null,
      });

      // First call
      await FeatureFlagService.getUserPlan('user123');

      // Second call should use cache
      await FeatureFlagService.getUserPlan('user123');

      // Should only query database once
      expect(mockSupabase.from).toHaveBeenCalledTimes(1);
    });

    it('should return BASIC if plan expired', async () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      mockSupabase.single.mockResolvedValue({
        data: {
          id: 'user123',
          current_plan: PlanTier.PRO,
          plan_expires_at: yesterday.toISOString(),
        },
        error: null,
      });

      const plan = await FeatureFlagService.getUserPlan('user123');

      expect(plan).toBe(PlanTier.BASIC);
    });
  });

  describe('hasFeatureAccess', () => {
    it('should grant access to BASIC features for BASIC users', async () => {
      mockSupabase.single.mockResolvedValue({
        data: {
          id: 'user123',
          current_plan: PlanTier.BASIC,
          plan_expires_at: null,
        },
        error: null,
      });

      const result = await FeatureFlagService.hasFeatureAccess(
        'user123',
        Feature.FEATURE_RAG_CHAT
      );

      expect(result.hasAccess).toBe(true);
      expect(result.userPlan).toBe(PlanTier.BASIC);
      expect(result.requiredPlan).toBe(PlanTier.BASIC);
      expect(result.upgradeRequired).toBe(false);
    });

    it('should deny access to PRO features for BASIC users', async () => {
      mockSupabase.single.mockResolvedValue({
        data: {
          id: 'user123',
          current_plan: PlanTier.BASIC,
          plan_expires_at: null,
        },
        error: null,
      });

      const result = await FeatureFlagService.hasFeatureAccess(
        'user123',
        Feature.FEATURE_LEARNING_CALENDAR
      );

      expect(result.hasAccess).toBe(false);
      expect(result.userPlan).toBe(PlanTier.BASIC);
      expect(result.requiredPlan).toBe(PlanTier.PRO);
      expect(result.upgradeRequired).toBe(true);
    });

    it('should grant access to BASIC and PRO features for PRO users', async () => {
      mockSupabase.single.mockResolvedValue({
        data: {
          id: 'user123',
          current_plan: PlanTier.PRO,
          plan_expires_at: null,
        },
        error: null,
      });

      const basicFeature = await FeatureFlagService.hasFeatureAccess(
        'user123',
        Feature.FEATURE_RAG_CHAT
      );

      const proFeature = await FeatureFlagService.hasFeatureAccess(
        'user123',
        Feature.FEATURE_LEARNING_CALENDAR
      );

      expect(basicFeature.hasAccess).toBe(true);
      expect(proFeature.hasAccess).toBe(true);
    });

    it('should deny access to ENTERPRISE features for PRO users', async () => {
      mockSupabase.single.mockResolvedValue({
        data: {
          id: 'user123',
          current_plan: PlanTier.PRO,
          plan_expires_at: null,
        },
        error: null,
      });

      const result = await FeatureFlagService.hasFeatureAccess(
        'user123',
        Feature.FEATURE_CREATOR_DASHBOARD
      );

      expect(result.hasAccess).toBe(false);
      expect(result.requiredPlan).toBe(PlanTier.ENTERPRISE);
    });

    it('should grant access to all features for ENTERPRISE users', async () => {
      mockSupabase.single.mockResolvedValue({
        data: {
          id: 'user123',
          current_plan: PlanTier.ENTERPRISE,
          plan_expires_at: null,
        },
        error: null,
      });

      // Test a few features from each tier
      const features = [
        Feature.FEATURE_RAG_CHAT, // BASIC
        Feature.FEATURE_LEARNING_CALENDAR, // PRO
        Feature.FEATURE_CREATOR_DASHBOARD, // ENTERPRISE
      ];

      for (const feature of features) {
        const result = await FeatureFlagService.hasFeatureAccess('user123', feature);
        expect(result.hasAccess).toBe(true);
      }
    });
  });

  describe('getAvailableFeatures', () => {
    it('should return only BASIC features for BASIC plan', () => {
      const features = FeatureFlagService.getAvailableFeatures(PlanTier.BASIC);

      expect(features).toContain(Feature.FEATURE_RAG_CHAT);
      expect(features).toContain(Feature.FEATURE_VIDEO_UPLOAD);
      expect(features).not.toContain(Feature.FEATURE_LEARNING_CALENDAR);
      expect(features).not.toContain(Feature.FEATURE_CREATOR_DASHBOARD);
    });

    it('should return BASIC + PRO features for PRO plan', () => {
      const features = FeatureFlagService.getAvailableFeatures(PlanTier.PRO);

      expect(features).toContain(Feature.FEATURE_RAG_CHAT); // BASIC
      expect(features).toContain(Feature.FEATURE_LEARNING_CALENDAR); // PRO
      expect(features).not.toContain(Feature.FEATURE_CREATOR_DASHBOARD); // ENTERPRISE
    });

    it('should return all features for ENTERPRISE plan', () => {
      const features = FeatureFlagService.getAvailableFeatures(PlanTier.ENTERPRISE);

      // Should include features from all tiers
      expect(features).toContain(Feature.FEATURE_RAG_CHAT);
      expect(features).toContain(Feature.FEATURE_LEARNING_CALENDAR);
      expect(features).toContain(Feature.FEATURE_CREATOR_DASHBOARD);

      // Should be a comprehensive list
      expect(features.length).toBeGreaterThan(10);
    });
  });

  describe('checkPlanLimit', () => {
    it('should allow action when within limits', async () => {
      mockSupabase.single.mockResolvedValue({
        data: {
          id: 'user123',
          current_plan: PlanTier.BASIC,
          plan_expires_at: null,
        },
        error: null,
      });

      const withinLimit = await FeatureFlagService.checkPlanLimit(
        'user123',
        'maxVideos',
        25 // Under 50 limit for BASIC
      );

      expect(withinLimit).toBe(true);
    });

    it('should deny action when limit exceeded', async () => {
      mockSupabase.single.mockResolvedValue({
        data: {
          id: 'user123',
          current_plan: PlanTier.BASIC,
          plan_expires_at: null,
        },
        error: null,
      });

      const withinLimit = await FeatureFlagService.checkPlanLimit(
        'user123',
        'maxVideos',
        50 // At or over 50 limit for BASIC
      );

      expect(withinLimit).toBe(false);
    });

    it('should always allow action for unlimited (-1) limits', async () => {
      mockSupabase.single.mockResolvedValue({
        data: {
          id: 'user123',
          current_plan: PlanTier.ENTERPRISE,
          plan_expires_at: null,
        },
        error: null,
      });

      const withinLimit = await FeatureFlagService.checkPlanLimit(
        'user123',
        'maxVideos',
        999999 // ENTERPRISE has unlimited (-1)
      );

      expect(withinLimit).toBe(true);
    });
  });

  describe('checkMultipleFeatures', () => {
    it('should check multiple features efficiently', async () => {
      mockSupabase.single.mockResolvedValue({
        data: {
          id: 'user123',
          current_plan: PlanTier.PRO,
          plan_expires_at: null,
        },
        error: null,
      });

      const features = [
        Feature.FEATURE_RAG_CHAT,
        Feature.FEATURE_LEARNING_CALENDAR,
        Feature.FEATURE_CREATOR_DASHBOARD,
      ];

      const results = await FeatureFlagService.checkMultipleFeatures('user123', features);

      expect(results.get(Feature.FEATURE_RAG_CHAT)).toBe(true);
      expect(results.get(Feature.FEATURE_LEARNING_CALENDAR)).toBe(true);
      expect(results.get(Feature.FEATURE_CREATOR_DASHBOARD)).toBe(false);
    });
  });

  describe('invalidateCache', () => {
    it('should clear cache for specific user', async () => {
      mockSupabase.single.mockResolvedValue({
        data: {
          id: 'user123',
          current_plan: PlanTier.PRO,
          plan_expires_at: null,
        },
        error: null,
      });

      // First call
      await FeatureFlagService.getUserPlan('user123');

      // Invalidate cache
      FeatureFlagService.invalidateCache('user123');

      // Second call should query database again
      await FeatureFlagService.getUserPlan('user123');

      expect(mockSupabase.from).toHaveBeenCalledTimes(2);
    });
  });

  describe('getUpgradePath', () => {
    it('should return null if user already has access', async () => {
      mockSupabase.single.mockResolvedValue({
        data: {
          id: 'user123',
          current_plan: PlanTier.PRO,
          plan_expires_at: null,
        },
        error: null,
      });

      const upgradePath = await FeatureFlagService.getUpgradePath(
        'user123',
        Feature.FEATURE_LEARNING_CALENDAR
      );

      expect(upgradePath).toBeNull();
    });

    it('should return required plan if user needs upgrade', async () => {
      mockSupabase.single.mockResolvedValue({
        data: {
          id: 'user123',
          current_plan: PlanTier.BASIC,
          plan_expires_at: null,
        },
        error: null,
      });

      const upgradePath = await FeatureFlagService.getUpgradePath(
        'user123',
        Feature.FEATURE_LEARNING_CALENDAR
      );

      expect(upgradePath).toBe(PlanTier.PRO);
    });
  });
});
