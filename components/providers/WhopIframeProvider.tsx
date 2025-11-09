'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';

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

  // Detect if we're in an iframe and get user from Whop SDK
  useEffect(() => {
    const inIframe = typeof window !== 'undefined' && window.self !== window.top;
    setIsInIframe(inIframe);
    console.log('[WhopIframe] Detected iframe:', inIframe);

    // Access Whop SDK from window object (injected by Whop when in iframe)
    if (inIframe && typeof window !== 'undefined') {
      const checkWhopSdk = () => {
        // Whop injects SDK into window object
        const whopSdk = (window as any).Whop;
        
        if (whopSdk) {
          console.log('[WhopIframe] Whop SDK found on window:', whopSdk);
          
          // Try to get user from SDK
          const sdkUser = whopSdk.user || whopSdk.currentUser;
          
          if (sdkUser) {
            console.log('[WhopIframe] User from SDK:', sdkUser);
            setUser({
              id: sdkUser.id,
              email: sdkUser.email || null,
              username: sdkUser.username || null,
              profilePictureUrl: sdkUser.profile_picture_url || sdkUser.profilePictureUrl || null,
            });
          }
        } else {
          console.log('[WhopIframe] Whop SDK not found on window, retrying...');
          // Retry after a delay
          setTimeout(checkWhopSdk, 100);
        }
        
        setIsLoading(false);
      };
      
      checkWhopSdk();
    } else {
      setIsLoading(false);
    }
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
