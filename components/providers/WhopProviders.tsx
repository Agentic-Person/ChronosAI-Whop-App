'use client';

import { WhopIframeSdkProvider } from "@whop/react";
import { WhopIframeProvider } from "@/components/providers/WhopIframeProvider";

/**
 * Whop SDK providers (client-only)
 * This component is dynamically imported to prevent SSR
 */
export default function WhopProviders({ children }: { children: React.ReactNode }) {
  return (
    <WhopIframeSdkProvider>
      <WhopIframeProvider>
        {children}
      </WhopIframeProvider>
    </WhopIframeSdkProvider>
  );
}
