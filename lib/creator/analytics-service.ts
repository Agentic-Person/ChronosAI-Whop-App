/**
 * Creator Analytics Service
 * Module 6: Creator Dashboard (ENTERPRISE Tier)
 *
 * Aggregates and computes analytics for the creator dashboard
 * Uses materialized views for performance
 */

import { createClient } from '@/lib/supabase/server';
import { cache } from '@/lib/infrastructure/cache/redis-client';
import { CacheKeys, CacheTTL } from '@/lib/infrastructure/cache/cache-keys';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface DashboardStats {
  students: StudentStats;
  progress: ProgressStats;
  engagement: EngagementStats;
  support: SupportStats;
  lastUpdated: string;
}

export interface StudentStats {
  total: number;
  active: number;
  activePercentage: number;
  newThisMonth: number;
  churnRate: number;
  trends: {
    active: number; // Percentage change from previous period
    new: number;
  };
}

export interface ProgressStats {
  avgCompletion: number;
  videosWatched: number;
  quizzesPassed: number;
  projectsSubmitted: number;
  trends: {
    completion: number;
    engagement: number;
  };
}

export interface EngagementStats {
  dailyActiveUsers: DailyActivity[];
  peakHours: HourlyActivity[];
  avgSessionTime: number; // Minutes
  totalSessions: number;
}

export interface DailyActivity {
  date: string;
  active_count: number;
  videos_watched: number;
  total_watch_time_seconds: number;
}

export interface HourlyActivity {
  hour: number;
  activity_count: number;
}

export interface SupportStats {
  questionsAsked: number;
  aiAnswered: number;
  satisfactionRate: number;
  topQuestions: TopQuestion[];
}

export interface TopQuestion {
  question: string;
  ask_count: number;
  unique_askers: number;
  avg_satisfaction: number | null;
  related_video_id: string | null;
  last_asked_at: string;
}

export interface VideoStats {
  video_id: string;
  title: string;
  category: string | null;
  difficulty_level: string | null;
  unique_viewers: number;
  total_views: number;
  avg_watch_percentage: number;
  completion_rate: number;
  views_last_7_days: number;
  last_viewed_at: string | null;
}

export interface StudentEngagement {
  student_id: string;
  name: string;
  email: string;
  engagement_tier: 'highly_engaged' | 'engaged' | 'moderate' | 'low_engagement' | 'at_risk' | 'inactive';
  videos_watched: number;
  avg_completion_rate: number;
  quiz_attempts: number;
  quizzes_passed: number;
  last_active: string;
  course_progress_percentage: number;
}

export interface EngagementMetrics {
  period: '7d' | '30d' | '90d';
  dailyActivity: DailyActivity[];
  averageSessionTime: number;
  totalActiveDays: number;
  engagementRate: number; // Percentage of students active in period
}

export interface QuizAnalytics {
  totalQuizzes: number;
  totalAttempts: number;
  averageScore: number;
  passRate: number;
  topPerformingQuizzes: Array<{
    quiz_id: string;
    title: string;
    attempts: number;
    avg_score: number;
    pass_rate: number;
  }>;
  strugglingAreas: Array<{
    quiz_id: string;
    title: string;
    fail_rate: number;
  }>;
}

export interface ChatAnalytics {
  totalSessions: number;
  totalMessages: number;
  avgMessagesPerSession: number;
  satisfactionRate: number;
  mostAskedQuestions: TopQuestion[];
  chatVolumeByDay: Array<{
    date: string;
    message_count: number;
  }>;
}

export interface RevenueMetrics {
  currentMonthRevenue: number;
  lastMonthRevenue: number;
  growth: number;
  totalStudents: number;
  avgRevenuePerStudent: number;
  churnRate: number;
}

// ============================================================================
// MAIN ANALYTICS SERVICE
// ============================================================================

