/**
 * Adaptive Difficulty Engine
 * Adjusts content difficulty based on student performance
 */

import { createClient } from '@/lib/supabase/server';

export type DifficultyLevel = 'beginner' | 'intermediate' | 'advanced';

export interface Performance {
  quiz_scores: number[];
  completion_rates: number[];
  time_spent_minutes: number[];
  rewatch_count: number;
}

export interface ContentRecommendation {
  video_id: string;
  title: string;
  difficulty: DifficultyLevel;
  reason: string;
  confidence: number; // 0-1
  estimated_time_minutes: number;
}

export class AdaptiveDifficultyEngine {
  /**
   * Assess current difficulty level for a student
   */
  async assessCurrentLevel(studentId: string): Promise<DifficultyLevel> {
    const supabase = createClient();

    // Get student's current level
    const { data: student } = await supabase
      .from('students')
      .select('difficulty_level, level, xp_points')
      .eq('id', studentId)
      .single();

    if (!student) {
      return 'beginner';
    }

    // Get recent performance
    const performance = await this.getRecentPerformance(studentId);

    // Calculate performance score
    const avgQuizScore = this.average(performance.quiz_scores);
    const avgCompletionRate = this.average(performance.completion_rates);

    // Determine level based on performance
    let assessedLevel: DifficultyLevel;

    if (avgQuizScore >= 85 && avgCompletionRate >= 0.9) {
      assessedLevel = 'advanced';
    } else if (avgQuizScore >= 70 && avgCompletionRate >= 0.75) {
      assessedLevel = 'intermediate';
    } else {
      assessedLevel = 'beginner';
    }

    // Update if different from current
    if (assessedLevel !== student.difficulty_level) {
      await this.updateDifficultyLevel(studentId, student.difficulty_level, assessedLevel, {
        avgQuizScore,
        avgCompletionRate,
      });
    }

    return assessedLevel;
  }

  /**
   * Recommend next content based on current level and performance
   */
  async recommendNextContent(
    studentId: string,
    limit: number = 5
  ): Promise<ContentRecommendation[]> {
    const supabase = createClient();

    // Get current difficulty level
    const currentLevel = await this.assessCurrentLevel(studentId);

    // Get student's completed videos
    const { data: completed } = await supabase
      .from('learning_progress')
      .select('video_id')
      .eq('student_id', studentId)
      .eq('completed', true);

    const completedIds = completed?.map((c) => c.video_id) || [];

    // Get videos at appropriate difficulty (and one level above/below)
    const targetDifficulties = this.getTargetDifficulties(currentLevel);

    const { data: videos } = await supabase
      .from('videos')
      .select('id, title, duration_seconds')
      .not('id', 'in', `(${completedIds.join(',')})`)
      .order('created_at', { ascending: true })
      .limit(limit * 2); // Get more to filter

    if (!videos || videos.length === 0) {
      return [];
    }

    // Score and rank videos
    const recommendations: ContentRecommendation[] = [];

    for (const video of videos) {
      // Estimate difficulty based on video metadata
      const estimatedDifficulty = await this.estimateVideoDifficulty(video.id);

      // Calculate confidence based on how well it matches current level
      const confidence = this.calculateMatchConfidence(currentLevel, estimatedDifficulty);

      if (confidence > 0.3) {
        recommendations.push({
          video_id: video.id,
          title: video.title,
          difficulty: estimatedDifficulty,
          reason: this.generateRecommendationReason(currentLevel, estimatedDifficulty),
          confidence,
          estimated_time_minutes: Math.round(video.duration_seconds / 60),
        });
      }
    }

    // Sort by confidence and return top N
    recommendations.sort((a, b) => b.confidence - a.confidence);
    return recommendations.slice(0, limit);
  }

  /**
   * Adjust difficulty based on performance
   */
  async adjustDifficulty(
    studentId: string,
    performance: Performance
  ): Promise<DifficultyLevel> {
    const supabase = createClient();

    // Get current level
    const { data: student } = await supabase
      .from('students')
      .select('difficulty_level')
      .eq('id', studentId)
      .single();

    if (!student) {
      return 'beginner';
    }

    const currentLevel = student.difficulty_level as DifficultyLevel;

    // Calculate performance metrics
    const avgQuizScore = this.average(performance.quiz_scores);
    const avgCompletionRate = this.average(performance.completion_rates);
    const avgTimeSpent = this.average(performance.time_spent_minutes);

    let newLevel = currentLevel;

    // Determine if should increase difficulty
    if (currentLevel === 'beginner' && avgQuizScore >= 85 && avgCompletionRate >= 0.9) {
      newLevel = 'intermediate';
    } else if (currentLevel === 'intermediate' && avgQuizScore >= 90 && avgCompletionRate >= 0.95) {
      newLevel = 'advanced';
    }
    // Determine if should decrease difficulty
    else if (currentLevel === 'advanced' && (avgQuizScore < 60 || avgCompletionRate < 0.6)) {
      newLevel = 'intermediate';
    } else if (currentLevel === 'intermediate' && (avgQuizScore < 50 || avgCompletionRate < 0.5)) {
      newLevel = 'beginner';
    }

    // Update if changed
    if (newLevel !== currentLevel) {
      await this.updateDifficultyLevel(studentId, currentLevel, newLevel, {
        avgQuizScore,
        avgCompletionRate,
        avgTimeSpent,
      });
    }

    return newLevel;
  }

