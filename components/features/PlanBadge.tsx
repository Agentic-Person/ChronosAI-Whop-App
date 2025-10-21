/**
 * PlanBadge Component
 * Visual indicator for user's current plan tier
 */

'use client';

import React from 'react';
import { PlanTier, PLAN_CONFIGS } from '@/lib/features/types';
import { useUserPlan } from '@/lib/hooks/useFeatureAccess';
import { Crown, Zap, Shield, ChevronDown } from 'lucide-react';

interface PlanBadgeProps {
  /** User ID (optional, uses session if not provided) */
  userId?: string;
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
  /** Whether to show plan details on hover/click */
  showDetails?: boolean;
  /** Custom className */
  className?: string;
}

/**
 * Get plan color scheme
 */
function getPlanColors(plan: PlanTier): {
  bg: string;
  text: string;
  border: string;
  gradient: string;
} {
  switch (plan) {
    case PlanTier.ENTERPRISE:
      return {
        bg: 'bg-gradient-to-r from-purple-600 to-indigo-600',
        text: 'text-white',
        border: 'border-purple-500',
        gradient: 'from-purple-600 to-indigo-600',
      };
    case PlanTier.PRO:
      return {
        bg: 'bg-gradient-to-r from-blue-600 to-cyan-600',
        text: 'text-white',
        border: 'border-blue-500',
        gradient: 'from-blue-600 to-cyan-600',
      };
    case PlanTier.BASIC:
    default:
      return {
        bg: 'bg-gradient-to-r from-gray-600 to-gray-700',
        text: 'text-white',
        border: 'border-gray-500',
        gradient: 'from-gray-600 to-gray-700',
      };
  }
}

/**
 * Get plan icon
 */
function getPlanIcon(plan: PlanTier) {
  switch (plan) {
    case PlanTier.ENTERPRISE:
      return Shield;
    case PlanTier.PRO:
      return Zap;
    case PlanTier.BASIC:
    default:
      return Crown;
  }
}

/**
 * PlanBadge component
 * Shows user's current plan with optional details
 *
 * @example
 * ```tsx
 * <PlanBadge />
 * ```
 *
 * @example With details
 * ```tsx
 * <PlanBadge size="lg" showDetails />
 * ```
 */
export function PlanBadge({
  userId,
  size = 'md',
  showDetails = false,
  className = '',
}: PlanBadgeProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const { plan, isLoading, planConfig, limits, daysUntilExpiration, isExpiringSoon } =
    useUserPlan(userId);

  if (isLoading) {
    return (
      <div
        className={`animate-pulse rounded-full bg-gray-200 ${
          size === 'sm' ? 'h-6 w-20' : size === 'lg' ? 'h-10 w-32' : 'h-8 w-24'
        } ${className}`}
      />
    );
  }

  if (!plan) {
    return null;
  }

  const colors = getPlanColors(plan);
  const Icon = getPlanIcon(plan);
  const config = planConfig || PLAN_CONFIGS[plan];

  const sizeClasses = {
    sm: 'px-2.5 py-1 text-xs gap-1',
    md: 'px-3 py-1.5 text-sm gap-1.5',
    lg: 'px-4 py-2 text-base gap-2',
  };

  const iconSizes = {
    sm: 'h-3 w-3',
    md: 'h-4 w-4',
    lg: 'h-5 w-5',
  };

  return (
    <div className={`relative inline-block ${className}`}>
      <button
        onClick={() => showDetails && setIsOpen(!isOpen)}
        className={`inline-flex items-center ${sizeClasses[size]} ${colors.bg} ${colors.text} font-semibold rounded-full shadow-sm transition-all hover:shadow-md ${
          showDetails ? 'cursor-pointer' : 'cursor-default'
        }`}
      >
        <Icon className={iconSizes[size]} />
        <span>{config.displayName}</span>
        {showDetails && <ChevronDown className={`${iconSizes[size]} transition-transform ${isOpen ? 'rotate-180' : ''}`} />}
      </button>

      {/* Details dropdown */}
      {showDetails && isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />

          {/* Dropdown content */}
          <div className="absolute right-0 mt-2 w-72 rounded-lg bg-white shadow-xl border border-gray-200 z-20 overflow-hidden">
            {/* Header */}
            <div className={`bg-gradient-to-r ${colors.gradient} p-4 text-white`}>
              <div className="flex items-center gap-2 mb-1">
                <Icon className="h-5 w-5" />
                <h3 className="font-bold text-lg">{config.displayName} Plan</h3>
              </div>
              <p className="text-sm opacity-90">{config.description}</p>
            </div>

            {/* Plan info */}
            <div className="p-4 space-y-3">
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase mb-2">
                  Plan Details
                </p>
                <div className="space-y-1.5">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Price:</span>
                    <span className="font-semibold text-gray-900">
                      ${config.price.monthly}/month
                    </span>
                  </div>

                  {daysUntilExpiration !== null && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Expires in:</span>
                      <span
                        className={`font-semibold ${
                          isExpiringSoon ? 'text-orange-600' : 'text-gray-900'
                        }`}
                      >
                        {daysUntilExpiration} days
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Usage limits */}
              {limits && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase mb-2">
                    Usage Limits
                  </p>
                  <div className="space-y-1.5">
                    {limits.maxVideos !== undefined && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Videos:</span>
                        <span className="font-medium text-gray-900">
                          {limits.maxVideos === -1 ? 'Unlimited' : limits.maxVideos}
                        </span>
                      </div>
                    )}
                    {limits.maxStudents !== undefined && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Students:</span>
                        <span className="font-medium text-gray-900">
                          {limits.maxStudents === -1 ? 'Unlimited' : limits.maxStudents}
                        </span>
                      </div>
                    )}
                    {limits.maxStorageGB !== undefined && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Storage:</span>
                        <span className="font-medium text-gray-900">
                          {limits.maxStorageGB === -1
                            ? 'Unlimited'
                            : `${limits.maxStorageGB} GB`}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Upgrade CTA (if not on highest plan) */}
              {plan !== PlanTier.ENTERPRISE && (
                <div className="pt-3 border-t border-gray-200">
                  <a
                    href="/pricing"
                    className="block w-full text-center px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white font-semibold rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all text-sm"
                  >
                    Upgrade Plan
                  </a>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

/**
 * Simple text-only plan badge
 */
export function PlanBadgeSimple({ plan }: { plan: PlanTier }) {
  const config = PLAN_CONFIGS[plan];
  const colors = getPlanColors(plan);

  return (
    <span
      className={`inline-block px-2 py-0.5 ${colors.bg} ${colors.text} text-xs font-semibold rounded`}
    >
      {config.displayName}
    </span>
  );
}

/**
 * Plan comparison badge (for pricing tables)
 */
export function PlanComparisonBadge({
  plan,
  isPopular = false,
}: {
  plan: PlanTier;
  isPopular?: boolean;
}) {
  const config = PLAN_CONFIGS[plan];
  const colors = getPlanColors(plan);
  const Icon = getPlanIcon(plan);

  return (
    <div className="relative">
      {isPopular && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-gradient-to-r from-yellow-400 to-orange-400 text-white text-xs font-bold rounded-full shadow-lg">
          MOST POPULAR
        </div>
      )}

      <div
        className={`inline-flex items-center gap-2 px-4 py-2 ${colors.bg} ${colors.text} font-bold rounded-lg shadow-md`}
      >
        <Icon className="h-5 w-5" />
        <span className="text-lg">{config.displayName}</span>
      </div>
    </div>
  );
}
