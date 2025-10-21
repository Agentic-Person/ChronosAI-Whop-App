/**
 * UpgradePrompt Component
 * Beautiful modal/banner showing locked features and upgrade CTA
 */

'use client';

import React, { useState } from 'react';
import { Feature, PlanTier, FEATURE_METADATA, PLAN_CONFIGS } from '@/lib/features/types';
import { useUpgradeUrl } from '@/lib/hooks/useFeatureAccess';
import { Lock, Crown, Sparkles, ArrowRight, X } from 'lucide-react';

interface UpgradePromptProps {
  /** Feature that requires upgrade */
  feature: Feature;
  /** User's current plan */
  currentPlan: PlanTier | null;
  /** Plan required for feature */
  requiredPlan: PlanTier | null;
  /** Custom message override */
  customMessage?: string;
  /** Variant style */
  variant?: 'modal' | 'banner' | 'card' | 'inline';
  /** Whether user can dismiss */
  dismissible?: boolean;
  /** Callback when dismissed */
  onDismiss?: () => void;
}

/**
 * UpgradePrompt component
 * Shows beautiful upgrade prompts when users try to access gated features
 *
 * @example
 * ```tsx
 * <UpgradePrompt
 *   feature={Feature.FEATURE_LEARNING_CALENDAR}
 *   currentPlan={PlanTier.BASIC}
 *   requiredPlan={PlanTier.PRO}
 * />
 * ```
 */
