# Module 4: Learning Calendar - Overview

## Executive Summary

The Learning Calendar transforms the overwhelming course library into a personalized, achievable study plan. Using AI and student preferences, it generates realistic schedules that adapt to each learner's goals, availability, and pace - dramatically improving course completion rates.

**Status**: Full Implementation Required
**Priority**: P0 (CRITICAL - First thing students see after signup)
**Dependencies**: Video metadata, Student onboarding data

## Problem Statement

### Why Online Courses Fail

**The Paradox of Choice**:
- Students see 100+ hours of content
- No clear starting point
- Overwhelming "where do I begin?"
- Analysis paralysis → abandonment

**Lack of Structure**:
- No deadlines = no urgency
- Self-paced often means never-paced
- Students underestimate time needed
- Overcommit then burn out

**Our Data**:
- 85% of students never finish online courses
- Most watch <3 videos before dropping out
- Drop-off highest in first week
- "Too much content" is #1 complaint

### What We're Solving

A personalized calendar that:
- ✅ **Eliminates choice paralysis** - "Watch this video today"
- ✅ **Creates realistic expectations** - Based on actual availability
- ✅ **Builds momentum** - Quick wins in first week
- ✅ **Adapts to life** - Flexible rescheduling
- ✅ **Maintains accountability** - Visual progress tracking

## Success Metrics

| Metric | Target | Current (Avg) | Impact |
|--------|--------|---------------|--------|
| **Week 1 Completion** | 80% | 25% | 3.2x improvement |
| **Course Completion Rate** | 60% | 15% | 4x improvement |
| **Time to First Video** | <10 min | 2 days | 288x faster |
| **Calendar Generation Success** | >95% | N/A | New feature |
| **Rescheduling Rate** | 20-30% | N/A | Healthy adaptation |
| **Average Session Adherence** | 70% | N/A | Strong engagement |

## Core Features

### 1. Smart Onboarding Quiz

**Collect Key Data** (2 minutes):

```typescript
interface OnboardingData {
  // Learning goals
  primaryGoal: 'career-change' | 'skill-upgrade' | 'side-project' | 'curiosity';
  targetCompletionWeeks: number; // 4, 8, 12, 16 weeks
  skillLevel: 'beginner' | 'intermediate' | 'advanced';

  // Availability
  availableHoursPerWeek: number; // 2, 5, 10, 15+ hours
  preferredDays: DayOfWeek[]; // Mon, Tue, Wed...
  preferredTimeSlots: TimeSlot[]; // morning, afternoon, evening
  sessionLength: 'short' | 'medium' | 'long'; // 20min, 45min, 90min

  // Preferences
  learningStyle: 'visual' | 'hands-on' | 'mixed';
  pacePreference: 'steady' | 'intensive' | 'flexible';
  breakFrequency: 'frequent' | 'moderate' | 'minimal';
}
```

**Example Flow**:
1. "What's your main goal with this course?"
   - [ ] Land a new job (Career change)
   - [ ] Level up current skills
   - [ ] Build a side project
   - [ ] Learn for fun

2. "How much time can you dedicate weekly?"
   - [ ] 2-3 hours (Casual learner)
   - [ ] 5-7 hours (Committed student)
   - [ ] 10-15 hours (Intensive mode)
   - [ ] 15+ hours (Full-time learning)

3. "When do you learn best?"
   - [ ] Mornings (6AM-12PM)
   - [ ] Afternoons (12PM-6PM)
   - [ ] Evenings (6PM-11PM)
   - [ ] Weekends only

4. "Preferred session length?"
   - [ ] Short bursts (20-30 min)
   - [ ] Medium sessions (45-60 min)
   - [ ] Long deep dives (90+ min)

### 2. AI Calendar Generation

**Algorithm** (Claude 3.5 Sonnet):

