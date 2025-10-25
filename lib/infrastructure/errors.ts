/**
 * Custom Error Classes for Infrastructure
 * Provides typed errors with HTTP status codes and recovery suggestions
 */

/**
 * Base infrastructure error class
 * All custom errors should extend this class
 */
export class InfrastructureError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode: number = 500,
    public readonly details?: Record<string, any>,
    public readonly recoverySuggestion?: string
  ) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }

  /**
   * Convert error to JSON for API responses
   */
  toJSON() {
    return {
      error: {
        name: this.name,
        message: this.message,
        code: this.code,
        statusCode: this.statusCode,
        details: this.details,
        recoverySuggestion: this.recoverySuggestion,
      },
    };
  }
}

/**
 * Database-related errors
 */
export class DatabaseError extends InfrastructureError {
  constructor(
    message: string,
    details?: Record<string, any>,
    recoverySuggestion?: string
  ) {
    super(
      message,
      'DATABASE_ERROR',
      503, // Service Unavailable
      details,
      recoverySuggestion || 'Please try again in a moment. If the problem persists, contact support.'
    );
  }
}

/**
 * Database connection errors
 */
export class DatabaseConnectionError extends DatabaseError {
  constructor(originalError?: Error) {
    super(
      'Failed to connect to database',
      { originalError: originalError?.message },
      'Check database connection settings and ensure the database is running.'
    );
  }
}

/**
 * Database query timeout errors
 */
export class DatabaseTimeoutError extends DatabaseError {
  constructor(query?: string) {
    super(
      'Database query timed out',
      { query },
      'The query took too long to execute. Try simplifying your request or contact support.'
    );
  }
}

/**
 * Record not found errors
 */
export class RecordNotFoundError extends DatabaseError {
  constructor(table: string, id: string) {
    super(
      `Record not found in ${table}`,
      { table, id },
      'The requested resource does not exist or has been deleted.'
    );
    this.statusCode = 404;
    this.code = 'RECORD_NOT_FOUND';
  }
}

/**
 * Optimistic locking errors
 */
export class OptimisticLockError extends DatabaseError {
  constructor(table: string, id: string) {
    super(
      `Record was modified by another process`,
      { table, id },
      'Please refresh the page and try again.'
    );
    this.statusCode = 409; // Conflict
    this.code = 'OPTIMISTIC_LOCK_FAILED';
  }
}

/**
 * Cache-related errors
 */
export class CacheError extends InfrastructureError {
  constructor(
    message: string,
    details?: Record<string, any>,
    recoverySuggestion?: string
  ) {
    super(
      message,
      'CACHE_ERROR',
      503,
      details,
      recoverySuggestion || 'Cache operation failed. The request will proceed without caching.'
    );
  }
}

/**
 * Cache connection errors
 */
export class CacheConnectionError extends CacheError {
  constructor(originalError?: Error) {
    super(
      'Failed to connect to cache',
      { originalError: originalError?.message },
      'Cache is unavailable. Operations will continue without caching.'
    );
  }
}

/**
 * Rate limit errors
 */
export class RateLimitError extends InfrastructureError {
  constructor(
    limit: number,
    window: string,
    retryAfter: Date,
    details?: Record<string, any>
  ) {
    super(
      `Rate limit exceeded: ${limit} requests per ${window}`,
      'RATE_LIMIT_EXCEEDED',
      429, // Too Many Requests
      { limit, window, retryAfter, ...details },
      `Please wait until ${retryAfter.toISOString()} before making another request.`
    );
  }

  /**
   * Get retry-after header value
   */
  getRetryAfter(): string {
    return this.details?.retryAfter
      ? new Date(this.details.retryAfter).toUTCString()
      : '';
  }
}

/**
 * Job queue errors
 */
export class JobQueueError extends InfrastructureError {
  constructor(
    message: string,
    details?: Record<string, any>,
    recoverySuggestion?: string
  ) {
    super(
      message,
      'JOB_QUEUE_ERROR',
      500,
      details,
      recoverySuggestion || 'Job processing failed. It will be retried automatically.'
    );
  }
}

