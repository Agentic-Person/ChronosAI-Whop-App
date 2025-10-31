/**
 * AI-Powered Study Buddy Matching Algorithm
 * Uses compatibility scoring to match students for collaborative learning
 */

import { createClient } from '@/lib/utils/supabase-client';
import Anthropic from '@anthropic-ai/sdk';
import {
  MatchingPreferences,
  MatchScore,
  MatchCandidate,
  StudentProfile,
  TimeSlot,
} from './types';
import { getClaudeModel } from '@/lib/config/ai-models';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

export class MatchingAlgorithm {
  /**
   * Find compatible study buddies for a student
   */
  async findStudyBuddies(
    studentId: string,
    preferences: MatchingPreferences,
    limit: number = 10
  ): Promise<MatchCandidate[]> {
    const supabase = createClient();

    // 1. Get student info
    const { data: student } = await supabase
      .from('students')
      .select('*')
      .eq('id', studentId)
      .single();

    if (!student) throw new Error('Student not found');

    // Calculate student's learning pace
    const weeksSinceJoin = Math.max(
      1,
      Math.floor(
        (Date.now() - new Date(student.created_at).getTime()) /
          (7 * 24 * 60 * 60 * 1000)
      )
    );

    const { count: totalVideos } = await supabase
      .from('learning_progress')
      .select('*', { count: 'exact', head: true })
      .eq('student_id', studentId)
      .eq('completed', true);

    const videosPerWeek = Math.ceil((totalVideos || 0) / weeksSinceJoin);

    // 2. Get existing connections to exclude
    const { data: existingConnections } = await supabase
      .from('study_buddy_matches')
      .select('student_a_id, student_b_id')
      .or(`student_a_id.eq.${studentId},student_b_id.eq.${studentId}`)
      .in('status', ['suggested', 'connected']);

    const connectedIds = new Set<string>(
      existingConnections?.flatMap((c) =>
        [c.student_a_id, c.student_b_id].filter((id) => id !== studentId)
      ) || []
    );

    // 3. Build query filters for candidates
    let query = supabase
      .from('students')
      .select(
        `
        *,
        matching_preferences (*)
      `
      )
      .neq('id', studentId)
      .eq('matching_preferences.open_to_matching', true)
      .gte('level', student.level - 3)
      .lte('level', student.level + 3);

    // Age group safety: minors must match age group
    if (student.age_group !== '22+') {
      query = query.eq('age_group', student.age_group);
    }

    // Timezone preference (within ±4 hours)
    if (preferences.timezone) {
      query = query.eq('matching_preferences.timezone', preferences.timezone);
    }

    const { data: candidates, error } = await query.limit(50);

    if (error) throw error;
    if (!candidates || candidates.length === 0) return [];

    // 4. Calculate match scores for each candidate
    const matches: MatchCandidate[] = [];

    for (const candidate of candidates) {
      if (!candidate.matching_preferences) continue;
      if (connectedIds.has(candidate.id)) continue;

      // Calculate candidate's videos per week
      const candWeeksSinceJoin = Math.max(
        1,
        Math.floor(
          (Date.now() - new Date(candidate.created_at).getTime()) /
            (7 * 24 * 60 * 60 * 1000)
        )
      );

      const { count: candTotalVideos } = await supabase
        .from('learning_progress')
        .select('*', { count: 'exact', head: true })
        .eq('student_id', candidate.id)
        .eq('completed', true);

      const candVideosPerWeek = Math.ceil(
        (candTotalVideos || 0) / candWeeksSinceJoin
      );

      const matchScore = this.calculateCompatibility(
        { ...student, videos_per_week: videosPerWeek },
        { ...candidate, videos_per_week: candVideosPerWeek },
        preferences,
        candidate.matching_preferences
      );

      // Only include matches with score >= 60
      if (matchScore.totalScore >= 60) {
        matches.push({
          student: {
            id: candidate.id,
            name: candidate.name,
            avatar_url: candidate.avatar_url,
            level: candidate.level,
            current_module: candidate.current_module,
            videos_per_week: candVideosPerWeek,
            age_group: candidate.age_group,
            user_id: candidate.user_id,
            created_at: candidate.created_at,
          },
          preferences: candidate.matching_preferences,
          matchScore,
        });
      }
    }

    // 5. Sort by match score and return top N
    return matches
      .sort((a, b) => b.matchScore.totalScore - a.matchScore.totalScore)
      .slice(0, limit);
  }

