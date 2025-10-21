/**
 * Supabase Client Configuration
 * Singleton Supabase client for server-side and client-side usage
 */

import { createClient } from '@supabase/supabase-js';
import { Database } from '@/types/database';

// Ensure environment variables are set
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

/**
 * Client-side Supabase client (uses anon key, RLS enforced)
 */
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});

/**
 * Server-side Supabase client (uses service role key, bypasses RLS)
 * WARNING: Only use on the server side, never expose to client
 */
export const supabaseAdmin = createClient(
  supabaseUrl,
  supabaseServiceKey || supabaseAnonKey,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

/**
 * Get user from Supabase auth
 */
export async function getUser() {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

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
