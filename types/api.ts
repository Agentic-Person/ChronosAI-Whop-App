/**
 * API Types
 * Request and response types for API endpoints
 */

import { VideoReference } from './database';

// Chat API
export interface ChatRequest {
  message: string;
  session_id?: string;
  context_type?: 'general' | 'project-specific' | 'quiz-help';
  creator_id?: string; // Optional - if not provided, uses student's active enrollment
}

export interface ChatResponse {
  message_id: string;
  content: string;
  video_references: VideoReference[];
  session_id: string;
}

// Video API
export interface VideoUploadRequest {
  title: string;
  description?: string;
  category?: string;
  tags?: string[];
  video_file: File;
}

export interface VideoProcessingStatus {
  video_id: string;
  status: 'uploading' | 'transcribing' | 'processing' | 'completed' | 'failed';
  progress_percentage: number;
  error?: string;
}

// Quiz API
export interface QuizGenerationRequest {
  video_ids: string[];
  difficulty: 'easy' | 'medium' | 'hard';
  question_count: number;
  question_types?: Array<'multiple-choice' | 'true-false' | 'short-answer' | 'code-challenge'>;
}

export interface QuizAttemptRequest {
  quiz_id: string;
  answers: Record<string, any>;
}

export interface QuizAttemptResponse {
  attempt_id: string;
  score: number;
  passed: boolean;
  feedback: QuizFeedback[];
  xp_earned: number;
  achievements_unlocked?: string[];
}

export interface QuizFeedback {
  question_id: string;
  correct: boolean;
  explanation: string;
  video_reference?: VideoReference;
}

// Project API
export interface ProjectSubmissionRequest {
  project_id: string;
  submission_url?: string;
  submission_files?: Record<string, any>;
  demo_video_url?: string;
}

// Calendar API
export interface ScheduleGenerationRequest {
  target_completion_date: string;
  daily_time_minutes: number;
  learning_pace: 'slow' | 'medium' | 'fast';
  project_interests?: string[];
}

export interface ScheduleResponse {
  events: CalendarEventSummary[];
  total_hours: number;
  estimated_completion: string;
}

export interface CalendarEventSummary {
  id: string;
  date: string;
  type: string;
  title: string;
  duration_minutes: number;
}

// Progress API
export interface ProgressStats {
  total_xp: number;
  current_level: number;
  next_level_xp: number;
  xp_to_next_level: number;
  videos_completed: number;
  total_videos: number;
  quizzes_passed: number;
  projects_completed: number;
  streak_days: number;
  achievements_unlocked: number;
  completion_percentage: number;
}

// Dashboard API
export interface DashboardOverview {
  total_students: number;
  active_students: number;
  total_videos: number;
  avg_completion_rate: number;
  most_asked_questions: QuestionInsight[];
  drop_off_points: DropOffPoint[];
}

export interface QuestionInsight {
  question: string;
  count: number;
  topics: string[];
}

export interface DropOffPoint {
  video_id: string;
  video_title: string;
  avg_completion_percentage: number;
  student_count: number;
}

// Whop API
export interface WhopMembership {
  id: string;
  user_id: string;
  company_id: string;
  status: 'active' | 'expired' | 'cancelled';
  tier: string;
}

export interface WhopWebhookPayload {
  event: 'membership.created' | 'membership.expired' | 'payment.succeeded';
  data: Record<string, any>;
  timestamp: string;
}

// Study Buddy API
export interface MatchRequest {
  project_type?: string;
  preferred_technologies?: string[];
  learning_pace?: string;
}

export interface MatchSuggestion {
  student_id: string;
  name: string;
  compatibility_score: number;
  common_interests: string[];
  current_projects: string[];
}

// Discord API
export interface DiscordNotification {
  user_id: string;
  type: 'achievement' | 'reminder' | 'group-invite';
  title: string;
  message: string;
  embed_data?: Record<string, any>;
}

// Common API Response
export interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
  meta?: Record<string, any>; // Optional metadata (e.g., chronos_balance, creator_id, etc.)
}
