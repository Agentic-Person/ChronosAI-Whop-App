/**
 * Creator Library
 * Export all creator-related functions and services
 */

// Analytics
export {
  getCreatorStats,
  getProcessingVideos,
  getRecentActivity,
  getVideoAnalyticsSummary,
  getEngagementMetrics,
  getTopVideos,
  getChatInsights,
  type CreatorStats,
  type ProcessingVideo,
  type RecentActivityEvent,
} from './analytics';

// Video Management
export {
  updateVideoMetadata,
  deleteVideo,
  retryProcessing,
  getCreatorVideosWithStats,
  searchVideos,
  filterVideosByStatus,
  getVideoById,
  bulkDeleteVideos,
  getVideoProcessingStatus,
  type VideoWithStats,
} from './videoManager';

// Analytics Service (from Agent 1)
export {
  AnalyticsService,
  getOverviewStats,
  getStudentEngagement,
  getVideoPerformance,
  getQuizAnalytics,
  getChatAnalytics,
  getRevenueMetrics,
} from './analytics-service';

// Video Management Service (from Agent 1)
export {
  VideoManagementService,
  getVideos,
  getVideo,
  reorderVideos,
  duplicateVideo,
  getVideoAnalytics,
  getCategories,
  getTags,
} from './video-management';