```typescript
async function generateLearningCalendar(
  student: OnboardingData,
  courseVideos: Video[]
): Promise<CalendarEvent[]> {
  // Calculate constraints
  const totalVideoMinutes = courseVideos.reduce((sum, v) => sum + v.duration, 0);
  const targetWeeks = student.targetCompletionWeeks;
  const hoursPerWeek = student.availableHoursPerWeek;

  // Reality check
  const totalHoursNeeded = Math.ceil(totalVideoMinutes / 60) * 1.5; // 1.5x for practice
  const totalHoursAvailable = targetWeeks * hoursPerWeek;

  if (totalHoursNeeded > totalHoursAvailable) {
    // Adjust expectations
    const suggestedWeeks = Math.ceil(totalHoursNeeded / hoursPerWeek);
    // Offer alternatives or extend timeline
  }

  // Group videos into modules/weeks
  const weeklySchedule = distributeVideosAcrossWeeks(
    courseVideos,
    targetWeeks,
    hoursPerWeek
  );

  // Use AI to create personalized schedule
  const prompt = `
    Create a learning schedule for a ${student.skillLevel} student who:
    - Has ${hoursPerWeek} hours/week available
    - Prefers ${student.sessionLength} sessions
    - Wants to complete in ${targetWeeks} weeks
    - Learns best ${student.preferredTimeSlots.join(', ')}

    Videos to schedule:
    ${JSON.stringify(weeklySchedule, null, 2)}

    Return a JSON array of calendar events with:
    - scheduled_date (ISO string)
    - video_id
    - session_duration (minutes)
    - learning_objectives (3-5 bullet points)
    - prerequisites (if any)
    - estimated_difficulty (1-5)
  `;

  const response = await claude.messages.create({
    model: 'claude-3-5-sonnet-20241022',
    max_tokens: 4096,
    messages: [
      {
        role: 'user',
        content: prompt,
      },
    ],
  });

  const calendarEvents = JSON.parse(response.content[0].text);

  // Add buffer days and review sessions
  return enhanceWithReviewSessions(calendarEvents);
}
```

**Schedule Optimization**:
1. **Beginner-Friendly Start** - Shorter, easier videos in Week 1
2. **Progressive Difficulty** - Gradually increase complexity
3. **Spaced Repetition** - Review sessions after complex topics
4. **Break Days** - Rest days to prevent burnout
5. **Milestone Celebrations** - Achievement unlocks at 25%, 50%, 75%

### 3. Calendar UI Components

**Monthly View**:
```tsx
<CalendarView
  events={calendarEvents}
  completedDates={student.completedDates}
  todayHighlight={true}
  onDateClick={(date) => showDayDetails(date)}
/>
```

**Weekly View** (Default):
```tsx
<WeeklySchedule
  currentWeek={weekNumber}
  events={thisWeekEvents}
  progress={completionPercentage}
  streak={student.streakDays}
/>
```

**Daily View**:
```tsx
<DaySchedule
  date={today}
  events={todayEvents}
  onComplete={(eventId) => markVideoComplete(eventId)}
  onReschedule={(eventId) => openRescheduleModal(eventId)}
/>
```

**Visual Elements**:
- 🟢 Green dot = Completed
- 🔵 Blue dot = Scheduled today
- ⚪ Gray dot = Upcoming
- 🔴 Red dot = Overdue
- 🔥 Streak counter (days in a row)
- 📊 Progress bar (% complete)

### 4. Adaptive Rescheduling

**Auto-Rescheduling Triggers**:
- Missed 2+ consecutive sessions → Offer easier pace
- Completing ahead of schedule → Offer more content
- Repeatedly skipping specific topics → Adjust prerequisites
- Long break (7+ days) → "Welcome back" catchup plan

**Manual Rescheduling**:
```tsx
<RescheduleModal
  event={selectedEvent}
  onReschedule={(newDate) => {
    // Update calendar
    // Cascade changes to dependent videos
    // Recalculate completion date
  }}
/>
```

**Smart Suggestions**:
- "You're behind schedule. Want to:"
  - [ ] Extend timeline by 2 weeks
  - [ ] Add 2 more hours/week
  - [ ] Skip optional videos
  - [ ] Keep current pace (might not finish)

### 5. Progress Tracking Integration

**Daily Check-in**:
```tsx
<DailyCheckin
  todayGoal={todayVideos}
  completed={completedToday}
  xpEarned={todayXP}
  streakDays={student.streakDays}
/>
```

**Progress Dashboard**:
- **On Track Indicator**: Green/Yellow/Red status
- **Completion Forecast**: "At this pace, you'll finish on May 15"
- **Time Invested**: "12.5 hours completed, 37.5 hours remaining"
- **Pace Comparison**: "You're 3 days ahead of schedule!"

### 6. Gamification Integration

**Achievements**:
- 📅 **Calendar Created** - Generated your first learning plan (50 XP)
- 🔥 **Week 1 Warrior** - Completed first week on schedule (100 XP)
- ⚡ **Lightning Learner** - Finished 3 videos in one day (150 XP)
- 🎯 **On Target** - Stayed on schedule for 2 weeks (200 XP)
- 🏆 **Early Bird** - Completed course before deadline (500 XP)

