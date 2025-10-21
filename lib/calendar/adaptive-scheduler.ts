/**
 * Adaptive Scheduler
 * Analyzes student progress and suggests schedule adjustments
 */

import { getSupabaseAdmin } from '@/lib/infrastructure/database/connection-pool';
import type { AdaptationSuggestion } from '@/types/onboarding';
import { calendarService } from './calendar-service';
import { differenceInDays, isPast, addDays } from 'date-fns';

interface ProgressAnalysis {
  totalScheduled: number;
  completed: number;
  overdue: number;
  onTrack: boolean;
  paceRatio: number; // >1 = ahead, <1 = behind
  daysSinceLastSession: number;
}

export class AdaptiveScheduler {
  /**
   * Analyze student progress and suggest adjustments
   */
  async analyzeAndAdapt(studentId: string): Promise<AdaptationSuggestion> {
    const analysis = await this.analyzeProgress(studentId);

    // Long break detection (7+ days without activity)
    if (analysis.daysSinceLastSession >= 7) {
      return this.createWelcomeBackSuggestion(studentId, analysis);
    }

    // Behind schedule
    if (analysis.overdue > 5) {
      return this.createBehindScheduleSuggestion(studentId, analysis);
    }

    // Ahead of schedule
    if (analysis.paceRatio > 1.5) {
      return this.createAheadOfScheduleSuggestion(studentId, analysis);
    }

    // On track
    return {
      type: 'on-track',
      severity: 'low',
      suggestions: [],
      message: "You're on track! Keep up the great work!",
    };
  }

  /**
   * Analyze current progress
   */
  private async analyzeProgress(studentId: string): Promise<ProgressAnalysis> {
    const now = new Date();

    // Get all events
    const { data: allEvents } = await getSupabaseAdmin()
      .from('calendar_events')
      .select('id, scheduled_date, completed, completed_at')
      .eq('student_id', studentId);

    const events = allEvents || [];

    // Calculate metrics
    const totalScheduled = events.length;
    const completed = events.filter((e) => e.completed).length;
    const overdue = events.filter(
      (e) => !e.completed && isPast(new Date(e.scheduled_date))
    ).length;

    // Calculate expected vs actual completion
    const pastEvents = events.filter((e) => isPast(new Date(e.scheduled_date)));
    const expectedCompleted = pastEvents.length;
    const actualCompleted = pastEvents.filter((e) => e.completed).length;
    const paceRatio = expectedCompleted > 0 ? actualCompleted / expectedCompleted : 1;

    // Days since last session
    const { data: lastSession } = await getSupabaseAdmin()
      .from('study_sessions')
      .select('started_at')
      .eq('student_id', studentId)
      .eq('completed', true)
      .order('started_at', { ascending: false })
      .limit(1)
      .single();

    const daysSinceLastSession = lastSession
      ? differenceInDays(now, new Date(lastSession.started_at))
      : 999;

    return {
      totalScheduled,
      completed,
      overdue,
      onTrack: paceRatio >= 0.8 && paceRatio <= 1.2,
      paceRatio,
      daysSinceLastSession,
    };
  }

  /**
   * Create suggestion for students behind schedule
   */
  private async createBehindScheduleSuggestion(
    studentId: string,
    analysis: ProgressAnalysis
  ): Promise<AdaptationSuggestion> {
    // Get student preferences
    const { data: prefs } = await getSupabaseAdmin()
      .from('schedule_preferences')
      .select('*')
      .eq('student_id', studentId)
      .single();

    const suggestions = [];

    // Option 1: Extend timeline by 2-4 weeks
    const extendWeeks = Math.ceil(analysis.overdue / 3);
    suggestions.push({
      action: 'extend-timeline' as const,
      weeks: extendWeeks,
    });

    // Option 2: Reduce weekly hours (if currently intensive)
    if (prefs && prefs.available_hours_per_week >= 10) {
      suggestions.push({
        action: 'reduce-hours' as const,
        newHours: Math.max(5, prefs.available_hours_per_week - 3),
      });
    }

    // Option 3: Skip optional content (identify lowest priority videos)
    const optionalVideos = await this.identifyOptionalVideos(studentId);
    if (optionalVideos.length > 0) {
      suggestions.push({
        action: 'skip-optional' as const,
        videosToSkip: optionalVideos.slice(0, Math.min(3, Math.floor(analysis.overdue / 2))),
      });
    }

    return {
      type: 'behind-schedule',
      severity: analysis.overdue > 10 ? 'high' : 'medium',
      suggestions,
      message: `You have ${analysis.overdue} overdue sessions. Let's adjust your schedule to help you catch up.`,
    };
  }

