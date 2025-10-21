/**
 * Calendar Service
 * Database operations for calendar events and study sessions
 */

import { getSupabaseAdmin, getSupabaseClient } from '@/lib/infrastructure/database/connection-pool';
import type {
  CalendarEvent,
  CreateCalendarEventInput,
  UpdateCalendarEventInput,
  CalendarEventFilters,
  StudySession,
} from '@/types/calendar';
import type { StudyStats } from '@/types/onboarding';

export class CalendarService {
  /**
   * Create a new calendar event
   */
  async createEvent(input: CreateCalendarEventInput): Promise<CalendarEvent> {
    const { data, error } = await getSupabaseAdmin()
      .from('calendar_events')
      .insert({
        student_id: input.student_id,
        video_id: input.video_id,
        scheduled_date: input.scheduled_date.toISOString(),
        session_duration: input.session_duration,
        learning_objectives: input.learning_objectives,
        prerequisites: input.prerequisites,
        estimated_difficulty: input.estimated_difficulty,
        completed: false,
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create calendar event: ${error.message}`);
    }

    return data as CalendarEvent;
  }

  /**
   * Get upcoming events for a student
   */
  async getUpcomingEvents(studentId: string, limit: number = 5): Promise<CalendarEvent[]> {
    const { data, error } = await getSupabaseClient()
      .from('calendar_events')
      .select(`
        *,
        video:videos (
          id,
          title,
          duration,
          difficulty_level,
          thumbnail_url
        )
      `)
      .eq('student_id', studentId)
      .eq('completed', false)
      .gte('scheduled_date', new Date().toISOString())
      .order('scheduled_date', { ascending: true })
      .limit(limit);

    if (error) {
      throw new Error(`Failed to fetch upcoming events: ${error.message}`);
    }

    return (data || []) as CalendarEvent[];
  }

  /**
   * Get events within a date range
   */
  async getEventsByDateRange(filters: CalendarEventFilters): Promise<CalendarEvent[]> {
    let query = getSupabaseClient()
      .from('calendar_events')
      .select(`
        *,
        video:videos (
          id,
          title,
          duration,
          difficulty_level,
          thumbnail_url
        )
      `)
      .eq('student_id', filters.studentId);

    if (filters.startDate) {
      query = query.gte('scheduled_date', filters.startDate.toISOString());
    }

    if (filters.endDate) {
      query = query.lte('scheduled_date', filters.endDate.toISOString());
    }

    if (filters.completed !== undefined) {
      query = query.eq('completed', filters.completed);
    }

    if (filters.videoId) {
      query = query.eq('video_id', filters.videoId);
    }

    query = query.order('scheduled_date', { ascending: true });

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to fetch events: ${error.message}`);
    }

    return (data || []) as CalendarEvent[];
  }

  /**
   * Get all events for a student
   */
  async getAllEvents(studentId: string): Promise<CalendarEvent[]> {
    const { data, error } = await getSupabaseClient()
      .from('calendar_events')
      .select(`
        *,
        video:videos (
          id,
          title,
          duration,
          difficulty_level,
          thumbnail_url
        )
      `)
      .eq('student_id', studentId)
      .order('scheduled_date', { ascending: true });

    if (error) {
      throw new Error(`Failed to fetch all events: ${error.message}`);
    }

    return (data || []) as CalendarEvent[];
  }

  /**
   * Mark a calendar event as complete
   */
  async markEventComplete(
    eventId: string,
    actualDuration?: number
  ): Promise<CalendarEvent> {
    const updateData: any = {
      completed: true,
      completed_at: new Date().toISOString(),
    };

    if (actualDuration) {
      updateData.actual_duration = actualDuration;
    }

    const { data, error } = await getSupabaseAdmin()
      .from('calendar_events')
      .update(updateData)
      .eq('id', eventId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to mark event complete: ${error.message}`);
    }

    return data as CalendarEvent;
  }

  /**
   * Update a calendar event
   */
  async updateEvent(
    eventId: string,
    updates: UpdateCalendarEventInput
  ): Promise<CalendarEvent> {
    const updateData: any = {};

    if (updates.scheduled_date) {
      updateData.scheduled_date = updates.scheduled_date.toISOString();
    }

    if (updates.session_duration !== undefined) {
      updateData.session_duration = updates.session_duration;
    }

    if (updates.completed !== undefined) {
      updateData.completed = updates.completed;
    }

    if (updates.completed_at) {
      updateData.completed_at = updates.completed_at.toISOString();
    }

    if (updates.rescheduled_from) {
      updateData.rescheduled_from = updates.rescheduled_from.toISOString();
      updateData.reschedule_count = await this.incrementRescheduleCount(eventId);
    }

    const { data, error } = await getSupabaseAdmin()
      .from('calendar_events')
      .update(updateData)
      .eq('id', eventId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update event: ${error.message}`);
    }

