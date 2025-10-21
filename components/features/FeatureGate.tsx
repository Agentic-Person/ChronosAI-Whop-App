/**
 * FeatureGate Component
 * Wraps gated features and shows upgrade prompt if user lacks access
 */

'use client';

import React from 'react';
import { useFeatureAccess } from '@/lib/hooks/useFeatureAccess';
import { Feature } from '@/lib/features/types';
import { UpgradePrompt } from './UpgradePrompt';

interface FeatureGateProps {
  /** Feature required to access children */
  feature: Feature;
  /** Children to render if user has access */
  children: React.ReactNode;
  /** Custom fallback component if access denied */
  fallback?: React.ReactNode;
  /** Loading component while checking access */
  loadingComponent?: React.ReactNode;
  /** User ID (optional, uses session if not provided) */
  userId?: string;
  /** Whether to show upgrade prompt on access denied (default: true) */
  showUpgradePrompt?: boolean;
  /** Custom upgrade message */
  upgradeMessage?: string;
}

/**
 * FeatureGate component
 * Conditionally renders children based on feature access
 *
 * @example
 * ```tsx
 * <FeatureGate feature={Feature.FEATURE_LEARNING_CALENDAR}>
 *   <LearningCalendar />
 * </FeatureGate>
 * ```
 *
 * @example With custom fallback
 * ```tsx
 * <FeatureGate
 *   feature={Feature.FEATURE_QUIZZES}
 *   fallback={<CustomUpgradeMessage />}
 * >
 *   <QuizBuilder />
 * </FeatureGate>
 * ```
 */
export function FeatureGate({
  feature,
  children,
  fallback,
  loadingComponent,
  userId,
  showUpgradePrompt = true,
  upgradeMessage,
}: FeatureGateProps) {
  const {
    hasAccess,
    isLoading,
    isError,
    userPlan,
    requiredPlan,
  } = useFeatureAccess(feature, userId);

  // Show loading state
  if (isLoading) {
    if (loadingComponent) {
      return <>{loadingComponent}</>;
    }

    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  // Show error state
  if (isError) {
    return (
      <div className="rounded-lg bg-red-50 p-4 text-red-800">
        <p className="text-sm font-medium">Failed to check feature access</p>
        <p className="text-xs mt-1">Please refresh the page or contact support</p>
      </div>
    );
  }

  // User has access - render children
  if (hasAccess) {
    return <>{children}</>;
  }

  // User doesn't have access - show fallback or upgrade prompt
  if (fallback) {
    return <>{fallback}</>;
  }

  if (showUpgradePrompt) {
    return (
      <UpgradePrompt
        feature={feature}
        currentPlan={userPlan}
        requiredPlan={requiredPlan}
        customMessage={upgradeMessage}
      />
    );
  }

  // Don't show anything if no fallback and upgrade prompt disabled
  return null;
}

/**
 * Inline feature gate for conditional rendering
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   return (
 *     <div>
 *       <h1>Dashboard</h1>
 *       <InlineFeatureGate feature={Feature.FEATURE_ADVANCED_ANALYTICS}>
 *         {(hasAccess) => (
 *           hasAccess ? <AdvancedAnalytics /> : <BasicAnalytics />
 *         )}
 *       </InlineFeatureGate>
 *     </div>
 *   );
 * }
 * ```
 */
export function InlineFeatureGate({
  feature,
  children,
  userId,
}: {
  feature: Feature;
  children: (hasAccess: boolean, isLoading: boolean) => React.ReactNode;
  userId?: string;
}) {
  const { hasAccess, isLoading } = useFeatureAccess(feature, userId);

  return <>{children(hasAccess, isLoading)}</>;
}

/**
 * Feature gate for multiple features (user must have ALL)
 *
 * @example
 * ```tsx
 * <MultiFeatureGate features={[Feature.FEATURE_QUIZZES, Feature.FEATURE_PROJECTS]}>
 *   <AdvancedLearningTools />
 * </MultiFeatureGate>
 * ```
 */
export function MultiFeatureGate({
  features,
  children,
  fallback,
  loadingComponent,
  userId,
}: {
  features: Feature[];
  children: React.ReactNode;
  fallback?: React.ReactNode;
  loadingComponent?: React.ReactNode;
  userId?: string;
}) {
  // Check access for first feature (can be optimized with batch check)
  const firstFeatureCheck = useFeatureAccess(features[0], userId);

  if (firstFeatureCheck.isLoading) {
    if (loadingComponent) {
      return <>{loadingComponent}</>;
    }

    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  // For simplicity, check all features client-side
  // In production, implement a batch check API
  const allChecks = features.map(feature => {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    return useFeatureAccess(feature, userId);
  });

  const allHaveAccess = allChecks.every(check => check.hasAccess);
  const anyLoading = allChecks.some(check => check.isLoading);

  if (anyLoading) {
    if (loadingComponent) {
      return <>{loadingComponent}</>;
    }

    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (allHaveAccess) {
    return <>{children}</>;
  }

  // Find first feature without access
  const deniedFeature = features.find((feature, index) => !allChecks[index].hasAccess);

  if (fallback) {
    return <>{fallback}</>;
  }

  return (
    <UpgradePrompt
      feature={deniedFeature || features[0]}
      currentPlan={firstFeatureCheck.userPlan}
      requiredPlan={firstFeatureCheck.requiredPlan}
    />
  );
}
