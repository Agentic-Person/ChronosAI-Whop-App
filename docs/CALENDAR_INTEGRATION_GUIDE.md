# Learning Calendar - Integration Guide for Other Modules

## Quick Start

The Learning Calendar is now fully integrated with feature gating. Here's how to use it in your module:

---

## For Module 3 - Gamification Integration

### Award Calendar-Related Achievements

```typescript
// lib/gamification/calendar-achievements.ts

import { calendarService } from '@/lib/calendar/calendar-service';

export async function checkCalendarAchievements(studentId: string) {
  // Check for calendar milestones
  const events = await calendarService.getAllEvents(studentId);
  const stats = await calendarService.getStudyStats(studentId);

  // Week 1 Warrior - Complete first week on schedule
  if (await isFirstWeekComplete(studentId)) {
    await unlockAchievement(studentId, 'week-1-warrior', 100);
  }

  // Perfect Week - Complete all sessions on time for a week
  if (await isPerfectWeek(studentId)) {
    await unlockAchievement(studentId, 'perfect-week', 200);
  }

  // Consistency bonuses based on streak
  if (stats.streakDays === 7) {
    await addXP(studentId, 25); // Week streak bonus
  }

  if (stats.streakDays === 30) {
    await unlockAchievement(studentId, 'unstoppable', 500);
  }
}
```

### Trigger Achievement Checks

Call after completing events:

```typescript
// After marking event complete
await calendarService.markEventComplete(eventId);
await checkCalendarAchievements(studentId); // Check for new achievements
```

---

## For Module 5 - Progress Tracking Integration

### Use Calendar Metrics in Analytics

```typescript
// lib/progress/calendar-progress.ts

import { calendarService } from '@/lib/calendar/calendar-service';

export async function getCalendarProgress(studentId: string) {
  const stats = await calendarService.getStudyStats(studentId);
  const upcomingEvents = await calendarService.getUpcomingEvents(studentId, 10);

  return {
    // Overall progress
    totalSessionsCompleted: stats.totalSessionsCompleted,
    completionRate: stats.completionRate,
    onTrackStatus: stats.onTrackStatus,

    // Time metrics
    totalMinutesStudied: stats.totalMinutesStudied,
    averageSessionLength: stats.averageSessionLength,
    projectedCompletionDate: stats.projectedCompletionDate,

    // Engagement
    streakDays: stats.streakDays,
    sessionsThisWeek: stats.sessionsThisWeek,

    // Upcoming
    nextSession: upcomingEvents[0],
    upcomingSessions: upcomingEvents.length,
  };
}
```

### Display in Dashboard

```tsx
// components/progress/ProgressDashboard.tsx

import { getCalendarProgress } from '@/lib/progress/calendar-progress';

export function ProgressDashboard({ studentId }: { studentId: string }) {
  const [progress, setProgress] = useState(null);

  useEffect(() => {
    getCalendarProgress(studentId).then(setProgress);
  }, [studentId]);

  return (
    <div>
      <h2>Your Progress</h2>
      <div>Completion Rate: {progress?.completionRate}%</div>
      <div>Streak: {progress?.streakDays} days</div>
      <div>Status: {progress?.onTrackStatus}</div>
    </div>
  );
}
```

---

## For Module 1 - RAG Chat Integration

### Include Schedule Context in AI Responses

```typescript
// lib/rag/context-builder.ts

import { calendarService } from '@/lib/calendar/calendar-service';

export async function buildChatContext(studentId: string, query: string) {
  const upcomingEvents = await calendarService.getUpcomingEvents(studentId, 3);
  const stats = await calendarService.getStudyStats(studentId);

  const scheduleContext = `
    Student's Learning Schedule:
    - Next scheduled session: ${upcomingEvents[0]?.video?.title || 'None'}
    - Upcoming: ${upcomingEvents.length} sessions
    - Completion rate: ${stats.completionRate}%
    - Currently ${stats.onTrackStatus}
    - Streak: ${stats.streakDays} days
  `;

  return {
    scheduleContext,
    // ... other context
  };
}
```

### Use in Chat Prompt

```typescript
const prompt = `
You are an AI learning assistant.

${scheduleContext}

Student question: ${query}

Provide a helpful response, considering their schedule and progress.
`;
```

---

## For Module 4 - Assessments Integration

### Schedule Quizzes Based on Calendar

```typescript
// lib/assessments/quiz-scheduler.ts

import { calendarService } from '@/lib/calendar/calendar-service';

export async function scheduleQuizzesForStudent(studentId: string) {
  const events = await calendarService.getAllEvents(studentId);

  // Schedule quiz after every 5 videos
  for (let i = 4; i < events.length; i += 5) {
    const lastVideoEvent = events[i];
    const quizDate = new Date(lastVideoEvent.scheduled_date);
    quizDate.setDate(quizDate.getDate() + 1); // Day after

    await createQuizEvent(studentId, quizDate, {
      relatedVideos: events.slice(i - 4, i + 1).map(e => e.video_id),
      difficulty: calculateAverageDifficulty(events.slice(i - 4, i + 1)),
    });
  }
}
```

