'use client';

import { WhopIframeProvider } from "@/components/providers/WhopIframeProvider";

/**
 * Client-side providers wrapper
 * Simplified to use only OAuth authentication (what was working before)
 * Removed WhopIframeSdkProvider layer that was causing conflicts
 */
export function ClientProviders({ children }: { children: React.ReactNode }) {
  return (
    <WhopIframeProvider>
      {children}
    </WhopIframeProvider>
  );
}