export class AnalyticsService {
  /**
   * Get complete dashboard overview statistics
   * Uses materialized view cache with fallback to real-time queries
   */
  static async getOverviewStats(creatorId: string): Promise<DashboardStats> {
    const supabase = createClient();

    // Try cache first (5-minute TTL)
    const cacheKey = CacheKeys.creatorDashboard(creatorId);
    const cached = await cache.get<DashboardStats>(cacheKey);
    if (cached) {
      return cached;
    }

    // Fetch from materialized view
    const { data: analyticsCache, error: cacheError } = await supabase
      .from('creator_analytics_cache')
      .select('*')
      .eq('creator_id', creatorId)
      .single();

    if (cacheError || !analyticsCache) {
      // Fallback to real-time aggregation
      console.warn('Analytics cache miss, falling back to real-time queries');
      return this.getOverviewStatsRealTime(creatorId);
    }

    // Parallel fetch for time-series data
    const [engagementData, supportData] = await Promise.all([
      this.getEngagementData(creatorId, '30d'),
      this.getSupportStats(creatorId),
    ]);

    const stats: DashboardStats = {
      students: {
        total: analyticsCache.total_students || 0,
        active: analyticsCache.active_students_7d || 0,
        activePercentage: analyticsCache.total_students > 0
          ? Math.round((analyticsCache.active_students_7d / analyticsCache.total_students) * 100)
          : 0,
        newThisMonth: analyticsCache.new_students_this_month || 0,
        churnRate: 0.05, // TODO: Calculate actual churn from historical data
        trends: {
          active: await this.calculateActiveTrend(creatorId),
          new: await this.calculateNewStudentTrend(creatorId),
        },
      },
      progress: {
        avgCompletion: analyticsCache.avg_watch_percentage
          ? Math.round(analyticsCache.avg_watch_percentage)
          : 0,
        videosWatched: analyticsCache.total_video_views || 0,
        quizzesPassed: analyticsCache.total_quiz_passes || 0,
        projectsSubmitted: 0, // TODO: Add project submissions count
        trends: {
          completion: 0, // TODO: Calculate completion trend
          engagement: 0, // TODO: Calculate engagement trend
        },
      },
      engagement: {
        dailyActiveUsers: engagementData.dailyActivity,
        peakHours: await this.getPeakHours(creatorId),
        avgSessionTime: engagementData.averageSessionTime,
        totalSessions: analyticsCache.total_chat_sessions || 0,
      },
      support: supportData,
      lastUpdated: new Date().toISOString(),
    };

    // Cache for 5 minutes
    await cache.set(cacheKey, stats, CacheTTL.MEDIUM);

    return stats;
  }

  /**
   * Get student engagement metrics over a time period
   */
  static async getStudentEngagement(
    creatorId: string,
    period: '7d' | '30d' | '90d' = '30d'
  ): Promise<EngagementMetrics> {
    const supabase = createClient();

    const periodDays = period === '7d' ? 7 : period === '30d' ? 30 : 90;
    const periodStart = new Date();
    periodStart.setDate(periodStart.getDate() - periodDays);

    // Get daily activity from materialized view
    const { data: dailyActivity } = await supabase
      .from('daily_active_users')
      .select('*')
      .eq('creator_id', creatorId)
      .gte('activity_date', periodStart.toISOString())
      .order('activity_date', { ascending: true });

    // Get total students for engagement rate calculation
    const { count: totalStudents } = await supabase
      .from('students')
      .select('*', { count: 'exact', head: true })
      .eq('creator_id', creatorId);

    // Get active students in period
    const { count: activeStudents } = await supabase
      .from('students')
      .select('*', { count: 'exact', head: true })
      .eq('creator_id', creatorId)
      .gte('last_active', periodStart.toISOString());

    // Calculate average session time
    const { data: sessionTimeData } = await supabase.rpc(
      'get_avg_session_time',
      { creator_id_param: creatorId }
    );

    return {
      period,
      dailyActivity: dailyActivity || [],
      averageSessionTime: sessionTimeData || 0,
      totalActiveDays: dailyActivity?.length || 0,
      engagementRate: totalStudents && activeStudents
        ? Math.round((activeStudents / totalStudents) * 100)
        : 0,
    };
  }

  /**
   * Get video performance statistics
   */
  static async getVideoPerformance(creatorId: string): Promise<VideoStats[]> {
    const supabase = createClient();

    // Fetch from materialized view
    const { data: videoStats, error } = await supabase
      .from('video_analytics')
      .select('*')
      .eq('creator_id', creatorId)
      .order('total_views', { ascending: false })
      .limit(50);

    if (error) {
      console.error('Error fetching video performance:', error);
      return [];
    }

    return videoStats || [];
  }