**Streak Bonuses**:
- 3 days: +10 XP per day
- 7 days: +25 XP bonus + "Week Warrior" badge
- 14 days: +50 XP bonus + "Consistency King" badge
- 30 days: +100 XP bonus + "Unstoppable" badge (Legendary!)

## Technical Implementation

### Database Schema

**calendar_events** table (already exists):
```sql
CREATE TABLE calendar_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID REFERENCES students(id) ON DELETE CASCADE,
  video_id UUID REFERENCES videos(id) ON DELETE CASCADE,
  scheduled_date TIMESTAMP NOT NULL,
  session_duration INTEGER NOT NULL, -- minutes
  completed BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMP,
  rescheduled_from TIMESTAMP, -- if rescheduled
  learning_objectives TEXT[],
  prerequisites UUID[], -- video IDs
  estimated_difficulty INTEGER, -- 1-5
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_calendar_student_date ON calendar_events(student_id, scheduled_date);
CREATE INDEX idx_calendar_video ON calendar_events(video_id);
CREATE INDEX idx_calendar_upcoming ON calendar_events(student_id, scheduled_date)
  WHERE completed = FALSE AND scheduled_date >= CURRENT_DATE;
```

### Calendar Generation Service

```typescript
// lib/calendar/calendar-generator.ts

export class CalendarGenerator {
  /**
   * Main entry point for calendar generation
   */
  async generate(
    studentId: string,
    onboardingData: OnboardingData
  ): Promise<CalendarEvent[]> {
    // 1. Get all course videos for student's creator
    const videos = await this.getCourseVideos(studentId);

    // 2. Filter based on skill level (skip beginner videos for advanced)
    const relevantVideos = this.filterBySkillLevel(videos, onboardingData.skillLevel);

    // 3. Order by dependencies and difficulty
    const orderedVideos = this.createLearningPath(relevantVideos);

    // 4. Distribute across timeline
    const schedule = await this.distributeVideos(
      orderedVideos,
      onboardingData
    );

    // 5. Add review sessions
    const withReviews = this.addReviewSessions(schedule);

    // 6. Store in database
    await this.saveCalendarEvents(studentId, withReviews);

    // 7. Send calendar created achievement
    await this.unlockAchievement(studentId, 'calendar-created');

    return withReviews;
  }

  private async distributeVideos(
    videos: Video[],
    data: OnboardingData
  ): Promise<CalendarEvent[]> {
    // Calculate daily schedule
    const sessionsPerWeek = this.calculateSessionsPerWeek(data);
    const sessionMinutes = this.getSessionMinutes(data.sessionLength);

    const events: CalendarEvent[] = [];
    let currentDate = new Date();
    let videoIndex = 0;

    for (let week = 0; week < data.targetCompletionWeeks; week++) {
      const videosThisWeek = this.selectVideosForWeek(
        videos,
        videoIndex,
        sessionsPerWeek,
        sessionMinutes
      );

      for (const dayOffset of this.getPreferredDays(data.preferredDays)) {
        if (videoIndex >= videos.length) break;

        const scheduledDate = this.calculateScheduledDate(
          currentDate,
          week,
          dayOffset,
          data.preferredTimeSlots[0]
        );

        events.push({
          video_id: videos[videoIndex].id,
          scheduled_date: scheduledDate,
          session_duration: sessionMinutes,
          learning_objectives: videos[videoIndex].learning_objectives,
          estimated_difficulty: videos[videoIndex].difficulty,
        });

        videoIndex++;
      }
    }

    return events;
  }
}
```

### Adaptive Rescheduling Engine