/**
 * Job timeout errors
 */
export class JobTimeoutError extends JobQueueError {
  constructor(jobType: string, duration: number) {
    super(
      `Job ${jobType} timed out after ${duration}ms`,
      { jobType, duration },
      'The job exceeded its maximum execution time and was terminated.'
    );
  }
}

/**
 * Job retry exhausted errors
 */
export class JobRetryExhaustedError extends JobQueueError {
  constructor(jobType: string, attempts: number) {
    super(
      `Job ${jobType} failed after ${attempts} attempts`,
      { jobType, attempts },
      'The job has exceeded maximum retry attempts. Manual intervention may be required.'
    );
  }
}

/**
 * External API errors (Claude, OpenAI, Whop, etc.)
 */
export class ExternalAPIError extends InfrastructureError {
  constructor(
    service: string,
    message: string,
    statusCode: number = 502, // Bad Gateway
    details?: Record<string, any>
  ) {
    super(
      `${service} API error: ${message}`,
      'EXTERNAL_API_ERROR',
      statusCode,
      { service, ...details },
      `The ${service} service is temporarily unavailable. Please try again later.`
    );
  }
}

/**
 * AI API specific errors
 */
export class AIAPIError extends ExternalAPIError {
  constructor(
    provider: 'Claude' | 'OpenAI',
    message: string,
    statusCode: number = 502
  ) {
    super(provider, message, statusCode, { provider });
  }
}

/**
 * AI API quota exceeded
 */
export class AIQuotaExceededError extends AIAPIError {
  constructor(provider: 'Claude' | 'OpenAI') {
    super(
      provider,
      'API quota exceeded',
      429 // Too Many Requests
    );
    this.code = 'AI_QUOTA_EXCEEDED';
    this.recoverySuggestion = 'AI service quota has been exceeded. Please try again later or upgrade your plan.';
  }
}

/**
 * Whop API errors
 */
export class WhopAPIError extends ExternalAPIError {
  constructor(message: string, statusCode: number = 502) {
    super('Whop', message, statusCode);
  }
}

/**
 * Feature gate errors (when user doesn't have access)
 */
export class FeatureGateError extends InfrastructureError {
  constructor(
    feature: string,
    requiredPlan: string,
    currentPlan: string
  ) {
    super(
      `Feature "${feature}" requires ${requiredPlan} plan`,
      'FEATURE_NOT_AVAILABLE',
      403, // Forbidden
      { feature, requiredPlan, currentPlan },
      `Upgrade to ${requiredPlan} plan to access this feature.`
    );
  }
}

/**
 * Alias for FeatureGateError for backward compatibility
 */
export class FeatureNotAvailableError extends FeatureGateError {}

/**
 * Plan limit exceeded errors
 */
export class PlanLimitExceededError extends InfrastructureError {
  constructor(
    limitType: string,
    limit: number,
    currentUsage: number,
    planTier: string
  ) {
    super(
      `Plan limit exceeded for ${limitType}: ${currentUsage}/${limit}`,
      'PLAN_LIMIT_EXCEEDED',
      403,
      { limitType, limit, currentUsage, planTier },
      `You've reached your ${planTier} plan limit for ${limitType}. Upgrade for higher limits.`
    );
  }
}

/**
 * Configuration errors
 */
export class ConfigurationError extends InfrastructureError {
  constructor(
    setting: string,
    message: string
  ) {
    super(
      `Configuration error for ${setting}: ${message}`,
      'CONFIGURATION_ERROR',
      500,
      { setting },
      'This is a system configuration issue. Please contact support.'
    );
  }
}

/**
 * Missing environment variable errors
 */
export class MissingEnvVarError extends ConfigurationError {
  constructor(varName: string) {
    super(
      varName,
      `Environment variable ${varName} is not set`
    );
    this.code = 'MISSING_ENV_VAR';
  }
}

/**
 * Validation errors
 */
