/**
 * Student Management Service
 * Module 6: Creator Dashboard (ENTERPRISE Tier)
 *
 * Handles all student management operations for creators
 */

import { createClient } from '@/lib/supabase/server';
import { StudentEngagement } from './analytics-service';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface StudentFilters {
  status?: 'all' | 'active' | 'at-risk' | 'inactive';
  progress?: '0-25' | '26-50' | '51-75' | '76-100';
  lastActive?: 'today' | 'week' | 'month' | 'inactive';
  search?: string;
  sortBy?: 'name' | 'progress' | 'lastActive' | 'xp';
  sortOrder?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}

export interface StudentList {
  students: StudentProfile[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

export interface StudentProfile {
  id: string;
  whop_user_id: string;
  whop_membership_id: string;
  email: string | null;
  name: string | null;
  xp_points: number;
  level: number;
  streak_days: number;
  last_active: string;
  created_at: string;

  // Computed fields
  engagement_tier: string;
  videos_watched: number;
  quiz_attempts: number;
  quizzes_passed: number;
  avg_completion_rate: number;
  course_progress_percentage: number;
  total_watch_time_seconds: number;

  // Recent activity
  recent_videos?: Array<{
    video_id: string;
    title: string;
    watched_at: string;
    completion: number;
  }>;
  recent_quizzes?: Array<{
    quiz_id: string;
    title: string;
    score: number;
    passed: boolean;
    attempted_at: string;
  }>;
}

export interface StudentDetailedProfile extends StudentProfile {
  learning_preferences: Record<string, any>;
  onboarding_completed: boolean;
  achievements: Achievement[];
  projects: ProjectSubmission[];
  chat_history_summary: ChatSummary;
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon_url: string;
  unlocked_at: string;
}

export interface ProjectSubmission {
  id: string;
  project_id: string;
  title: string;
  submitted_at: string;
  status: 'pending' | 'reviewed' | 'approved' | 'needs_revision';
  score: number | null;
  feedback: string | null;
}

export interface ChatSummary {
  total_sessions: number;
  total_messages: number;
  last_chat_at: string | null;
  avg_satisfaction: number;
}

export interface InviteResult {
  success: boolean;
  invited: number;
  failed: number;
  errors: Array<{
    email: string;
    error: string;
  }>;
}

export interface BulkActionResult {
  success: boolean;
  affected: number;
  errors: Array<{
    student_id: string;
    error: string;
  }>;
}

// ============================================================================
// STUDENT MANAGEMENT SERVICE
// ============================================================================

export class StudentManagementService {
  /**
   * Get filtered and paginated student list
   */
  static async getStudents(
    creatorId: string,
    filters: StudentFilters = {}
  ): Promise<StudentList> {
    const supabase = createClient();

    const {
      status = 'all',
      progress,
      lastActive,
      search,
      sortBy = 'lastActive',
      sortOrder = 'desc',
      limit = 50,
      offset = 0,
    } = filters;

    // Base query from materialized view
    let query = supabase
      .from('student_engagement_tiers')
      .select('*', { count: 'exact' })
      .eq('creator_id', creatorId);

    // Apply filters
    if (status !== 'all') {
      if (status === 'active') {
        query = query.in('engagement_tier', ['highly_engaged', 'engaged', 'moderate']);
      } else if (status === 'at-risk') {
        query = query.eq('engagement_tier', 'at_risk');
      } else if (status === 'inactive') {
        query = query.eq('engagement_tier', 'inactive');
      }
    }

    if (progress) {
      const [min, max] = progress.split('-').map(Number);
      query = query
        .gte('course_progress_percentage', min)
        .lte('course_progress_percentage', max);
    }

    if (lastActive) {
      const now = new Date();
      let cutoffDate: Date;

      switch (lastActive) {
        case 'today':
          cutoffDate = new Date(now.setHours(0, 0, 0, 0));
          break;
        case 'week':
          cutoffDate = new Date(now.setDate(now.getDate() - 7));
          break;
        case 'month':
          cutoffDate = new Date(now.setDate(now.getDate() - 30));
          break;
        case 'inactive':
          cutoffDate = new Date(now.setDate(now.getDate() - 30));
          query = query.lt('last_active', cutoffDate.toISOString());
          break;
      }

      if (lastActive !== 'inactive') {
        query = query.gte('last_active', cutoffDate.toISOString());
      }
    }

    if (search) {
      query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%`);
    }

    // Apply sorting
    const sortColumn = sortBy === 'name' ? 'name'
      : sortBy === 'progress' ? 'course_progress_percentage'
      : sortBy === 'xp' ? 'xp_points'
      : 'last_active';

    query = query.order(sortColumn, { ascending: sortOrder === 'asc' });

    // Apply pagination
    query = query.range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) {
      console.error('Error fetching students:', error);
      throw new Error('Failed to fetch students');
    }

    const students = data || [];
    const total = count || 0;
    const page = Math.floor(offset / limit) + 1;

    return {
      students: students.map(this.mapToStudentProfile),
      total,
      page,
      pageSize: limit,
      hasMore: offset + limit < total,
    };
  }

  /**
   * Get detailed profile for a single student
   */
  static async getStudentDetails(
    studentId: string,
    creatorId: string
  ): Promise<StudentDetailedProfile | null> {
    const supabase = createClient();

    // Fetch student basic info
    const { data: student, error: studentError } = await supabase
      .from('students')
      .select('*')
      .eq('id', studentId)
      .eq('creator_id', creatorId)
      .single();

    if (studentError || !student) {
      return null;
    }

    // Fetch engagement metrics
    const { data: engagement } = await supabase
      .from('student_engagement_tiers')
      .select('*')
      .eq('student_id', studentId)
      .single();

    // Fetch achievements
    const { data: achievements } = await supabase
      .from('student_achievements')
      .select(`
        id,
        unlocked_at,
        achievements (
          id,
          title,
          description,
          icon_url
        )
      `)
      .eq('student_id', studentId);

    // Fetch recent videos
    const { data: recentVideos } = await supabase
      .from('video_progress')
      .select(`
        video_id,
        last_watched,
        watch_percentage,
        videos (
          title
        )
      `)
      .eq('student_id', studentId)
      .order('last_watched', { ascending: false })
      .limit(10);

    // Fetch recent quizzes
    const { data: recentQuizzes } = await supabase
      .from('quiz_attempts')
      .select(`
        quiz_id,
        score,
        passed,
        created_at,
        quizzes (
          title
        )
      `)
      .eq('student_id', studentId)
      .order('created_at', { ascending: false })
      .limit(10);

    // Fetch projects
    const { data: projects } = await supabase
      .from('project_submissions')
      .select('*')
      .eq('student_id', studentId)
      .order('submitted_at', { ascending: false });

    // Fetch chat summary
    const { data: chatSessions, count: sessionCount } = await supabase
      .from('chat_sessions')
      .select('id, created_at', { count: 'exact' })
      .eq('student_id', studentId);

    const { count: messageCount } = await supabase
      .from('chat_messages')
      .select('*', { count: 'exact', head: true })
      .in('session_id', chatSessions?.map(s => s.id) || [])
      .eq('role', 'user');

    const chatSummary: ChatSummary = {
      total_sessions: sessionCount || 0,
      total_messages: messageCount || 0,
      last_chat_at: chatSessions?.[0]?.created_at || null,
      avg_satisfaction: 0, // TODO: Calculate from ratings
    };

    return {
      ...student,
      ...engagement,
      achievements: achievements?.map((a: any) => ({
        id: a.achievements.id,
        title: a.achievements.title,
        description: a.achievements.description,
        icon_url: a.achievements.icon_url,
        unlocked_at: a.unlocked_at,
      })) || [],
      recent_videos: recentVideos?.map((v: any) => ({
        video_id: v.video_id,
        title: v.videos.title,
        watched_at: v.last_watched,
        completion: v.watch_percentage,
      })) || [],
      recent_quizzes: recentQuizzes?.map((q: any) => ({
        quiz_id: q.quiz_id,
        title: q.quizzes.title,
        score: q.score,
        passed: q.passed,
        attempted_at: q.created_at,
      })) || [],
      projects: projects || [],
      chat_history_summary: chatSummary,
    };
  }

  /**
   * Export student data as CSV
   */
  static async exportStudentData(
    creatorId: string,
    filters: StudentFilters = {},
    format: 'csv' | 'json' = 'csv'
  ): Promise<string> {
    // Get all students (no pagination)
    const { students } = await this.getStudents(creatorId, {
      ...filters,
      limit: 10000, // Max export size
      offset: 0,
    });

    if (format === 'json') {
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
      'Last Active',
      'Joined Date',
    ];

    const rows = students.map((s) => [
      s.name || '',
      s.email || '',
      s.engagement_tier || '',
      s.videos_watched || 0,
      s.course_progress_percentage || 0,
      s.quiz_attempts || 0,
      s.quizzes_passed || 0,
      s.xp_points || 0,
      s.level || 0,
      s.streak_days || 0,
      s.last_active || '',
      s.created_at || '',
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(',')),
    ].join('\n');

    return csvContent;
  }

  /**
   * Send message to a student (placeholder)
   */
  static async sendMessageToStudent(
    studentId: string,
    creatorId: string,
    message: string
  ): Promise<void> {
    // TODO: Implement messaging system
    // This could send an email or create a notification
    console.log(`Sending message to student ${studentId}:`, message);
  }

  /**
   * Bulk invite students via email (placeholder)
   */
  static async bulkInviteStudents(
    creatorId: string,
    emails: string[]
  ): Promise<InviteResult> {
    // TODO: Implement bulk invitation system
    // This would integrate with Whop membership creation

    return {
      success: true,
      invited: emails.length,
      failed: 0,
      errors: [],
    };
  }

  /**
   * Bulk update student engagement tier (admin action)
   */
  static async bulkUpdateEngagementTier(
    creatorId: string,
    studentIds: string[],
    tier: string
  ): Promise<BulkActionResult> {
    // TODO: Implement if manual tier override is needed
    return {
      success: true,
      affected: studentIds.length,
      errors: [],
    };
  }

  /**
   * Get at-risk students (for dashboard alerts)
   */
  static async getAtRiskStudents(creatorId: string): Promise<StudentProfile[]> {
    const { students } = await this.getStudents(creatorId, {
      status: 'at-risk',
      limit: 20,
    });

    return students;
  }

  /**
   * Get highly engaged students (for recognition)
   */
  static async getTopPerformers(creatorId: string): Promise<StudentProfile[]> {
    const supabase = createClient();

    const { data } = await supabase
      .from('student_engagement_tiers')
      .select('*')
      .eq('creator_id', creatorId)
      .eq('engagement_tier', 'highly_engaged')
      .order('xp_points', { ascending: false })
      .limit(10);

    return (data || []).map(this.mapToStudentProfile);
  }

  // ============================================================================
  // PRIVATE HELPER METHODS
  // ============================================================================

  private static mapToStudentProfile(data: any): StudentProfile {
    return {
      id: data.student_id || data.id,
      whop_user_id: data.whop_user_id || '',
      whop_membership_id: data.whop_membership_id || '',
      email: data.email,
      name: data.name,
      xp_points: data.xp_points || 0,
      level: data.level || 1,
      streak_days: data.streak_days || 0,
      last_active: data.last_active,
      created_at: data.created_at,
      engagement_tier: data.engagement_tier || 'moderate',
      videos_watched: data.videos_watched || 0,
      quiz_attempts: data.quiz_attempts || 0,
      quizzes_passed: data.quizzes_passed || 0,
      avg_completion_rate: data.avg_completion_rate || 0,
      course_progress_percentage: data.course_progress_percentage || 0,
      total_watch_time_seconds: data.total_watch_time_seconds || 0,
    };
  }
}

// ============================================================================
// EXPORT CONVENIENCE FUNCTIONS
// ============================================================================

export const getStudents = StudentManagementService.getStudents.bind(StudentManagementService);
export const getStudentDetails = StudentManagementService.getStudentDetails.bind(StudentManagementService);
export const exportStudentData = StudentManagementService.exportStudentData.bind(StudentManagementService);
export const sendMessageToStudent = StudentManagementService.sendMessageToStudent.bind(StudentManagementService);
export const bulkInviteStudents = StudentManagementService.bulkInviteStudents.bind(StudentManagementService);
export const getAtRiskStudents = StudentManagementService.getAtRiskStudents.bind(StudentManagementService);
export const getTopPerformers = StudentManagementService.getTopPerformers.bind(StudentManagementService);
