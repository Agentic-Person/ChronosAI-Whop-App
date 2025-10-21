/**
 * Enhanced Supabase Connection Pool
 * Provides optimized database connections with retry logic and performance monitoring
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Database } from '@/types/database';

// Singleton instances for connection reuse
let supabaseInstance: SupabaseClient<Database> | null = null;
let adminInstance: SupabaseClient<Database> | null = null;

/**
 * Get Supabase client (for client-side and API routes with RLS)
 * Implements connection pooling via Supabase's built-in PgBouncer
 */
export function getSupabaseClient(): SupabaseClient<Database> {
  if (!supabaseInstance) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error('Missing Supabase environment variables');
    }

    supabaseInstance = createClient<Database>(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
      db: {
        schema: 'public',
      },
      global: {
        headers: {
          'x-application-name': 'mentora-web',
        },
      },
    });
  }

  return supabaseInstance;
}

/**
 * Get Supabase admin client (bypasses RLS)
 * USE WITH CAUTION - only in server-side contexts
 * Never expose to client or use in client components
 */
export function getSupabaseAdmin(): SupabaseClient<Database> {
  if (!adminInstance) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl) {
      throw new Error('NEXT_PUBLIC_SUPABASE_URL not configured');
    }

    if (!supabaseServiceKey) {
      throw new Error('SUPABASE_SERVICE_ROLE_KEY not configured');
    }

    adminInstance = createClient<Database>(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
      db: {
        schema: 'public',
      },
      global: {
        headers: {
          'x-application-name': 'mentora-admin',
        },
      },
    });
  }

  return adminInstance;
}

/**
 * Health check for database connection
 * Tests basic query execution and measures latency
 */
export async function checkDatabaseHealth(): Promise<{
  healthy: boolean;
  latency: number;
  error?: string;
}> {
  const start = Date.now();

  try {
    const { data, error } = await getSupabaseClient()
      .from('creators')
      .select('id')
      .limit(1);

    const latency = Date.now() - start;

    if (error) {
      return { healthy: false, latency, error: error.message };
    }

    return { healthy: true, latency };
  } catch (error) {
    return {
      healthy: false,
      latency: Date.now() - start,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Execute a query with automatic retry logic
 * Retries up to 3 times with exponential backoff on transient errors
 */
export async function executeWithRetry<T>(
  queryFn: () => Promise<{ data: T | null; error: any }>,
  maxRetries = 3
): Promise<{ data: T | null; error: any }> {
  let lastError: any;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const result = await queryFn();

      // If successful or non-retryable error, return immediately
      if (!result.error || !isRetryableError(result.error)) {
        return result;
      }

      lastError = result.error;

      // Exponential backoff: 100ms, 200ms, 400ms
      if (attempt < maxRetries - 1) {
        await sleep(100 * Math.pow(2, attempt));
      }
    } catch (error) {
      lastError = error;

      if (attempt < maxRetries - 1) {
        await sleep(100 * Math.pow(2, attempt));
      }
    }
  }

  return { data: null, error: lastError };
}

/**
 * Check if an error is retryable (network issues, timeouts, etc.)
 */
function isRetryableError(error: any): boolean {
  if (!error) return false;

  const retryableCodes = [
    'PGRST301', // Connection timeout
    'PGRST504', // Gateway timeout
    '08000', // Connection exception
    '08003', // Connection does not exist
    '08006', // Connection failure
    '57P03', // Cannot connect now
  ];

  return (
    retryableCodes.includes(error.code) ||
    error.message?.includes('timeout') ||
    error.message?.includes('ECONNREFUSED') ||
    error.message?.includes('ETIMEDOUT')
  );
}

/**
 * Sleep utility for backoff delays
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Reset connection instances (useful for testing)
 */
export function resetConnections(): void {
  supabaseInstance = null;
  adminInstance = null;
}
