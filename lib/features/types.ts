/**
 * Feature Gating Type Definitions
 * Defines all features and plan tiers for the Video Wizard platform
 */

/**
 * Available subscription plan tiers
 * Aligned with Whop product configuration
 */
export enum PlanTier {
  BASIC = 'basic',
  PRO = 'pro',
  ENTERPRISE = 'enterprise',
}

/**
 * All available features in the platform
 * Each feature can be gated based on plan tier
 */
export enum Feature {
  // BASIC Features (available to all users)
  FEATURE_RAG_CHAT = 'rag_chat',
  FEATURE_VIDEO_UPLOAD = 'video_upload',
  FEATURE_VIDEO_PROCESSING = 'video_processing',
  FEATURE_BASIC_PROGRESS_TRACKING = 'basic_progress_tracking',

  // PRO Features (BASIC + these)
  FEATURE_LEARNING_CALENDAR = 'learning_calendar',
  FEATURE_GAMIFICATION = 'gamification',
  FEATURE_ACHIEVEMENTS = 'achievements',
  FEATURE_QUIZZES = 'quizzes',
  FEATURE_PROJECTS = 'projects',
  FEATURE_ADVANCED_ANALYTICS = 'advanced_analytics',

  // ENTERPRISE Features (PRO + these)
  FEATURE_CREATOR_DASHBOARD = 'creator_dashboard',
  FEATURE_STUDENT_MANAGEMENT = 'student_management',
  FEATURE_AI_STUDY_BUDDY = 'ai_study_buddy',
  FEATURE_STUDY_GROUPS = 'study_groups',
  FEATURE_DISCORD_INTEGRATION = 'discord_integration',
  FEATURE_CONTENT_INTELLIGENCE = 'content_intelligence',
  FEATURE_CUSTOM_BRANDING = 'custom_branding',
  FEATURE_API_ACCESS = 'api_access',
}

/**
 * Feature to plan tier mapping
 * Defines which features are available in each plan
 */
export const FEATURE_PLAN_MAPPING: Record<Feature, PlanTier> = {
  // BASIC tier features
  [Feature.FEATURE_RAG_CHAT]: PlanTier.BASIC,
  [Feature.FEATURE_VIDEO_UPLOAD]: PlanTier.BASIC,
  [Feature.FEATURE_VIDEO_PROCESSING]: PlanTier.BASIC,
  [Feature.FEATURE_BASIC_PROGRESS_TRACKING]: PlanTier.BASIC,

  // PRO tier features
  [Feature.FEATURE_LEARNING_CALENDAR]: PlanTier.PRO,
  [Feature.FEATURE_GAMIFICATION]: PlanTier.PRO,
  [Feature.FEATURE_ACHIEVEMENTS]: PlanTier.PRO,
  [Feature.FEATURE_QUIZZES]: PlanTier.PRO,
  [Feature.FEATURE_PROJECTS]: PlanTier.PRO,
  [Feature.FEATURE_ADVANCED_ANALYTICS]: PlanTier.PRO,

  // ENTERPRISE tier features
  [Feature.FEATURE_CREATOR_DASHBOARD]: PlanTier.ENTERPRISE,
  [Feature.FEATURE_STUDENT_MANAGEMENT]: PlanTier.ENTERPRISE,
  [Feature.FEATURE_AI_STUDY_BUDDY]: PlanTier.ENTERPRISE,
  [Feature.FEATURE_STUDY_GROUPS]: PlanTier.ENTERPRISE,
  [Feature.FEATURE_DISCORD_INTEGRATION]: PlanTier.ENTERPRISE,
  [Feature.FEATURE_CONTENT_INTELLIGENCE]: PlanTier.ENTERPRISE,
  [Feature.FEATURE_CUSTOM_BRANDING]: PlanTier.ENTERPRISE,
  [Feature.FEATURE_API_ACCESS]: PlanTier.ENTERPRISE,
};

/**
 * Plan tier hierarchy (for comparison)
 */
