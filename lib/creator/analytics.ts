/**
 * Creator Analytics Helper Functions
 * Simplified functions for the creator dashboard
 */

import { createClient } from '@/lib/utils/supabase-client';

export interface CreatorStats {
  totalVideos: number;
  totalStudents: number;
  totalChatMessages: number;
  totalWatchTimeHours: number;
  videosProcessing: number;
  videosCompleted: number;
  videosFailed: number;
}

export interface ProcessingVideo {
  id: string;
  title: string;
  status: 'pending' | 'transcribing' | 'chunking' | 'embedding' | 'completed' | 'failed';
  progress: number;
  created_at: string;
  error_message?: string;
}

export interface RecentActivityEvent {
  id: string;
  type: 'student_enrolled' | 'video_uploaded' | 'video_completed' | 'student_question' | 'milestone_reached';
  description: string;
  timestamp: string;
  icon?: string;
  action?: {
    label: string;
    href: string;
  };
}

/**
 * Get creator dashboard statistics
 */
export async function getCreatorStats(creatorId: string): Promise<CreatorStats> {
  const supabase = createClient();

  // Get total videos
  const { count: totalVideos } = await supabase
    .from('videos')
    .select('*', { count: 'exact', head: true })
    .eq('creator_id', creatorId);

  // Get processing/completed/failed counts
  const { data: videosByStatus } = await supabase
    .from('videos')
    .select('transcript_processed')
    .eq('creator_id', creatorId);

  const videosCompleted = videosByStatus?.filter((v) => v.transcript_processed).length || 0;
  const videosProcessing = videosByStatus?.filter((v) => !v.transcript_processed).length || 0;

  // Get total students
  const { count: totalStudents } = await supabase
    .from('students')
    .select('*', { count: 'exact', head: true })
    .eq('creator_id', creatorId);

  // Get total chat messages
  const { count: totalChatMessages } = await supabase
    .from('chat_messages')
    .select('id, session_id!inner(creator_id)', { count: 'exact', head: true })
    .eq('session_id.creator_id', creatorId);

  // Get total watch time
  const { data: watchTimeData } = await supabase
    .from('video_progress')
    .select('watch_time_seconds, student_id!inner(creator_id)')
    .eq('student_id.creator_id', creatorId);

  const totalWatchTimeSeconds = watchTimeData?.reduce((sum, record) => sum + (record.watch_time_seconds || 0), 0) || 0;
  const totalWatchTimeHours = Math.round(totalWatchTimeSeconds / 3600);

  return {
    totalVideos: totalVideos || 0,
    totalStudents: totalStudents || 0,
    totalChatMessages: totalChatMessages || 0,
    totalWatchTimeHours,
    videosProcessing,
    videosCompleted,
    videosFailed: 0, // TODO: Add error tracking
  };
}

/**
 * Get currently processing videos
 */
export async function getProcessingVideos(creatorId: string): Promise<ProcessingVideo[]> {
  const supabase = createClient();

  const { data: videos } = await supabase
    .from('videos')
    .select('id, title, transcript_processed, created_at')
    .eq('creator_id', creatorId)
    .eq('transcript_processed', false)
    .order('created_at', { ascending: false });

  if (!videos) return [];

  return videos.map((video) => ({
    id: video.id,
    title: video.title,
    status: 'processing' as const,
    progress: 50, // Mock progress - would need to track actual progress
    created_at: video.created_at,
  }));
}

/**
 * Get recent activity feed
 */
export async function getRecentActivity(creatorId: string, limit: number = 10): Promise<RecentActivityEvent[]> {
  const supabase = createClient();

  const events: RecentActivityEvent[] = [];

  // Get recent student enrollments
  const { data: recentStudents } = await supabase
    .from('students')
    .select('id, name, created_at')
    .eq('creator_id', creatorId)
    .order('created_at', { ascending: false })
    .limit(5);

  recentStudents?.forEach((student) => {
    events.push({
      id: `enrollment-${student.id}`,
      type: 'student_enrolled',
      description: `${student.name || 'New student'} enrolled in your course`,
      timestamp: student.created_at,
      icon: 'user-plus',
    });
  });

  // Get recent video uploads
  const { data: recentVideos } = await supabase
    .from('videos')
    .select('id, title, created_at, transcript_processed')
    .eq('creator_id', creatorId)
    .order('created_at', { ascending: false })
    .limit(5);

  recentVideos?.forEach((video) => {
    if (video.transcript_processed) {
      events.push({
        id: `video-completed-${video.id}`,
        type: 'video_completed',
        description: `Video "${video.title}" processing completed`,
        timestamp: video.created_at,
        icon: 'check-circle',
        action: {
          label: 'View',
          href: `/dashboard/creator/videos/${video.id}`,
        },
      });
    } else {
      events.push({
        id: `video-uploaded-${video.id}`,
        type: 'video_uploaded',
        description: `Video "${video.title}" uploaded`,
        timestamp: video.created_at,
        icon: 'upload',
      });
    }
  });

  // Sort by timestamp and limit
  return events
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, limit);
}

