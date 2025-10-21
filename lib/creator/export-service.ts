/**
 * Export Service
 * Module 6: Creator Dashboard (ENTERPRISE Tier)
 *
 * Handles data exports in various formats (CSV, PDF, JSON, Excel)
 */

import { createClient } from '@/lib/supabase/server';
import { StudentProfile } from './student-management';
import { VideoStats } from './analytics-service';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export type ExportFormat = 'csv' | 'pdf' | 'json' | 'xlsx';
export type ExportType = 'students' | 'progress' | 'chat' | 'analytics' | 'quiz_results' | 'videos';

export interface ExportOptions {
  type: ExportType;
  format: ExportFormat;
  filters?: Record<string, any>;
  includeMetadata?: boolean;
  dateRange?: {
    start: string;
    end: string;
  };
}

export interface ExportResult {
  success: boolean;
  downloadUrl?: string;
  fileSize?: number;
  error?: string;
  expiresAt?: string; // URL expiration timestamp
}

// ============================================================================
// EXPORT SERVICE
// ============================================================================

export class ExportService {
  /**
   * Main export function - routes to specific exporters
   */
  static async exportData(
    creatorId: string,
    options: ExportOptions
  ): Promise<ExportResult> {
    try {
      let content: string;

      switch (options.type) {
        case 'students':
          content = await this.exportStudents(creatorId, options);
          break;
        case 'progress':
          content = await this.exportProgress(creatorId, options);
          break;
        case 'chat':
          content = await this.exportChat(creatorId, options);
          break;
        case 'analytics':
          content = await this.exportAnalytics(creatorId, options);
          break;
        case 'quiz_results':
          content = await this.exportQuizResults(creatorId, options);
          break;
        case 'videos':
          content = await this.exportVideos(creatorId, options);
          break;
        default:
          throw new Error(`Unknown export type: ${options.type}`);
      }

      // Upload to storage and get signed URL
      const result = await this.uploadToStorage(creatorId, options, content);

      // Log export
      await this.logExport(creatorId, options, result);

      return result;
    } catch (error) {
      console.error('Export error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Export failed',
      };
    }
  }

  /**
   * Export student list
   */
  private static async exportStudents(
    creatorId: string,
    options: ExportOptions
  ): Promise<string> {
    const supabase = createClient();

    const { data: students } = await supabase
      .from('student_engagement_tiers')
      .select('*')
      .eq('creator_id', creatorId);

    if (!students || students.length === 0) {
      throw new Error('No students found');
    }

    if (options.format === 'json') {
      return JSON.stringify(students, null, 2);
    }

    // CSV format
    const headers = [
      'Name',
      'Email',
      'Engagement Tier',
      'Videos Watched',
      'Course Progress %',
      'Quiz Attempts',
      'Quizzes Passed',
      'XP Points',
      'Level',
      'Streak Days',
      'Total Watch Time (hours)',
      'Avg Completion Rate',
      'Last Active',
      'Joined Date',
    ];

    const rows = students.map((s) => [
      s.name || '',
      s.email || '',
      s.engagement_tier || '',
      s.videos_watched || 0,
      Math.round(s.course_progress_percentage || 0),
      s.quiz_attempts || 0,
      s.quizzes_passed || 0,
      s.xp_points || 0,
      s.level || 1,
      s.streak_days || 0,
      Math.round((s.total_watch_time_seconds || 0) / 3600),
      Math.round(s.avg_completion_rate || 0),
      s.last_active || '',
      s.created_at || '',
    ]);

    return this.toCsv(headers, rows);
  }

  /**
   * Export student progress report
   */
  private static async exportProgress(
    creatorId: string,
    options: ExportOptions
  ): Promise<string> {
    const supabase = createClient();

    const { data: progress } = await supabase
      .from('video_progress')
      .select(`
        student_id,
        video_id,
        watch_percentage,
        completed,
        last_watched,
        students (name, email),
        videos (title)
      `)
      .eq('videos.creator_id', creatorId);

    if (!progress || progress.length === 0) {
      throw new Error('No progress data found');
    }

    if (options.format === 'json') {
      return JSON.stringify(progress, null, 2);
    }

    // CSV format
    const headers = [
      'Student Name',
      'Student Email',
      'Video Title',
      'Watch Percentage',
      'Completed',
      'Last Watched',
    ];

    const rows = progress.map((p: any) => [
      p.students?.name || '',
      p.students?.email || '',
      p.videos?.title || '',
      Math.round(p.watch_percentage || 0),
      p.completed ? 'Yes' : 'No',
      p.last_watched || '',
    ]);

    return this.toCsv(headers, rows);
  }

