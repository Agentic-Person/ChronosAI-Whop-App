/**
 * Cache Key Management
 * Centralized cache key generation with namespacing and TTL constants
 */

/**
 * Generate hash from string for cache key deduplication
 * Uses simple but effective hashing algorithm
 */
function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(36);
}

/**
 * Centralized cache key generation with namespacing
 * All cache keys should be generated through this object
 */
export const CacheKeys = {
  // ===== Chat & Sessions =====
  /** Chat session context (10 min TTL) */
  chatSession: (sessionId: string) => `chat:session:${sessionId}`,

  /** Chat message history (10 min TTL) */
  chatHistory: (sessionId: string) => `chat:history:${sessionId}`,

  /** Chat context for AI (includes last N messages) */
  chatContext: (sessionId: string) => `chat:context:${sessionId}`,

  // ===== User & Membership =====
  /** User membership validation (5 min TTL) */
  membership: (userId: string) => `membership:${userId}`,

  /** User plan tier (5 min TTL) */
  userPlan: (userId: string) => `user:plan:${userId}`,

  /** User profile data (15 min TTL) */
  userProfile: (userId: string) => `user:profile:${userId}`,

  /** User permissions (5 min TTL) */
  userPermissions: (userId: string) => `user:permissions:${userId}`,

  // ===== Video & Content =====
  /** Video metadata (1 hour TTL) */
  video: (videoId: string) => `video:${videoId}`,

  /** Videos by creator with pagination (1 hour TTL) */
  videosByCreator: (creatorId: string, page: number) =>
    `videos:creator:${creatorId}:page:${page}`,

  /** Video transcript (permanent with LRU) */
  videoTranscript: (videoId: string) => `video:transcript:${videoId}`,

  /** Video chunks for RAG (permanent with LRU) */
  videoChunks: (videoId: string) => `video:chunks:${videoId}`,

  /** Video processing status (5 min TTL) */
  videoProcessingStatus: (videoId: string) => `video:processing:${videoId}`,

  // ===== AI & Embeddings =====
  /** AI embeddings (permanent, LRU eviction) */
  embedding: (text: string) => {
    const hash = simpleHash(text);
    return `embedding:${hash}`;
  },

  /** AI chat response (24 hour TTL for similar queries) */
  aiResponse: (queryHash: string) => `ai:response:${queryHash}`,

  /** Query embedding cache */
  queryEmbedding: (query: string) => {
    const hash = simpleHash(query);
    return `query:embedding:${hash}`;
  },

  // ===== Rate Limiting =====
  /** Rate limit counter (1 min sliding window) */
  rateLimit: (identifier: string, endpoint: string) =>
    `ratelimit:${endpoint}:${identifier}`,

  /** Rate limit for chat endpoints */
  rateLimitChat: (userId: string) => `ratelimit:chat:${userId}`,

  /** Rate limit for video upload */
  rateLimitVideoUpload: (userId: string) => `ratelimit:video-upload:${userId}`,

  /** Rate limit for quiz generation */
  rateLimitQuizGen: (userId: string) => `ratelimit:quiz-gen:${userId}`,

  // ===== Creator & Settings =====
  /** Creator settings (30 min TTL) */
  creatorSettings: (creatorId: string) => `creator:settings:${creatorId}`,

  /** Creator configuration (30 min TTL) */
  creatorConfig: (creatorId: string) => `creator:config:${creatorId}`,

  /** Creator analytics summary (15 min TTL) */
  creatorAnalytics: (creatorId: string, period: string) =>
    `creator:analytics:${creatorId}:${period}`,

  // ===== Student & Progress =====
  /** Student progress summary (15 min TTL) */
  studentProgress: (studentId: string) => `student:progress:${studentId}`,

  /** Student achievements (15 min TTL) */
  studentAchievements: (studentId: string) =>
    `student:achievements:${studentId}`,

  /** Student video progress for specific video */
  studentVideoProgress: (studentId: string, videoId: string) =>
    `student:video:${studentId}:${videoId}`,

  /** Student learning stats (15 min TTL) */
  studentStats: (studentId: string) => `student:stats:${studentId}`,

  // ===== Quiz & Assessments =====
  /** Quiz attempt (1 hour TTL) */
  quizAttempt: (attemptId: string) => `quiz:attempt:${attemptId}`,

  /** Quiz results (1 hour TTL) */
  quizResults: (attemptId: string) => `quiz:results:${attemptId}`,

  /** Quiz questions for a video (1 day TTL) */
  quizQuestions: (videoId: string) => `quiz:questions:${videoId}`,

  // ===== Calendar & Schedule =====
  /** Student calendar events (15 min TTL) */
  studentCalendar: (studentId: string) => `calendar:student:${studentId}`,

  /** Upcoming events for student (15 min TTL) */
  upcomingEvents: (studentId: string) => `calendar:upcoming:${studentId}`,

  // ===== Analytics & Metrics =====
  /** Daily analytics aggregation (1 hour TTL) */
  dailyAnalytics: (date: string) => `analytics:daily:${date}`,

  /** Weekly analytics aggregation (6 hour TTL) */
  weeklyAnalytics: (weekStart: string) => `analytics:weekly:${weekStart}`,

  /** Popular videos (1 hour TTL) */
  popularVideos: (limit: number) => `analytics:popular:videos:${limit}`,

  // ===== Feature Flags =====
  /** Feature access check (5 min TTL) */
  featureAccess: (userId: string, feature: string) =>
    `feature:${feature}:${userId}`,

  /** Plan features list (1 hour TTL) */
  planFeatures: (planTier: string) => `plan:features:${planTier}`,

  // ===== Patterns for Invalidation =====
  /** Pattern to match all student-related caches */
  studentPattern: (studentId: string) => `*:student:${studentId}*`,

  /** Pattern to match all creator-related caches */
  creatorPattern: (creatorId: string) => `*:creator:${creatorId}:*`,

  /** Pattern to match all video-related caches */
  videoPattern: (videoId: string) => `*:video:${videoId}*`,

  /** Pattern to match all chat session caches */
  chatPattern: (sessionId: string) => `chat:*:${sessionId}*`,

  /** Pattern to match all rate limits for user */
  rateLimitPattern: (userId: string) => `ratelimit:*:${userId}`,

  /** Pattern to match all analytics caches */
  analyticsPattern: () => `analytics:*`,
} as const;

