/**
 * React Hooks for Feature Access
 * Client-side hooks for checking feature access and plan information
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { Feature, PlanTier, FeatureAccessResult } from '@/lib/features/types';

/**
 * Hook return type for feature access
 */
interface UseFeatureAccessReturn {
  hasAccess: boolean;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  userPlan: PlanTier | null;
  requiredPlan: PlanTier | null;
  refetch: () => Promise<void>;
}

/**
 * Hook to check if user has access to a specific feature
 * @param feature - Feature to check
 * @param userId - User ID (optional, will use current session if not provided)
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { hasAccess, isLoading, userPlan } = useFeatureAccess(
 *     Feature.FEATURE_LEARNING_CALENDAR
 *   );
 *
 *   if (isLoading) return <Spinner />;
 *   if (!hasAccess) return <UpgradePrompt />;
 *
 *   return <LearningCalendar />;
 * }
 * ```
 */
export function useFeatureAccess(
  feature: Feature,
  userId?: string
): UseFeatureAccessReturn {
  const [hasAccess, setHasAccess] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [userPlan, setUserPlan] = useState<PlanTier | null>(null);
  const [requiredPlan, setRequiredPlan] = useState<PlanTier | null>(null);

  const checkAccess = useCallback(async () => {
    setIsLoading(true);
    setIsError(false);
    setError(null);

    try {
      // Call API to check feature access
      const response = await fetch('/api/features/check', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          feature,
          userId,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to check feature access');
      }

      const result: FeatureAccessResult = await response.json();

      setHasAccess(result.hasAccess);
      setUserPlan(result.userPlan);
      setRequiredPlan(result.requiredPlan);
    } catch (err) {
      setIsError(true);
      setError(err instanceof Error ? err : new Error('Unknown error'));
      setHasAccess(false);
    } finally {
      setIsLoading(false);
    }
  }, [feature, userId]);

  useEffect(() => {
    checkAccess();
  }, [checkAccess]);

  return {
    hasAccess,
    isLoading,
    isError,
    error,
    userPlan,
    requiredPlan,
    refetch: checkAccess,
  };
}

/**
 * Hook return type for plan features
 */
interface UsePlanFeaturesReturn {
  features: Feature[];
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  userPlan: PlanTier | null;
  hasFeature: (feature: Feature) => boolean;
  refetch: () => Promise<void>;
}

/**
 * Hook to get all features available in user's plan
 * @param userId - User ID (optional, will use current session if not provided)
 *
 * @example
 * ```tsx
 * function FeatureList() {
 *   const { features, userPlan, hasFeature } = usePlanFeatures();
 *
 *   return (
 *     <div>
 *       <h2>Your Plan: {userPlan}</h2>
 *       {features.map(feature => (
 *         <FeatureItem key={feature} feature={feature} />
 *       ))}
 *     </div>
 *   );
 * }
 * ```
 */