---

## For Module 6 - Creator Dashboard Integration

### Show Student Calendar Metrics

```typescript
// lib/dashboard/student-calendar-overview.ts

import { getSupabaseAdmin } from '@/lib/infrastructure/database/connection-pool';

export async function getStudentsCalendarOverview(creatorId: string) {
  const { data: students } = await getSupabaseAdmin()
    .from('students')
    .select('id, full_name')
    .eq('creator_id', creatorId);

  const overview = [];

  for (const student of students || []) {
    const stats = await calendarService.getStudyStats(student.id);

    overview.push({
      studentId: student.id,
      studentName: student.full_name,
      completionRate: stats.completionRate,
      onTrackStatus: stats.onTrackStatus,
      streakDays: stats.streakDays,
      sessionsCompleted: stats.totalSessionsCompleted,
    });
  }

  // Sort by engagement (streak + completion rate)
  return overview.sort((a, b) =>
    (b.streakDays + b.completionRate) - (a.streakDays + a.completionRate)
  );
}
```

### Display Top Students

```tsx
// components/dashboard/TopStudents.tsx

<TopStudentsList>
  {students.map(student => (
    <StudentCard key={student.studentId}>
      <h4>{student.studentName}</h4>
      <Badge>{student.onTrackStatus}</Badge>
      <div>🔥 {student.streakDays} day streak</div>
      <div>{student.completionRate}% complete</div>
    </StudentCard>
  ))}
</TopStudentsList>
```

---

## For Module 9 - Discord Integration

### Send Calendar Reminders

```typescript
// lib/discord/calendar-reminders.ts

import { calendarService } from '@/lib/calendar/calendar-service';
import { sendDiscordNotification } from '@/lib/discord/notifications';

export async function sendDailyReminders() {
  // Get all students with sessions today
  const { data: todayEvents } = await getSupabaseAdmin()
    .from('calendar_events')
    .select('*, student:students(*)')
    .gte('scheduled_date', new Date().toISOString())
    .lte('scheduled_date', endOfDay(new Date()).toISOString())
    .eq('completed', false);

  for (const event of todayEvents || []) {
    if (event.student.discord_id) {
      await sendDiscordNotification(event.student.discord_id, {
        title: '📅 Study Reminder',
        description: `Your session "${event.video.title}" is scheduled for ${format(new Date(event.scheduled_date), 'h:mm a')}`,
        color: '#3b82f6',
        url: `/videos/${event.video_id}`,
      });
    }
  }
}
```

Run this daily via Inngest:

```typescript
// inngest/functions/calendar-reminders.ts

export const dailyCalendarReminders = inngest.createFunction(
  { id: 'daily-calendar-reminders' },
  { cron: '0 9 * * *' }, // 9 AM daily
  async () => {
    await sendDailyReminders();
  }
);
```

---

## API Usage Examples

### Generate Calendar (POST)

```typescript
const response = await fetch('/api/calendar/generate', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-user-id': userId,
  },
  body: JSON.stringify({
    studentId: 'uuid',
    creatorId: 'uuid',
    onboardingData: {
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
    },
  }),
});

const { data } = await response.json();
console.log(`Generated ${data.totalEvents} events`);
```

### Get Upcoming Events (GET)

```typescript
const response = await fetch(
  `/api/calendar/events?studentId=${studentId}&upcoming=true&limit=5`,
  {
    headers: { 'x-user-id': userId },
  }
);

const { data } = await response.json();
const upcomingEvents = data.events;
```

### Mark Event Complete (PATCH)

```typescript
const response = await fetch(`/api/calendar/events/${eventId}`, {
  method: 'PATCH',
  headers: {
    'Content-Type': 'application/json',
    'x-user-id': userId,
  },
  body: JSON.stringify({
    status: 'completed',
    actualDuration: 50, // optional
  }),
});
```

### Get Study Stats (GET)

```typescript
const response = await fetch(`/api/calendar/stats?studentId=${studentId}`, {
  headers: { 'x-user-id': userId },
});

const { data } = await response.json();
const { stats, adaptation } = data;

console.log(`Completion rate: ${stats.completionRate}%`);
console.log(`Streak: ${stats.streakDays} days`);
console.log(`Status: ${stats.onTrackStatus}`);
console.log(`Suggestion: ${adaptation.message}`);
```

---

## React Component Usage

### Using OnboardingWizard

