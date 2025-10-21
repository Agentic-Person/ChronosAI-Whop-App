/**
 * Database Types
 * Generated from Supabase schema
 */

export interface Creator {
  id: string;
  whop_company_id: string;
  whop_user_id: string;
  company_name: string;
  subscription_tier: 'starter' | 'pro' | 'enterprise';
  settings: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface Student {
  id: string;
  whop_user_id: string;
  whop_membership_id: string;
  creator_id: string;
  email?: string;
  name?: string;
  learning_preferences: LearningPreferences;
  onboarding_completed: boolean;
  xp_points: number;
  level: number;
  streak_days: number;
  last_active: string;
  created_at: string;
  updated_at: string;
}

export interface LearningPreferences {
  pace?: 'slow' | 'medium' | 'fast';
  daily_time_minutes?: number;
  project_interests?: string[];
  technologies?: string[];
  learning_style?: 'visual' | 'hands-on' | 'reading' | 'mixed';
  goals?: string[];
}

export interface Video {
  id: string;
  creator_id: string;
  title: string;
  description?: string;
  video_url: string;
  thumbnail_url?: string;
  duration_seconds?: number;
  transcript?: string;
  transcript_processed: boolean;
  category?: string;
  tags?: string[];
  difficulty_level?: 'beginner' | 'intermediate' | 'advanced';
  order_index: number;
  created_at: string;
  updated_at: string;
}

export interface VideoChunk {
  id: string;
  video_id: string;
  chunk_text: string;
  chunk_index: number;
  start_timestamp?: number;
  end_timestamp?: number;
  embedding?: number[];
  topic_tags?: string[];
  created_at: string;
}

export interface ChatSession {
  id: string;
  student_id: string;
  creator_id: string;
  title: string;
  context_type?: 'general' | 'project-specific' | 'quiz-help';
  created_at: string;
  updated_at: string;
}

export interface ChatMessage {
  id: string;
  session_id: string;
  role: 'user' | 'assistant';
  content: string;
  video_references?: VideoReference[];
  feedback?: 'positive' | 'negative';
  created_at: string;
}

export interface VideoReference {
  video_id: string;
  title: string;
  timestamp: number;
  relevance_score: number;
}

export interface Quiz {
  id: string;
  creator_id: string;
  title: string;
  description?: string;
  video_ids?: string[];
  difficulty: 'easy' | 'medium' | 'hard';
  questions: QuizQuestion[];
  passing_score: number;
  time_limit_minutes?: number;
  created_at: string;
  updated_at: string;
}

export interface QuizQuestion {
  id: string;
  type: 'multiple-choice' | 'true-false' | 'short-answer' | 'code-challenge';
  question: string;
  options?: string[];
  correct_answer: string | string[];
  explanation?: string;
  points: number;
}

export interface QuizAttempt {
  id: string;
  quiz_id: string;
  student_id: string;
  answers: Record<string, any>;
  score: number;
  passed: boolean;
  time_taken_seconds?: number;
  completed_at: string;
}

export interface Project {
  id: string;
  creator_id: string;
  title: string;
  description?: string;
  type: string;
  requirements?: ProjectRequirements;
  technologies?: string[];
  difficulty_level?: 'beginner' | 'intermediate' | 'advanced';
  estimated_hours?: number;
  milestone_structure?: Milestone[];
  created_at: string;
  updated_at: string;
}

export interface ProjectRequirements {
  overview: string;
  features: string[];
  rubric: RubricItem[];
  bonus_features?: string[];
}

export interface RubricItem {
  category: string;
  points: number;
  criteria: string;
}

export interface Milestone {
  id: string;
  title: string;
  description: string;
  order: number;
  estimated_hours: number;
}

export interface ProjectSubmission {
  id: string;
  project_id: string;
  student_id: string;
  submission_url?: string;
  submission_files?: Record<string, any>;
  demo_video_url?: string;
  status: 'in-progress' | 'submitted' | 'reviewed' | 'passed';
  feedback?: string;
  ai_review?: AIReview;
  peer_reviews?: PeerReview[];
  score?: number;
  milestones_completed?: Record<string, boolean>;
  submitted_at?: string;
  reviewed_at?: string;
  created_at: string;
  updated_at: string;
}

export interface AIReview {
  summary: string;
  strengths: string[];
  improvements: string[];
  code_quality_score: number;
  best_practices_score: number;
  functionality_score: number;
}

export interface PeerReview {
  reviewer_id: string;
  reviewer_name: string;
  rating: number;
  comment: string;
  submitted_at: string;
}

export interface CalendarEvent {
  id: string;
  student_id: string;
  event_type: 'video' | 'quiz' | 'project' | 'milestone' | 'study-session';
  video_id?: string;
  quiz_id?: string;
  project_id?: string;
  title: string;
  description?: string;
  scheduled_date: string;
  scheduled_time?: string;
  duration_minutes?: number;
  status: 'pending' | 'completed' | 'skipped';
  reminder_sent: boolean;
  completed_at?: string;
  created_at: string;
  updated_at: string;
}

export interface VideoProgress {
  id: string;
  student_id: string;
  video_id: string;
  last_position_seconds: number;
  watch_time_seconds: number;
  completion_percentage: number;
  completed: boolean;
  created_at: string;
  updated_at: string;
}

export interface StudyGroup {
  id: string;
  creator_id: string;
  name: string;
  description?: string;
  project_focus?: string;
  max_members: number;
  discord_channel_id?: string;
  discord_role_id?: string;
  created_at: string;
  updated_at: string;
}

export interface StudyGroupMember {
  group_id: string;
  student_id: string;
  role: 'member' | 'leader' | 'mentor';
  joined_at: string;
}

export interface Achievement {
  id: string;
  name: string;
  description?: string;
  icon_url?: string;
  animation_type?: 'confetti' | 'stars' | 'fireworks' | 'rocket' | 'trophy' | 'level-up';
  xp_value: number;
  criteria: Record<string, any>;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  created_at: string;
}

export interface StudentAchievement {
  student_id: string;
  achievement_id: string;
  unlocked_at: string;
}

export interface DiscordLink {
  student_id: string;
  discord_user_id: string;
  discord_username: string;
  discord_discriminator?: string;
  linked_at: string;
}

export interface AnalyticsEvent {
  id: string;
  student_id?: string;
  event_type: string;
  event_data?: Record<string, any>;
  created_at: string;
}
