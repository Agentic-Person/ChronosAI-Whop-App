/**
 * Demo Content Badge and Related Components
 *
 * Visual indicators for demo content during trial period
 */

'use client';

import { Sparkles, Lock } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Badge shown on demo videos
 */
export function DemoContentBadge({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium',
        'bg-accent-purple/20 text-accent-purple border border-accent-purple/30',
        className
      )}
    >
      <Sparkles className="w-3 h-3" />
      DEMO
    </span>
  );
}

/**
 * Feature locked indicator during trial
 */
export function LockedFeatureBadge({ feature }: { feature: string }) {
  return (
    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-text-muted/10 border border-border-primary">
      <Lock className="w-4 h-4 text-text-muted" />
      <span className="text-sm text-text-muted font-medium">
        {feature} - Upgrade Required
      </span>
    </div>
  );
}

/**
 * Demo content notice card
 */
export function DemoContentNotice() {
  return (
    <div className="bg-accent-purple/10 border border-accent-purple/30 rounded-lg p-4">
      <div className="flex items-start gap-3">
        <Sparkles className="w-5 h-5 text-accent-purple flex-shrink-0 mt-0.5" />
        <div>
          <h4 className="font-semibold text-accent-purple mb-1">
            Demo Content
          </h4>
          <p className="text-sm text-text-muted">
            These are sample Whop tutorials to showcase our AI chat features.
            Upgrade to upload your own videos and create custom courses.
          </p>
        </div>
      </div>
    </div>
  );
}

/**
 * Upload blocked overlay for trial users
 */
export function UploadBlockedOverlay({ onUpgrade }: { onUpgrade: () => void }) {
  return (
    <div className="fixed inset-0 bg-bg-app/95 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="max-w-md mx-auto p-8 bg-bg-elevated rounded-lg border border-border-primary shadow-2xl">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-accent-cyan/10 flex items-center justify-center">
            <Lock className="w-8 h-8 text-accent-cyan" />
          </div>

          <h2 className="text-2xl font-bold mb-2">
            Upgrade to Upload Videos
          </h2>

          <p className="text-text-muted mb-6">
            You're currently using demo content to try out Video Wizard.
            Upgrade to any tier to upload your own videos and create custom courses.
          </p>

          <button
            onClick={onUpgrade}
            className="w-full py-3 px-4 bg-accent-cyan hover:bg-accent-cyan/90 rounded-lg font-semibold transition-colors"
          >
            View Pricing Plans
          </button>
        </div>
      </div>
    </div>
  );
}