  /**
   * Export chat history
   */
  private static async exportChat(
    creatorId: string,
    options: ExportOptions
  ): Promise<string> {
    const supabase = createClient();

    const { data: sessions } = await supabase
      .from('chat_sessions')
      .select(`
        id,
        title,
        created_at,
        students (name, email),
        chat_messages (
          role,
          content,
          created_at,
          helpful_rating
        )
      `)
      .eq('creator_id', creatorId);

    if (!sessions || sessions.length === 0) {
      throw new Error('No chat history found');
    }

    if (options.format === 'json') {
      return JSON.stringify(sessions, null, 2);
    }

    // CSV format (flattened)
    const headers = [
      'Session ID',
      'Session Title',
      'Student Name',
      'Student Email',
      'Message Role',
      'Message Content',
      'Helpful Rating',
      'Timestamp',
    ];

    const rows: any[] = [];
    sessions.forEach((session: any) => {
      session.chat_messages?.forEach((msg: any) => {
        rows.push([
          session.id,
          session.title || 'Untitled',
          session.students?.name || '',
          session.students?.email || '',
          msg.role,
          msg.content || '',
          msg.helpful_rating || '',
          msg.created_at || '',
        ]);
      });
    });

    return this.toCsv(headers, rows);
  }

  /**
   * Export analytics dashboard
   */
  private static async exportAnalytics(
    creatorId: string,
    options: ExportOptions
  ): Promise<string> {
    const supabase = createClient();

    const { data: analytics } = await supabase
      .from('creator_analytics_cache')
      .select('*')
      .eq('creator_id', creatorId)
      .single();

    if (!analytics) {
      throw new Error('No analytics data found');
    }

    // Get daily active users
    const { data: dau } = await supabase
      .from('daily_active_users')
      .select('*')
      .eq('creator_id', creatorId)
      .order('activity_date', { ascending: false })
      .limit(90);

    const exportData = {
      overview: analytics,
      daily_activity: dau || [],
      exported_at: new Date().toISOString(),
    };

    if (options.format === 'json') {
      return JSON.stringify(exportData, null, 2);
    }

    // CSV format - overview only
    const headers = [
      'Metric',
      'Value',
    ];

    const rows = [
      ['Total Students', analytics.total_students],
      ['Active Students (7d)', analytics.active_students_7d],
      ['Active Students (30d)', analytics.active_students_30d],
      ['New Students This Month', analytics.new_students_this_month],
      ['Total Videos', analytics.total_videos],
      ['Processed Videos', analytics.processed_videos],
      ['Total Video Views', analytics.total_video_views],
      ['Avg Watch Percentage', Math.round(analytics.avg_watch_percentage || 0)],
      ['Total Completions', analytics.total_completions],
      ['Total Chat Sessions', analytics.total_chat_sessions],
      ['Total User Messages', analytics.total_user_messages],
      ['Total AI Responses', analytics.total_ai_responses],
      ['Total Quizzes', analytics.total_quizzes],
      ['Total Quiz Attempts', analytics.total_quiz_attempts],
      ['Total Quiz Passes', analytics.total_quiz_passes],
      ['Avg Videos per Student', analytics.avg_videos_per_student],
    ];

    return this.toCsv(headers, rows);
  }

  /**
   * Export quiz results
   */
  private static async exportQuizResults(
    creatorId: string,
    options: ExportOptions
  ): Promise<string> {
    const supabase = createClient();

    const { data: attempts } = await supabase
      .from('quiz_attempts')
      .select(`
        id,
        score,
        passed,
        created_at,
        students (name, email),
        quizzes (title, creator_id)
      `)
      .eq('quizzes.creator_id', creatorId);

    if (!attempts || attempts.length === 0) {
      throw new Error('No quiz results found');
    }

    if (options.format === 'json') {
      return JSON.stringify(attempts, null, 2);
    }

    // CSV format
    const headers = [
      'Student Name',
      'Student Email',
      'Quiz Title',
      'Score',
      'Passed',
      'Attempted At',
    ];

    const rows = attempts.map((a: any) => [
      a.students?.name || '',
      a.students?.email || '',
      a.quizzes?.title || '',
      a.score || 0,
      a.passed ? 'Yes' : 'No',
      a.created_at || '',
    ]);

    return this.toCsv(headers, rows);
  }

