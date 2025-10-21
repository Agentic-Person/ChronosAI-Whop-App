/**
 * Type definitions for AI Study Buddy System
 * Includes matching, study groups, and collaboration features
 */

// ============================================================================
// Matching System Types
// ============================================================================

export interface MatchingPreferences {
  student_id: string;
  weekly_availability_hours: number;
  timezone: string;
  preferred_study_times: TimeSlot[];
  primary_goal: string;
  interested_topics: string[];
  project_interests: string[];
  learning_style: 'visual' | 'hands-on' | 'theoretical' | 'social';
  communication_preference: 'text' | 'voice' | 'video' | 'any';
  competitiveness: number; // 1-5
  open_to_matching: boolean;
  preferred_group_size: number;
  language_preferences: string[];
}

export interface TimeSlot {
  day: string; // 'Monday', 'Tuesday', etc.
  startTime: string; // '18:00'
  endTime: string; // '21:00'
}

export interface MatchScore {
  totalScore: number; // 0-100
  breakdown: {
    levelCompatibility: number; // 25 points
    goalAlignment: number; // 20 points
    scheduleOverlap: number; // 20 points
    learningPaceMatch: number; // 15 points
    interestsOverlap: number; // 10 points
    communicationStyleFit: number; // 10 points
  };
  confidenceLevel: 'high' | 'medium' | 'low';
  reasoning: string;
}

export interface StudentProfile {
  id: string;
  name: string;
  avatar_url?: string;
  level: number;
  current_module: number;
  videos_per_week: number;
  age_group: string;
  user_id: string;
  created_at: string;
}

export interface MatchCandidate {
  student: StudentProfile;
  preferences: MatchingPreferences;
  matchScore: MatchScore;
}

export interface StudyBuddyMatch {
  id: string;
  student_a_id: string;
  student_b_id: string;
  compatibility_score: number;
  match_reasoning: string;
  status: 'suggested' | 'connected' | 'declined';
  created_at: string;
  connected_at?: string;
}

// ============================================================================
// Study Group Types
// ============================================================================

export type StudyGroupType =
  | 'learning-circle'
  | 'project-team'
  | 'accountability-pod'
  | 'workshop';

export type GroupRecruitingStatus = 'open' | 'invite-only' | 'closed';

export type MemberRole = 'creator' | 'admin' | 'member';

export type MemberStatus = 'active' | 'left' | 'removed';

export interface StudyGroup {
  id: string;
  name: string;
  description: string;
  type: StudyGroupType;

  // Focus
  focus_module?: number;
  focus_project?: string;
  focus_topic?: string;

  // Configuration
  max_members: number;
  recruiting_status: GroupRecruitingStatus;
  min_level?: number;
  max_level?: number;
  required_topics: string[];

  // Schedule
  timezone?: string;
  meeting_schedule?: string;
  requirements?: string;
  is_public: boolean;
  start_date?: string;
  end_date?: string;

  // Activity requirements
  min_weekly_check_ins: number;
  min_weekly_messages: number;

  // Status
  created_by: string;
  activity_score: number; // 0-100
  total_messages: number;
  last_activity_at: string;

  // Metadata
  created_at: string;
  updated_at: string;
}

export interface GroupMember {
  id: string;
  group_id: string;
  student_id: string;
  role: MemberRole;

  // Activity
  joined_at: string;
  last_active_at: string;
  total_messages: number;
  total_check_ins: number;
  contribution_score: number; // 0-100

  // Status
  status: MemberStatus;
  left_at?: string;
}

export interface CreateGroupData {
  name: string;
  description: string;
  type: StudyGroupType;
  focus_module?: number;
  focus_project?: string;
  focus_topic?: string;
  max_members: number;
  recruiting_status: GroupRecruitingStatus;
  min_level?: number;
  max_level?: number;
  required_topics?: string[];
  timezone?: string;
  meeting_schedule?: string;
  requirements?: string;
  is_public?: boolean;
  start_date?: string;
  end_date?: string;
  min_weekly_check_ins?: number;
  min_weekly_messages?: number;
}

export interface GroupDiscoveryFilters {
  type?: StudyGroupType;
  focusModule?: number;
  minLevel?: number;
  maxLevel?: number;
  search?: string;
}

// ============================================================================
// Messaging Types
// ============================================================================

export type MessageType = 'text' | 'code' | 'file' | 'system';

export interface GroupMessage {
  id: string;
  group_id: string;
  sender_id: string;
  content: string;
  message_type: MessageType;
  metadata?: {
    language?: string; // For code messages
    filename?: string; // For file messages
    fileSize?: number;
    fileUrl?: string;
  };
  is_pinned: boolean;
  reactions: MessageReaction[];
  reply_to?: string;
  flagged: boolean;
  flagged_reason?: string;
  created_at: string;
  edited_at?: string;
  sender?: {
    id: string;
    name: string;
    avatar_url?: string;
  };
}

export interface MessageReaction {
  emoji: string;
  users: string[];
}

// ============================================================================
// Shared Notes Types
// ============================================================================

export interface SharedNote {
  id: string;
  group_id: string;
  title: string;
  content: string;
  last_edited_by?: string;
  created_at: string;
  updated_at: string;
}

export interface NoteRevision {
  id: string;
  note_id: string;
  content: string;
  editor_id: string;
  created_at: string;
}

// ============================================================================
// Study Session Types
// ============================================================================

export interface StudySession {
  id: string;
  group_id: string;
  title: string;
  scheduled_start: string;
  scheduled_end: string;
  actual_start?: string;
  actual_end?: string;
  summary?: string;
  attendees: string[];
  created_at: string;
}

