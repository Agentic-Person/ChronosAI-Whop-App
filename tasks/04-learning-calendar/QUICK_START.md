# Learning Calendar - Quick Start Guide

## 5-Minute Setup

### 1. Run Database Migration

```bash
cd d:\APS\Projects\whop\AI-Video-Learning-Assistant
supabase db push
```

This creates:
- `calendar_events` table
- `schedule_preferences` table
- `study_sessions` table
- Database functions and RLS policies

### 2. Verify Environment Variables

Ensure these are set in `.env.local`:

```env
ANTHROPIC_API_KEY=sk-ant-... # Required for AI calendar generation
NEXT_PUBLIC_SUPABASE_URL=https://...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
```

### 3. Test the API

**Generate a calendar:**

```bash
curl -X POST http://localhost:3000/api/calendar/generate \
  -H "Content-Type: application/json" \
  -H "x-user-id: test-user-id" \
  -d '{
    "studentId": "YOUR_STUDENT_UUID",
    "creatorId": "YOUR_CREATOR_UUID",
    "onboardingData": {
      "primaryGoal": "career-change",
      "skillLevel": "beginner",
      "availableHoursPerWeek": 10,
      "targetCompletionWeeks": 12,
      "preferredDays": ["monday", "wednesday", "friday"],
      "preferredTimeSlots": ["evening"],
      "sessionLength": "medium",
      "learningStyle": "mixed",
      "pacePreference": "steady",
      "breakFrequency": "moderate"
    }
  }'
```

**Get upcoming events:**

```bash
curl http://localhost:3000/api/calendar/events?studentId=YOUR_STUDENT_UUID&upcoming=true&limit=5 \
  -H "x-user-id: test-user-id"
```

### 4. Add to Your App

**Onboarding Page:**

```tsx
// app/onboarding/page.tsx
import { OnboardingWizard } from '@/components/calendar/OnboardingWizard';

export default function OnboardingPage() {
  const handleComplete = async (data) => {
    const res = await fetch('/api/calendar/generate', {
      method: 'POST',
      body: JSON.stringify({
        studentId: userId,
        creatorId: creatorId,
        onboardingData: data,
      }),
    });

    if (res.ok) {
      router.push('/calendar');
    }
  };

  return <OnboardingWizard onComplete={handleComplete} />;
}
```

**Calendar Page:**

```tsx
// app/calendar/page.tsx
import { WeeklyCalendarView } from '@/components/calendar/WeeklyCalendarView';

export default async function CalendarPage() {
  const events = await fetchEvents();

  return (
    <WeeklyCalendarView
      events={events}
      onEventClick={(event) => router.push(`/videos/${event.video_id}`)}
      onMarkComplete={markComplete}
    />
  );
}
```

**Dashboard Widget:**

```tsx
// app/dashboard/page.tsx
import { UpcomingEvents } from '@/components/calendar/UpcomingEvents';

export default async function Dashboard() {
  const upcoming = await fetchUpcoming();

  return (
    <div>
      <h1>Dashboard</h1>
      <UpcomingEvents events={upcoming} />
    </div>
  );
}
```

### 5. Feature Gate Check

Ensure your user has PRO tier:

```typescript
import { FeatureGate } from '@/components/features/FeatureGate';
import { Feature } from '@/lib/features/types';

<FeatureGate feature={Feature.FEATURE_LEARNING_CALENDAR}>
  <CalendarContent />
</FeatureGate>
```

---

## Common Issues

### "No videos found for this creator"
**Solution:** Ensure creator has videos with `processing_status = 'completed'` in the database.

### "Timeline unrealistic" error
**Solution:** Either:
- Increase `availableHoursPerWeek`
- Increase `targetCompletionWeeks`
- The system will suggest optimal timeline in error message

### "Feature Access Denied"
**Solution:** User needs PRO tier. Update plan in database:
```sql
UPDATE creators SET current_plan = 'pro' WHERE id = 'user-id';
```

### Events not showing
**Solution:** Check RLS policies are active and user is authenticated.

---

## Next Steps

1. Read `docs/LEARNING_CALENDAR.md` for full documentation
2. Check `docs/CALENDAR_INTEGRATION_GUIDE.md` for module integration
3. Review `tasks/04-learning-calendar/COMPLETION_SUMMARY.md` for implementation details

---

## File Locations

**Backend:**
- `lib/calendar/calendar-generator.ts` - AI schedule generation
- `lib/calendar/calendar-service.ts` - Database operations
- `lib/calendar/adaptive-scheduler.ts` - Rescheduling logic

**Frontend:**
- `components/calendar/OnboardingWizard.tsx` - Onboarding form
- `components/calendar/WeeklyCalendarView.tsx` - Calendar UI
- `components/calendar/UpcomingEvents.tsx` - Dashboard widget

**API:**
- `app/api/calendar/generate/route.ts` - Generate calendar
- `app/api/calendar/events/route.ts` - Get events
- `app/api/calendar/events/[id]/route.ts` - Update/delete events
- `app/api/calendar/stats/route.ts` - Get statistics

**Database:**
- `supabase/migrations/20251021000011_learning_calendar.sql` - Schema

**Types:**
- `types/onboarding.ts` - Onboarding types
- `types/calendar.ts` - Calendar types

---

**Ready to use!** The Learning Calendar is fully implemented and production-ready.