export function usePlanFeatures(userId?: string): UsePlanFeaturesReturn {
  const [features, setFeatures] = useState<Feature[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [userPlan, setUserPlan] = useState<PlanTier | null>(null);

  const fetchFeatures = useCallback(async () => {
    setIsLoading(true);
    setIsError(false);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (userId) params.append('userId', userId);

      const response = await fetch(`/api/features/list?${params.toString()}`);

      if (!response.ok) {
        throw new Error('Failed to fetch plan features');
      }

      const data = await response.json();

      setFeatures(data.features);
      setUserPlan(data.userPlan);
    } catch (err) {
      setIsError(true);
      setError(err instanceof Error ? err : new Error('Unknown error'));
      setFeatures([]);
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchFeatures();
  }, [fetchFeatures]);

  const hasFeature = useCallback(
    (feature: Feature) => features.includes(feature),
    [features]
  );

  return {
    features,
    isLoading,
    isError,
    error,
    userPlan,
    hasFeature,
    refetch: fetchFeatures,
  };
}

/**
 * Hook return type for user plan
 */
interface UseUserPlanReturn {
  plan: PlanTier | null;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  planConfig: any;
  limits: any;
  expiresAt: Date | null;
  daysUntilExpiration: number | null;
  isExpiringSoon: boolean;
  refetch: () => Promise<void>;
}

/**
 * Hook to get user's current plan information
 * @param userId - User ID (optional, will use current session if not provided)
 *
 * @example
 * ```tsx
 * function PlanInfo() {
 *   const { plan, limits, daysUntilExpiration, isExpiringSoon } = useUserPlan();
 *
 *   return (
 *     <div>
 *       <h2>Current Plan: {plan}</h2>
 *       {isExpiringSoon && (
 *         <Alert>Your plan expires in {daysUntilExpiration} days</Alert>
 *       )}
 *     </div>
 *   );
 * }
 * ```
 */
export function useUserPlan(userId?: string): UseUserPlanReturn {
  const [plan, setPlan] = useState<PlanTier | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [planConfig, setPlanConfig] = useState<any>(null);
  const [limits, setLimits] = useState<any>(null);
  const [expiresAt, setExpiresAt] = useState<Date | null>(null);
  const [daysUntilExpiration, setDaysUntilExpiration] = useState<number | null>(
    null
  );
  const [isExpiringSoon, setIsExpiringSoon] = useState(false);

  const fetchPlan = useCallback(async () => {
    setIsLoading(true);
    setIsError(false);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (userId) params.append('userId', userId);

      const response = await fetch(`/api/features/plan?${params.toString()}`);

      if (!response.ok) {
        throw new Error('Failed to fetch user plan');
      }

      const data = await response.json();

      setPlan(data.plan);
      setPlanConfig(data.planConfig);
      setLimits(data.limits);

      if (data.expiresAt) {
        const expiration = new Date(data.expiresAt);
        setExpiresAt(expiration);

        const now = new Date();
        const diffMs = expiration.getTime() - now.getTime();
        const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
        setDaysUntilExpiration(diffDays);
        setIsExpiringSoon(diffDays <= 7 && diffDays > 0);
      } else {
        setExpiresAt(null);
        setDaysUntilExpiration(null);
        setIsExpiringSoon(false);
      }
    } catch (err) {
      setIsError(true);
      setError(err instanceof Error ? err : new Error('Unknown error'));
      setPlan(null);
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchPlan();
  }, [fetchPlan]);

  return {
    plan,
    isLoading,
    isError,
    error,
    planConfig,
    limits,
    expiresAt,
    daysUntilExpiration,
    isExpiringSoon,
    refetch: fetchPlan,
  };
}

/**
 * Hook to check plan limits
 * @param limitType - Type of limit to check
 * @param currentUsage - Current usage count
 *
 * @example
 * ```tsx
 * function VideoUpload() {
 *   const videoCount = useVideoCount();
 *   const { withinLimit, limit, percentUsed } = usePlanLimit('maxVideos', videoCount);
 *
 *   if (!withinLimit) {
 *     return <UpgradePrompt reason="Video limit reached" />;
 *   }
 *
 *   return <VideoUploadForm />;
 * }
 * ```
 */
export function usePlanLimit(
  limitType: 'maxVideos' | 'maxStudents' | 'maxProjects' | 'maxQuizzes',
  currentUsage: number
) {
  const { limits, isLoading } = useUserPlan();

  const limit = limits?.[limitType] ?? 0;
  const unlimited = limit === -1;
  const withinLimit = unlimited || currentUsage < limit;
  const percentUsed = unlimited ? 0 : (currentUsage / limit) * 100;
  const remaining = unlimited ? Infinity : Math.max(0, limit - currentUsage);

  return {
    withinLimit,
    limit,
    unlimited,
    currentUsage,
    percentUsed,
    remaining,
    isLoading,
  };
}

/**
 * Hook to get upgrade URL for a feature
 * @param feature - Feature to upgrade for
 *
 * @example
 * ```tsx
 * function LockedFeature() {
 *   const upgradeUrl = useUpgradeUrl(Feature.FEATURE_LEARNING_CALENDAR);
 *
 *   return (
 *     <a href={upgradeUrl}>Upgrade to Pro to unlock this feature</a>
 *   );
 * }
 * ```
 */
export function useUpgradeUrl(feature: Feature): string | null {
  const [upgradeUrl, setUpgradeUrl] = useState<string | null>(null);

  useEffect(() => {
    async function fetchUpgradeUrl() {
      try {
        const response = await fetch('/api/features/upgrade-url', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ feature }),
        });

        if (response.ok) {
          const data = await response.json();
          setUpgradeUrl(data.upgradeUrl);
        }
      } catch (error) {
        console.error('Failed to fetch upgrade URL:', error);
      }
    }

    fetchUpgradeUrl();
  }, [feature]);

  return upgradeUrl;
}
