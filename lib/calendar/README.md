# Module 4: Learning Calendar

**Status:** Full Implementation Required
**Agent:** Agent 4

## Responsibilities
- Student onboarding flow (preferences + project interests)
- AI schedule generation with multiple event types:
  - Video watching time
  - Quiz preparation
  - Project work blocks
  - Peer collaboration sessions
- Calendar UI with React Big Calendar
- To-do list with subtasks for projects
- Rescheduling logic considering project deadlines
- Email/push reminders

## Key Files
- `schedule-generator.ts` - AI scheduling algorithm
- `calendar-service.ts` - Event management
- `onboarding.ts` - Preference collection
- `reminder-system.ts` - Notification logic

## Dependencies
- Claude API for intelligent scheduling
- React Big Calendar for UI
- Zustand for state
- n8n for automation

## API Endpoints
- `POST /api/calendar/generate` - Generate personalized schedule
- `GET /api/calendar/events` - Get upcoming events
- `PATCH /api/calendar/reschedule` - Adjust schedule
- `POST /api/calendar/complete` - Mark event complete

## Testing
- Schedule generation algorithm tests
- Pacing appropriateness validation
- Deadline conflict detection
- Progress integration tests
