/**
 * Calendar Type Definitions
 * Types for learning calendar events and scheduling
 */

/**
 * Calendar event from database
 */
export interface CalendarEvent {
  id: string;
  student_id: string;
  video_id: string;
  scheduled_date: string; // ISO timestamp
  session_duration: number; // minutes
  completed: boolean;
  completed_at?: string; // ISO timestamp
  rescheduled_from?: string; // ISO timestamp
  learning_objectives?: string[];
  prerequisites?: string[]; // video IDs
  estimated_difficulty?: number; // 1-5
  created_at: string;
  updated_at: string;

  // Relations (populated via joins)
  video?: {
    id: string;
    title: string;
    duration: number;
    difficulty_level?: string;
    thumbnail_url?: string;
  };
}

/**
 * Schedule preferences stored per student
 */
export interface SchedulePreferences {
  student_id: string;
  target_completion_date?: Date;
  available_hours_per_week: number;
  preferred_days: string[]; // ['monday', 'wednesday', 'friday']
  preferred_time_slots: string[]; // ['morning', 'evening']
  session_length: string; // 'short', 'medium', 'long'
  created_at: Date;
  updated_at: Date;
}

/**
 * Study session tracking
 */
export interface StudySession {
  id: string;
  student_id: string;
  event_id?: string;
  started_at: Date;
  ended_at?: Date;
  duration_minutes?: number;
  completed: boolean;
  created_at: Date;
}

/**
 * Calendar event creation input
 */
export interface CreateCalendarEventInput {
  student_id: string;
  video_id: string;
  scheduled_date: Date;
  session_duration: number;
  learning_objectives?: string[];
  prerequisites?: string[];
  estimated_difficulty?: number;
}

/**
 * Calendar event update input
 */
export interface UpdateCalendarEventInput {
  scheduled_date?: Date;
  session_duration?: number;
  completed?: boolean;
  completed_at?: Date;
  rescheduled_from?: Date;
}

/**
 * Calendar event filters
 */
export interface CalendarEventFilters {
  studentId: string;
  startDate?: Date;
  endDate?: Date;
  completed?: boolean;
  videoId?: string;
}

/**
 * Calendar generation result
 */
export interface CalendarGenerationResult {
  success: boolean;
  events: CalendarEvent[];
  totalEvents: number;
  startDate: Date;
  endDate: Date;
  totalDuration: number; // minutes
  message?: string;
  error?: string;
}

/**
 * Rescheduling options
 */
export interface RescheduleOptions {
  eventId: string;
  newDate: Date;
  cascadeChanges?: boolean; // reschedule dependent events
  reason?: string;
}

/**
 * Weekly schedule summary
 */
export interface WeeklyScheduleSummary {
  weekNumber: number;
  startDate: Date;
  endDate: Date;
  totalEvents: number;
  completedEvents: number;
  totalMinutes: number;
  completedMinutes: number;
  onTrack: boolean;
}
