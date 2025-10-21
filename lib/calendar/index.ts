/**
 * Learning Calendar Module
 * Exports all calendar-related services and utilities
 */

// Services
export { CalendarGenerator } from './calendar-generator';
export { calendarService, CalendarService } from './calendar-service';
export { adaptiveScheduler, AdaptiveScheduler } from './adaptive-scheduler';

// Configuration
export { ONBOARDING_QUESTIONS, SESSION_LENGTH_MINUTES, TIME_SLOT_HOURS, DAY_OF_WEEK_NUMBERS } from './onboarding-questions';

// Types are exported from their respective type files
// Import from @/types/calendar or @/types/onboarding