  /**
   * Create suggestion for students ahead of schedule
   */
  private async createAheadOfScheduleSuggestion(
    studentId: string,
    analysis: ProgressAnalysis
  ): Promise<AdaptationSuggestion> {
    // Get advanced content that could be added
    const bonusVideos = await this.suggestBonusVideos(studentId);
    const earlyFinishDate = await this.calculateEarlyFinishDate(studentId);

    const suggestions = [];

    if (bonusVideos.length > 0) {
      suggestions.push({
        action: 'add-advanced-content' as const,
        videos: bonusVideos,
      });
    }

    if (earlyFinishDate) {
      suggestions.push({
        action: 'finish-early' as const,
        newDate: earlyFinishDate,
      });
    }

    return {
      type: 'ahead-of-schedule',
      severity: 'low',
      suggestions,
      message: `Amazing work! You're ahead of schedule. Want to add more content or finish early?`,
    };
  }

  /**
   * Create welcome back suggestion after break
   */
  private createWelcomeBackSuggestion(
    studentId: string,
    analysis: ProgressAnalysis
  ): Promise<AdaptationSuggestion> {
    return Promise.resolve({
      type: 'returning-after-break',
      severity: 'medium',
      suggestions: [
        {
          action: 'extend-timeline' as const,
          weeks: Math.ceil(analysis.daysSinceLastSession / 7),
        },
      ],
      message: `Welcome back! It's been ${analysis.daysSinceLastSession} days. Let's ease back in with a gentle catchup plan.`,
    });
  }

  /**
   * Identify optional videos that can be skipped
   */
  private async identifyOptionalVideos(studentId: string): Promise<string[]> {
    // Get uncompleted events with lower difficulty and no dependents
    const { data: events } = await getSupabaseAdmin()
      .from('calendar_events')
      .select('id, video_id, estimated_difficulty')
      .eq('student_id', studentId)
      .eq('completed', false)
      .lte('estimated_difficulty', 2) // Easier videos
      .order('estimated_difficulty', { ascending: true })
      .limit(5);

    return (events || []).map((e) => e.video_id);
  }

  /**
   * Suggest bonus/advanced videos
   */
  private async suggestBonusVideos(studentId: string): Promise<string[]> {
    // Get student's creator ID
    const { data: student } = await getSupabaseAdmin()
      .from('students')
      .select('creator_id')
      .eq('id', studentId)
      .single();

    if (!student) return [];

    // Find advanced videos not yet scheduled
    const { data: scheduledVideoIds } = await getSupabaseAdmin()
      .from('calendar_events')
      .select('video_id')
      .eq('student_id', studentId);

    const scheduled = new Set(scheduledVideoIds?.map((e) => e.video_id) || []);

    const { data: advancedVideos } = await getSupabaseAdmin()
      .from('videos')
      .select('id')
      .eq('creator_id', student.creator_id)
      .eq('difficulty_level', 'advanced')
      .eq('processing_status', 'completed')
      .limit(5);

    return (advancedVideos || [])
      .filter((v) => !scheduled.has(v.id))
      .map((v) => v.id)
      .slice(0, 3);
  }

  /**
   * Calculate early finish date based on current pace
   */
  private async calculateEarlyFinishDate(studentId: string): Promise<Date | null> {
    const { data: lastEvent } = await getSupabaseAdmin()
      .from('calendar_events')
      .select('scheduled_date')
      .eq('student_id', studentId)
      .eq('completed', false)
      .order('scheduled_date', { ascending: false })
      .limit(1)
      .single();

    if (!lastEvent) return null;

    const analysis = await this.analyzeProgress(studentId);

    if (analysis.paceRatio <= 1.2) return null;

    // Calculate how much ahead they are
    const daysAhead = Math.floor((analysis.paceRatio - 1) * 30); // Rough estimate
    const currentEnd = new Date(lastEvent.scheduled_date);
    const newEnd = addDays(currentEnd, -daysAhead);

    return newEnd;
  }

