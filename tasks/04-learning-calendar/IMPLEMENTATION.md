# Module 4: Learning Calendar - Implementation Guide

## Prerequisites

Before implementing the calendar:
- [ ] Module 8 (Backend Infrastructure) completed
- [ ] Module 7 (Whop Integration) for student authentication
- [ ] Video metadata available in database
- [ ] Claude API key configured
- [ ] Student onboarding flow designed

## Phase 1: Onboarding Quiz Setup

### Step 1.1: Create Onboarding Types

```typescript
// types/onboarding.ts

export type LearningGoal = 'career-change' | 'skill-upgrade' | 'side-project' | 'curiosity';
export type SkillLevel = 'beginner' | 'intermediate' | 'advanced';
export type SessionLength = 'short' | 'medium' | 'long';
export type TimeSlot = 'morning' | 'afternoon' | 'evening' | 'late-night';
export type DayOfWeek = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';
export type LearningStyle = 'visual' | 'hands-on' | 'mixed';
export type PacePreference = 'steady' | 'intensive' | 'flexible';

export interface OnboardingData {
  // Goals
  primaryGoal: LearningGoal;
  targetCompletionWeeks: number; // 4, 8, 12, 16
  skillLevel: SkillLevel;

  // Availability
  availableHoursPerWeek: number; // 2, 5, 10, 15+
  preferredDays: DayOfWeek[];
  preferredTimeSlots: TimeSlot[];
  sessionLength: SessionLength;

  // Preferences
  learningStyle: LearningStyle;
  pacePreference: PacePreference;
  breakFrequency: 'frequent' | 'moderate' | 'minimal';

  // Optional
  timezone?: string;
  previousExperience?: string;
}

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
```

### Step 1.2: Define Onboarding Questions