    return data as CalendarEvent;
  }

  /**
   * Reschedule a calendar event
   */
  async rescheduleEvent(
    eventId: string,
    newDate: Date,
    cascadeChanges: boolean = false
  ): Promise<void> {
    // Get the original event
    const { data: event, error: fetchError } = await getSupabaseAdmin()
      .from('calendar_events')
      .select('*, video:videos(*)')
      .eq('id', eventId)
      .single();

    if (fetchError || !event) {
      throw new Error('Event not found');
    }

    const originalDate = new Date(event.scheduled_date);

    // Update the event with new date
    await this.updateEvent(eventId, {
      scheduled_date: newDate,
      rescheduled_from: originalDate,
    });

    // If cascading, reschedule dependent events
    if (cascadeChanges && event.prerequisites) {
      const daysDiff = Math.floor(
        (newDate.getTime() - originalDate.getTime()) / (1000 * 60 * 60 * 24)
      );

      // Find events that have this video as a prerequisite
      const { data: dependentEvents } = await getSupabaseAdmin()
        .from('calendar_events')
        .select('*')
        .eq('student_id', event.student_id)
        .contains('prerequisites', [event.video_id]);

      if (dependentEvents && dependentEvents.length > 0) {
        for (const depEvent of dependentEvents) {
          const depOriginalDate = new Date(depEvent.scheduled_date);
          const newDepDate = new Date(
            depOriginalDate.getTime() + daysDiff * 24 * 60 * 60 * 1000
          );

          await this.rescheduleEvent(depEvent.id, newDepDate, false);
        }
      }
    }
  }

  /**
   * Delete a calendar event
   */
  async deleteEvent(eventId: string): Promise<void> {
    const { error } = await getSupabaseAdmin()
      .from('calendar_events')
      .delete()
      .eq('id', eventId);

    if (error) {
      throw new Error(`Failed to delete event: ${error.message}`);
    }
  }

  /**
   * Start a study session
   */
  async startStudySession(
    studentId: string,
    eventId?: string
  ): Promise<StudySession> {
    const { data, error } = await getSupabaseAdmin()
      .from('study_sessions')
      .insert({
        student_id: studentId,
        event_id: eventId,
        started_at: new Date().toISOString(),
        completed: false,
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to start study session: ${error.message}`);
    }

    return data as StudySession;
  }

  /**
   * End a study session
   */
  async endStudySession(
    sessionId: string,
    completed: boolean = true
  ): Promise<StudySession> {
    const now = new Date();

    // Get the session to calculate duration
    const { data: session } = await getSupabaseAdmin()
      .from('study_sessions')
      .select('started_at')
      .eq('id', sessionId)
      .single();

    let durationMinutes = 0;
    if (session) {
      const startTime = new Date(session.started_at);
      durationMinutes = Math.floor((now.getTime() - startTime.getTime()) / (1000 * 60));
    }

    const { data, error } = await getSupabaseAdmin()
      .from('study_sessions')
      .update({
        ended_at: now.toISOString(),
        duration_minutes: durationMinutes,
        completed,
      })
      .eq('id', sessionId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to end study session: ${error.message}`);
    }

    return data as StudySession;
  }

  /**
   * Get study statistics for a student
   */
  async getStudyStats(studentId: string): Promise<StudyStats> {
    // Call the database function we created in the migration
    const { data, error } = await getSupabaseAdmin()
      .rpc('get_study_stats', {
        p_student_id: studentId,
      });

    if (error) {
      console.error('Error fetching study stats:', error);
      // Return default stats if function not available
      return this.calculateStudyStatsManually(studentId);
    }

    // Add projected completion date
    const stats = data as StudyStats;
    stats.projectedCompletionDate = await this.calculateProjectedCompletion(studentId);
    stats.onTrackStatus = await this.calculateOnTrackStatus(studentId);

    return stats;
  }

  /**
   * Calculate study stats manually (fallback)
   */
  private async calculateStudyStatsManually(studentId: string): Promise<StudyStats> {
    const { data: sessions } = await getSupabaseAdmin()
      .from('study_sessions')
      .select('*')
      .eq('student_id', studentId)
      .eq('completed', true);

    const totalSessions = sessions?.length || 0;
    const totalMinutes = sessions?.reduce((sum, s) => sum + (s.duration_minutes || 0), 0) || 0;
    const avgSessionLength = totalSessions > 0 ? totalMinutes / totalSessions : 0;

    return {
      totalSessionsCompleted: totalSessions,
      totalMinutesStudied: totalMinutes,
      averageSessionLength: Math.round(avgSessionLength),
      completionRate: 0,
      streakDays: 0,
      longestStreak: 0,
      sessionsThisWeek: 0,
      onTrackStatus: 'on-track',
      projectedCompletionDate: new Date(),
    };
  }

  /**
   * Calculate projected completion date
   */
  private async calculateProjectedCompletion(studentId: string): Promise<Date> {
    const { data: events } = await getSupabaseAdmin()
      .from('calendar_events')
      .select('scheduled_date')
      .eq('student_id', studentId)
      .eq('completed', false)
      .order('scheduled_date', { ascending: false })
      .limit(1);

    if (events && events.length > 0) {
      return new Date(events[0].scheduled_date);
    }

    return new Date();
  }

  /**
   * Calculate if student is on track
   */
  private async calculateOnTrackStatus(
    studentId: string
  ): Promise<'ahead' | 'on-track' | 'behind'> {
    const now = new Date();

    // Get events that should have been completed by now
    const { data: pastEvents } = await getSupabaseAdmin()
      .from('calendar_events')
      .select('id, completed')
      .eq('student_id', studentId)
      .lte('scheduled_date', now.toISOString());

    if (!pastEvents || pastEvents.length === 0) {
      return 'on-track';
    }

    const totalPast = pastEvents.length;
    const completedPast = pastEvents.filter((e) => e.completed).length;
    const completionRate = completedPast / totalPast;

    if (completionRate >= 1.1) return 'ahead';
    if (completionRate >= 0.8) return 'on-track';
    return 'behind';
  }

  /**
   * Increment reschedule count for an event
   */
  private async incrementRescheduleCount(eventId: string): Promise<number> {
    const { data } = await getSupabaseAdmin()
      .from('calendar_events')
      .select('reschedule_count')
      .eq('id', eventId)
      .single();

    return (data?.reschedule_count || 0) + 1;
  }
}

// Export singleton instance
export const calendarService = new CalendarService();
