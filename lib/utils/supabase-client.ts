/**
 * Supabase Client Configuration
 * Singleton Supabase client for server-side and client-side usage
 *
 * IMPORTANT: This file uses lazy initialization to prevent build-time errors
 * when environment variables are not available during Next.js static page collection.
 */

import { createClient as createSupabaseClient, SupabaseClient } from '@supabase/supabase-js';
import { Database } from '@/types/database';

// Singleton instances (lazy-loaded)
let _supabase: SupabaseClient | null = null;
let _supabaseAdmin: SupabaseClient | null = null;

/**
 * Get environment variables with runtime validation
 */
function getEnvVars() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase environment variables');
  }

  return { supabaseUrl, supabaseAnonKey, supabaseServiceKey };
}

/**
 * Client-side Supabase client (uses anon key, RLS enforced)
 * Lazy-loaded to prevent build-time initialization
 */
export const supabase = new Proxy({} as SupabaseClient, {
  get(target, prop) {
    if (!_supabase) {
      const { supabaseUrl, supabaseAnonKey } = getEnvVars();
      _supabase = createSupabaseClient(supabaseUrl, supabaseAnonKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
        },
      });
    }
    return (_supabase as any)[prop];
  },
});

/**
 * Server-side Supabase client (uses service role key, bypasses RLS)
 * WARNING: Only use on the server side, never expose to client
 * Lazy-loaded to prevent build-time initialization
 */
export const supabaseAdmin = new Proxy({} as SupabaseClient, {
  get(target, prop) {
    if (!_supabaseAdmin) {
      const { supabaseUrl, supabaseAnonKey, supabaseServiceKey } = getEnvVars();
      _supabaseAdmin = createSupabaseClient(
        supabaseUrl,
        supabaseServiceKey || supabaseAnonKey,
        {
          auth: {
            autoRefreshToken: false,
            persistSession: false,
          },
        }
      );
    }
    return (_supabaseAdmin as any)[prop];
  },
});

/**
 * Get user from Supabase auth
 * In development mode, returns a dev user if no user is authenticated
 */
export async function getUser() {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  // In development, return a dev user if no user is authenticated
  if (!user && process.env.NODE_ENV === 'development') {
    console.log('🔧 DEV MODE: Using dev user (00000000-0000-0000-0000-000000000001)');
    return {
      id: '00000000-0000-0000-0000-000000000001',
      email: 'dev@chronos-ai.app',
      aud: 'authenticated',
      role: 'authenticated',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      app_metadata: {},
      user_metadata: {
        name: 'Dev User',
      },
    } as any;
  }

  if (error) throw error;
  return user;
}

/**
 * Check if user is authenticated
 */
export async function isAuthenticated(): Promise<boolean> {
  try {
    const user = await getUser();
    return !!user;
  } catch {
    return false;
  }
}

/**
 * Create a Supabase client instance
 * This is a wrapper that returns the singleton supabase client
 */
export function createClient() {
  return supabase;
}
