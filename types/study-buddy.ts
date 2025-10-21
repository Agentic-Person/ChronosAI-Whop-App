/**
 * Study Buddy & Peer Learning Types
 * Type definitions for the intelligent peer matching and collaboration system
 */

/**
 * Compatibility Score Components
 * Each factor contributes to the overall match score (0-100)
 */
export interface CompatibilityScore {
  overall: number; // 0-100, weighted average of all factors
  breakdown: {
    progressLevel: number; // How similar their learning progress is (0-100)
    interests: number; // Overlap in project interests (0-100)
    technologies: number; // Shared technology preferences (0-100)
    learningPace: number; // Compatibility of learning speeds (0-100)
    availability: number; // Time zone and schedule overlap (0-100)
    personalityFit: number; // Learning style compatibility (0-100)
  };
  weights: CompatibilityWeights;
}

/**
 * Configurable weights for compatibility factors
 * Sum should equal 1.0 for proper normalization
 */
export interface CompatibilityWeights {
  progressLevel: number; // Default: 0.25
  interests: number; // Default: 0.20
  technologies: number; // Default: 0.20
  learningPace: number; // Default: 0.15
  availability: number; // Default: 0.10
  personalityFit: number; // Default: 0.10
}

/**
 * Study Buddy Match Result
 * Represents a potential match between two students
 */
export interface StudyBuddyMatch {
  id: string;
  student1_id: string;
  student2_id: string;
  compatibility_score: CompatibilityScore;
  match_type: 'peer' | 'mentor' | 'mentee'; // Type of relationship
  match_status: 'suggested' | 'pending' | 'accepted' | 'declined' | 'expired';
  common_interests: string[];
  common_technologies: string[];
  suggested_projects: string[];
  match_reason: string; // Human-readable explanation
  created_at: string;
  expires_at?: string;
  accepted_at?: string;
}

/**
 * Study Group Information
 * Groups of 3-5 students working together
 */
export interface StudyGroupExtended extends StudyGroup {
  member_count: number;
  is_full: boolean;
  recruiting: boolean;
  average_progress_level: number;
  primary_technologies: string[];
  session_schedule?: GroupSessionSchedule[];
  performance_metrics?: GroupPerformanceMetrics;
}

/**
 * Group Session Schedule
 * Recurring or one-time study sessions
 */
export interface GroupSessionSchedule {
  id: string;
  day_of_week?: number; // 0-6 (Sunday-Saturday) for recurring
  time: string; // HH:MM format in UTC
  duration_minutes: number;
  recurring: boolean;
  timezone: string;
  next_session?: string; // ISO timestamp
}

/**
 * Group Performance Metrics
 * Track how well a study group is performing
 */
export interface GroupPerformanceMetrics {
  average_completion_rate: number; // Percentage
  sessions_held: number;
  sessions_planned: number;
  attendance_rate: number; // Percentage
  peer_reviews_completed: number;
  collaborative_projects: number;
  group_cohesion_score: number; // 0-100, based on activity and interaction
}

/**
 * Peer Review Submission
 * Student reviewing another student's work
 */
export interface PeerReviewSubmission {
  id: string;
  project_submission_id: string;
  reviewer_id: string;
  reviewee_id: string;
  review_type: 'code' | 'project' | 'concept' | 'presentation';
  rating: number; // 1-5
  feedback: PeerReviewFeedback;
  helpful_votes: number; // How many found this review helpful
  not_helpful_votes: number;
  status: 'draft' | 'submitted' | 'acknowledged';
  time_spent_minutes?: number;
  created_at: string;
  submitted_at?: string;
}

/**
 * Structured Peer Review Feedback
 */
export interface PeerReviewFeedback {
  strengths: string[]; // What the reviewee did well
  improvements: string[]; // Constructive suggestions
  code_quality?: number; // 1-5 rating
  functionality?: number; // 1-5 rating
  creativity?: number; // 1-5 rating
  documentation?: number; // 1-5 rating
  overall_comment: string;
  specific_comments?: CodeComment[]; // Line-specific comments
}

/**
 * Code-specific comment
 */
export interface CodeComment {
  file_path: string;
  line_number: number;
  comment: string;
  suggestion?: string; // Proposed code improvement
  severity: 'info' | 'suggestion' | 'issue';
}

/**
 * Reviewer Reputation Score
 * Track quality of reviews given by a student
 */
export interface ReviewerScore {
  student_id: string;
  total_reviews: number;
  helpful_count: number;
  not_helpful_count: number;
  average_rating: number; // How reviewees rated the feedback
  helpfulness_ratio: number; // helpful / (helpful + not_helpful)
  review_quality_score: number; // 0-100, composite metric
  expertise_areas: string[]; // Topics they review well
  last_review_at: string;
}

/**
 * Collaboration Resource
 * Shared resources within a study group
 */
export interface CollaborationResource {
  id: string;
  group_id: string;
  resource_type: 'note' | 'code' | 'link' | 'file' | 'video';
  title: string;
  content?: string;
  url?: string;
  file_url?: string;
  uploaded_by: string;
  tags: string[];
  pinned: boolean;
  view_count: number;
  upvotes: number;
  created_at: string;
  updated_at: string;
}