  /**
   * Get recent performance data
   */
  private async getRecentPerformance(studentId: string): Promise<Performance> {
    const supabase = createClient();

    // Get recent quiz scores
    const { data: quizzes } = await supabase
      .from('quiz_attempts')
      .select('score')
      .eq('student_id', studentId)
      .order('created_at', { ascending: false })
      .limit(10);

    // Get recent video completion rates
    const { data: progress } = await supabase
      .from('learning_progress')
      .select('last_position_seconds, completed, video:videos!inner(duration_seconds)')
      .eq('student_id', studentId)
      .order('updated_at', { ascending: false })
      .limit(10);

    const quiz_scores = quizzes?.map((q) => q.score) || [];

    const completion_rates =
      progress?.map((p) => {
        const duration = p.video?.duration_seconds || 1;
        return (p.last_position_seconds || 0) / duration;
      }) || [];

    const time_spent_minutes =
      progress?.map((p) => (p.last_position_seconds || 0) / 60) || [];

    const rewatch_count = 0; // Would need additional tracking

    return {
      quiz_scores,
      completion_rates,
      time_spent_minutes,
      rewatch_count,
    };
  }

  /**
   * Estimate difficulty of a video
   */
  private async estimateVideoDifficulty(videoId: string): Promise<DifficultyLevel> {
    const supabase = createClient();

    // Check if video has metadata with difficulty
    // For now, return intermediate as default
    // In production, this would use AI tagging from auto-tagger

    return 'intermediate';
  }

  /**
   * Get target difficulty range based on current level
   */
  private getTargetDifficulties(currentLevel: DifficultyLevel): DifficultyLevel[] {
    switch (currentLevel) {
      case 'beginner':
        return ['beginner', 'intermediate'];
      case 'intermediate':
        return ['beginner', 'intermediate', 'advanced'];
      case 'advanced':
        return ['intermediate', 'advanced'];
      default:
        return ['intermediate'];
    }
  }

  /**
   * Calculate how well a video difficulty matches student level
   */
  private calculateMatchConfidence(
    studentLevel: DifficultyLevel,
    videoDifficulty: DifficultyLevel
  ): number {
    const levelScores: Record<DifficultyLevel, number> = {
      beginner: 1,
      intermediate: 2,
      advanced: 3,
    };

    const studentScore = levelScores[studentLevel];
    const videoScore = levelScores[videoDifficulty];

    const difference = Math.abs(studentScore - videoScore);

    // Perfect match = 1.0, one level off = 0.7, two levels off = 0.3
    if (difference === 0) return 1.0;
    if (difference === 1) return 0.7;
    return 0.3;
  }

  /**
   * Generate reason for recommendation
   */
  private generateRecommendationReason(
    studentLevel: DifficultyLevel,
    videoDifficulty: DifficultyLevel
  ): string {
    if (studentLevel === videoDifficulty) {
      return `Matches your current ${studentLevel} level`;
    } else if (this.isOneLevel(studentLevel, videoDifficulty, 'up')) {
      return `Slightly challenging to help you progress`;
    } else if (this.isOneLevel(studentLevel, videoDifficulty, 'down')) {
      return `Review to strengthen fundamentals`;
    } else {
      return `Recommended based on your learning path`;
    }
  }

  /**
   * Check if one difficulty level is one step above/below another
   */
  private isOneLevel(
    from: DifficultyLevel,
    to: DifficultyLevel,
    direction: 'up' | 'down'
  ): boolean {
    const levels: DifficultyLevel[] = ['beginner', 'intermediate', 'advanced'];
    const fromIndex = levels.indexOf(from);
    const toIndex = levels.indexOf(to);

    if (direction === 'up') {
      return toIndex === fromIndex + 1;
    } else {
      return toIndex === fromIndex - 1;
    }
  }

  /**
   * Update student's difficulty level in database
   */
  private async updateDifficultyLevel(
    studentId: string,
    previousLevel: string,
    newLevel: DifficultyLevel,
    performanceData: any
  ): Promise<void> {
    const supabase = createClient();

    // Update student record
    await supabase
      .from('students')
      .update({ difficulty_level: newLevel })
      .eq('id', studentId);

    // Log the adjustment
    await supabase.from('difficulty_adjustments').insert({
      student_id: studentId,
      previous_level: previousLevel,
      new_level: newLevel,
      reason: `Performance-based adjustment: avg quiz ${performanceData.avgQuizScore?.toFixed(1)}%, completion ${((performanceData.avgCompletionRate || 0) * 100).toFixed(1)}%`,
      performance_data: performanceData,
    });
  }

  /**
   * Calculate average of number array
   */
  private average(numbers: number[]): number {
    if (numbers.length === 0) return 0;
    return numbers.reduce((sum, n) => sum + n, 0) / numbers.length;
  }
}