  /**
   * Apply an adaptation suggestion
   */
  async applyAdaptation(
    studentId: string,
    action: 'extend-timeline' | 'reduce-hours' | 'skip-optional' | 'add-advanced-content' | 'finish-early',
    params: any
  ): Promise<void> {
    switch (action) {
      case 'extend-timeline':
        await this.extendTimeline(studentId, params.weeks);
        break;

      case 'skip-optional':
        await this.skipVideos(studentId, params.videosToSkip);
        break;

      case 'add-advanced-content':
        await this.addBonusContent(studentId, params.videos);
        break;

      default:
        console.log(`[AdaptiveScheduler] Unhandled action: ${action}`);
    }
  }

  /**
   * Extend timeline by pushing all future events
   */
  private async extendTimeline(studentId: string, weeks: number): Promise<void> {
    const { data: futureEvents } = await getSupabaseAdmin()
      .from('calendar_events')
      .select('id, scheduled_date')
      .eq('student_id', studentId)
      .eq('completed', false)
      .gte('scheduled_date', new Date().toISOString());

    if (!futureEvents || futureEvents.length === 0) return;

    // Spread events out over the extended timeline
    const daysToAdd = weeks * 7;
    const daysPerEvent = daysToAdd / futureEvents.length;

    for (let i = 0; i < futureEvents.length; i++) {
      const event = futureEvents[i];
      const originalDate = new Date(event.scheduled_date);
      const newDate = addDays(originalDate, Math.floor(daysPerEvent * (i + 1)));

      await calendarService.updateEvent(event.id, {
        scheduled_date: newDate,
        rescheduled_from: originalDate,
      });
    }

    console.log(`[AdaptiveScheduler] Extended timeline by ${weeks} weeks for ${futureEvents.length} events`);
  }

  /**
   * Skip optional videos by deleting their events
   */
  private async skipVideos(studentId: string, videoIds: string[]): Promise<void> {
    const { error } = await getSupabaseAdmin()
      .from('calendar_events')
      .delete()
      .eq('student_id', studentId)
      .in('video_id', videoIds)
      .eq('completed', false);

    if (error) {
      console.error('[AdaptiveScheduler] Error skipping videos:', error);
    } else {
      console.log(`[AdaptiveScheduler] Skipped ${videoIds.length} optional videos`);
    }
  }

  /**
   * Add bonus content to calendar
   */
  private async addBonusContent(studentId: string, videoIds: string[]): Promise<void> {
    // Get last scheduled event date
    const { data: lastEvent } = await getSupabaseAdmin()
      .from('calendar_events')
      .select('scheduled_date')
      .eq('student_id', studentId)
      .order('scheduled_date', { ascending: false })
      .limit(1)
      .single();

    if (!lastEvent) return;

    // Get schedule preferences
    const { data: prefs } = await getSupabaseAdmin()
      .from('schedule_preferences')
      .select('*')
      .eq('student_id', studentId)
      .single();

    if (!prefs) return;

    const startDate = addDays(new Date(lastEvent.scheduled_date), 3);
    const preferredDay = prefs.preferred_days[0] || 'monday';
    const preferredTime = prefs.preferred_time_slots[0] || 'evening';

    // Create events for bonus content
    const events = videoIds.map((videoId, index) => {
      const eventDate = addDays(startDate, index * 3); // Space out by 3 days

      return {
        student_id: studentId,
        video_id: videoId,
        scheduled_date: eventDate.toISOString(),
        session_duration: 60,
        estimated_difficulty: 4,
        completed: false,
      };
    });

    await getSupabaseAdmin().from('calendar_events').insert(events);

    console.log(`[AdaptiveScheduler] Added ${events.length} bonus videos`);
  }
}

// Export singleton instance
export const adaptiveScheduler = new AdaptiveScheduler();
