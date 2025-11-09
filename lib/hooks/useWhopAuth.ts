/**
 * Whop Authentication Hook
 * Simplified client-side hook using header-based auth (no OAuth)
 */

'use client';

import { useState, useEffect } from 'react';

export interface CreatorInfo {
  creatorId: string;
  whopUserId: string;
  email: string;
  membershipValid: boolean;
  currentPlan: string;
}

export function useWhopAuth() {
  const [creator, setCreator] = useState<CreatorInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [isInIframe, setIsInIframe] = useState(false);

  // Detect if running in iframe
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setIsInIframe(window.self !== window.top);
    }
  }, []);

  useEffect(() => {
    const fetchCreator = async () => {
      try {
        const response = await fetch('/api/auth/me');

        if (!response.ok) {
          if (response.status === 401) {
            setCreator(null);
            setIsLoading(false);
            return;
          }
          throw new Error('Failed to fetch creator');
        }

        const data = await response.json();
        setCreator(data);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Unknown error'));
      } finally {
        setIsLoading(false);
      }
    };

    fetchCreator();
  }, []);

  return { creator, isLoading, error, isInIframe };
}

/**
 * Simple version that just returns the creator ID (for backwards compatibility)
 */
export function useCreatorId(): { creatorId: string | null; isLoading: boolean } {
  const { creator, isLoading } = useWhopAuth();
  return {
    creatorId: creator?.creatorId || null,
    isLoading,
  };
}