```typescript
// lib/calendar/onboarding-questions.ts

export const ONBOARDING_QUESTIONS: OnboardingQuestion[] = [
  {
    id: 'primaryGoal',
    question: "What's your main goal with this course?",
    description: 'This helps us tailor your learning path',
    type: 'single-select',
    options: [
      {
        value: 'career-change',
        label: 'Land a new job',
        description: 'I want to change careers or get hired',
        icon: '💼',
      },
      {
        value: 'skill-upgrade',
        label: 'Level up current skills',
        description: 'Improve my performance at work',
        icon: '📈',
      },
      {
        value: 'side-project',
        label: 'Build a side project',
        description: 'Create something on my own',
        icon: '🚀',
      },
      {
        value: 'curiosity',
        label: 'Learn for fun',
        description: 'Personal interest and growth',
        icon: '🎯',
      },
    ],
    required: true,
  },

  {
    id: 'skillLevel',
    question: 'What\'s your current skill level?',
    type: 'single-select',
    options: [
      {
        value: 'beginner',
        label: 'Beginner',
        description: 'New to this topic',
        icon: '🌱',
      },
      {
        value: 'intermediate',
        label: 'Intermediate',
        description: 'Some experience already',
        icon: '🌿',
      },
      {
        value: 'advanced',
        label: 'Advanced',
        description: 'Looking to master advanced concepts',
        icon: '🌳',
      },
    ],
    required: true,
  },

  {
    id: 'availableHoursPerWeek',
    question: 'How much time can you dedicate weekly?',
    description: 'Be realistic - consistency beats intensity',
    type: 'single-select',
    options: [
      {
        value: '2',
        label: '2-3 hours',
        description: 'Casual learner (1-2 sessions/week)',
        icon: '🐢',
      },
      {
        value: '5',
        label: '5-7 hours',
        description: 'Committed student (3-4 sessions/week)',
        icon: '🏃',
      },
      {
        value: '10',
        label: '10-15 hours',
        description: 'Intensive mode (5-6 sessions/week)',
        icon: '⚡',
      },
      {
        value: '15',
        label: '15+ hours',
        description: 'Full-time learning',
        icon: '🔥',
      },
    ],
    required: true,
  },

  {
    id: 'targetCompletionWeeks',
    question: 'When do you want to finish?',
    type: 'slider',
    min: 4,
    max: 24,
    step: 2,
    defaultValue: 12,
    required: true,
  },

  {
    id: 'preferredDays',
    question: 'Which days work best for you?',
    description: 'Select all that apply',
    type: 'multi-select',
    options: [
      { value: 'monday', label: 'Monday', icon: '📅' },
      { value: 'tuesday', label: 'Tuesday', icon: '📅' },
      { value: 'wednesday', label: 'Wednesday', icon: '📅' },
      { value: 'thursday', label: 'Thursday', icon: '📅' },
      { value: 'friday', label: 'Friday', icon: '📅' },
      { value: 'saturday', label: 'Saturday', icon: '📅' },
      { value: 'sunday', label: 'Sunday', icon: '📅' },
    ],
    required: true,
  },

  {
    id: 'preferredTimeSlots',
    question: 'When do you learn best?',
    description: 'Select all that apply',
    type: 'multi-select',
    options: [
      {
        value: 'morning',
        label: 'Morning',
        description: '6 AM - 12 PM',
        icon: '🌅',
      },
      {
        value: 'afternoon',
        label: 'Afternoon',
        description: '12 PM - 6 PM',
        icon: '☀️',
      },
      {
        value: 'evening',
        label: 'Evening',
        description: '6 PM - 11 PM',
        icon: '🌆',
      },
      {
        value: 'late-night',
        label: 'Late Night',
        description: '11 PM - 2 AM',
        icon: '🌙',
      },
    ],
    required: true,
  },

  {
    id: 'sessionLength',
    question: 'Preferred session length?',
    type: 'single-select',
    options: [
      {
        value: 'short',
        label: 'Short bursts',
        description: '20-30 minutes',
        icon: '⚡',
      },
      {
        value: 'medium',
        label: 'Medium sessions',
        description: '45-60 minutes',
        icon: '⏱️',
      },
      {
        value: 'long',
        label: 'Long deep dives',
        description: '90+ minutes',
        icon: '🏋️',
      },
    ],
    required: true,
  },
];
```

### Step 1.3: Create Onboarding UI Component