```typescript
// lib/calendar/adaptive-scheduler.ts

export class AdaptiveScheduler {
  /**
   * Analyze progress and suggest adjustments
   */
  async analyzeAndAdapt(studentId: string): Promise<AdaptationSuggestion> {
    const student = await this.getStudent(studentId);
    const events = await this.getCalendarEvents(studentId);

    const analysis = {
      totalScheduled: events.length,
      completed: events.filter(e => e.completed).length,
      overdue: events.filter(e => !e.completed && isPast(e.scheduled_date)).length,
      onTrack: this.isOnTrack(student, events),
      paceRatio: this.calculatePaceRatio(student, events),
    };

    // Generate suggestions based on analysis
    if (analysis.overdue > 5) {
      return {
        type: 'behind-schedule',
        severity: 'high',
        suggestions: [
          { action: 'extend-timeline', weeks: 2 },
          { action: 'reduce-hours', newHours: student.availableHoursPerWeek - 2 },
          { action: 'skip-optional', videosToSkip: this.identifyOptionalVideos() },
        ],
      };
    }

    if (analysis.paceRatio > 1.5) {
      return {
        type: 'ahead-of-schedule',
        severity: 'low',
        suggestions: [
          { action: 'add-advanced-content', videos: this.suggestBonusVideos() },
          { action: 'finish-early', newDate: this.calculateEarlyFinish() },
        ],
      };
    }

    return { type: 'on-track', suggestions: [] };
  }

  /**
   * Reschedule a single event with cascade
   */
  async rescheduleEvent(
    eventId: string,
    newDate: Date,
    cascadeChanges = true
  ): Promise<void> {
    const event = await this.getEvent(eventId);

    // Update event
    await supabaseAdmin
      .from('calendar_events')
      .update({
        scheduled_date: newDate,
        rescheduled_from: event.scheduled_date,
        updated_at: new Date(),
      })
      .eq('id', eventId);

    // Cascade to dependent events if needed
    if (cascadeChanges) {
      const dependentEvents = await this.getDependentEvents(event.video_id);
      for (const depEvent of dependentEvents) {
        const daysDiff = differenceInDays(newDate, event.scheduled_date);
        const newDepDate = addDays(depEvent.scheduled_date, daysDiff);
        await this.rescheduleEvent(depEvent.id, newDepDate, false);
      }
    }
  }
}
```

## User Experience Flow

### First-Time User (Onboarding)

**Step 1: Welcome** (5 seconds)
- "Welcome! Let's create your personalized learning plan"
- Show benefit: "Students with a plan are 4x more likely to finish"

**Step 2: Quick Quiz** (2 minutes)
- 5 questions about goals, availability, preferences
- Progress bar showing "2 of 5"
- Skip option (uses defaults)

**Step 3: Calendar Generation** (10 seconds)
- Loading animation with fun facts
- "Analyzing 127 videos..."
- "Creating your custom schedule..."
- "Adding review sessions..."

**Step 4: Calendar Preview** (30 seconds)
- Show full calendar with highlights
- "Your course will take 8 weeks at 5 hours/week"
- "First video: tomorrow at 7 PM"
- "You'll finish by March 15, 2025"
- Call-to-action: "Start Learning" button

**Step 5: First Video** (immediate)
- Redirect to first scheduled video
- "+50 XP - Started your learning journey!"

### Returning User (Daily Check-in)

**Dashboard View**:
```
┌────────────────────────────────────────┐
│  Today's Schedule - Monday, Oct 21     │
│                                        │
│  🔵 Video 1: Introduction to React    │
│     45 minutes • Due: 7:00 PM         │
│     ▶ Start Learning                   │
│                                        │
│  ⚪ Video 2: Components & Props        │
│     60 minutes • Due: 8:00 PM         │
│     📅 Reschedule                      │
│                                        │
│  ─────────────────────────────────    │
│  Progress: 32% complete               │
│  Streak: 🔥 5 days                    │
│  On track to finish: Mar 12 ✅        │
└────────────────────────────────────────┘
```

### When Behind Schedule

**Adaptive Prompt**:
```
⚠️ You've missed 3 scheduled sessions

Would you like to:
• Extend your timeline by 2 weeks (Recommended)
• Add more hours per week
• Take a break and resume later
• Stick with current plan
```

## Performance Optimization

### Calendar Generation
- **Cache** generated calendars for 24 hours
- **Background job** for complex calculations
- **Progressive loading** show partial calendar while generating rest

### Database Queries
- **Indexed queries** on student_id + scheduled_date
- **Batch updates** when rescheduling multiple events
- **Materialized view** for progress calculations

### UI Performance
- **Virtual scrolling** for long calendars
- **Lazy load** future months
- **Optimistic updates** for instant feedback

## Cost Estimate

| Component | Usage | Cost/Month |
|-----------|-------|------------|
| **Claude API** | 100 calendars/day × 4K tokens | $24 |
| **Database** | Calendar queries (included in Supabase) | $0 |
| **Caching** | Calendar cache (included in Redis) | $0 |
| **Total** | | **$24/month** |

**Per Student**: $0.08 one-time + free daily checks

## Next Steps

1. Read `ALGORITHM.md` - Calendar generation algorithm details
2. Read `IMPLEMENTATION.md` - Step-by-step build guide
3. Read `UI_COMPONENTS.md` - All React components
4. Read `ADAPTIVE_LOGIC.md` - Rescheduling and adaptation
5. Review `TESTING.md` - Test scenarios and edge cases

---

**This is the ONBOARDING module - first impressions matter!** 🗓️
