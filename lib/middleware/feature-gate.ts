/**
 * Feature Gate Middleware
 * Higher-order function to protect API routes with feature gating
 */

import { NextRequest, NextResponse } from 'next/server';
import { FeatureFlagService } from '@/lib/features/feature-flags';
import { Feature, FEATURE_METADATA, PlanTier } from '@/lib/features/types';
import { WhopPlanChecker } from '@/lib/whop/plan-checker';

/**
 * API Route Handler type (Next.js 14 App Router)
 */
export type ApiRouteHandler = (
  req: NextRequest,
  context?: any
) => Promise<NextResponse> | NextResponse;

/**
 * Feature gate options
 */
interface FeatureGateOptions {
  /** Feature to check access for */
  feature: Feature;
  /** Custom error message */
  errorMessage?: string;
  /** Whether to log access attempts */
  logAccess?: boolean;
  /** Extract user ID from request (custom logic) */
  getUserId?: (req: NextRequest) => Promise<string | null> | string | null;
}

/**
 * Default user ID extraction from request
 * Checks headers and query params for user identification
 */
async function defaultGetUserId(req: NextRequest): Promise<string | null> {
  // Check for user ID in headers
  const headerUserId = req.headers.get('x-user-id');
  if (headerUserId) {
    return headerUserId;
  }

  // Check for Whop user ID in headers
  const whopUserId = req.headers.get('x-whop-user-id');
  if (whopUserId) {
    return whopUserId;
  }

  // Check URL params
  const { searchParams } = new URL(req.url);
  const queryUserId = searchParams.get('userId');
  if (queryUserId) {
    return queryUserId;
  }

  // Try to extract from session/auth token (placeholder)
  // In production, implement proper session extraction
  const authHeader = req.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    // TODO: Decode JWT and extract user ID
    // For now, return null
  }

  return null;
}

/**
 * Higher-order function to wrap API routes with feature gating
 * @param options - Feature gate configuration
 * @param handler - API route handler to protect
 * @returns Protected API route handler
 *
 * @example
 * ```ts
 * export const GET = withFeatureGate(
 *   { feature: Feature.FEATURE_LEARNING_CALENDAR },
 *   async (req) => {
 *     // Your protected route logic
 *     return NextResponse.json({ data: 'success' });
 *   }
 * );
 * ```
 */
export function withFeatureGate(
  options: FeatureGateOptions,
  handler: ApiRouteHandler
): ApiRouteHandler {
  return async (req: NextRequest, context?: any): Promise<NextResponse> => {
    try {
      // Extract user ID
      const getUserId = options.getUserId || defaultGetUserId;
      const userId = await getUserId(req);

      if (!userId) {
        return NextResponse.json(
          {
            error: 'Unauthorized',
            message: 'User identification required',
            code: 'MISSING_USER_ID',
          },
          { status: 401 }
        );
      }

      // Check feature access
      const accessResult = await FeatureFlagService.hasFeatureAccess(
        userId,
        options.feature
      );

      // Log access attempt if enabled
      if (options.logAccess !== false) {
        await FeatureFlagService.logFeatureAccess(
          userId,
          options.feature,
          accessResult.hasAccess
        );
      }

      // Block access if user doesn't have required plan
      if (!accessResult.hasAccess) {
        const featureMetadata = FEATURE_METADATA[options.feature];
        const upgradeUrl = WhopPlanChecker.getUpgradeUrl(
          accessResult.requiredPlan,
          userId
        );

        return NextResponse.json(
          {
            error: 'Feature Access Denied',
            message:
              options.errorMessage ||
              `This feature requires ${accessResult.requiredPlan.toUpperCase()} plan or higher`,
            code: 'FEATURE_GATED',
            details: {
              feature: options.feature,
              featureName: featureMetadata.name,
              currentPlan: accessResult.userPlan,
              requiredPlan: accessResult.requiredPlan,
              upgradeUrl,
            },
          },
          { status: 403 }
        );
      }

      // User has access - proceed to handler
      return await handler(req, context);
    } catch (error) {
      console.error('Feature gate middleware error:', error);

      return NextResponse.json(
        {
          error: 'Internal Server Error',
          message: 'Failed to validate feature access',
          code: 'FEATURE_GATE_ERROR',
        },
        { status: 500 }
      );
    }
  };
}

/**
 * Middleware to check plan limits (e.g., max videos, max students)
 * @param limitType - Type of limit to check
 * @param getCurrentUsage - Function to get current usage count
 * @param handler - API route handler to protect
 *
 * @example
 * ```ts
 * export const POST = withPlanLimit(
 *   'maxVideos',
 *   async (userId) => {
 *     const count = await getVideoCount(userId);
 *     return count;
 *   },
 *   async (req) => {
 *     // Your protected route logic
 *     return NextResponse.json({ data: 'success' });
 *   }
 * );
 * ```
 */
