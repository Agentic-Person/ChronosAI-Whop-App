/**
 * Application Constants
 * Centralized constants used across the application
 */

// XP and Leveling
export const XP_BASE = 100;
export const XP_MULTIPLIER = 1.5;
export const MAX_LEVEL = 100;

// XP Rewards
export const XP_REWARDS = {
  VIDEO_COMPLETED: 50,
  QUIZ_PASSED: 100,
  QUIZ_PERFECT: 200,
  PROJECT_SUBMITTED: 250,
  PROJECT_COMPLETED: 500,
  DAILY_STREAK: 25,
  WEEKLY_STREAK: 100,
  PEER_REVIEW: 75,
  HELPFUL_ANSWER: 30,
} as const;

// Subscription Tiers
export const SUBSCRIPTION_TIERS = {
  STARTER: {
    name: 'Starter',
    max_videos: 50,
    max_students: 100,
    price: 49,
  },
  PRO: {
    name: 'Professional',
    max_videos: 200,
    max_students: 500,
    price: 99,
  },
  ENTERPRISE: {
    name: 'Enterprise',
    max_videos: -1, // unlimited
    max_students: -1, // unlimited
    price: 249,
  },
} as const;

// Video Processing
export const VIDEO_CHUNK_SIZE = 1000; // words
export const VIDEO_CHUNK_OVERLAP = 100; // words
export const EMBEDDING_DIMENSIONS = 1536; // OpenAI ada-002

// Rate Limits
export const RATE_LIMITS = {
  CHAT_PER_MINUTE: 20,
  VIDEO_UPLOAD_PER_HOUR: 10,
  QUIZ_GENERATION_PER_HOUR: 5,
  API_REQUESTS_PER_MINUTE: 100,
} as const;

// Quiz Settings
export const QUIZ_DEFAULTS = {
  PASSING_SCORE: 70,
  TIME_LIMIT_MINUTES: 30,
  QUESTIONS_PER_QUIZ: 10,
} as const;

// Achievement Rarities
export const ACHIEVEMENT_RARITIES = {
  COMMON: { color: '#9CA3AF', glow: '#D1D5DB' },
  RARE: { color: '#3B82F6', glow: '#93C5FD' },
  EPIC: { color: '#A855F7', glow: '#D8B4FE' },
  LEGENDARY: { color: '#F59E0B', glow: '#FCD34D' },
} as const;

// Animation Durations (ms)
export const ANIMATION_DURATIONS = {
  CONFETTI: 3000,
  LEVEL_UP: 2000,
  ACHIEVEMENT_UNLOCK: 1500,
  TOAST: 3000,
} as const;

// Discord Bot Commands
export const DISCORD_COMMANDS = [
  '/ask',
  '/progress',
  '/find-buddy',
  '/submit-project',
  '/schedule-session',
] as const;

// API Endpoints
export const API_ENDPOINTS = {
  CHAT: '/api/chat',
  VIDEO_UPLOAD: '/api/video/upload',
  VIDEO_STATUS: '/api/video/status',
  QUIZ_GENERATE: '/api/quiz/generate',
  QUIZ_ATTEMPT: '/api/quiz/attempt',
  PROJECT_SUBMIT: '/api/project/submit',
  CALENDAR_GENERATE: '/api/calendar/generate',
  PROGRESS_STATS: '/api/progress/stats',
  DASHBOARD_OVERVIEW: '/api/dashboard/overview',
  WHOP_WEBHOOK: '/api/webhooks/whop',
} as const;

// Error Messages
export const ERROR_MESSAGES = {
  UNAUTHORIZED: 'You must be logged in to perform this action',
  INVALID_MEMBERSHIP: 'Your membership is not active',
  RATE_LIMIT_EXCEEDED: 'Too many requests. Please try again later',
  VIDEO_PROCESSING_FAILED: 'Failed to process video',
  QUIZ_GENERATION_FAILED: 'Failed to generate quiz',
  DATABASE_ERROR: 'Database operation failed',
  INVALID_INPUT: 'Invalid input provided',
} as const;

// Success Messages
export const SUCCESS_MESSAGES = {
  VIDEO_UPLOADED: 'Video uploaded successfully',
  QUIZ_PASSED: 'Congratulations! You passed the quiz',
  PROJECT_SUBMITTED: 'Project submitted for review',
  ACHIEVEMENT_UNLOCKED: 'Achievement unlocked!',
  LEVEL_UP: 'Level up!',
} as const;
