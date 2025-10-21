/**
 * Structured Logging Service
 * Uses Pino for high-performance structured logging
 */

import pino from 'pino';

/**
 * Create logger instance with environment-based configuration
 */
export const logger = pino({
  level: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
  formatters: {
    level: (label) => ({ level: label }),
  },
  // Pretty print in development
  ...(process.env.NODE_ENV !== 'production' && {
    transport: {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'SYS:standard',
        ignore: 'pid,hostname',
      },
    },
  }),
  // Production configuration
  ...(process.env.NODE_ENV === 'production' && {
    base: {
      env: process.env.NODE_ENV,
      app: 'mentora',
    },
  }),
});

/**
 * Log levels:
 * - fatal: Application crash
 * - error: Error that needs attention
 * - warn: Warning but operation succeeded
 * - info: General informational messages
 * - debug: Detailed debugging information
 * - trace: Very detailed debugging
 */

/**
 * Structured log entry interface
 */
export interface LogContext {
  /** User ID */
  userId?: string;
  /** Creator ID */
  creatorId?: string;
  /** Request ID for tracing */
  requestId?: string;
  /** Operation/feature being performed */
  operation?: string;
  /** Duration in milliseconds */
  duration?: number;
  /** Error object */
  error?: Error | unknown;
  /** Additional metadata */
  metadata?: Record<string, any>;
}

/**
 * Helper functions for common logging patterns
 */

export function logInfo(message: string, context?: LogContext): void {
  logger.info(context || {}, message);
}

export function logError(message: string, error: Error | unknown, context?: LogContext): void {
  logger.error(
    {
      ...context,
      error: error instanceof Error ? {
        message: error.message,
        stack: error.stack,
        name: error.name,
      } : error,
    },
    message
  );
}

export function logWarn(message: string, context?: LogContext): void {
  logger.warn(context || {}, message);
}

export function logDebug(message: string, context?: LogContext): void {
  logger.debug(context || {}, message);
}

/**
 * Log API request
 */
export function logAPIRequest(
  method: string,
  path: string,
  statusCode: number,
  duration: number,
  context?: LogContext
): void {
  logger.info(
    {
      ...context,
      method,
      path,
      statusCode,
      duration,
    },
    `${method} ${path} ${statusCode} ${duration}ms`
  );
}

/**
 * Log database query
 */
export function logDatabaseQuery(
  table: string,
  operation: string,
  duration: number,
  context?: LogContext
): void {
  const level = duration > 1000 ? 'warn' : duration > 500 ? 'info' : 'debug';
  logger[level](
    {
      ...context,
      table,
      operation,
      duration,
    },
    `DB ${operation} on ${table} took ${duration}ms`
  );
}

/**
 * Log cache operation
 */
export function logCacheOperation(
  operation: 'hit' | 'miss' | 'set' | 'delete',
  key: string,
  context?: LogContext
): void {
  logger.debug(
    {
      ...context,
      operation,
      key,
    },
    `Cache ${operation}: ${key}`
  );
}

/**
 * Log AI API call
 */
export function logAIAPICall(
  provider: 'Claude' | 'OpenAI',
  operation: string,
  duration: number,
  tokensUsed?: number,
  cost?: number,
  context?: LogContext
): void {
  logger.info(
    {
      ...context,
      provider,
      operation,
      duration,
      tokensUsed,
      cost,
    },
    `${provider} ${operation} completed in ${duration}ms${tokensUsed ? ` (${tokensUsed} tokens)` : ''}`
  );
}

/**
 * Log job queue event
 */
export function logJobEvent(
  jobType: string,
  event: 'started' | 'completed' | 'failed' | 'retry',
  duration?: number,
  context?: LogContext
): void {
  const level = event === 'failed' ? 'error' : event === 'retry' ? 'warn' : 'info';
  logger[level](
    {
      ...context,
      jobType,
      event,
      duration,
    },
    `Job ${jobType} ${event}${duration ? ` (${duration}ms)` : ''}`
  );
}

/**
 * Log rate limit event
 */
export function logRateLimit(
  identifier: string,
  endpoint: string,
  blocked: boolean,
  remaining: number,
  context?: LogContext
): void {
  logger[blocked ? 'warn' : 'debug'](
    {
      ...context,
      identifier,
      endpoint,
      blocked,
      remaining,
    },
    `Rate limit ${blocked ? 'BLOCKED' : 'OK'} for ${identifier} on ${endpoint} (${remaining} remaining)`
  );
}

/**
 * Log performance metric
 */
export function logPerformance(
  operation: string,
  duration: number,
  metadata?: Record<string, any>
): void {
  const level = duration > 5000 ? 'warn' : duration > 1000 ? 'info' : 'debug';
  logger[level](
    {
      operation,
      duration,
      ...metadata,
    },
    `Performance: ${operation} took ${duration}ms`
  );
}

/**
 * Create child logger with persistent context
 */
export function createContextLogger(context: LogContext): pino.Logger {
  return logger.child(context);
}

export default logger;