```typescript
// components/onboarding/OnboardingWizard.tsx

'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ONBOARDING_QUESTIONS } from '@/lib/calendar/onboarding-questions';
import type { OnboardingData } from '@/types/onboarding';

export function OnboardingWizard({
  onComplete,
}: {
  onComplete: (data: OnboardingData) => void;
}) {
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState<Partial<OnboardingData>>({});

  const totalSteps = ONBOARDING_QUESTIONS.length;
  const progress = ((currentStep + 1) / totalSteps) * 100;

  const currentQuestion = ONBOARDING_QUESTIONS[currentStep];

  const handleAnswer = (value: any) => {
    setAnswers({
      ...answers,
      [currentQuestion.id]: value,
    });
  };

  const handleNext = () => {
    if (currentStep < totalSteps - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      // Submit complete data
      onComplete(answers as OnboardingData);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const canProceed = !currentQuestion.required || answers[currentQuestion.id] !== undefined;

  return (
    <div className="max-w-2xl mx-auto p-6">
      {/* Progress bar */}
      <div className="mb-8">
        <div className="flex justify-between mb-2">
          <span className="text-sm text-gray-600">
            Step {currentStep + 1} of {totalSteps}
          </span>
          <span className="text-sm text-gray-600">{Math.round(progress)}%</span>
        </div>
        <Progress value={progress} className="h-2" />
      </div>

      {/* Question */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentStep}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.3 }}
        >
          <h2 className="text-2xl font-bold mb-2">{currentQuestion.question}</h2>
          {currentQuestion.description && (
            <p className="text-gray-600 mb-6">{currentQuestion.description}</p>
          )}

          {/* Render question type */}
          {currentQuestion.type === 'single-select' && (
            <SingleSelectQuestion
              options={currentQuestion.options!}
              value={answers[currentQuestion.id]}
              onChange={handleAnswer}
            />
          )}

          {currentQuestion.type === 'multi-select' && (
            <MultiSelectQuestion
              options={currentQuestion.options!}
              value={answers[currentQuestion.id] || []}
              onChange={handleAnswer}
            />
          )}

          {currentQuestion.type === 'slider' && (
            <SliderQuestion
              min={currentQuestion.min!}
              max={currentQuestion.max!}
              step={currentQuestion.step!}
              value={answers[currentQuestion.id] || currentQuestion.defaultValue}
              onChange={handleAnswer}
            />
          )}
        </motion.div>
      </AnimatePresence>

      {/* Navigation */}
      <div className="flex justify-between mt-8">
        <Button
          variant="outline"
          onClick={handleBack}
          disabled={currentStep === 0}
        >
          Back
        </Button>

        <Button
          onClick={handleNext}
          disabled={!canProceed}
        >
          {currentStep === totalSteps - 1 ? 'Generate Calendar' : 'Next'}
        </Button>
      </div>
    </div>
  );
}

// Question type components...
function SingleSelectQuestion({ options, value, onChange }) {
  return (
    <div className="space-y-3">
      {options.map((option) => (
        <button
          key={option.value}
          onClick={() => onChange(option.value)}
          className={`
            w-full p-4 rounded-lg border-2 text-left transition-all
            ${
              value === option.value
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 hover:border-gray-300'
            }
          `}
        >
          <div className="flex items-center gap-3">
            {option.icon && <span className="text-2xl">{option.icon}</span>}
            <div className="flex-1">
              <div className="font-semibold">{option.label}</div>
              {option.description && (
                <div className="text-sm text-gray-600">{option.description}</div>
              )}
            </div>
          </div>
        </button>
      ))}
    </div>
  );
}

function MultiSelectQuestion({ options, value, onChange }) {
  const handleToggle = (optionValue: string) => {
    const newValue = value.includes(optionValue)
      ? value.filter((v) => v !== optionValue)
      : [...value, optionValue];
    onChange(newValue);
  };

  return (
    <div className="space-y-3">
      {options.map((option) => (
        <button
          key={option.value}
          onClick={() => handleToggle(option.value)}
          className={`
            w-full p-4 rounded-lg border-2 text-left transition-all
            ${
              value.includes(option.value)
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 hover:border-gray-300'
            }
          `}
        >
          <div className="flex items-center gap-3">
            <div
              className={`
                w-5 h-5 rounded border-2 flex items-center justify-center
                ${value.includes(option.value) ? 'border-blue-500 bg-blue-500' : 'border-gray-300'}
              `}
            >
              {value.includes(option.value) && (
                <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" />
                </svg>
              )}
            </div>
            {option.icon && <span className="text-xl">{option.icon}</span>}
            <div className="flex-1">
              <div className="font-semibold">{option.label}</div>
              {option.description && (
                <div className="text-sm text-gray-600">{option.description}</div>
              )}
            </div>
          </div>
        </button>
      ))}
    </div>
  );
}

function SliderQuestion({ min, max, step, value, onChange }) {
  return (
    <div className="space-y-4">
      <div className="text-center">
        <span className="text-4xl font-bold text-blue-600">{value}</span>
        <span className="text-xl text-gray-600 ml-2">weeks</span>
      </div>

      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
      />

      <div className="flex justify-between text-sm text-gray-600">
        <span>{min} weeks</span>
        <span>{max} weeks</span>
      </div>
    </div>
  );
}
```

## Phase 2: Calendar Generation Engine

### Step 2.1: Create Calendar Generator Service