  /**
   * Calculate compatibility score between two students
   */
  calculateCompatibility(
    student: StudentProfile & { videos_per_week: number },
    candidate: StudentProfile & { videos_per_week: number },
    studentPrefs: MatchingPreferences,
    candidatePrefs: MatchingPreferences
  ): MatchScore {
    let totalScore = 0;
    const breakdown = {
      levelCompatibility: 0,
      goalAlignment: 0,
      scheduleOverlap: 0,
      learningPaceMatch: 0,
      interestsOverlap: 0,
      communicationStyleFit: 0,
    };

    // 1. Level Compatibility (25 points) - Most important
    const levelDiff = Math.abs(student.level - candidate.level);
    breakdown.levelCompatibility = Math.max(0, 25 - levelDiff * 8);
    totalScore += breakdown.levelCompatibility;

    // 2. Goal Alignment (20 points)
    const sharedTopics = this.countSharedItems(
      studentPrefs.interested_topics || [],
      candidatePrefs.interested_topics || []
    );
    breakdown.goalAlignment = Math.min(20, sharedTopics * 7);
    totalScore += breakdown.goalAlignment;

    // 3. Schedule Overlap (20 points)
    const overlapHours = this.calculateScheduleOverlap(
      studentPrefs.preferred_study_times || [],
      candidatePrefs.preferred_study_times || [],
      studentPrefs.timezone,
      candidatePrefs.timezone
    );
    breakdown.scheduleOverlap = Math.min(20, overlapHours * 4);
    totalScore += breakdown.scheduleOverlap;

    // 4. Learning Pace Match (15 points)
    const paceDiff = Math.abs(
      student.videos_per_week - candidate.videos_per_week
    );
    breakdown.learningPaceMatch = Math.max(0, 15 - paceDiff * 2);
    totalScore += breakdown.learningPaceMatch;

    // 5. Interests Overlap (10 points)
    const sharedInterests = this.countSharedItems(
      studentPrefs.project_interests || [],
      candidatePrefs.project_interests || []
    );
    breakdown.interestsOverlap = Math.min(10, sharedInterests * 4);
    totalScore += breakdown.interestsOverlap;

    // 6. Communication Style Fit (10 points)
    const commMatch = this.checkCommunicationMatch(
      studentPrefs.communication_preference,
      candidatePrefs.communication_preference
    );
    breakdown.communicationStyleFit = commMatch ? 10 : 5;
    totalScore += breakdown.communicationStyleFit;

    // Generate reasoning
    const reasoning = this.generateMatchReasoning(
      student,
      candidate,
      breakdown
    );

    return {
      totalScore: Math.round(totalScore),
      breakdown,
      confidenceLevel:
        totalScore >= 80 ? 'high' : totalScore >= 60 ? 'medium' : 'low',
      reasoning,
    };
  }

  /**
   * Use AI to analyze compatibility and provide insights
   */
  async analyzeCompatibilityWithAI(
    student: StudentProfile & { videos_per_week: number },
    candidate: StudentProfile & { videos_per_week: number },
    studentPrefs: MatchingPreferences,
    candidatePrefs: MatchingPreferences
  ): Promise<{ score: number; reasons: string[]; concerns: string[] }> {
    const prompt = `Analyze compatibility between these two students for study partnership:

Student A:
- Level ${student.level}, Module ${student.current_module}
- Learning pace: ${student.videos_per_week} videos/week
- Timezone: ${studentPrefs.timezone}
- Availability: ${studentPrefs.weekly_availability_hours} hours/week
- Goals: ${studentPrefs.primary_goal}
- Interests: ${studentPrefs.interested_topics.join(', ')}
- Learning style: ${studentPrefs.learning_style}
- Communication preference: ${studentPrefs.communication_preference}

Student B:
- Level ${candidate.level}, Module ${candidate.current_module}
- Learning pace: ${candidate.videos_per_week} videos/week
- Timezone: ${candidatePrefs.timezone}
- Availability: ${candidatePrefs.weekly_availability_hours} hours/week
- Goals: ${candidatePrefs.primary_goal}
- Interests: ${candidatePrefs.interested_topics.join(', ')}
- Learning style: ${candidatePrefs.learning_style}
- Communication preference: ${candidatePrefs.communication_preference}

Rate compatibility (0-100) based on:
1. Skill level match - are they at similar learning stages?
2. Learning goals alignment - do they want similar outcomes?
3. Availability overlap - can they actually study together?
4. Communication style compatibility - will they work well together?
5. Complementary skills/interests - can they learn from each other?

Return JSON ONLY:
{
  "score": <number 0-100>,
  "reasons": ["reason 1", "reason 2", "reason 3"],
  "concerns": ["concern 1 (if any)", "concern 2 (if any)"]
}`;

    try {
      const response = await anthropic.messages.create({
        model: getClaudeModel(),
        max_tokens: 500,
        messages: [{ role: 'user', content: prompt }],
      });

      const textContent = response.content.find((c) => c.type === 'text');
      if (!textContent || textContent.type !== 'text') {
        throw new Error('No text response from AI');
      }

      const result = JSON.parse(textContent.text);
      return {
        score: result.score,
        reasons: result.reasons || [],
        concerns: result.concerns || [],
      };
    } catch (error) {
      console.error('AI compatibility analysis failed:', error);
      // Fallback to basic scoring
      return {
        score: 0,
        reasons: [],
        concerns: ['AI analysis unavailable'],
      };
    }
  }

