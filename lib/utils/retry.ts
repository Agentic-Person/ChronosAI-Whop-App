/**
 * Retry Utility
 * Provides exponential backoff retry logic for API calls
 */

import { logInfo, logWarning } from '@/lib/infrastructure/monitoring/logger';

/**
 * Retry options configuration
 */
export interface RetryOptions {
  maxRetries?: number;
  baseDelay?: number;
  maxDelay?: number;
  retryableErrors?: number[];
  onRetry?: (attempt: number, error: Error) => void;
}

/**
 * Default retry options
 */
const DEFAULT_OPTIONS: Required<RetryOptions> = {
  maxRetries: 3,
  baseDelay: 1000, // 1 second
  maxDelay: 30000, // 30 seconds
  retryableErrors: [429, 500, 502, 503, 504], // Rate limit and server errors
  onRetry: () => {},
};

/**
 * Sleep for specified milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Calculate exponential backoff delay with jitter
 */
function calculateDelay(attempt: number, baseDelay: number, maxDelay: number): number {
  // Exponential backoff: baseDelay * 2^attempt
  const exponentialDelay = baseDelay * Math.pow(2, attempt);

  // Add jitter (0-1000ms) to prevent thundering herd
  const jitter = Math.random() * 1000;

  // Cap at maxDelay
  return Math.min(exponentialDelay + jitter, maxDelay);
}

/**
 * Check if error is retryable
 */
function isRetryableError(error: any, retryableErrors: number[]): boolean {
  // Check for HTTP status codes
  if (error.status && retryableErrors.includes(error.status)) {
    return true;
  }

  // Check for OpenAI/Anthropic specific errors
  if (error.response?.status && retryableErrors.includes(error.response.status)) {
    return true;
  }

  // Check for network errors
  if (error.code === 'ECONNRESET' || error.code === 'ETIMEDOUT') {
    return true;
  }

  // Check for specific error messages
  const message = error.message?.toLowerCase() || '';
  if (
    message.includes('rate limit') ||
    message.includes('timeout') ||
    message.includes('internal server error') ||
    message.includes('bad gateway')
  ) {
    return true;
  }

  return false;
}

/**
 * Retry a function with exponential backoff
 *
 * @param fn - Function to retry
 * @param options - Retry configuration
 * @returns Result of the function
 * @throws Last error if all retries fail
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  let lastError: Error | null = null;

  for (let attempt = 0; attempt < opts.maxRetries; attempt++) {
    try {
      // Try to execute the function
      const result = await fn();

      // Success - return result
      if (attempt > 0) {
        logInfo('Retry successful', { attempt: attempt + 1 });
      }

      return result;
    } catch (error: any) {
      lastError = error;

      // Check if this is the last attempt
      if (attempt === opts.maxRetries - 1) {
        logWarning('All retries exhausted', {
          attempts: opts.maxRetries,
          error: error.message,
        });
        throw error;
      }

      // Check if error is retryable
      if (!isRetryableError(error, opts.retryableErrors)) {
        logWarning('Non-retryable error encountered', {
          error: error.message,
          status: error.status || error.response?.status,
        });
        throw error;
      }

      // Calculate delay for next attempt
      const delay = calculateDelay(attempt, opts.baseDelay, opts.maxDelay);

      logWarning(`Retrying after error (attempt ${attempt + 1}/${opts.maxRetries})`, {
        error: error.message,
        status: error.status || error.response?.status,
        retryDelayMs: delay,
      });

      // Call onRetry callback if provided
      opts.onRetry(attempt + 1, error);

      // Wait before retrying
      await sleep(delay);
    }
  }

  // This should never be reached, but TypeScript requires it
  throw lastError || new Error('Retry failed');
}

/**
 * Retry specifically for OpenAI API calls
 */
export async function retryOpenAI<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3
): Promise<T> {
  return retryWithBackoff(fn, {
    maxRetries,
    baseDelay: 1000,
    maxDelay: 30000,
    retryableErrors: [429, 500, 502, 503, 504], // OpenAI specific errors
    onRetry: (attempt, error) => {
      logWarning(`OpenAI API retry attempt ${attempt}`, {
        error: error.message,
      });
    },
  });
}

/**
 * Retry specifically for Anthropic API calls
 */
export async function retryAnthropic<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3
): Promise<T> {
  return retryWithBackoff(fn, {
    maxRetries,
    baseDelay: 1000,
    maxDelay: 30000,
    retryableErrors: [429, 500, 502, 503, 504, 529], // 529 = overloaded
    onRetry: (attempt, error) => {
      logWarning(`Anthropic API retry attempt ${attempt}`, {
        error: error.message,
      });
    },
  });
}

/**
 * Retry with custom configuration
 */
export async function retry<T>(
  fn: () => Promise<T>,
  config: {
    attempts?: number;
    delay?: number;
    onError?: (error: Error, attempt: number) => void;
  } = {}
): Promise<T> {
  return retryWithBackoff(fn, {
    maxRetries: config.attempts || 3,
    baseDelay: config.delay || 1000,
    onRetry: (attempt, error) => {
      if (config.onError) {
        config.onError(error, attempt);
      }
    },
  });
}