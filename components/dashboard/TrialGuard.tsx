/**
 * Trial Guard Component
 *
 * Wraps content that should be blocked during trial
 * Shows upgrade modal when trial users try to access paid features
 */

'use client';

import { useState, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { UploadBlockedOverlay } from './DemoContentBadge';

interface TrialGuardProps {
  isOnTrial: boolean;
  feature: 'upload' | 'create_course' | 'settings' | 'analytics';
  children: ReactNode;
  fallback?: ReactNode;
}

export function TrialGuard({
  isOnTrial,
  feature,
  children,
  fallback,
}: TrialGuardProps) {
  const router = useRouter();
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  // If not on trial, show children normally
  if (!isOnTrial) {
    return <>{children}</>;
  }

  // If on trial, intercept actions
  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setShowUpgradeModal(true);
  };

  const handleUpgrade = () => {
    router.push('/upgrade');
  };

  return (
    <>
      <div onClick={handleClick} className="cursor-not-allowed">
        {fallback || (
          <div className="opacity-50 pointer-events-none">
            {children}
          </div>
        )}
      </div>

      {showUpgradeModal && (
        <UploadBlockedOverlay onUpgrade={handleUpgrade} />
      )}
    </>
  );
}
