/**
 * Onboarding Type Definitions
 * Types for the learning calendar onboarding flow
 */

export type LearningGoal = 'career-change' | 'skill-upgrade' | 'side-project' | 'curiosity';
export type SkillLevel = 'beginner' | 'intermediate' | 'advanced';
export type SessionLength = 'short' | 'medium' | 'long';
export type TimeSlot = 'morning' | 'afternoon' | 'evening' | 'late-night';
export type DayOfWeek = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';
export type LearningStyle = 'visual' | 'hands-on' | 'mixed';
export type PacePreference = 'steady' | 'intensive' | 'flexible';
export type BreakFrequency = 'frequent' | 'moderate' | 'minimal';

/**
 * Complete onboarding data collected from student
 */
export interface OnboardingData {
  // Goals
  primaryGoal: LearningGoal;
  targetCompletionWeeks: number; // 4, 8, 12, 16, 24
  skillLevel: SkillLevel;

  // Availability
  availableHoursPerWeek: number; // 2, 5, 10, 15+
  preferredDays: DayOfWeek[];
  preferredTimeSlots: TimeSlot[];
  sessionLength: SessionLength;

  // Preferences
  learningStyle: LearningStyle;
  pacePreference: PacePreference;
  breakFrequency: BreakFrequency;

  // Optional
  timezone?: string;
  previousExperience?: string;
}

/**
 * Onboarding question configuration
 */
export interface OnboardingQuestion {
  id: string;
  question: string;
  description?: string;
  type: 'single-select' | 'multi-select' | 'slider' | 'number-input';
  options?: Array<{
    value: string;
    label: string;
    description?: string;
    icon?: string;
  }>;
  min?: number;
  max?: number;
  step?: number;
  defaultValue?: any;
  required: boolean;
}

/**
 * Timeline validation result
 */
export interface TimelineValidation {
  realistic: boolean;
  totalHoursNeeded: number;
  totalHoursAvailable: number;
  suggestion?: string;
  suggestedWeeks?: number;
}

/**
 * AI-generated schedule item
 */
export interface AIScheduleItem {
  videoIndex: number;
  weekNumber: number;
  dayOfWeek: DayOfWeek;
  timeSlot: TimeSlot;
  estimatedDuration: number;
  learningObjectives: string[];
  difficulty: number; // 1-5 scale
}

/**
 * Adaptation suggestion for when student falls behind/ahead
 */
export interface AdaptationSuggestion {
  type: 'behind-schedule' | 'ahead-of-schedule' | 'on-track' | 'returning-after-break';
  severity: 'low' | 'medium' | 'high';
  suggestions: Array<{
    action: 'extend-timeline' | 'reduce-hours' | 'skip-optional' | 'add-advanced-content' | 'finish-early';
    weeks?: number;
    newHours?: number;
    videosToSkip?: string[];
    videos?: string[];
    newDate?: Date;
  }>;
  message?: string;
}

/**
 * Study session analytics
 */
export interface StudyStats {
  totalSessionsCompleted: number;
  totalMinutesStudied: number;
  averageSessionLength: number;
  completionRate: number; // percentage
  streakDays: number;
  longestStreak: number;
  sessionsThisWeek: number;
  onTrackStatus: 'ahead' | 'on-track' | 'behind';
  projectedCompletionDate: Date;
}
