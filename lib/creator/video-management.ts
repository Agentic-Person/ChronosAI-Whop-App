/**
 * Video Management Service
 * Module 6: Creator Dashboard (ENTERPRISE Tier)
 *
 * Enhanced video operations for creators
 */

import { createClient } from '@/lib/supabase/server';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface Video {
  id: string;
  creator_id: string;
  title: string;
  description: string | null;
  video_url: string;
  thumbnail_url: string | null;
  duration_seconds: number | null;
  transcript: string | null;
  transcript_processed: boolean;
  category: string | null;
  tags: string[];
  difficulty_level: string | null;
  order_index: number;
  created_at: string;
  updated_at: string;

  // Analytics (from video_analytics view)
  unique_viewers?: number;
  total_views?: number;
  avg_watch_percentage?: number;
  completion_rate?: number;
}

export interface VideoUpdates {
  title?: string;
  description?: string;
  thumbnail_url?: string;
  category?: string;
  tags?: string[];
  difficulty_level?: string;
  order_index?: number;
}

export interface VideoAnalytics {
  video_id: string;
  unique_viewers: number;
  total_views: number;
  avg_watch_percentage: number;
  avg_watch_duration_seconds: number;
  completion_rate: number;
  high_engagement_views: number;
  low_engagement_views: number;
  avg_dropoff_percentage: number;
  views_last_7_days: number;
  last_viewed_at: string | null;

  // Viewer breakdown
  viewer_engagement: {
    highly_engaged: number; // >75% watched
    moderately_engaged: number; // 25-75%
    low_engaged: number; // <25%
  };

  // Common questions about this video
  related_questions?: Array<{
    question: string;
    ask_count: number;
  }>;
}

export interface VideoFilters {
  status?: 'all' | 'processing' | 'completed' | 'failed';
  difficulty?: string;
  category?: string;
  search?: string;
  sortBy?: 'title' | 'created_at' | 'views' | 'completion_rate';
  sortOrder?: 'asc' | 'desc';
}

// ============================================================================
// VIDEO MANAGEMENT SERVICE
// ============================================================================