export const PLAN_TIER_HIERARCHY: Record<PlanTier, number> = {
  [PlanTier.BASIC]: 1,
  [PlanTier.PRO]: 2,
  [PlanTier.ENTERPRISE]: 3,
};

/**
 * Feature metadata for UI display
 */
export interface FeatureMetadata {
  name: string;
  description: string;
  category: 'core' | 'learning' | 'collaboration' | 'analytics' | 'advanced';
  icon?: string;
}

export const FEATURE_METADATA: Record<Feature, FeatureMetadata> = {
  // BASIC Features
  [Feature.FEATURE_RAG_CHAT]: {
    name: 'AI Chat Assistant',
    description: 'Chat with AI about your video content with timestamp references',
    category: 'core',
    icon: 'MessageSquare',
  },
  [Feature.FEATURE_VIDEO_UPLOAD]: {
    name: 'Video Upload',
    description: 'Upload and manage your course videos',
    category: 'core',
    icon: 'Upload',
  },
  [Feature.FEATURE_VIDEO_PROCESSING]: {
    name: 'Video Processing',
    description: 'Automatic transcription and content analysis',
    category: 'core',
    icon: 'FileVideo',
  },
  [Feature.FEATURE_BASIC_PROGRESS_TRACKING]: {
    name: 'Progress Tracking',
    description: 'Track student video completion',
    category: 'core',
    icon: 'TrendingUp',
  },

  // PRO Features
  [Feature.FEATURE_LEARNING_CALENDAR]: {
    name: 'Learning Calendar',
    description: 'AI-generated personalized study schedules',
    category: 'learning',
    icon: 'Calendar',
  },
  [Feature.FEATURE_GAMIFICATION]: {
    name: 'Gamification',
    description: 'XP, levels, and streaks to boost engagement',
    category: 'learning',
    icon: 'Gamepad2',
  },
  [Feature.FEATURE_ACHIEVEMENTS]: {
    name: 'Achievements',
    description: 'Unlock badges and rewards for milestones',
    category: 'learning',
    icon: 'Trophy',
  },
  [Feature.FEATURE_QUIZZES]: {
    name: 'AI Quizzes',
    description: 'Auto-generated assessments from video content',
    category: 'learning',
    icon: 'ClipboardCheck',
  },
  [Feature.FEATURE_PROJECTS]: {
    name: 'Projects',
    description: 'Hands-on projects with AI code review',
    category: 'learning',
    icon: 'FolderKanban',
  },
  [Feature.FEATURE_ADVANCED_ANALYTICS]: {
    name: 'Advanced Analytics',
    description: 'Detailed engagement and performance metrics',
    category: 'analytics',
    icon: 'BarChart3',
  },

  // ENTERPRISE Features
  [Feature.FEATURE_CREATOR_DASHBOARD]: {
    name: 'Creator Dashboard',
    description: 'Comprehensive creator tools and insights',
    category: 'advanced',
    icon: 'LayoutDashboard',
  },
  [Feature.FEATURE_STUDENT_MANAGEMENT]: {
    name: 'Student Management',
    description: 'Advanced student roster and support tools',
    category: 'advanced',
    icon: 'Users',
  },
  [Feature.FEATURE_AI_STUDY_BUDDY]: {
    name: 'AI Study Buddy',
    description: 'Personalized AI tutor for each student',
    category: 'advanced',
    icon: 'Bot',
  },
  [Feature.FEATURE_STUDY_GROUPS]: {
    name: 'Study Groups',
    description: 'Collaborative learning groups',
    category: 'collaboration',
    icon: 'UsersRound',
  },
  [Feature.FEATURE_DISCORD_INTEGRATION]: {
    name: 'Discord Integration',
    description: 'Seamless Discord community features',
    category: 'collaboration',
    icon: 'MessageCircle',
  },
  [Feature.FEATURE_CONTENT_INTELLIGENCE]: {
    name: 'Content Intelligence',
    description: 'AI-powered content recommendations and optimization',
    category: 'analytics',
    icon: 'Brain',
  },
  [Feature.FEATURE_CUSTOM_BRANDING]: {
    name: 'Custom Branding',
    description: 'White-label your learning platform',
    category: 'advanced',
    icon: 'Palette',
  },
  [Feature.FEATURE_API_ACCESS]: {
    name: 'API Access',
    description: 'Developer API for custom integrations',
    category: 'advanced',
    icon: 'Code2',
  },
};

