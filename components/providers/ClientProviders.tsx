'use client';

import { WhopIframeSdkProvider } from "@whop/react";
import { WhopIframeProvider } from "@/components/providers/WhopIframeProvider";

/**
 * Client-side providers wrapper
 * Wraps the app with Whop SDK and authentication providers
 */
export function ClientProviders({ children }: { children: React.ReactNode }) {
  const appId = process.env.NEXT_PUBLIC_WHOP_APP_ID;

  return (
    <WhopIframeSdkProvider appId={appId}>
      <WhopIframeProvider>
        {children}
      </WhopIframeProvider>
    </WhopIframeSdkProvider>
  );
}
