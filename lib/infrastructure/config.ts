/**
 * Configuration Management
 * Centralized configuration with validation
 */

import { MissingEnvVarError } from './errors';

/**
 * Get required environment variable
 * Throws if not set
 */
function getRequiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new MissingEnvVarError(name);
  }
  return value;
}

/**
 * Get optional environment variable with default
 */
function getOptionalEnv(name: string, defaultValue: string): string {
  return process.env[name] || defaultValue;
}

/**
 * Application configuration
 */
export const config = {
  // Environment
  env: getOptionalEnv('NODE_ENV', 'development'),
  isDevelopment: process.env.NODE_ENV !== 'production',
  isProduction: process.env.NODE_ENV === 'production',

  // App
  app: {
    name: 'ChronosAI',
    url: getOptionalEnv('NEXT_PUBLIC_APP_URL', 'http://localhost:3000'),
  },

  // Database (Supabase)
  database: {
    url: getRequiredEnv('NEXT_PUBLIC_SUPABASE_URL'),
    anonKey: getRequiredEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY'),
    serviceRoleKey: getRequiredEnv('SUPABASE_SERVICE_ROLE_KEY'),
  },

  // Cache (Vercel KV)
  cache: {
    enabled: process.env.KV_URL !== undefined,
  },

  // Job Queue (Inngest)
  jobs: {
    eventKey: process.env.INNGEST_EVENT_KEY,
    signingKey: process.env.INNGEST_SIGNING_KEY,
  },

  // Error Tracking (Sentry)
  sentry: {
    dsn: process.env.SENTRY_DSN,
    enabled: !!process.env.SENTRY_DSN,
  },

  // AI Services
  ai: {
    anthropic: {
      apiKey: process.env.ANTHROPIC_API_KEY,
    },
    openai: {
      apiKey: process.env.OPENAI_API_KEY,
    },
  },

  // Whop Integration
  whop: {
    apiKey: process.env.WHOP_API_KEY,
    clientId: process.env.WHOP_CLIENT_ID,
    clientSecret: process.env.WHOP_CLIENT_SECRET,
    webhookSecret: process.env.WHOP_WEBHOOK_SECRET,
  },

  // Storage (AWS S3)
  storage: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    region: getOptionalEnv('AWS_REGION', 'us-east-1'),
    bucket: process.env.AWS_S3_BUCKET,
  },

  // Logging
  logging: {
    level: getOptionalEnv('LOG_LEVEL', 'info'),
  },
} as const;

/**
 * Validate required configuration
 * Call this on app startup
 */
export function validateConfig(): void {
  const errors: string[] = [];

  // Check required configs
  if (!config.database.url) errors.push('NEXT_PUBLIC_SUPABASE_URL');
  if (!config.database.anonKey) errors.push('NEXT_PUBLIC_SUPABASE_ANON_KEY');
  if (!config.database.serviceRoleKey) errors.push('SUPABASE_SERVICE_ROLE_KEY');

  if (errors.length > 0) {
    throw new Error(`Missing required environment variables: ${errors.join(', ')}`);
  }
}
