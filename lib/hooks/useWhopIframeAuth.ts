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
 * When in Whop iframe: Uses @whop/react SDK user (provided by WhopIframeProvider)
 * When standalone: Uses OAuth cookies via /api/auth/me endpoint
 */
export function useWhopAuth(): UseWhopAuthResult {
  const { user: iframeUser, isLoading: iframeLoading, isInIframe, isAuthenticated } = useWhopIframe();
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
          // Not authenticated - redirect to OAuth login
          window.location.href = '/api/whop/auth/login';
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
    // If in iframe and user is loaded from SDK
    if (isInIframe && !iframeLoading) {
      if (iframeUser) {
        // Use iframe SDK user - create creator object
        console.log('[useWhopAuth] Using iframe SDK user:', iframeUser.id);
        setCreator({
          creatorId: iframeUser.id, // Use Whop user ID as creator ID
          whopUserId: iframeUser.id,
          email: iframeUser.email || '',
          membershipValid: isAuthenticated,
          currentPlan: 'basic', // Default plan for iframe users
        });
        setIsLoading(false);
      } else {
        // In iframe but no user - should not happen (Whop handles auth)
        console.log('[useWhopAuth] In iframe but no user from SDK');
        setCreator(null);
        setIsLoading(false);
      }
    } else if (!isInIframe) {
      // Not in iframe - use OAuth API
      console.log('[useWhopAuth] Standalone mode - using OAuth API');
      fetchCreator();
    }
  }, [isInIframe, iframeUser, iframeLoading, isAuthenticated]);

  return {
    creator,
    isLoading: isInIframe ? iframeLoading : isLoading,
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