  /**
   * Export video library
   */
  private static async exportVideos(
    creatorId: string,
    options: ExportOptions
  ): Promise<string> {
    const supabase = createClient();

    const { data: videos } = await supabase
      .from('video_analytics')
      .select('*')
      .eq('creator_id', creatorId);

    if (!videos || videos.length === 0) {
      throw new Error('No videos found');
    }

    if (options.format === 'json') {
      return JSON.stringify(videos, null, 2);
    }

    // CSV format
    const headers = [
      'Title',
      'Category',
      'Difficulty',
      'Duration (min)',
      'Unique Viewers',
      'Total Views',
      'Avg Watch %',
      'Completion Rate %',
      'Views Last 7 Days',
      'Last Viewed',
    ];

    const rows = videos.map((v: any) => [
      v.title || '',
      v.category || '',
      v.difficulty_level || '',
      Math.round((v.duration_seconds || 0) / 60),
      v.unique_viewers || 0,
      v.total_views || 0,
      Math.round(v.avg_watch_percentage || 0),
      Math.round(v.completion_rate || 0),
      v.views_last_7_days || 0,
      v.last_viewed_at || '',
    ]);

    return this.toCsv(headers, rows);
  }

  /**
   * Upload export file to storage and return signed URL
   */
  private static async uploadToStorage(
    creatorId: string,
    options: ExportOptions,
    content: string
  ): Promise<ExportResult> {
    const supabase = createClient();

    // Generate filename
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `exports/${creatorId}/${options.type}-${timestamp}.${options.format}`;

    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from('exports')
      .upload(filename, content, {
        contentType: this.getContentType(options.format),
      });

    if (error) {
      throw new Error(`Storage upload failed: ${error.message}`);
    }

    // Get signed URL (expires in 24 hours)
    const { data: urlData } = await supabase.storage
      .from('exports')
      .createSignedUrl(filename, 86400); // 24 hours

    if (!urlData?.signedUrl) {
      throw new Error('Failed to generate download URL');
    }

    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    return {
      success: true,
      downloadUrl: urlData.signedUrl,
      fileSize: content.length,
      expiresAt: expiresAt.toISOString(),
    };
  }

  /**
   * Log export to database
   */
  private static async logExport(
    creatorId: string,
    options: ExportOptions,
    result: ExportResult
  ): Promise<void> {
    const supabase = createClient();

    await supabase.from('export_logs').insert({
      creator_id: creatorId,
      export_type: options.type,
      format: options.format,
      file_url: result.downloadUrl,
      file_size_bytes: result.fileSize,
      filters: options.filters || {},
      status: result.success ? 'completed' : 'failed',
      error_message: result.error,
      completed_at: new Date().toISOString(),
    });
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  /**
   * Convert data to CSV format
   */
  private static toCsv(headers: string[], rows: any[][]): string {
    const escapeCsvValue = (value: any): string => {
      const str = String(value || '');
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const csvRows = [
      headers.map(escapeCsvValue).join(','),
      ...rows.map(row => row.map(escapeCsvValue).join(',')),
    ];

    return csvRows.join('\n');
  }

  /**
   * Get content type for format
   */
  private static getContentType(format: ExportFormat): string {
    switch (format) {
      case 'csv':
        return 'text/csv';
      case 'json':
        return 'application/json';
      case 'pdf':
        return 'application/pdf';
      case 'xlsx':
        return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      default:
        return 'text/plain';
    }
  }
}

// ============================================================================
// EXPORT CONVENIENCE FUNCTIONS
// ============================================================================

export const exportData = ExportService.exportData.bind(ExportService);

/**
 * Export student list as CSV
 */
export async function exportStudentList(creatorId: string): Promise<Buffer> {
  const result = await ExportService.exportData(creatorId, {
    type: 'students',
    format: 'csv',
  });

  if (!result.success || !result.downloadUrl) {
    throw new Error(result.error || 'Export failed');
  }

  // Fetch the file content
  const response = await fetch(result.downloadUrl);
  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

/**
 * Export progress report as PDF (placeholder)
 */
export async function exportProgressReport(studentId: string): Promise<Buffer> {
  // TODO: Implement PDF generation using jsPDF or puppeteer
  throw new Error('PDF export not yet implemented');
}

/**
 * Export chat history as JSON
 */
export async function exportChatHistory(creatorId: string): Promise<Buffer> {
  const result = await ExportService.exportData(creatorId, {
    type: 'chat',
    format: 'json',
  });

  if (!result.success || !result.downloadUrl) {
    throw new Error(result.error || 'Export failed');
  }

  const response = await fetch(result.downloadUrl);
  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

/**
 * Export analytics dashboard (placeholder)
 */
export async function exportAnalyticsDashboard(
  creatorId: string,
  period: string
): Promise<Buffer> {
  const result = await ExportService.exportData(creatorId, {
    type: 'analytics',
    format: 'csv',
  });

  if (!result.success || !result.downloadUrl) {
    throw new Error(result.error || 'Export failed');
  }

  const response = await fetch(result.downloadUrl);
  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}