```typescript
// lib/calendar/calendar-generator.ts

import Anthropic from '@anthropic-ai/sdk';
import { getSupabaseAdmin } from '@/lib/infrastructure/database/connection-pool';
import type { OnboardingData } from '@/types/onboarding';
import type { Video, CalendarEvent } from '@/types/database';

const claude = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

export class CalendarGenerator {
  /**
   * Generate personalized learning calendar
   */
  async generate(
    studentId: string,
    creatorId: string,
    onboardingData: OnboardingData
  ): Promise<CalendarEvent[]> {
    console.log('Generating calendar for student:', studentId);

    // 1. Get all videos for this creator
    const videos = await this.getCreatorVideos(creatorId);
    console.log(`Found ${videos.length} videos`);

    // 2. Filter by skill level
    const relevantVideos = this.filterBySkillLevel(videos, onboardingData.skillLevel);
    console.log(`${relevantVideos.length} videos match skill level`);

    // 3. Calculate if timeline is realistic
    const validation = this.validateTimeline(relevantVideos, onboardingData);
    if (!validation.realistic) {
      throw new Error(validation.suggestion);
    }

    // 4. Use Claude to create optimized schedule
    const schedule = await this.generateAISchedule(relevantVideos, onboardingData);

    // 5. Add review sessions
    const withReviews = this.addReviewSessions(schedule);

    // 6. Store in database
    await this.saveCalendarEvents(studentId, withReviews);

    // 7. Update student onboarding status
    await getSupabaseAdmin()
      .from('students')
      .update({
        onboarding_completed: true,
        learning_preferences: onboardingData,
        updated_at: new Date().toISOString(),
      })
      .eq('id', studentId);

    // 8. Trigger achievement
    await this.unlockAchievement(studentId, 'calendar-created');

    return withReviews;
  }

  /**
   * Get all videos for a creator
   */
  private async getCreatorVideos(creatorId: string): Promise<Video[]> {
    const { data, error } = await getSupabaseAdmin()
      .from('videos')
      .select('*')
      .eq('creator_id', creatorId)
      .eq('processing_status', 'completed')
      .order('created_at', { ascending: true });

    if (error) throw error;
    return data || [];
  }

  /**
   * Filter videos by skill level
   */
  private filterBySkillLevel(videos: Video[], skillLevel: string): Video[] {
    // For beginners: include beginner and some intermediate
    if (skillLevel === 'beginner') {
      return videos.filter(v =>
        v.difficulty_level === 'beginner' || v.difficulty_level === 'intermediate'
      );
    }

    // For intermediate: exclude pure beginner content
    if (skillLevel === 'intermediate') {
      return videos.filter(v => v.difficulty_level !== 'beginner');
    }

    // For advanced: all content, prioritize advanced
    return videos;
  }

  /**
   * Validate if timeline is realistic
   */
  private validateTimeline(
    videos: Video[],
    data: OnboardingData
  ): { realistic: boolean; suggestion?: string } {
    const totalMinutes = videos.reduce((sum, v) => sum + v.duration, 0);
    const totalHours = Math.ceil(totalMinutes / 60);

    // Add 50% buffer for practice, quizzes, breaks
    const estimatedHours = totalHours * 1.5;

    const availableHours = data.targetCompletionWeeks * data.availableHoursPerWeek;

    if (estimatedHours > availableHours) {
      const suggestedWeeks = Math.ceil(estimatedHours / data.availableHoursPerWeek);

      return {
        realistic: false,
        suggestion: `This course needs ~${estimatedHours} hours. At ${data.availableHoursPerWeek} hours/week, we recommend ${suggestedWeeks} weeks instead of ${data.targetCompletionWeeks}.`,
      };
    }

    return { realistic: true };
  }

  /**
   * Use Claude AI to generate optimized schedule
   */
  private async generateAISchedule(
    videos: Video[],
    data: OnboardingData
  ): Promise<Partial<CalendarEvent>[]> {
    const sessionsPerWeek = this.calculateSessionsPerWeek(data);
    const sessionMinutes = this.getSessionMinutes(data.sessionLength);

    const prompt = `
