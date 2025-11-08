'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';

/**
 * Whop Iframe SDK Context
 *
 * This provider wraps the app and provides authenticated user info
 * when embedded in Whop. For iframe contexts, authentication is
 * handled automatically by Whop. For standalone, uses OAuth cookies.
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
  const [iframeSdk, setIframeSdk] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Detect if we're in an iframe
  useEffect(() => {
    const inIframe = typeof window !== 'undefined' && window.self !== window.top;
    setIsInIframe(inIframe);

    // Dynamically load Whop iframe SDK only if in iframe
    if (inIframe) {
      import('@whop/react').then((whopModule) => {
        // Initialize SDK provider context
        setIframeSdk(whopModule);
        setIsLoading(false);
      }).catch((error) => {
        console.error('Failed to load Whop iframe SDK:', error);
        setIsLoading(false);
      });
    } else {
      setIsLoading(false);
    }
  }, []);

  // Extract user info from iframe SDK if available
  const user: WhopIframeUser | null = null; // Will be populated by useWhopAuth hook

  const contextValue: WhopIframeContextValue = {
    user,
    isLoading,
    isAuthenticated: false,
    isInIframe,
    hasAccess: false,
  };

  return (
    <WhopIframeContext.Provider value={contextValue}>
      {children}
    </WhopIframeContext.Provider>
  );
}