export class ValidationError extends InfrastructureError {
  constructor(
    fieldOrMessage: string,
    message?: string,
    details?: Record<string, any>
  ) {
    // Handle backward compatibility: new ValidationError('Message is required')
    if (message === undefined) {
      super(
        fieldOrMessage,
        'VALIDATION_ERROR',
        400, // Bad Request
        details,
        'Please check your input and try again.'
      );
    } else {
      // Handle full signature: new ValidationError('message', 'Message is required', {})
      super(
        `Validation failed for ${fieldOrMessage}: ${message}`,
        'VALIDATION_ERROR',
        400, // Bad Request
        { field: fieldOrMessage, ...details },
        'Please check your input and try again.'
      );
    }
  }
}

/**
 * Authentication errors
 */
export class AuthenticationError extends InfrastructureError {
  constructor(message: string = 'Authentication required') {
    super(
      message,
      'AUTHENTICATION_REQUIRED',
      401, // Unauthorized
      undefined,
      'Please log in to access this resource.'
    );
  }
}

/**
 * Authorization errors
 */
export class AuthorizationError extends InfrastructureError {
  constructor(
    resource: string,
    action: string
  ) {
    super(
      `Not authorized to ${action} ${resource}`,
      'AUTHORIZATION_FAILED',
      403, // Forbidden
      { resource, action },
      'You do not have permission to perform this action.'
    );
  }
}

/**
 * File storage errors
 */
export class StorageError extends InfrastructureError {
  constructor(
    message: string,
    details?: Record<string, any>
  ) {
    super(
      message,
      'STORAGE_ERROR',
      500,
      details,
      'File storage operation failed. Please try again.'
    );
  }
}

/**
 * File upload errors
 */
export class FileUploadError extends StorageError {
  constructor(
    fileName: string,
    reason: string
  ) {
    super(
      `Failed to upload file: ${fileName}`,
      { fileName, reason }
    );
    this.code = 'FILE_UPLOAD_FAILED';
  }
}

/**
 * File size exceeded errors
 */
export class FileSizeLimitError extends StorageError {
  constructor(
    fileName: string,
    size: number,
    maxSize: number
  ) {
    super(
      `File size exceeds limit: ${size} bytes (max: ${maxSize} bytes)`,
      { fileName, size, maxSize }
    );
    this.statusCode = 413; // Payload Too Large
    this.code = 'FILE_SIZE_LIMIT_EXCEEDED';
    this.recoverySuggestion = `Please upload a file smaller than ${Math.round(maxSize / 1024 / 1024)}MB.`;
  }
}

/**
 * Type guard to check if error is an InfrastructureError
 */
export function isInfrastructureError(error: unknown): error is InfrastructureError {
  return error instanceof InfrastructureError;
}

/**
 * Get HTTP status code from error
 */
export function getErrorStatusCode(error: unknown): number {
  if (isInfrastructureError(error)) {
    return error.statusCode;
  }
  return 500; // Internal Server Error
}

/**
 * Get user-friendly error message
 */
export function getUserFriendlyMessage(error: unknown): string {
  if (isInfrastructureError(error)) {
    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return 'An unexpected error occurred. Please try again.';
}

/**
 * Get recovery suggestion from error
 */
export function getRecoverySuggestion(error: unknown): string | undefined {
  if (isInfrastructureError(error)) {
    return error.recoverySuggestion;
  }
  return undefined;
}

/**
 * Convert any error to API response format
 */
export function errorToAPIResponse(error: unknown): {
  error: {
    name: string;
    message: string;
    code: string;
    statusCode: number;
    details?: Record<string, any>;
    recoverySuggestion?: string;
  };
} {
  if (isInfrastructureError(error)) {
    return error.toJSON();
  }

  if (error instanceof Error) {
    return {
      error: {
        name: error.name,
        message: error.message,
        code: 'INTERNAL_ERROR',
        statusCode: 500,
      },
    };
  }

  return {
    error: {
      name: 'UnknownError',
      message: 'An unexpected error occurred',
      code: 'UNKNOWN_ERROR',
      statusCode: 500,
    },
  };
}
