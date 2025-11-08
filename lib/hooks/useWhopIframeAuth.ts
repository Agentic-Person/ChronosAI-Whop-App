/**
 * Unified authentication hook for Whop
 *
 * Uses OAuth cookies for authentication in both iframe and standalone contexts.
 * With sameSite: 'none', cookies work in both scenarios.
 */

import { useState, useEffect } from 'react';
import { useWhopIframe } from '@/components/providers/WhopIframeProvider';

export interface CreatorInfo {
  creatorId: string;
  whopUserId: string;
  email: string;
  membershipValid: boolean;
  currentPlan: string;
}

interface UseWhopAuthResult {
  creator: CreatorInfo | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
  isInIframe: boolean;
}

/**
 * Unified authentication hook
 *
 * Uses OAuth cookies for both iframe and standalone contexts.
 * The sameSite: 'none' cookie setting allows this to work in Whop's iframe.
 */
export function useWhopAuth(): UseWhopAuthResult {
  const { isInIframe } = useWhopIframe();
  const [creator, setCreator] = useState<CreatorInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchCreator = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch('/api/auth/me');

      if (!response.ok) {
        if (response.status === 401) {
          // Not authenticated
          // In iframe, Whop should handle this
          // In standalone, redirect to login
          if (!isInIframe) {
            window.location.href = '/api/whop/auth/login';
          }
          setCreator(null);
          return;
        }
        throw new Error(`Failed to fetch creator info: ${response.statusText}`);
      }

      const data = await response.json();
      setCreator(data);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'));
      console.error('Error fetching creator:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCreator();
  }, []);

  return {
    creator,
    isLoading,
    error,
    refetch: fetchCreator,
    isInIframe,
  };
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