```tsx
'use client';

import { useState } from 'react';
import { OnboardingWizard } from '@/components/calendar/OnboardingWizard';
import { useRouter } from 'next/navigation';

export default function OnboardingPage() {
  const [isGenerating, setIsGenerating] = useState(false);
  const router = useRouter();

  const handleComplete = async (data) => {
    setIsGenerating(true);

    try {
      const response = await fetch('/api/calendar/generate', {
        method: 'POST',
        body: JSON.stringify({
          studentId: userId,
          creatorId: creatorId,
          onboardingData: data,
        }),
      });

      if (response.ok) {
        router.push('/calendar');
      }
    } catch (error) {
      console.error('Failed to generate calendar:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <OnboardingWizard
      onComplete={handleComplete}
      onSkip={() => router.push('/dashboard')}
      isLoading={isGenerating}
    />
  );
}
```

### Using WeeklyCalendarView

```tsx
'use client';

import { useEffect, useState } from 'react';
import { WeeklyCalendarView } from '@/components/calendar/WeeklyCalendarView';

export default function CalendarPage({ studentId }: { studentId: string }) {
  const [events, setEvents] = useState([]);

  useEffect(() => {
    fetch(`/api/calendar/events?studentId=${studentId}`)
      .then(res => res.json())
      .then(data => setEvents(data.data.events));
  }, [studentId]);

  const handleMarkComplete = async (eventId: string) => {
    await fetch(`/api/calendar/events/${eventId}`, {
      method: 'PATCH',
      body: JSON.stringify({ status: 'completed' }),
    });

    // Refresh events
    const res = await fetch(`/api/calendar/events?studentId=${studentId}`);
    const data = await res.json();
    setEvents(data.data.events);
  };

  return (
    <WeeklyCalendarView
      events={events}
      onEventClick={(event) => router.push(`/videos/${event.video_id}`)}
      onMarkComplete={handleMarkComplete}
    />
  );
}
```

### Using UpcomingEvents Widget

```tsx
'use client';

import { UpcomingEvents } from '@/components/calendar/UpcomingEvents';

export function DashboardWidget({ studentId }: { studentId: string }) {
  const [upcoming, setUpcoming] = useState([]);

  useEffect(() => {
    fetch(`/api/calendar/events?studentId=${studentId}&upcoming=true&limit=5`)
      .then(res => res.json())
      .then(data => setUpcoming(data.data.events));
  }, [studentId]);

  return (
    <UpcomingEvents
      events={upcoming}
      onEventClick={(event) => router.push(`/videos/${event.video_id}`)}
      onStartLearning={(event) => {
        // Start study session
        router.push(`/videos/${event.video_id}?autoplay=true`);
      }}
    />
  );
}
```

---

## Database Functions Available

### get_upcoming_events

```sql
SELECT * FROM get_upcoming_events('student-uuid', 5);
```

Returns next 5 upcoming events with video details.

### get_study_stats

```sql
SELECT get_study_stats('student-uuid');
```

Returns JSON with comprehensive study statistics.

---

## Hooks & Utilities

### Custom React Hooks (Create these in your module)

```typescript
// lib/hooks/useCalendarEvents.ts

export function useCalendarEvents(studentId: string) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/calendar/events?studentId=${studentId}`)
      .then(res => res.json())
      .then(data => {
        setEvents(data.data.events);
        setLoading(false);
      });
  }, [studentId]);

  const markComplete = async (eventId: string) => {
    await fetch(`/api/calendar/events/${eventId}`, {
      method: 'PATCH',
      body: JSON.stringify({ status: 'completed' }),
    });
    // Refresh
    const res = await fetch(`/api/calendar/events?studentId=${studentId}`);
    const data = await res.json();
    setEvents(data.data.events);
  };

  return { events, loading, markComplete };
}
```

---

## Feature Gating Reminder

All calendar routes are protected with PRO tier. Handle upgrade prompts:

```tsx
import { FeatureGate } from '@/components/features/FeatureGate';
import { UpgradePrompt } from '@/components/features/UpgradePrompt';
import { Feature, PlanTier } from '@/lib/features/types';

export function CalendarFeature() {
  return (
    <FeatureGate
      feature={Feature.FEATURE_LEARNING_CALENDAR}
      fallback={
        <UpgradePrompt
          feature={Feature.FEATURE_LEARNING_CALENDAR}
          currentPlan={PlanTier.BASIC}
          requiredPlan={PlanTier.PRO}
          variant="card"
        />
      }
    >
      <CalendarContent />
    </FeatureGate>
  );
}
```

---

## Questions?

Check:
1. `docs/LEARNING_CALENDAR.md` - Full system documentation
2. `lib/calendar/` - Service implementations
3. `components/calendar/` - React components
4. `app/api/calendar/` - API routes

Or contact Agent 5 (Learning Calendar Specialist)