  /**
   * Get quiz analytics
   */
  static async getQuizAnalytics(creatorId: string): Promise<QuizAnalytics> {
    const supabase = createClient();

    // Get quiz summary
    const { data: quizSummary } = await supabase
      .from('quizzes')
      .select(`
        id,
        title,
        quiz_attempts (
          id,
          score,
          passed
        )
      `)
      .eq('creator_id', creatorId);

    if (!quizSummary || quizSummary.length === 0) {
      return {
        totalQuizzes: 0,
        totalAttempts: 0,
        averageScore: 0,
        passRate: 0,
        topPerformingQuizzes: [],
        strugglingAreas: [],
      };
    }

    const totalQuizzes = quizSummary.length;
    let totalAttempts = 0;
    let totalScore = 0;
    let totalPassed = 0;

    const quizPerformance = quizSummary.map((quiz: any) => {
      const attempts = quiz.quiz_attempts || [];
      const quizAttempts = attempts.length;
      const quizPassed = attempts.filter((a: any) => a.passed).length;
      const avgScore = attempts.length > 0
        ? attempts.reduce((sum: number, a: any) => sum + (a.score || 0), 0) / attempts.length
        : 0;

      totalAttempts += quizAttempts;
      totalScore += avgScore * quizAttempts;
      totalPassed += quizPassed;

      return {
        quiz_id: quiz.id,
        title: quiz.title,
        attempts: quizAttempts,
        avg_score: Math.round(avgScore * 100) / 100,
        pass_rate: quizAttempts > 0 ? Math.round((quizPassed / quizAttempts) * 100) : 0,
        fail_rate: quizAttempts > 0 ? Math.round(((quizAttempts - quizPassed) / quizAttempts) * 100) : 0,
      };
    });

    return {
      totalQuizzes,
      totalAttempts,
      averageScore: totalAttempts > 0 ? Math.round((totalScore / totalAttempts) * 100) / 100 : 0,
      passRate: totalAttempts > 0 ? Math.round((totalPassed / totalAttempts) * 100) : 0,
      topPerformingQuizzes: quizPerformance
        .sort((a, b) => b.pass_rate - a.pass_rate)
        .slice(0, 10),
      strugglingAreas: quizPerformance
        .filter((q) => q.fail_rate > 50)
        .sort((a, b) => b.fail_rate - a.fail_rate)
        .slice(0, 10),
    };
  }

  /**
   * Get chat analytics
   */
  static async getChatAnalytics(creatorId: string): Promise<ChatAnalytics> {
    const supabase = createClient();

    // Get chat sessions and messages count
    const { count: totalSessions } = await supabase
      .from('chat_sessions')
      .select('*', { count: 'exact', head: true })
      .eq('creator_id', creatorId);

    const { count: totalMessages } = await supabase
      .from('chat_messages')
      .select('cm.*, cs.creator_id', { count: 'exact', head: true })
      .eq('cs.creator_id', creatorId);

    // Get most asked questions from materialized view
    const { data: mostAsked } = await supabase
      .from('most_asked_questions')
      .select('*')
      .eq('creator_id', creatorId)
      .order('ask_count', { ascending: false })
      .limit(20);

    // Get chat volume by day (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data: chatVolume } = await supabase
      .from('chat_messages')
      .select('created_at')
      .eq('chat_sessions.creator_id', creatorId)
      .gte('created_at', thirtyDaysAgo.toISOString());

    // Group by date
    const volumeByDay: Record<string, number> = {};
    chatVolume?.forEach((msg: any) => {
      const date = new Date(msg.created_at).toISOString().split('T')[0];
      volumeByDay[date] = (volumeByDay[date] || 0) + 1;
    });

    const chatVolumeArray = Object.entries(volumeByDay).map(([date, count]) => ({
      date,
      message_count: count,
    }));

    // Calculate satisfaction rate
    const { data: ratings } = await supabase
      .from('chat_messages')
      .select('helpful_rating')
      .eq('chat_sessions.creator_id', creatorId)
      .not('helpful_rating', 'is', null);

    const satisfactionRate = ratings && ratings.length > 0
      ? ratings.reduce((sum, r) => sum + (r.helpful_rating || 0), 0) / ratings.length
      : 0;

    return {
      totalSessions: totalSessions || 0,
      totalMessages: totalMessages || 0,
      avgMessagesPerSession: totalSessions && totalMessages
        ? Math.round((totalMessages / totalSessions) * 10) / 10
        : 0,
      satisfactionRate: Math.round(satisfactionRate * 100),
      mostAskedQuestions: mostAsked || [],
      chatVolumeByDay: chatVolumeArray,
    };
  }

  /**
   * Get revenue metrics (placeholder for future implementation)
   */
  static async getRevenueMetrics(creatorId: string): Promise<RevenueMetrics> {
    // TODO: Implement when Whop payment integration is complete
    return {
      currentMonthRevenue: 0,
      lastMonthRevenue: 0,
      growth: 0,
      totalStudents: 0,
      avgRevenuePerStudent: 0,
      churnRate: 0,
    };
  }

  // ============================================================================
  // PRIVATE HELPER METHODS
  // ============================================================================