/**
 * Get video analytics summary for a specific video
 */
export async function getVideoAnalyticsSummary(videoId: string, creatorId: string) {
  const supabase = createClient();

  // Get video details
  const { data: video } = await supabase
    .from('videos')
    .select('*')
    .eq('id', videoId)
    .eq('creator_id', creatorId)
    .single();

  if (!video) return null;

  // Get view count
  const { count: totalViews } = await supabase
    .from('video_progress')
    .select('*', { count: 'exact', head: true })
    .eq('video_id', videoId);

  // Get completion count
  const { count: completions } = await supabase
    .from('video_progress')
    .select('*', { count: 'exact', head: true })
    .eq('video_id', videoId)
    .eq('completed', true);

  // Get average watch percentage
  const { data: progressData } = await supabase
    .from('video_progress')
    .select('completion_percentage')
    .eq('video_id', videoId);

  const avgCompletion = progressData && progressData.length > 0
    ? progressData.reduce((sum, p) => sum + (p.completion_percentage || 0), 0) / progressData.length
    : 0;

  // Get chat questions about this video
  const { count: chatQuestions } = await supabase
    .from('chat_messages')
    .select('*', { count: 'exact', head: true })
    .contains('video_references', [{ video_id: videoId }]);

  return {
    video,
    totalViews: totalViews || 0,
    completions: completions || 0,
    avgCompletion: Math.round(avgCompletion),
    chatQuestions: chatQuestions || 0,
  };
}

/**
 * Get engagement metrics for charts
 */
export async function getEngagementMetrics(creatorId: string, days: number = 30) {
  const supabase = createClient();

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  // Get student enrollments over time
  const { data: enrollments } = await supabase
    .from('students')
    .select('created_at')
    .eq('creator_id', creatorId)
    .gte('created_at', startDate.toISOString());

  // Group by date
  const enrollmentsByDate: Record<string, number> = {};
  enrollments?.forEach((enrollment) => {
    const date = new Date(enrollment.created_at).toISOString().split('T')[0];
    enrollmentsByDate[date] = (enrollmentsByDate[date] || 0) + 1;
  });

  // Get chat activity over time
  const { data: messages } = await supabase
    .from('chat_messages')
    .select('created_at, session_id!inner(creator_id)')
    .eq('session_id.creator_id', creatorId)
    .gte('created_at', startDate.toISOString());

  const messagesByDate: Record<string, number> = {};
  messages?.forEach((message) => {
    const date = new Date(message.created_at).toISOString().split('T')[0];
    messagesByDate[date] = (messagesByDate[date] || 0) + 1;
  });

  return {
    enrollmentsByDate,
    messagesByDate,
  };
}

/**
 * Get top videos by views
 */
export async function getTopVideos(creatorId: string, limit: number = 10) {
  const supabase = createClient();

  const { data: videos } = await supabase
    .from('videos')
    .select(`
      id,
      title,
      duration_seconds,
      video_progress (
        id,
        completed
      )
    `)
    .eq('creator_id', creatorId);

  if (!videos) return [];

  const videoStats = videos.map((video: any) => {
    const views = video.video_progress?.length || 0;
    const completions = video.video_progress?.filter((p: any) => p.completed).length || 0;
    const completionRate = views > 0 ? Math.round((completions / views) * 100) : 0;

    return {
      id: video.id,
      title: video.title,
      views,
      completions,
      completionRate,
      duration: video.duration_seconds,
    };
  });

  return videoStats
    .sort((a, b) => b.views - a.views)
    .slice(0, limit);
}

/**
 * Get chat insights (most asked questions)
 */
export async function getChatInsights(creatorId: string, limit: number = 10) {
  const supabase = createClient();

  // Get all user messages (questions)
  const { data: messages } = await supabase
    .from('chat_messages')
    .select('content, session_id!inner(creator_id)')
    .eq('session_id.creator_id', creatorId)
    .eq('role', 'user')
    .order('created_at', { ascending: false })
    .limit(100);

  if (!messages) return [];

  // Simple word frequency analysis (would use more sophisticated NLP in production)
  const questionWords: Record<string, number> = {};
  messages.forEach((msg) => {
    const words = msg.content.toLowerCase().split(/\s+/);
    words.forEach((word) => {
      if (word.length > 4) { // Filter out short words
        questionWords[word] = (questionWords[word] || 0) + 1;
      }
    });
  });

  return Object.entries(questionWords)
    .sort(([, a], [, b]) => b - a)
    .slice(0, limit)
    .map(([word, count]) => ({ word, count }));
}