/**
 * Plan tier configuration
 */
export interface PlanTierConfig {
  tier: PlanTier;
  name: string;
  displayName: string;
  price: {
    monthly: number;
    currency: string;
  };
  description: string;
  features: Feature[];
  limits: PlanLimits;
  popular?: boolean;
}

export interface PlanLimits {
  maxVideos?: number;
  maxStudents?: number;
  maxProjects?: number;
  maxQuizzes?: number;
  maxStorageGB?: number;
  aiMessagesPerMonth?: number;
  customBranding: boolean;
  prioritySupport: boolean;
}

/**
 * Complete plan tier configurations
 */
export const PLAN_CONFIGS: Record<PlanTier, PlanTierConfig> = {
  [PlanTier.BASIC]: {
    tier: PlanTier.BASIC,
    name: 'basic',
    displayName: 'Basic',
    price: {
      monthly: 29,
      currency: 'USD',
    },
    description: 'Perfect for getting started with AI-powered video learning',
    features: [
      Feature.FEATURE_RAG_CHAT,
      Feature.FEATURE_VIDEO_UPLOAD,
      Feature.FEATURE_VIDEO_PROCESSING,
      Feature.FEATURE_BASIC_PROGRESS_TRACKING,
    ],
    limits: {
      maxVideos: 50,
      maxStudents: 100,
      maxStorageGB: 10,
      aiMessagesPerMonth: 1000,
      customBranding: false,
      prioritySupport: false,
    },
  },
  [PlanTier.PRO]: {
    tier: PlanTier.PRO,
    name: 'pro',
    displayName: 'Pro',
    price: {
      monthly: 79,
      currency: 'USD',
    },
    description: 'Advanced learning features for serious educators',
    features: [
      // Includes all BASIC features
      Feature.FEATURE_RAG_CHAT,
      Feature.FEATURE_VIDEO_UPLOAD,
      Feature.FEATURE_VIDEO_PROCESSING,
      Feature.FEATURE_BASIC_PROGRESS_TRACKING,
      // Plus PRO features
      Feature.FEATURE_LEARNING_CALENDAR,
      Feature.FEATURE_GAMIFICATION,
      Feature.FEATURE_ACHIEVEMENTS,
      Feature.FEATURE_QUIZZES,
      Feature.FEATURE_PROJECTS,
      Feature.FEATURE_ADVANCED_ANALYTICS,
    ],
    limits: {
      maxVideos: 500,
      maxStudents: 1000,
      maxProjects: 50,
      maxQuizzes: 100,
      maxStorageGB: 100,
      aiMessagesPerMonth: 10000,
      customBranding: false,
      prioritySupport: true,
    },
    popular: true,
  },
  [PlanTier.ENTERPRISE]: {
    tier: PlanTier.ENTERPRISE,
    name: 'enterprise',
    displayName: 'Enterprise',
    price: {
      monthly: 199,
      currency: 'USD',
    },
    description: 'Complete platform with all features for professional creators',
    features: Object.values(Feature), // All features
    limits: {
      maxVideos: -1, // Unlimited
      maxStudents: -1, // Unlimited
      maxProjects: -1, // Unlimited
      maxQuizzes: -1, // Unlimited
      maxStorageGB: -1, // Unlimited
      aiMessagesPerMonth: -1, // Unlimited
      customBranding: true,
      prioritySupport: true,
    },
  },
};

/**
 * Feature access result
 */
export interface FeatureAccessResult {
  hasAccess: boolean;
  userPlan: PlanTier;
  requiredPlan: PlanTier;
  feature: Feature;
  upgradeRequired: boolean;
}

/**
 * Plan change result
 */
export interface PlanChangeResult {
  success: boolean;
  newPlan: PlanTier;
  previousPlan: PlanTier;
  message: string;
}
