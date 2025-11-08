/**
 * React hook to get the current authenticated creator
 * Uses SWR for caching and revalidation
 */

import { useState, useEffect } from 'react';

interface CreatorInfo {
  creatorId: string;
  whopUserId: string;
  email: string;
  membershipValid: boolean;
  currentPlan: string;
}

interface UseCurrentCreatorResult {
  creator: CreatorInfo | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

export function useCurrentCreator(): UseCurrentCreatorResult {
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
          // Not authenticated, redirect to login
          window.location.href = '/api/whop/auth/login';
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
  };
}

/**
 * Simple version that just returns the creator ID (for backwards compatibility)
 */
export function useCreatorId(): { creatorId: string | null; isLoading: boolean } {
  const { creator, isLoading } = useCurrentCreator();
  return {
    creatorId: creator?.creatorId || null,
    isLoading,
  };
}