export function UpgradePrompt({
  feature,
  currentPlan,
  requiredPlan,
  customMessage,
  variant = 'card',
  dismissible = false,
  onDismiss,
}: UpgradePromptProps) {
  const [isDismissed, setIsDismissed] = useState(false);
  const upgradeUrl = useUpgradeUrl(feature);

  if (isDismissed) {
    return null;
  }

  const featureMetadata = FEATURE_METADATA[feature];
  const targetPlan = requiredPlan || PlanTier.PRO;
  const planConfig = PLAN_CONFIGS[targetPlan];

  const handleDismiss = () => {
    setIsDismissed(true);
    onDismiss?.();
  };

  const handleUpgrade = () => {
    if (upgradeUrl) {
      window.open(upgradeUrl, '_blank');
    }
  };

  // Card variant (default)
  if (variant === 'card') {
    return (
      <div className="relative overflow-hidden rounded-xl border-2 border-purple-200 bg-gradient-to-br from-purple-50 to-blue-50 p-8 shadow-lg">
        {dismissible && (
          <button
            onClick={handleDismiss}
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        )}

        <div className="flex items-start gap-6">
          {/* Icon */}
          <div className="flex-shrink-0">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-purple-500 to-blue-500">
              <Lock className="h-8 w-8 text-white" />
            </div>
          </div>

          {/* Content */}
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <Crown className="h-5 w-5 text-purple-600" />
              <h3 className="text-2xl font-bold text-gray-900">
                {planConfig.displayName} Feature
              </h3>
            </div>

            <p className="text-lg text-gray-700 mb-4">
              {customMessage || (
                <>
                  <span className="font-semibold">{featureMetadata.name}</span> is available
                  on the {planConfig.displayName} plan
                </>
              )}
            </p>

            <p className="text-sm text-gray-600 mb-6">
              {featureMetadata.description}
            </p>

            {/* Features list */}
            <div className="bg-white rounded-lg p-4 mb-6">
              <p className="text-sm font-semibold text-gray-700 mb-3">
                Unlock with {planConfig.displayName}:
              </p>
              <ul className="space-y-2">
                {planConfig.features.slice(0, 5).map((feat) => {
                  const meta = FEATURE_METADATA[feat];
                  return (
                    <li key={feat} className="flex items-start gap-2 text-sm text-gray-600">
                      <Sparkles className="h-4 w-4 text-purple-500 flex-shrink-0 mt-0.5" />
                      <span>{meta.name}</span>
                    </li>
                  );
                })}
              </ul>
            </div>

            {/* CTA */}
            <button
              onClick={handleUpgrade}
              className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white font-semibold rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all shadow-md hover:shadow-lg"
            >
              <span>Upgrade to {planConfig.displayName}</span>
              <ArrowRight className="h-5 w-5" />
            </button>

            <p className="text-xs text-gray-500 mt-3">
              Starting at ${planConfig.price.monthly}/month
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Banner variant
  if (variant === 'banner') {
    return (
      <div className="relative bg-gradient-to-r from-purple-600 to-blue-600 text-white p-4 rounded-lg shadow-lg">
        {dismissible && (
          <button
            onClick={handleDismiss}
            className="absolute top-2 right-2 text-white/80 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        )}

        <div className="flex items-center justify-between gap-4 pr-8">
          <div className="flex items-center gap-3">
            <Lock className="h-6 w-6" />
            <div>
              <p className="font-semibold">
                {featureMetadata.name} requires {planConfig.displayName}
              </p>
              <p className="text-sm text-white/90">
                Unlock this feature and more from ${planConfig.price.monthly}/month
              </p>
            </div>
          </div>

          <button
            onClick={handleUpgrade}
            className="flex-shrink-0 px-4 py-2 bg-white text-purple-600 font-semibold rounded-lg hover:bg-gray-100 transition-colors"
          >
            Upgrade Now
          </button>
        </div>
      </div>
    );
  }

  // Inline variant
  if (variant === 'inline') {
    return (
      <div className="inline-flex items-center gap-2 text-sm text-gray-600">
        <Lock className="h-4 w-4 text-purple-500" />
        <span>
          {featureMetadata.name} requires{' '}
          <button
            onClick={handleUpgrade}
            className="text-purple-600 hover:text-purple-700 font-semibold underline"
          >
            {planConfig.displayName}
          </button>
        </span>
      </div>
    );
  }

  // Modal variant
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="relative w-full max-w-2xl rounded-2xl bg-white p-8 shadow-2xl">
        {dismissible && (
          <button
            onClick={handleDismiss}
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        )}

        <div className="text-center">
          <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-purple-500 to-blue-500">
            <Crown className="h-10 w-10 text-white" />
          </div>

          <h2 className="text-3xl font-bold text-gray-900 mb-2">
            Unlock {featureMetadata.name}
          </h2>

          <p className="text-lg text-gray-600 mb-6">
            {customMessage || `Upgrade to ${planConfig.displayName} to access this feature`}
          </p>

          {/* Feature highlights */}
          <div className="bg-gray-50 rounded-lg p-6 mb-6 text-left">
            <p className="text-sm font-semibold text-gray-700 mb-4">
              What you'll get with {planConfig.displayName}:
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {planConfig.features.slice(0, 6).map((feat) => {
                const meta = FEATURE_METADATA[feat];
                return (
                  <div key={feat} className="flex items-start gap-2">
                    <Sparkles className="h-4 w-4 text-purple-500 flex-shrink-0 mt-1" />
                    <span className="text-sm text-gray-700">{meta.name}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={handleUpgrade}
              className="px-8 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white font-semibold rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all shadow-lg"
            >
              Upgrade to {planConfig.displayName} - ${planConfig.price.monthly}/mo
            </button>

            {dismissible && (
              <button
                onClick={handleDismiss}
                className="px-8 py-3 bg-gray-100 text-gray-700 font-semibold rounded-lg hover:bg-gray-200 transition-colors"
              >
                Maybe Later
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Compact upgrade badge for inline use
 */
export function UpgradeBadge({
  requiredPlan,
  size = 'sm',
}: {
  requiredPlan: PlanTier;
  size?: 'xs' | 'sm' | 'md';
}) {
  const planConfig = PLAN_CONFIGS[requiredPlan];

  const sizeClasses = {
    xs: 'px-2 py-0.5 text-xs',
    sm: 'px-2.5 py-1 text-xs',
    md: 'px-3 py-1.5 text-sm',
  };

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-purple-500 to-blue-500 text-white font-semibold ${sizeClasses[size]}`}
    >
      <Crown className={size === 'xs' ? 'h-3 w-3' : 'h-4 w-4'} />
      <span>{planConfig.displayName}</span>
    </span>
  );
}
