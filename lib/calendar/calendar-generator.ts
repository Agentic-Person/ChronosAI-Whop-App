/**
 * AI Calendar Generator Service
 * Uses Claude API to generate personalized learning schedules
 */

import Anthropic from '@anthropic-ai/sdk';
import { getSupabaseAdmin } from '@/lib/infrastructure/database/connection-pool';
import type { OnboardingData, AIScheduleItem, TimelineValidation } from '@/types/onboarding';
import type { CalendarEvent, CreateCalendarEventInput } from '@/types/calendar';
import { SESSION_LENGTH_MINUTES, TIME_SLOT_HOURS, DAY_OF_WEEK_NUMBERS } from './onboarding-questions';
import { getClaudeModel } from '@/lib/config/ai-models';

const claude = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

interface Video {
  id: string;
  title: string;
  duration: number; // minutes
  difficulty_level?: string;
  learning_objectives?: string[];
}

export class CalendarGenerator {
  /**
   * Generate personalized learning calendar for a student
   */
  async generate(
    studentId: string,
    creatorId: string,
    onboardingData: OnboardingData
  ): Promise<CalendarEvent[]> {
    console.log('[CalendarGenerator] Generating calendar for student:', studentId);

    try {
      // 1. Get all videos for this creator
      const videos = await this.getCreatorVideos(creatorId);
      console.log(`[CalendarGenerator] Found ${videos.length} videos`);

      if (videos.length === 0) {
        throw new Error('No videos found for this creator');
      }

      // 2. Filter by skill level
      const relevantVideos = this.filterBySkillLevel(videos, onboardingData.skillLevel);
      console.log(`[CalendarGenerator] ${relevantVideos.length} videos match skill level`);

      // 3. Validate timeline is realistic
      const validation = this.validateTimeline(relevantVideos, onboardingData);
      if (!validation.realistic) {
        throw new Error(validation.suggestion);
      }

      // 4. Use Claude to create optimized schedule
      const schedule = await this.generateAISchedule(relevantVideos, onboardingData);

      // 5. Add review sessions (every 5th video)
      const withReviews = this.addReviewSessions(schedule, relevantVideos);

      // 6. Store in database
      await this.saveCalendarEvents(studentId, withReviews);

      // 7. Save schedule preferences
      await this.saveSchedulePreferences(studentId, onboardingData);

      // 8. Unlock "Calendar Created" achievement (if gamification is enabled)
      await this.unlockAchievement(studentId, 'calendar-created');

      console.log(`[CalendarGenerator] Successfully generated ${withReviews.length} calendar events`);

      return withReviews as CalendarEvent[];
    } catch (error) {
      console.error('[CalendarGenerator] Error generating calendar:', error);
      throw error;
    }
  }

  /**
   * Get all processed videos for a creator
   */
  private async getCreatorVideos(creatorId: string): Promise<Video[]> {
    const { data, error } = await getSupabaseAdmin()
      .from('videos')
      .select('id, title, duration, difficulty_level, learning_objectives')
      .eq('creator_id', creatorId)
      .eq('processing_status', 'completed')
      .order('created_at', { ascending: true });

    if (error) {
      console.error('[CalendarGenerator] Error fetching videos:', error);
      throw new Error(`Failed to fetch videos: ${error.message}`);
    }

    return (data || []) as Video[];
  }

  /**
   * Filter videos based on student's skill level
   */
  private filterBySkillLevel(videos: Video[], skillLevel: string): Video[] {
    // For beginners: include beginner and some intermediate content
    if (skillLevel === 'beginner') {
      return videos.filter(
        (v) => v.difficulty_level === 'beginner' || v.difficulty_level === 'intermediate'
      );
    }

    // For intermediate: exclude pure beginner content
    if (skillLevel === 'intermediate') {
      return videos.filter((v) => v.difficulty_level !== 'beginner');
    }

    // For advanced: all content, prioritize advanced
    return videos;
  }