export interface SessionDetails {
  title: string;
  scheduled_start: string;
  scheduled_end: string;
  description?: string;
}

// ============================================================================
// Check-In Types
// ============================================================================

export type Mood = 'struggling' | 'ok' | 'confident' | 'crushing-it';

export interface CheckIn {
  id: string;
  student_id: string;
  group_id?: string;
  buddy_id?: string;

  // Progress
  videos_watched: number;
  quizzes_taken: number;
  project_hours: number;
  xp_earned: number;

  // Mood and feedback
  mood: Mood;
  blockers?: string;
  wins?: string;

  // Commitments
  next_week_commitment?: string;
  previous_commitment_met?: boolean;

  check_in_date: string;
  created_at: string;
}

export interface CheckInData {
  videosWatched: number;
  quizzesTaken: number;
  projectHours: number;
  xpEarned: number;
  mood: Mood;
  blockers?: string;
  wins?: string;
  nextWeekCommitment?: string;
}

// ============================================================================
// Shared Project Types
// ============================================================================

export type ProjectStatus = 'planning' | 'in-progress' | 'review' | 'completed';

export type TaskStatus = 'todo' | 'in-progress' | 'blocked' | 'done';

export type TaskPriority = 'low' | 'medium' | 'high';

export interface SharedProject {
  id: string;
  group_id: string;
  name: string;
  description: string;

  // GitHub integration
  github_repo?: string;
  branches: ProjectBranch[];

  // Task management
  tasks: ProjectTask[];

  // Status
  status: ProjectStatus;
  progress: number; // 0-100

  // Resources
  references: Resource[];
  code_snippets: CodeSnippet[];

  // Metadata
  created_by: string;
  created_at: string;
  updated_at: string;
  completed_at?: string;
}

export interface ProjectBranch {
  member: string;
  branch: string;
}

export interface ProjectTask {
  id: string;
  title: string;
  description: string;
  assignedTo?: string;
  status: TaskStatus;
  dueDate?: string;
  priority: TaskPriority;
}

export interface Resource {
  title: string;
  url: string;
  type: 'video' | 'article' | 'documentation' | 'tool';
}

export interface CodeSnippet {
  id: string;
  title: string;
  code: string;
  language: string;
  addedBy: string;
  addedAt: string;
}

export interface CreateProjectData {
  name: string;
  description: string;
  github_repo?: string;
}

// ============================================================================
// Safety & Moderation Types
// ============================================================================

export type ReportContext = 'message' | 'profile' | 'behavior';

export type ReportCategory =
  | 'harassment'
  | 'inappropriate-content'
  | 'spam'
  | 'other';

export type ReportStatus =
  | 'pending'
  | 'under-review'
  | 'resolved'
  | 'dismissed';

export type ModerationAction =
  | 'warning'
  | 'timeout'
  | 'ban'
  | 'none';

export interface SafetyReport {
  id: string;
  reported_by: string;
  reported_user: string;
  context: ReportContext;
  category: ReportCategory;
  description: string;
  evidence: string[];
  status: ReportStatus;
  reviewed_by?: string;
  resolution?: string;
  action_taken?: ModerationAction;
  created_at: string;
  reviewed_at?: string;
}

export interface ReportData {
  reportedUserId: string;
  context: ReportContext;
  category: ReportCategory;
  description: string;
  evidence?: string[];
}

// ============================================================================
// Service Response Types
// ============================================================================

export interface ServiceResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface MatchingResponse {
  success: boolean;
  matches: MatchCandidate[];
}

export interface ConnectionResponse {
  success: boolean;
  connection: StudyBuddyMatch;
}

export interface GroupResponse {
  success: boolean;
  group: StudyGroup;
}

export interface MessageResponse {
  success: boolean;
  message: GroupMessage;
}

// ============================================================================
// Gamification XP Events
// ============================================================================

export const SOCIAL_XP_EVENTS = {
  FIRST_STUDY_BUDDY: 'FIRST_STUDY_BUDDY', // 150 XP
  JOINED_STUDY_GROUP: 'JOINED_STUDY_GROUP', // 200 XP
  CREATED_STUDY_GROUP: 'CREATED_STUDY_GROUP', // 300 XP
  WEEKLY_CHECK_IN: 'WEEKLY_CHECK_IN', // 50 XP
  HELPED_PEER: 'HELPED_PEER', // 100 XP
  STUDY_SESSION_COMPLETED: 'STUDY_SESSION_COMPLETED', // 75 XP
  GROUP_PROJECT_MILESTONE: 'GROUP_PROJECT_MILESTONE', // 250 XP
  GROUP_PROJECT_COMPLETED: 'GROUP_PROJECT_COMPLETED', // 500 XP
  SEVEN_DAY_BUDDY_STREAK: 'SEVEN_DAY_BUDDY_STREAK', // 200 XP
  THIRTY_DAY_BUDDY_STREAK: 'THIRTY_DAY_BUDDY_STREAK', // 1000 XP
  COMMITMENT_COMPLETED: 'COMMITMENT_COMPLETED', // 150 XP
  PEER_REVIEW_PROJECT: 'PEER_REVIEW_PROJECT', // 100 XP
  TAUGHT_CONCEPT: 'TAUGHT_CONCEPT', // 200 XP
  MENTORED_NEWBIE: 'MENTORED_NEWBIE', // 300 XP
} as const;

export type SocialXPEvent = typeof SOCIAL_XP_EVENTS[keyof typeof SOCIAL_XP_EVENTS];