/**
 * Group Study Session
 * Actual meeting/session instance
 */
export interface GroupSession {
  id: string;
  group_id: string;
  title: string;
  description?: string;
  scheduled_start: string; // ISO timestamp
  scheduled_end: string; // ISO timestamp
  actual_start?: string;
  actual_end?: string;
  session_type: 'study' | 'project-work' | 'peer-review' | 'brainstorm' | 'presentation';
  video_call_link?: string;
  discord_voice_channel_id?: string;
  attendance: SessionAttendance[];
  agenda?: string[];
  notes?: string;
  recording_url?: string;
  status: 'scheduled' | 'in-progress' | 'completed' | 'cancelled';
  created_at: string;
}

/**
 * Session Attendance Tracking
 */
export interface SessionAttendance {
  student_id: string;
  status: 'confirmed' | 'tentative' | 'declined' | 'attended' | 'no-show';
  joined_at?: string;
  left_at?: string;
  duration_minutes?: number;
}

/**
 * AI Moderation Alert
 * Flags raised by the AI moderator
 */
export interface ModerationAlert {
  id: string;
  group_id?: string;
  student_id?: string;
  alert_type: 'unhelpful-response' | 'disagreement' | 'inactivity' | 'off-topic' | 'spam' | 'positive-contribution';
  severity: 'info' | 'low' | 'medium' | 'high';
  description: string;
  ai_suggestion?: string; // What the AI recommends
  context?: {
    message_id?: string;
    message_content?: string;
    related_students?: string[];
  };
  resolved: boolean;
  resolved_at?: string;
  created_at: string;
}

/**
 * Student Matching Preferences
 * How a student wants to be matched
 */
export interface MatchingPreferences {
  student_id: string;
  seeking_buddy: boolean;
  seeking_group: boolean;
  seeking_mentor: boolean;
  willing_to_mentor: boolean;
  preferred_group_size?: number; // 2-5
  preferred_technologies: string[];
  preferred_project_types: string[];
  availability_windows: AvailabilityWindow[];
  min_compatibility_score?: number; // Minimum score to accept (0-100)
  auto_accept_matches: boolean;
  updated_at: string;
}

/**
 * Time Availability Window
 */
export interface AvailabilityWindow {
  day_of_week: number; // 0-6
  start_time: string; // HH:MM in student's timezone
  end_time: string; // HH:MM
  timezone: string; // IANA timezone name
}

/**
 * Matching Algorithm Configuration
 * Admin-configurable settings for the matching system
 */
export interface MatchingConfig {
  enabled: boolean;
  default_weights: CompatibilityWeights;
  min_match_score: number; // Minimum score to suggest (0-100)
  max_suggestions_per_student: number;
  match_expiry_days: number;
  auto_form_groups: boolean; // Automatically create groups
  optimal_group_size: number; // Target group size
  allow_cross_level_matching: boolean; // Match different skill levels
  mentor_level_gap: number; // XP difference for mentor matching
}

/**
 * Group Formation Request
 * Request to create or join a group
 */
export interface GroupFormationRequest {
  student_id: string;
  request_type: 'create' | 'join' | 'invite';
  group_id?: string; // For join/invite requests
  proposed_name?: string; // For create requests
  proposed_description?: string;
  project_focus?: string;
  preferred_size?: number;
  invited_students?: string[]; // Student IDs to invite
  status: 'pending' | 'approved' | 'rejected' | 'expired';
  created_at: string;
}

/**
 * Similarity Calculation Result
 * Used internally by matching algorithm
 */
export interface SimilarityResult {
  metric_name: string;
  score: number; // 0-1
  algorithm_used: 'cosine' | 'jaccard' | 'euclidean' | 'custom';
  details?: Record<string, any>;
}

/**
 * Student Profile for Matching
 * Enriched student data used by matching algorithm
 */
export interface StudentMatchProfile {
  student_id: string;
  current_level: number;
  xp_points: number;
  videos_completed: number;
  projects_completed: number;
  learning_pace: 'slow' | 'medium' | 'fast';
  learning_style?: 'visual' | 'hands-on' | 'reading' | 'mixed';
  technologies: string[];
  interests: string[];
  goals: string[];
  timezone: string;
  availability_score: number; // 0-1, based on availability windows
  activity_level: 'low' | 'medium' | 'high'; // Based on recent activity
  preferred_group_size?: number;
  personality_indicators?: {
    collaborative_score: number; // 0-1
    help_seeking_frequency: number; // 0-1
    help_giving_frequency: number; // 0-1
  };
}

/**
 * Batch Matching Result
 * Results from a batch matching operation
 */
export interface BatchMatchingResult {
  total_students_processed: number;
  matches_created: number;
  groups_formed: number;
  students_matched: number;
  students_unmatched: number;
  execution_time_ms: number;
  match_quality_average: number; // Average compatibility score
  errors?: string[];
}
