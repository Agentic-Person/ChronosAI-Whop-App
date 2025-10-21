/**
 * Infrastructure Module Exports
 * Central export point for all infrastructure services
 */

// Database
export {
  getSupabaseClient,
  getSupabaseAdmin,
  checkDatabaseHealth,
  executeWithRetry,
  resetConnections,
} from './database/connection-pool';

export {
  QueryBuilder,
  createQueryBuilder,
  type PaginationOptions,
  type QueryFilters,
  type PaginatedResult,
} from './database/query-builder';

// Cache
export { cache, CacheService } from './cache/redis-client';
export { CacheKeys, CacheTTL, CacheNamespaces, getTTL } from './cache/cache-keys';
export {
  CacheInvalidator,
  invalidateStudent,
  invalidateCreator,
  invalidateVideo,
  invalidateMembership,
  invalidateChatSession,
} from './cache/cache-invalidation';

// Rate Limiting
export {
  RateLimiterService,
  checkRateLimit,
  enforceRateLimit,
  getRemainingRequests,
  resetRateLimit,
  type RateLimitConfig,
  type RateLimitResult,
} from './rate-limiting/rate-limiter';

// Jobs
export { inngest } from './jobs/inngest-client';

// Monitoring
export {
  logger,
  logInfo,
  logError,
  logWarn,
  logDebug,
  logAPIRequest,
  logDatabaseQuery,
  logCacheOperation,
  logAIAPICall,
  logJobEvent,
  logRateLimit,
  logPerformance,
  createContextLogger,
  type LogContext,
} from './monitoring/logger';

export {
  PerformanceTimer,
  measureAsync,
  measureSync,
  measurePerformance,
} from './monitoring/performance';

// Errors
export {
  InfrastructureError,
  DatabaseError,
  DatabaseConnectionError,
  DatabaseTimeoutError,
  RecordNotFoundError,
  OptimisticLockError,
  CacheError,
  CacheConnectionError,
  RateLimitError,
  JobQueueError,
  JobTimeoutError,
  JobRetryExhaustedError,
  ExternalAPIError,
  AIAPIError,
  AIQuotaExceededError,
  WhopAPIError,
  FeatureGateError,
  PlanLimitExceededError,
  ConfigurationError,
  MissingEnvVarError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  StorageError,
  FileUploadError,
  FileSizeLimitError,
  isInfrastructureError,
  getErrorStatusCode,
  getUserFriendlyMessage,
  getRecoverySuggestion,
  errorToAPIResponse,
} from './errors';

// Configuration
export { config, validateConfig } from './config';

// Middleware
export {
  withInfrastructure,
  withRequestId,
  withErrorHandling,
  type MiddlewareOptions,
  type InfrastructureRequest,
} from './middleware/with-infrastructure';
