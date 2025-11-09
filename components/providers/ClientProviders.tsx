'use client';

/**
 * Client-side providers wrapper
 * Simple wrapper without provider (auth handled server-side via headers)
 */
export function ClientProviders({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