You are an expert learning designer. Create a personalized learning schedule.

Student Profile:
- Skill Level: ${data.skillLevel}
- Available: ${data.availableHoursPerWeek} hours/week
- Goal: Complete in ${data.targetCompletionWeeks} weeks
- Session Length: ${sessionMinutes} minutes
- Sessions per Week: ${sessionsPerWeek}
- Preferred Days: ${data.preferredDays.join(', ')}
- Preferred Times: ${data.preferredTimeSlots.join(', ')}
- Learning Style: ${data.learningStyle}
- Pace: ${data.pacePreference}

Videos to Schedule (${videos.length} total):
${videos.map((v, i) => `${i + 1}. "${v.title}" (${v.duration} min, difficulty: ${v.difficulty_level || 'medium'})`).join('\n')}

Create a schedule that:
1. Starts with easier videos in Week 1 for quick wins
2. Gradually increases difficulty
3. Respects session length preferences
4. Distributes videos across preferred days
5. Adds buffer time between complex topics
6. Includes breaks every 3-4 sessions

Return ONLY a JSON array with this exact structure:
[
  {
    "videoIndex": 0,
    "weekNumber": 1,
    "dayOfWeek": "monday",
    "timeSlot": "evening",
    "estimatedDuration": 30,
    "learningObjectives": ["objective 1", "objective 2"],
    "difficulty": 2
  }
]

Important:
- videoIndex is 0-based
- weekNumber starts at 1
- dayOfWeek must be from preferredDays
- timeSlot must be from preferredTimeSlots
- difficulty is 1-5 scale
`;

    const response = await claude.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 8192,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    const textContent = response.content[0].type === 'text' ? response.content[0].text : '';

    // Extract JSON from response (Claude might add explanations)
    const jsonMatch = textContent.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      throw new Error('Failed to parse AI response');
    }

    const aiSchedule = JSON.parse(jsonMatch[0]);

    // Convert AI schedule to CalendarEvent format
    const now = new Date();
    const events: Partial<CalendarEvent>[] = [];

    for (const item of aiSchedule) {
      const video = videos[item.videoIndex];
      if (!video) continue;

      const scheduledDate = this.calculateScheduledDate(
        now,
        item.weekNumber,
        item.dayOfWeek,
        item.timeSlot
      );

      events.push({
        video_id: video.id,
        scheduled_date: scheduledDate.toISOString(),
        session_duration: item.estimatedDuration,
        learning_objectives: item.learningObjectives,
        estimated_difficulty: item.difficulty,
        completed: false,
      });
    }

    return events;
  }

  /**
   * Calculate scheduled date from week/day/time
   */
  private calculateScheduledDate(
    startDate: Date,
    weekNumber: number,
    dayOfWeek: string,
    timeSlot: string
  ): Date {
    const date = new Date(startDate);

    // Add weeks
    date.setDate(date.getDate() + (weekNumber - 1) * 7);

    // Find the specified day of week
    const targetDay = this.dayToNumber(dayOfWeek);
    const currentDay = date.getDay();
    const daysToAdd = (targetDay - currentDay + 7) % 7;
    date.setDate(date.getDate() + daysToAdd);

    // Set time based on slot
    const hour = this.timeSlotToHour(timeSlot);
    date.setHours(hour, 0, 0, 0);

    return date;
  }

  private dayToNumber(day: string): number {
    const map = {
      sunday: 0,
      monday: 1,
      tuesday: 2,
      wednesday: 3,
      thursday: 4,
      friday: 5,
      saturday: 6,
    };
    return map[day] || 1;
  }

  private timeSlotToHour(slot: string): number {
    const map = {
      morning: 9,
      afternoon: 14,
      evening: 19,
      'late-night': 22,
    };
    return map[slot] || 19;
  }

  private calculateSessionsPerWeek(data: OnboardingData): number {
    const sessionMinutes = this.getSessionMinutes(data.sessionLength);
    const weeklyMinutes = data.availableHoursPerWeek * 60;
    return Math.floor(weeklyMinutes / sessionMinutes);
  }

  private getSessionMinutes(length: string): number {
    const map = {
      short: 25,
      medium: 50,
      long: 90,
    };
    return map[length] || 50;
  }

  /**
   * Add review sessions after complex topics
   */
  private addReviewSessions(events: Partial<CalendarEvent>[]): Partial<CalendarEvent>[] {
    // Every 5th video, add a review session
    // This is simplified - could be more sophisticated
    return events; // TODO: Implement review session logic
  }

  /**
   * Save events to database
   */
  private async saveCalendarEvents(
    studentId: string,
    events: Partial<CalendarEvent>[]
  ): Promise<void> {
    const eventsWithStudent = events.map(event => ({
      ...event,
      student_id: studentId,
    }));

    const { error } = await getSupabaseAdmin()
      .from('calendar_events')
      .insert(eventsWithStudent);

    if (error) throw error;
  }

  /**
   * Unlock achievement
   */
  private async unlockAchievement(studentId: string, achievementSlug: string): Promise<void> {
    // Get achievement ID
    const { data: achievement } = await getSupabaseAdmin()
      .from('achievements')
      .select('id, xp_value')
      .eq('slug', achievementSlug)
      .single();

    if (!achievement) return;

    // Check if already unlocked
    const { data: existing } = await getSupabaseAdmin()
      .from('student_achievements')
      .select('id')
      .eq('student_id', studentId)
      .eq('achievement_id', achievement.id)
      .single();

    if (existing) return;

    // Unlock achievement
    await getSupabaseAdmin()
      .from('student_achievements')
      .insert({
        student_id: studentId,
        achievement_id: achievement.id,
      });

    // Add XP
    await getSupabaseAdmin().rpc('add_student_xp', {
      student_id: studentId,
      xp_amount: achievement.xp_value,
    });
  }
}
```