  /**
   * Rank potential matches using both algorithmic and AI scoring
   */
  async rankMatches(
    studentId: string,
    candidates: StudentProfile[]
  ): Promise<MatchCandidate[]> {
    const supabase = createClient();

    // Get student preferences
    const { data: studentData } = await supabase
      .from('students')
      .select('*, matching_preferences (*)')
      .eq('id', studentId)
      .single();

    if (!studentData || !studentData.matching_preferences) {
      throw new Error('Student or preferences not found');
    }

    const rankedMatches: MatchCandidate[] = [];

    for (const candidate of candidates) {
      const { data: candidatePrefs } = await supabase
        .from('matching_preferences')
        .select('*')
        .eq('student_id', candidate.id)
        .single();

      if (!candidatePrefs) continue;

      // Calculate basic compatibility score
      const basicScore = this.calculateCompatibility(
        studentData as any,
        candidate as any,
        studentData.matching_preferences,
        candidatePrefs
      );

      rankedMatches.push({
        student: candidate,
        preferences: candidatePrefs,
        matchScore: basicScore,
      });
    }

    // Sort by score
    return rankedMatches.sort(
      (a, b) => b.matchScore.totalScore - a.matchScore.totalScore
    );
  }

  /**
   * Count shared items between two arrays
   */
  private countSharedItems(arr1: string[], arr2: string[]): number {
    const set1 = new Set(arr1.map((s) => s.toLowerCase()));
    return arr2.filter((item) => set1.has(item.toLowerCase())).length;
  }

  /**
   * Calculate schedule overlap in hours
   */
  private calculateScheduleOverlap(
    times1: TimeSlot[],
    times2: TimeSlot[],
    tz1: string,
    tz2: string
  ): number {
    if (!times1.length || !times2.length) return 0;

    let totalOverlap = 0;

    for (const slot1 of times1) {
      for (const slot2 of times2) {
        if (slot1.day === slot2.day) {
          const start1 = this.timeToMinutes(slot1.startTime);
          const end1 = this.timeToMinutes(slot1.endTime);
          const start2 = this.timeToMinutes(slot2.startTime);
          const end2 = this.timeToMinutes(slot2.endTime);

          const overlapStart = Math.max(start1, start2);
          const overlapEnd = Math.min(end1, end2);

          if (overlapEnd > overlapStart) {
            totalOverlap += (overlapEnd - overlapStart) / 60;
          }
        }
      }
    }

    return Math.round(totalOverlap * 10) / 10;
  }

  /**
   * Convert time string to minutes since midnight
   */
  private timeToMinutes(time: string): number {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  }

  /**
   * Check if communication preferences match
   */
  private checkCommunicationMatch(pref1: string, pref2: string): boolean {
    if (pref1 === 'any' || pref2 === 'any') return true;
    return pref1 === pref2;
  }

  /**
   * Generate human-readable match reasoning
   */
  private generateMatchReasoning(
    student: StudentProfile,
    candidate: StudentProfile,
    breakdown: MatchScore['breakdown']
  ): string {
    const reasons: string[] = [];

    if (breakdown.levelCompatibility >= 20) {
      reasons.push(
        `Similar skill levels (Level ${student.level} and ${candidate.level})`
      );
    }

    if (breakdown.scheduleOverlap >= 15) {
      reasons.push('Overlapping study times');
    }

    if (breakdown.goalAlignment >= 15) {
      reasons.push('Shared learning goals');
    }

    if (breakdown.learningPaceMatch >= 12) {
      reasons.push('Similar learning pace');
    }

    if (breakdown.interestsOverlap >= 8) {
      reasons.push('Common interests');
    }

    if (reasons.length === 0) {
      reasons.push('Compatible learning styles');
    }

    return reasons.join('. ') + '.';
  }
}

/**
 * Singleton instance
 */
export const matchingAlgorithm = new MatchingAlgorithm();
