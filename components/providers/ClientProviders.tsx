'use client';

import dynamic from 'next/dynamic';
import { useState, useEffect } from 'react';

// Dynamically import Whop SDK provider to prevent SSR issues
const WhopProviders = dynamic(
  () => import('./WhopProviders'),
  { ssr: false }
);

/**
 * Client-side providers wrapper
 * Wraps the app with Whop SDK and authentication providers
 * Uses dynamic import to prevent SSR errors with Whop SDK
 */
export function ClientProviders({ children }: { children: React.ReactNode }) {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // During SSR or before mount, render children without SDK
  if (!isMounted) {
    return <>{children}</>;
  }

  // After mount (client-side), render with SDK providers
  return <WhopProviders>{children}</WhopProviders>;
}