  /**
   * Fallback: Real-time dashboard stats (when cache unavailable)
   */
  private static async getOverviewStatsRealTime(creatorId: string): Promise<DashboardStats> {
    const supabase = createClient();

    // This is a simplified version - in production, use materialized views
    const [studentData, progressData, engagementData, supportData] = await Promise.all([
      this.getStudentStatsRealTime(creatorId),
      this.getProgressStatsRealTime(creatorId),
      this.getEngagementData(creatorId, '30d'),
      this.getSupportStats(creatorId),
    ]);

    return {
      students: studentData,
      progress: progressData,
      engagement: {
        dailyActiveUsers: engagementData.dailyActivity,
        peakHours: await this.getPeakHours(creatorId),
        avgSessionTime: engagementData.averageSessionTime,
        totalSessions: 0,
      },
      support: supportData,
      lastUpdated: new Date().toISOString(),
    };
  }

  private static async getStudentStatsRealTime(creatorId: string): Promise<StudentStats> {
    const supabase = createClient();

    const { count: total } = await supabase
      .from('students')
      .select('*', { count: 'exact', head: true })
      .eq('creator_id', creatorId);

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const { count: active } = await supabase
      .from('students')
      .select('*', { count: 'exact', head: true })
      .eq('creator_id', creatorId)
      .gte('last_active', sevenDaysAgo.toISOString());

    return {
      total: total || 0,
      active: active || 0,
      activePercentage: total && active ? Math.round((active / total) * 100) : 0,
      newThisMonth: 0,
      churnRate: 0,
      trends: { active: 0, new: 0 },
    };
  }

  private static async getProgressStatsRealTime(creatorId: string): Promise<ProgressStats> {
    const supabase = createClient();

    const { data: avgData } = await supabase.rpc('get_avg_completion_rate', {
      creator_id_param: creatorId,
    });

    return {
      avgCompletion: avgData || 0,
      videosWatched: 0,
      quizzesPassed: 0,
      projectsSubmitted: 0,
      trends: { completion: 0, engagement: 0 },
    };
  }

  private static async getEngagementData(
    creatorId: string,
    period: '7d' | '30d' | '90d'
  ): Promise<EngagementMetrics> {
    return this.getStudentEngagement(creatorId, period);
  }

  private static async getSupportStats(creatorId: string): Promise<SupportStats> {
    const supabase = createClient();

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const { count: questionsAsked } = await supabase
      .from('chat_messages')
      .select('cm.*, cs.creator_id', { count: 'exact', head: true })
      .eq('cs.creator_id', creatorId)
      .eq('cm.role', 'user')
      .gte('cm.created_at', sevenDaysAgo.toISOString());

    const { count: aiAnswered } = await supabase
      .from('chat_messages')
      .select('cm.*, cs.creator_id', { count: 'exact', head: true })
      .eq('cs.creator_id', creatorId)
      .eq('cm.role', 'assistant')
      .gte('cm.created_at', sevenDaysAgo.toISOString());

    const { data: mostAsked } = await supabase
      .from('most_asked_questions')
      .select('*')
      .eq('creator_id', creatorId)
      .order('ask_count', { ascending: false })
      .limit(10);

    return {
      questionsAsked: questionsAsked || 0,
      aiAnswered: aiAnswered || 0,
      satisfactionRate: 0.92, // TODO: Calculate from ratings
      topQuestions: mostAsked || [],
    };
  }

  private static async getPeakHours(creatorId: string): Promise<HourlyActivity[]> {
    const supabase = createClient();

    const { data } = await supabase.rpc('get_peak_learning_hours', {
      creator_id_param: creatorId,
    });

    return data || [];
  }

  private static async calculateActiveTrend(creatorId: string): Promise<number> {
    // TODO: Implement trend calculation comparing current vs previous period
    return 0;
  }

  private static async calculateNewStudentTrend(creatorId: string): Promise<number> {
    // TODO: Implement new student trend
    return 0;
  }
}

// ============================================================================
// EXPORT CONVENIENCE FUNCTIONS
// ============================================================================

export const getOverviewStats = AnalyticsService.getOverviewStats.bind(AnalyticsService);
export const getStudentEngagement = AnalyticsService.getStudentEngagement.bind(AnalyticsService);
export const getVideoPerformance = AnalyticsService.getVideoPerformance.bind(AnalyticsService);
export const getQuizAnalytics = AnalyticsService.getQuizAnalytics.bind(AnalyticsService);
export const getChatAnalytics = AnalyticsService.getChatAnalytics.bind(AnalyticsService);
export const getRevenueMetrics = AnalyticsService.getRevenueMetrics.bind(AnalyticsService);