/**
 * TTL constants (in seconds)
 * All cache TTLs should use these constants for consistency
 */
export const CacheTTL = {
  /** 30 seconds - Very short-lived data */
  VERY_SHORT: 30,

  /** 1 minute - Short-lived data */
  SHORT: 60,

  /** 5 minutes - Default for frequently changing data */
  MEDIUM: 300,

  /** 15 minutes - User-specific data */
  MEDIUM_LONG: 900,

  /** 1 hour - Semi-static data */
  LONG: 3600,

  /** 6 hours - Daily aggregations */
  VERY_LONG: 21600,

  /** 24 hours - Rarely changing data */
  DAY: 86400,

  /** 7 days - Very stable data */
  WEEK: 604800,

  /** No expiration (relies on LRU eviction) */
  PERMANENT: -1,
} as const;

/**
 * Cache namespace prefixes
 * Used for bulk operations and monitoring
 */
export const CacheNamespaces = {
  CHAT: 'chat',
  USER: 'user',
  VIDEO: 'video',
  EMBEDDING: 'embedding',
  AI: 'ai',
  RATELIMIT: 'ratelimit',
  CREATOR: 'creator',
  STUDENT: 'student',
  QUIZ: 'quiz',
  CALENDAR: 'calendar',
  ANALYTICS: 'analytics',
  FEATURE: 'feature',
  PLAN: 'plan',
} as const;

/**
 * Helper to get TTL based on data type and plan tier
 */
export function getTTL(dataType: string, planTier?: string): number {
  // Enterprise customers get longer cache for better performance
  const multiplier = planTier === 'enterprise' ? 2 : 1;

  switch (dataType) {
    case 'chat':
      return CacheTTL.MEDIUM * multiplier;
    case 'user':
      return CacheTTL.MEDIUM * multiplier;
    case 'video':
      return CacheTTL.LONG * multiplier;
    case 'analytics':
      return CacheTTL.MEDIUM_LONG;
    case 'embedding':
      return CacheTTL.PERMANENT;
    default:
      return CacheTTL.MEDIUM;
  }
}