export function withPlanLimit(
  limitType: 'maxVideos' | 'maxStudents' | 'maxProjects' | 'maxQuizzes' | 'maxStorageGB',
  getCurrentUsage: (userId: string) => Promise<number>,
  handler: ApiRouteHandler
): ApiRouteHandler {
  return async (req: NextRequest, context?: any): Promise<NextResponse> => {
    try {
      // Extract user ID
      const userId = await defaultGetUserId(req);

      if (!userId) {
        return NextResponse.json(
          {
            error: 'Unauthorized',
            message: 'User identification required',
          },
          { status: 401 }
        );
      }

      // Get current usage
      const currentUsage = await getCurrentUsage(userId);

      // Check if within plan limits
      const withinLimit = await FeatureFlagService.checkPlanLimit(
        userId,
        limitType,
        currentUsage
      );

      if (!withinLimit) {
        const userPlan = await FeatureFlagService.getUserPlan(userId);
        const planConfig = FeatureFlagService.getPlanConfig(userPlan);
        const limit = planConfig.limits[limitType];

        return NextResponse.json(
          {
            error: 'Plan Limit Exceeded',
            message: `You have reached your plan limit for ${limitType}`,
            code: 'PLAN_LIMIT_EXCEEDED',
            details: {
              limitType,
              currentUsage,
              limit,
              currentPlan: userPlan,
              upgradeUrl: WhopPlanChecker.getUpgradeUrl(PlanTier.PRO, userId),
            },
          },
          { status: 403 }
        );
      }

      // Within limits - proceed
      return await handler(req, context);
    } catch (error) {
      console.error('Plan limit middleware error:', error);

      return NextResponse.json(
        {
          error: 'Internal Server Error',
          message: 'Failed to check plan limits',
        },
        { status: 500 }
      );
    }
  };
}

/**
 * Combine multiple feature gates (user must have ALL features)
 * @param features - Array of features required
 * @param handler - API route handler to protect
 *
 * @example
 * ```ts
 * export const POST = withMultipleFeatureGates(
 *   [Feature.FEATURE_QUIZZES, Feature.FEATURE_PROJECTS],
 *   async (req) => {
 *     // Route requires both quizzes AND projects features
 *     return NextResponse.json({ data: 'success' });
 *   }
 * );
 * ```
 */
export function withMultipleFeatureGates(
  features: Feature[],
  handler: ApiRouteHandler
): ApiRouteHandler {
  return async (req: NextRequest, context?: any): Promise<NextResponse> => {
    try {
      const userId = await defaultGetUserId(req);

      if (!userId) {
        return NextResponse.json(
          {
            error: 'Unauthorized',
            message: 'User identification required',
          },
          { status: 401 }
        );
      }

      // Check all features
      const accessResults = await FeatureFlagService.checkMultipleFeatures(
        userId,
        features
      );

      // Find first denied feature
      const deniedFeature = features.find(feature => !accessResults.get(feature));

      if (deniedFeature) {
        const userPlan = await FeatureFlagService.getUserPlan(userId);
        const requiredPlan = FeatureFlagService.getRequiredPlan(deniedFeature);
        const featureMetadata = FEATURE_METADATA[deniedFeature];

        return NextResponse.json(
          {
            error: 'Feature Access Denied',
            message: `This requires ${featureMetadata.name} (${requiredPlan.toUpperCase()} plan)`,
            code: 'MULTIPLE_FEATURES_REQUIRED',
            details: {
              missingFeature: deniedFeature,
              featureName: featureMetadata.name,
              currentPlan: userPlan,
              requiredPlan,
              upgradeUrl: WhopPlanChecker.getUpgradeUrl(requiredPlan, userId),
            },
          },
          { status: 403 }
        );
      }

      // Has access to all features
      return await handler(req, context);
    } catch (error) {
      console.error('Multiple feature gates error:', error);

      return NextResponse.json(
        {
          error: 'Internal Server Error',
          message: 'Failed to validate feature access',
        },
        { status: 500 }
      );
    }
  };
}

/**
 * Simplified feature gate for common use cases
 * @param feature - Feature to check
 * @param handler - API route handler
 */
export const requireFeature = (feature: Feature, handler: ApiRouteHandler) =>
  withFeatureGate({ feature }, handler);

/**
 * Express/Connect-style middleware (for compatibility)
 */
export function createFeatureGateMiddleware(feature: Feature) {
  return async (req: any, res: any, next: any) => {
    try {
      const userId = req.user?.id || req.userId || req.headers['x-user-id'];

      if (!userId) {
        return res.status(401).json({
          error: 'Unauthorized',
          message: 'User identification required',
        });
      }

      const hasAccess = await FeatureFlagService.canAccessFeature(userId, feature);

      if (!hasAccess) {
        const userPlan = await FeatureFlagService.getUserPlan(userId);
        const requiredPlan = FeatureFlagService.getRequiredPlan(feature);

        return res.status(403).json({
          error: 'Feature Access Denied',
          message: `This feature requires ${requiredPlan.toUpperCase()} plan`,
          currentPlan: userPlan,
          requiredPlan,
        });
      }

      next();
    } catch (error) {
      console.error('Feature gate middleware error:', error);
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to validate feature access',
      });
    }
  };
}