### Step 2.2: Create API Route

```typescript
// app/api/calendar/generate/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { CalendarGenerator } from '@/lib/calendar/calendar-generator';
import { withRateLimit } from '@/lib/infrastructure/rate-limiting/rate-limiter';

async function handler(req: NextRequest) {
  try {
    const body = await req.json();
    const { studentId, creatorId, onboardingData } = body;

    // Validate input
    if (!studentId || !creatorId || !onboardingData) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Generate calendar
    const generator = new CalendarGenerator();
    const events = await generator.generate(studentId, creatorId, onboardingData);

    return NextResponse.json({
      success: true,
      events,
      message: `Generated ${events.length} learning sessions`,
    });
  } catch (error) {
    console.error('Calendar generation error:', error);

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Calendar generation failed',
      },
      { status: 500 }
    );
  }
}

export const POST = withRateLimit(handler, 'api');
```

## Phase 3: Calendar UI Components

### Step 3.1: Weekly Calendar View

```typescript
// components/calendar/WeeklyView.tsx

'use client';

import { useState } from 'react';
import { format, addDays, startOfWeek, isSameDay, isPast, isFuture } from 'date-fns';
import type { CalendarEvent } from '@/types/database';
import { Button } from '@/components/ui/button';
import { CheckCircle, Circle, Clock } from 'lucide-react';

export function WeeklyCalendarView({
  events,
  onEventClick,
}: {
  events: CalendarEvent[];
  onEventClick: (event: CalendarEvent) => void;
}) {
  const [currentWeekStart, setCurrentWeekStart] = useState(() =>
    startOfWeek(new Date(), { weekStartsOn: 1 }) // Monday
  );

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(currentWeekStart, i));

  const getEventsForDay = (date: Date) => {
    return events.filter(event =>
      isSameDay(new Date(event.scheduled_date), date)
    );
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      {/* Week navigation */}
      <div className="flex items-center justify-between mb-6">
        <Button
          variant="outline"
          onClick={() => setCurrentWeekStart(addDays(currentWeekStart, -7))}
        >
          ← Previous
        </Button>

        <h2 className="text-lg font-semibold">
          {format(currentWeekStart, 'MMM d')} -{' '}
          {format(addDays(currentWeekStart, 6), 'MMM d, yyyy')}
        </h2>

        <Button
          variant="outline"
          onClick={() => setCurrentWeekStart(addDays(currentWeekStart, 7))}
        >
          Next →
        </Button>
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-4">
        {weekDays.map((date, dayIndex) => {
          const dayEvents = getEventsForDay(date);
          const isToday = isSameDay(date, new Date());

          return (
            <div
              key={dayIndex}
              className={`
                border rounded-lg p-3 min-h-[200px]
                ${isToday ? 'border-blue-500 bg-blue-50' : 'border-gray-200'}
              `}
            >
              {/* Day header */}
              <div className="text-center mb-3">
                <div className="text-xs text-gray-600 uppercase">
                  {format(date, 'EEE')}
                </div>
                <div className={`text-lg font-semibold ${isToday ? 'text-blue-600' : ''}`}>
                  {format(date, 'd')}
                </div>
              </div>

              {/* Events for this day */}
              <div className="space-y-2">
                {dayEvents.map(event => (
                  <EventCard
                    key={event.id}
                    event={event}
                    onClick={() => onEventClick(event)}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function EventCard({
  event,
  onClick,
}: {
  event: CalendarEvent;
  onClick: () => void;
}) {
  const eventDate = new Date(event.scheduled_date);
  const isOverdue = !event.completed && isPast(eventDate);
  const isUpcoming = isFuture(eventDate);

  return (
    <button
      onClick={onClick}
      className={`
        w-full text-left p-2 rounded text-xs border-l-4 transition-all
        ${
          event.completed
            ? 'border-green-500 bg-green-50'
            : isOverdue
            ? 'border-red-500 bg-red-50'
            : 'border-blue-500 bg-blue-50 hover:bg-blue-100'
        }
      `}
    >
      <div className="flex items-start gap-1">
        {event.completed ? (
          <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
        ) : isOverdue ? (
          <Clock className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
        ) : (
          <Circle className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
        )}

        <div className="flex-1 min-w-0">
          <div className="font-medium truncate">
            {event.video?.title || 'Video'}
          </div>
          <div className="text-gray-600">
            {format(eventDate, 'h:mm a')} • {event.session_duration}m
          </div>
        </div>
      </div>
    </button>
  );
}
```

## Testing the Calendar

### Test Calendar Generation

```typescript
// scripts/test-calendar-generation.ts

import { CalendarGenerator } from '../lib/calendar/calendar-generator';

async function testCalendarGeneration() {
  const generator = new CalendarGenerator();

  const testData = {
    primaryGoal: 'career-change',
    skillLevel: 'beginner',
    availableHoursPerWeek: 10,
    targetCompletionWeeks: 12,
    preferredDays: ['monday', 'wednesday', 'friday'],
    preferredTimeSlots: ['evening'],
    sessionLength: 'medium',
    learningStyle: 'mixed',
    pacePreference: 'steady',
    breakFrequency: 'moderate',
  };

  console.log('Generating test calendar...');

  try {
    const events = await generator.generate(
      'test-student-id',
      'test-creator-id',
      testData
    );

    console.log(`✅ Generated ${events.length} calendar events`);
    console.log('First event:', events[0]);
    console.log('Last event:', events[events.length - 1]);
  } catch (error) {
    console.error('❌ Calendar generation failed:', error);
  }
}

testCalendarGeneration();
```

---

**Next**: Create adaptive rescheduling logic in `ADAPTIVE_LOGIC.md`
