/**
 * Trial Banner Component
 *
 * Shows trial countdown and upgrade CTA
 * Displayed on all dashboard pages during active trial
 */

'use client';

import { useRouter } from 'next/navigation';
import { Clock, Sparkles, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { TrialInfo, TrialStatus } from '@/lib/trial/types';

interface TrialBannerProps {
  trialInfo: TrialInfo;
}

export function TrialBanner({ trialInfo }: TrialBannerProps) {
  const router = useRouter();

  const { daysRemaining, status } = trialInfo;

  // Trial expired - urgent upgrade required
  if (status === TrialStatus.EXPIRED || daysRemaining <= 0) {
    return (
      <div className="bg-red-500/10 border border-red-500 rounded-lg p-4 mb-6">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h3 className="font-semibold text-red-500 mb-1">
              Trial Expired - Upgrade Required
            </h3>
            <p className="text-sm text-text-muted mb-3">
              Your 7-day trial has ended. Choose a plan to continue using Video Wizard
              and upload your own content.
            </p>
            <Button
              onClick={() => router.push('/upgrade')}
              className="bg-red-500 hover:bg-red-600"
            >
              Choose Your Plan
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Last day - urgent warning
  if (daysRemaining === 1) {
    return (
      <div className="bg-amber-500/10 border border-amber-500 rounded-lg p-4 mb-6">
        <div className="flex items-start gap-3">
          <Clock className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h3 className="font-semibold text-amber-500 mb-1">
              Last Day of Trial!
            </h3>
            <p className="text-sm text-text-muted mb-3">
              Your trial expires tomorrow. Upgrade now to keep using Video Wizard
              and add your own videos.
            </p>
            <div className="flex gap-2">
              <Button
                onClick={() => router.push('/upgrade')}
                className="bg-amber-500 hover:bg-amber-600"
              >
                Upgrade Now
              </Button>
              <Button
                onClick={() => router.push('/upgrade')}
                variant="secondary"
              >
                View Plans
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Active trial with 2+ days remaining
  return (
    <div className="bg-accent-cyan/10 border border-accent-cyan rounded-lg p-4 mb-6">
      <div className="flex items-start gap-3">
        <Sparkles className="w-5 h-5 text-accent-cyan flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <h3 className="font-semibold text-accent-cyan mb-1">
            Free Trial Active - {daysRemaining} {daysRemaining === 1 ? 'Day' : 'Days'} Left
          </h3>
          <p className="text-sm text-text-muted mb-3">
            Try out our AI chat with the demo Whop tutorials! Upgrade to any tier
            to upload your own videos and create custom courses.
          </p>
          <div className="flex gap-2">
            <Button
              onClick={() => router.push('/upgrade')}
              variant="secondary"
              size="sm"
            >
              View Pricing
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Compact trial indicator for header/nav
 */
export function TrialIndicator({ daysRemaining }: { daysRemaining: number }) {
  const router = useRouter();

  if (daysRemaining <= 0) {
    return (
      <button
        onClick={() => router.push('/upgrade')}
        className="flex items-center gap-2 px-3 py-1.5 bg-red-500/10 border border-red-500 rounded-full text-sm text-red-500 hover:bg-red-500/20 transition-colors"
      >
        <AlertCircle className="w-4 h-4" />
        <span className="font-medium">Trial Expired</span>
      </button>
    );
  }

  if (daysRemaining === 1) {
    return (
      <button
        onClick={() => router.push('/upgrade')}
        className="flex items-center gap-2 px-3 py-1.5 bg-amber-500/10 border border-amber-500 rounded-full text-sm text-amber-500 hover:bg-amber-500/20 transition-colors"
      >
        <Clock className="w-4 h-4" />
        <span className="font-medium">1 Day Left</span>
      </button>
    );
  }

  return (
    <button
      onClick={() => router.push('/upgrade')}
      className="flex items-center gap-2 px-3 py-1.5 bg-accent-cyan/10 border border-accent-cyan rounded-full text-sm text-accent-cyan hover:bg-accent-cyan/20 transition-colors"
    >
      <Sparkles className="w-4 h-4" />
      <span className="font-medium">{daysRemaining} Days Trial</span>
    </button>
  );
}
