'use client';

import { WhopIframeSdkProvider } from "@whop/react";
import { WhopIframeProvider } from "@/components/providers/WhopIframeProvider";

/**
 * Client-side providers wrapper
 * Wraps the app with Whop SDK and authentication providers
 */
export function ClientProviders({ children }: { children: React.ReactNode }) {
  return (
    <WhopIframeSdkProvider>
      <WhopIframeProvider>
        {children}
      </WhopIframeProvider>
    </WhopIframeSdkProvider>
  );
}