export class VideoManagementService {
  /**
   * Get all videos for a creator with optional filters
   */
  static async getVideos(
    creatorId: string,
    filters: VideoFilters = {}
  ): Promise<Video[]> {
    const supabase = createClient();

    const {
      status = 'all',
      difficulty,
      category,
      search,
      sortBy = 'created_at',
      sortOrder = 'desc',
    } = filters;

    let query = supabase
      .from('videos')
      .select('*')
      .eq('creator_id', creatorId);

    // Apply filters
    if (status !== 'all') {
      if (status === 'processing') {
        query = query.eq('transcript_processed', false);
      } else if (status === 'completed') {
        query = query.eq('transcript_processed', true);
      }
      // 'failed' status would require additional tracking field
    }

    if (difficulty) {
      query = query.eq('difficulty_level', difficulty);
    }

    if (category) {
      query = query.eq('category', category);
    }

    if (search) {
      query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%`);
    }

    // Apply sorting
    query = query.order(sortBy, { ascending: sortOrder === 'asc' });

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching videos:', error);
      throw new Error('Failed to fetch videos');
    }

    // Enrich with analytics data
    const enrichedVideos = await this.enrichWithAnalytics(creatorId, data || []);

    return enrichedVideos;
  }

  /**
   * Get a single video by ID
   */
  static async getVideo(videoId: string, creatorId: string): Promise<Video | null> {
    const supabase = createClient();

    const { data, error } = await supabase
      .from('videos')
      .select('*')
      .eq('id', videoId)
      .eq('creator_id', creatorId)
      .single();

    if (error || !data) {
      return null;
    }

    // Enrich with analytics
    const [enriched] = await this.enrichWithAnalytics(creatorId, [data]);
    return enriched;
  }

  /**
   * Update video metadata
   */
  static async updateVideoMetadata(
    videoId: string,
    creatorId: string,
    updates: VideoUpdates
  ): Promise<Video> {
    const supabase = createClient();

    const { data, error } = await supabase
      .from('videos')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', videoId)
      .eq('creator_id', creatorId)
      .select()
      .single();

    if (error || !data) {
      throw new Error('Failed to update video');
    }

    return data;
  }

  /**
   * Reorder videos in a course
   */
  static async reorderVideos(
    creatorId: string,
    videoIds: string[]
  ): Promise<void> {
    const supabase = createClient();

    // Update order_index for each video
    const updates = videoIds.map((id, index) => ({
      id,
      order_index: index,
      updated_at: new Date().toISOString(),
    }));

    const { error } = await supabase
      .from('videos')
      .upsert(updates)
      .eq('creator_id', creatorId);

    if (error) {
      throw new Error('Failed to reorder videos');
    }
  }

  /**
   * Delete a video
   */
  static async deleteVideo(videoId: string, creatorId: string): Promise<void> {
    const supabase = createClient();

    // Delete video (cascading deletes will handle related data)
    const { error } = await supabase
      .from('videos')
      .delete()
      .eq('id', videoId)
      .eq('creator_id', creatorId);

    if (error) {
      throw new Error('Failed to delete video');
    }

    // TODO: Delete video file from storage (S3/R2)
    // await deleteVideoFromStorage(videoUrl);
  }

  /**
   * Duplicate a video (copy metadata, not actual video file)
   */
  static async duplicateVideo(videoId: string, creatorId: string): Promise<Video> {
    const supabase = createClient();

    // Get original video
    const { data: original, error: fetchError } = await supabase
      .from('videos')
      .select('*')
      .eq('id', videoId)
      .eq('creator_id', creatorId)
      .single();

    if (fetchError || !original) {
      throw new Error('Video not found');
    }

    // Create duplicate
    const { data: duplicate, error: createError } = await supabase
      .from('videos')
      .insert({
        creator_id: creatorId,
        title: `${original.title} (Copy)`,
        description: original.description,
        video_url: original.video_url,
        thumbnail_url: original.thumbnail_url,
        duration_seconds: original.duration_seconds,
        category: original.category,
        tags: original.tags,
        difficulty_level: original.difficulty_level,
        order_index: original.order_index + 1,
        transcript_processed: false, // Re-process transcript
      })
      .select()
      .single();

    if (createError || !duplicate) {
      throw new Error('Failed to duplicate video');
    }

    return duplicate;
  }

  /**
   * Get detailed analytics for a specific video
   */
  static async getVideoAnalytics(videoId: string, creatorId: string): Promise<VideoAnalytics | null> {
    const supabase = createClient();

    // Get from materialized view
    const { data: analytics, error } = await supabase
      .from('video_analytics')
      .select('*')
      .eq('video_id', videoId)
      .eq('creator_id', creatorId)
      .single();

    if (error || !analytics) {
      return null;
    }

    // Get related questions from chat
    const { data: questions } = await supabase
      .from('most_asked_questions')
      .select('question, ask_count')
      .eq('creator_id', creatorId)
      .eq('related_video_id', videoId)
      .order('ask_count', { ascending: false })
      .limit(10);

    return {
      video_id: analytics.video_id,
      unique_viewers: analytics.unique_viewers || 0,
      total_views: analytics.total_views || 0,
      avg_watch_percentage: analytics.avg_watch_percentage || 0,
      avg_watch_duration_seconds: analytics.avg_watch_duration_seconds || 0,
      completion_rate: analytics.completion_rate || 0,
      high_engagement_views: analytics.high_engagement_views || 0,
      low_engagement_views: analytics.low_engagement_views || 0,
      avg_dropoff_percentage: analytics.avg_dropoff_percentage || 0,
      views_last_7_days: analytics.views_last_7_days || 0,
      last_viewed_at: analytics.last_viewed_at,
      viewer_engagement: {
        highly_engaged: analytics.high_engagement_views || 0,
        moderately_engaged: (analytics.total_views || 0) -
          (analytics.high_engagement_views || 0) -
          (analytics.low_engagement_views || 0),
        low_engaged: analytics.low_engagement_views || 0,
      },
      related_questions: questions || [],
    };
  }

  /**
   * Get video categories used by creator
   */
  static async getCategories(creatorId: string): Promise<string[]> {
    const supabase = createClient();

    const { data } = await supabase
      .from('videos')
      .select('category')
      .eq('creator_id', creatorId)
      .not('category', 'is', null);

    const categories = Array.from(new Set(data?.map(v => v.category).filter(Boolean)));
    return categories as string[];
  }

  /**
   * Get all tags used by creator
   */
  static async getTags(creatorId: string): Promise<string[]> {
    const supabase = createClient();

    const { data } = await supabase
      .from('videos')
      .select('tags')
      .eq('creator_id', creatorId);

    const allTags = data?.flatMap(v => v.tags || []) || [];
    const uniqueTags = Array.from(new Set(allTags));
    return uniqueTags;
  }

  /**
   * Bulk update video category
   */
  static async bulkUpdateCategory(
    videoIds: string[],
    creatorId: string,
    category: string
  ): Promise<void> {
    const supabase = createClient();

    const { error } = await supabase
      .from('videos')
      .update({ category, updated_at: new Date().toISOString() })
      .in('id', videoIds)
      .eq('creator_id', creatorId);

    if (error) {
      throw new Error('Failed to bulk update category');
    }
  }

  /**
   * Bulk update video difficulty
   */
  static async bulkUpdateDifficulty(
    videoIds: string[],
    creatorId: string,
    difficulty: string
  ): Promise<void> {
    const supabase = createClient();

    const { error } = await supabase
      .from('videos')
      .update({ difficulty_level: difficulty, updated_at: new Date().toISOString() })
      .in('id', videoIds)
      .eq('creator_id', creatorId);

    if (error) {
      throw new Error('Failed to bulk update difficulty');
    }
  }

  /**
   * Bulk delete videos
   */
  static async bulkDeleteVideos(
    videoIds: string[],
    creatorId: string
  ): Promise<void> {
    const supabase = createClient();

    const { error } = await supabase
      .from('videos')
      .delete()
      .in('id', videoIds)
      .eq('creator_id', creatorId);

    if (error) {
      throw new Error('Failed to bulk delete videos');
    }

    // TODO: Delete video files from storage
  }

  // ============================================================================
  // PRIVATE HELPER METHODS
  // ============================================================================

  /**
   * Enrich videos with analytics data
   */
  private static async enrichWithAnalytics(
    creatorId: string,
    videos: Video[]
  ): Promise<Video[]> {
    if (videos.length === 0) return [];

    const supabase = createClient();

    const videoIds = videos.map(v => v.id);

    // Fetch analytics for all videos
    const { data: analytics } = await supabase
      .from('video_analytics')
      .select('*')
      .in('video_id', videoIds)
      .eq('creator_id', creatorId);

    // Map analytics to videos
    const analyticsMap = new Map(analytics?.map(a => [a.video_id, a]));

    return videos.map(video => {
      const videoAnalytics = analyticsMap.get(video.id);
      return {
        ...video,
        unique_viewers: videoAnalytics?.unique_viewers || 0,
        total_views: videoAnalytics?.total_views || 0,
        avg_watch_percentage: videoAnalytics?.avg_watch_percentage || 0,
        completion_rate: videoAnalytics?.completion_rate || 0,
      };
    });
  }
}

// ============================================================================
// EXPORT CONVENIENCE FUNCTIONS
// ============================================================================

export const getVideos = VideoManagementService.getVideos.bind(VideoManagementService);
export const getVideo = VideoManagementService.getVideo.bind(VideoManagementService);
export const updateVideoMetadata = VideoManagementService.updateVideoMetadata.bind(VideoManagementService);
export const reorderVideos = VideoManagementService.reorderVideos.bind(VideoManagementService);
export const deleteVideo = VideoManagementService.deleteVideo.bind(VideoManagementService);
export const duplicateVideo = VideoManagementService.duplicateVideo.bind(VideoManagementService);
export const getVideoAnalytics = VideoManagementService.getVideoAnalytics.bind(VideoManagementService);
export const getCategories = VideoManagementService.getCategories.bind(VideoManagementService);
export const getTags = VideoManagementService.getTags.bind(VideoManagementService);
