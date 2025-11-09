'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useIframeSdk } from '@whop/react';

/**
 * Whop Iframe SDK Context
 *
 * This provider wraps the app and provides authenticated user info
 * when embedded in Whop using the @whop/react SDK.
 */

export interface WhopIframeUser {
  id: string;
  email: string | null;
  username: string | null;
  profilePictureUrl: string | null;
}

interface WhopIframeContextValue {
  user: WhopIframeUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isInIframe: boolean;
  hasAccess: boolean;
}

const WhopIframeContext = createContext<WhopIframeContextValue>({
  user: null,
  isLoading: false,
  isAuthenticated: false,
  isInIframe: false,
  hasAccess: false,
});

export function useWhopIframe() {
  const context = useContext(WhopIframeContext);
  if (!context) {
    throw new Error('useWhopIframe must be used within WhopIframeProvider');
  }
  return context;
}

export function WhopIframeProvider({ children }: { children: React.ReactNode }) {
  const [isInIframe, setIsInIframe] = useState(false);
  const [user, setUser] = useState<WhopIframeUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isMounted, setIsMounted] = useState(false);

  // Always call hook unconditionally (required by Rules of Hooks)
  // The hook itself handles SSR gracefully and returns null during server-side rendering
  let sdk = null;
  try {
    sdk = useIframeSdk();
  } catch (error) {
    // SDK not available (SSR or not in iframe)
    // This is expected during SSR, no need to log
  }

  // Detect if we're in an iframe and mark as mounted
  useEffect(() => {
    setIsMounted(true);
    const inIframe = typeof window !== 'undefined' && window.self !== window.top;
    setIsInIframe(inIframe);
    console.log('[WhopIframe] Detected iframe:', inIframe);
  }, []);

  // Get user from SDK when available
  useEffect(() => {
    async function fetchUser() {
      if (!sdk || !isInIframe) {
        setIsLoading(false);
        return;
      }

      try {
        console.log('[WhopIframe] SDK available, checking for user');

        // Access SDK user property or method (SDK structure depends on Whop's implementation)
        // Try different possible patterns
        const sdkUser = (sdk as any).user || (typeof (sdk as any).getUser === 'function' ? await (sdk as any).getUser() : null);

        console.log('[WhopIframe] SDK user:', sdkUser);

        if (sdkUser) {
          setUser({
            id: sdkUser.id,
            email: sdkUser.email || null,
            username: sdkUser.username || null,
            profilePictureUrl: sdkUser.profile_picture_url || sdkUser.profilePictureUrl || null,
          });
        }
      } catch (error) {
        console.error('[WhopIframe] Error getting user from SDK:', error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchUser();
  }, [sdk, isInIframe]);

  const contextValue: WhopIframeContextValue = {
    user,
    isLoading,
    isAuthenticated: !!user,
    isInIframe,
    hasAccess: !!user,
  };

  return (
    <WhopIframeContext.Provider value={contextValue}>
      {children}
    </WhopIframeContext.Provider>
  );
}