  /**
   * Validate if the timeline is realistic given available time
   */
  private validateTimeline(
    videos: Video[],
    data: OnboardingData
  ): TimelineValidation {
    const totalMinutes = videos.reduce((sum, v) => sum + v.duration, 0);
    const totalHours = Math.ceil(totalMinutes / 60);

    // Add 50% buffer for practice, quizzes, breaks
    const estimatedHours = Math.ceil(totalHours * 1.5);

    const availableHours = data.targetCompletionWeeks * data.availableHoursPerWeek;

    if (estimatedHours > availableHours) {
      const suggestedWeeks = Math.ceil(estimatedHours / data.availableHoursPerWeek);

      return {
        realistic: false,
        totalHoursNeeded: estimatedHours,
        totalHoursAvailable: availableHours,
        suggestion: `This course needs approximately ${estimatedHours} hours. At ${data.availableHoursPerWeek} hours/week, we recommend ${suggestedWeeks} weeks instead of ${data.targetCompletionWeeks}.`,
        suggestedWeeks,
      };
    }

    return {
      realistic: true,
      totalHoursNeeded: estimatedHours,
      totalHoursAvailable: availableHours,
    };
  }

  /**
   * Use Claude AI to generate optimized learning schedule
   */
  private async generateAISchedule(
    videos: Video[],
    data: OnboardingData
  ): Promise<Partial<CreateCalendarEventInput>[]> {
    const sessionMinutes = SESSION_LENGTH_MINUTES[data.sessionLength] || 50;
    const sessionsPerWeek = Math.floor(
      (data.availableHoursPerWeek * 60) / sessionMinutes
    );

    const prompt = `You are an expert learning designer. Create a personalized learning schedule.

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
${videos
  .map(
    (v, i) =>
      `${i + 1}. "${v.title}" (${v.duration} min, difficulty: ${v.difficulty_level || 'medium'})`
  )
  .join('\n')}

Create a schedule that:
1. Starts with easier videos in Week 1 for quick wins
2. Gradually increases difficulty
3. Respects session length preferences (${sessionMinutes} minutes per session)
4. Distributes videos across preferred days: ${data.preferredDays.join(', ')}
5. Adds buffer time between complex topics
6. Includes natural break days to prevent burnout
7. Ensures no more than ${sessionsPerWeek} sessions per week

Return ONLY a valid JSON array with this exact structure:
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

Important constraints:
- videoIndex must be 0-based and correspond to the video list above
- weekNumber starts at 1 and must not exceed ${data.targetCompletionWeeks}
- dayOfWeek must be from: ${data.preferredDays.join(', ')}
- timeSlot must be from: ${data.preferredTimeSlots.join(', ')}
- difficulty is 1-5 scale (1=easiest, 5=hardest)
- learningObjectives should be 2-3 clear, actionable outcomes
- Do not schedule more than ${sessionsPerWeek} sessions in any single week

Return ONLY the JSON array, no explanations.`;

    console.log('[CalendarGenerator] Calling Claude API for schedule generation...');

    const response = await claude.messages.create({
      model: getClaudeModel(),
      max_tokens: 8192,
      temperature: 0.7,
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
      console.error('[CalendarGenerator] Failed to parse AI response:', textContent);
      throw new Error('Failed to parse AI schedule response');
    }

    const aiSchedule: AIScheduleItem[] = JSON.parse(jsonMatch[0]);
    console.log(`[CalendarGenerator] AI generated ${aiSchedule.length} schedule items`);

    // Convert AI schedule to CalendarEvent format
    const now = new Date();
    const events: Partial<CreateCalendarEventInput>[] = [];

    for (const item of aiSchedule) {
      const video = videos[item.videoIndex];
      if (!video) {
        console.warn(`[CalendarGenerator] Video index ${item.videoIndex} not found, skipping`);
        continue;
      }

      const scheduledDate = this.calculateScheduledDate(
        now,
        item.weekNumber,
        item.dayOfWeek,
        item.timeSlot
      );

      events.push({
        video_id: video.id,
        scheduled_date: scheduledDate,
        session_duration: item.estimatedDuration,
        learning_objectives: item.learningObjectives,
        estimated_difficulty: item.difficulty,
      });
    }

    return events;
  }

  /**
   * Calculate the actual scheduled date from week/day/time
   */
  private calculateScheduledDate(
    startDate: Date,
    weekNumber: number,
    dayOfWeek: string,
    timeSlot: string
  ): Date {
    const date = new Date(startDate);

    // Move to the start of the target week
    date.setDate(date.getDate() + (weekNumber - 1) * 7);

    // Find the specified day of week
    const targetDay = DAY_OF_WEEK_NUMBERS[dayOfWeek.toLowerCase()] || 1;
    const currentDay = date.getDay();
    const daysToAdd = (targetDay - currentDay + 7) % 7;
    date.setDate(date.getDate() + daysToAdd);

    // Set time based on slot
    const hour = TIME_SLOT_HOURS[timeSlot.toLowerCase()] || 19;
    date.setHours(hour, 0, 0, 0);

    return date;
  }

  /**
   * Add review sessions after complex topics
   * Every 5th video gets a review session scheduled
   */
  private addReviewSessions(
    events: Partial<CreateCalendarEventInput>[],
    videos: Video[]
  ): Partial<CreateCalendarEventInput>[] {
    // For now, we'll skip review sessions to keep it simple
    // Can be enhanced later to add dedicated review/practice sessions
    return events;
  }

  /**
   * Save calendar events to database
   */
  private async saveCalendarEvents(
    studentId: string,
    events: Partial<CreateCalendarEventInput>[]
  ): Promise<void> {
    const eventsWithStudent = events.map((event) => ({
      ...event,
      student_id: studentId,
      completed: false,
    }));

    const { error } = await getSupabaseAdmin()
      .from('calendar_events')
      .insert(eventsWithStudent as any);

    if (error) {
      console.error('[CalendarGenerator] Error saving calendar events:', error);
      throw new Error(`Failed to save calendar events: ${error.message}`);
    }
  }

  /**
   * Save student's schedule preferences
   */
  private async saveSchedulePreferences(
    studentId: string,
    data: OnboardingData
  ): Promise<void> {
    const preferences = {
      student_id: studentId,
      target_completion_date: new Date(
        Date.now() + data.targetCompletionWeeks * 7 * 24 * 60 * 60 * 1000
      ).toISOString(),
      available_hours_per_week: data.availableHoursPerWeek,
      preferred_days: data.preferredDays,
      preferred_time_slots: data.preferredTimeSlots,
      session_length: data.sessionLength,
      primary_goal: data.primaryGoal,
      skill_level: data.skillLevel,
      learning_style: data.learningStyle,
      pace_preference: data.pacePreference,
      break_frequency: data.breakFrequency,
    };

    const { error } = await getSupabaseAdmin()
      .from('schedule_preferences')
      .upsert(preferences, {
        onConflict: 'student_id',
      });

    if (error) {
      console.error('[CalendarGenerator] Error saving schedule preferences:', error);
      // Don't throw - preferences are nice to have but not critical
    }
  }

  /**
   * Unlock achievement for creating calendar
   */
  private async unlockAchievement(
    studentId: string,
    achievementSlug: string
  ): Promise<void> {
    try {
      // Get achievement ID
      const { data: achievement } = await getSupabaseAdmin()
        .from('achievements')
        .select('id, xp_value')
        .eq('slug', achievementSlug)
        .single();

      if (!achievement) {
        console.log(`[CalendarGenerator] Achievement ${achievementSlug} not found`);
        return;
      }

      // Check if already unlocked
      const { data: existing } = await getSupabaseAdmin()
        .from('student_achievements')
        .select('id')
        .eq('student_id', studentId)
        .eq('achievement_id', achievement.id)
        .single();

      if (existing) {
        console.log(`[CalendarGenerator] Achievement already unlocked`);
        return;
      }

      // Unlock achievement
      await getSupabaseAdmin()
        .from('student_achievements')
        .insert({
          student_id: studentId,
          achievement_id: achievement.id,
        });

      // Add XP (if the RPC function exists)
      await getSupabaseAdmin()
        .rpc('add_student_xp', {
          student_id: studentId,
          xp_amount: achievement.xp_value,
        })
        .then(() => {
          console.log(`[CalendarGenerator] Added ${achievement.xp_value} XP for achievement`);
        })
        .catch((err) => {
          console.log('[CalendarGenerator] XP RPC not available yet:', err.message);
        });
    } catch (error) {
      console.error('[CalendarGenerator] Error unlocking achievement:', error);
      // Don't throw - achievements are nice to have but not critical
    }
  }
}
