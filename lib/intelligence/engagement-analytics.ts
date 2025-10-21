/**
 * Engagement Analytics
 * Predict student engagement and identify at-risk students
 */

import { createClient } from '@/lib/supabase/server';

export interface EngagementScore {
  student_id: string;
  score: number; // 0-100
  trend: 'improving' | 'stable' | 'declining';
  risk_level: 'none' | 'low' | 'medium' | 'high' | 'critical';
  factors: EngagementFactor[];
  recommendations: string[];
}

export interface EngagementFactor {
  name: string;
  current_value: number;
  target_value: number;
  impact: number; // Weight in score calculation
}

export interface BurnoutRisk {
  risk_level: 'none' | 'low' | 'medium' | 'high';
  indicators: string[];
  recommended_break_days: number;
}

export interface Student {
  id: string;
  name: string;
  email: string;
  engagement_score: number;
  risk_level: string;
  last_active_at: string;
}

export class EngagementAnalytics {
  /**
   * Calculate engagement score for a student
   */
  async predictEngagement(studentId: string): Promise<EngagementScore> {
    const supabase = createClient();

    // Get student data
    const { data: student } = await supabase
      .from('students')
      .select(`
        id,
        current_streak,
        longest_streak,
        last_active_at,
        created_at,
        level,
        xp_points
      `)
      .eq('id', studentId)
      .single();

    if (!student) {
      throw new Error('Student not found');
    }

    // Calculate factors
    const factors: EngagementFactor[] = [];

    // 1. Login frequency (last 30 days)
    const daysSinceActive = Math.floor(
      (Date.now() - new Date(student.last_active_at).getTime()) / (1000 * 60 * 60 * 24)
    );
    factors.push({
      name: 'Recent Activity',
      current_value: Math.max(0, 30 - daysSinceActive),
      target_value: 30,
      impact: 0.25,
    });

    // 2. Current streak
    factors.push({
      name: 'Learning Streak',
      current_value: student.current_streak,
      target_value: 7,
      impact: 0.2,
    });

    // 3. Video completion rate
    const { data: progressData } = await supabase
      .from('learning_progress')
      .select('completed')
      .eq('student_id', studentId);

    const totalVideos = progressData?.length || 0;
    const completedVideos = progressData?.filter((p) => p.completed).length || 0;
    const completionRate = totalVideos > 0 ? (completedVideos / totalVideos) * 100 : 0;

    factors.push({
      name: 'Video Completion',
      current_value: completionRate,
      target_value: 80,
      impact: 0.3,
    });

    // 4. Quiz performance
    const { data: quizData } = await supabase
      .from('quiz_attempts')
      .select('score')
      .eq('student_id', studentId)
      .order('created_at', { ascending: false })
      .limit(10);

    const avgQuizScore =
      quizData && quizData.length > 0
        ? quizData.reduce((sum, q) => sum + q.score, 0) / quizData.length
        : 0;

    factors.push({
      name: 'Quiz Performance',
      current_value: avgQuizScore,
      target_value: 70,
      impact: 0.25,
    });

    // Calculate overall score
    let totalScore = 0;
    for (const factor of factors) {
      const factorScore = Math.min(100, (factor.current_value / factor.target_value) * 100);
      totalScore += factorScore * factor.impact;
    }

    const score = Math.round(totalScore);

    // Determine risk level
    let risk_level: 'none' | 'low' | 'medium' | 'high' | 'critical';
    if (score >= 80) risk_level = 'none';
    else if (score >= 60) risk_level = 'low';
    else if (score >= 40) risk_level = 'medium';
    else if (score >= 20) risk_level = 'high';
    else risk_level = 'critical';

    // Determine trend (would need historical data)
    const trend = 'stable'; // Simplified

    // Generate recommendations
    const recommendations: string[] = [];
    if (daysSinceActive > 7) {
      recommendations.push('Log in more frequently to maintain momentum');
    }
    if (student.current_streak === 0) {
      recommendations.push('Start a new learning streak today');
    }
    if (completionRate < 50) {
      recommendations.push('Focus on completing videos before starting new ones');
    }
    if (avgQuizScore < 60) {
      recommendations.push('Review video content before taking quizzes');
    }

    return {
      student_id: studentId,
      score,
      trend,
      risk_level,
      factors,
      recommendations,
    };
  }

  /**
   * Identify at-risk students for a creator
   */
  async identifyAtRiskStudents(creatorId: string): Promise<Student[]> {
    const supabase = createClient();

    // Get all students for creator
    const { data: students } = await supabase
      .from('students')
      .select('id, name, email, engagement_score, last_active_at')
      .eq('creator_id', creatorId);

    if (!students) return [];

    // Filter for at-risk (engagement score < 50 OR inactive > 14 days)
    const atRisk = students.filter((student) => {
      const daysSinceActive = Math.floor(
        (Date.now() - new Date(student.last_active_at).getTime()) / (1000 * 60 * 60 * 24)
      );
      return student.engagement_score < 50 || daysSinceActive > 14;
    });

    // Calculate risk level
    return atRisk.map((student) => {
      const daysSinceActive = Math.floor(
        (Date.now() - new Date(student.last_active_at).getTime()) / (1000 * 60 * 60 * 24)
      );

      let risk_level: string;
      if (daysSinceActive > 30 || student.engagement_score < 20) {
        risk_level = 'critical';
      } else if (daysSinceActive > 21 || student.engagement_score < 40) {
        risk_level = 'high';
      } else if (daysSinceActive > 14 || student.engagement_score < 50) {
        risk_level = 'medium';
      } else {
        risk_level = 'low';
      }

      return {
        ...student,
        risk_level,
      };
    });
  }

  /**
   * Detect burnout risk
   */
  async detectBurnout(studentId: string): Promise<BurnoutRisk> {
    const supabase = createClient();

    const indicators: string[] = [];
    let risk_level: 'none' | 'low' | 'medium' | 'high' = 'none';
    let recommended_break_days = 0;

    // Check for consecutive days of high activity
    const { data: recentActivity } = await supabase
      .from('learning_progress')
      .select('created_at, updated_at')
      .eq('student_id', studentId)
      .gte('created_at', new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString())
      .order('created_at', { ascending: false });

    if (recentActivity && recentActivity.length > 20) {
      indicators.push('Very high activity in past 2 weeks');
      risk_level = 'low';
      recommended_break_days = 1;
    }

    if (recentActivity && recentActivity.length > 40) {
      indicators.push('Excessive daily learning hours');
      risk_level = 'medium';
      recommended_break_days = 2;
    }

    // Check for declining quiz scores
    const { data: quizzes } = await supabase
      .from('quiz_attempts')
      .select('score, created_at')
      .eq('student_id', studentId)
      .order('created_at', { ascending: false })
      .limit(10);

    if (quizzes && quizzes.length >= 5) {
      const recentScores = quizzes.slice(0, 5).map((q) => q.score);
      const olderScores = quizzes.slice(5).map((q) => q.score);

      const recentAvg = recentScores.reduce((a, b) => a + b, 0) / recentScores.length;
      const olderAvg = olderScores.reduce((a, b) => a + b, 0) / olderScores.length;

      if (recentAvg < olderAvg - 15) {
        indicators.push('Declining quiz performance despite high effort');
        risk_level = 'medium';
        recommended_break_days = Math.max(recommended_break_days, 2);
      }
    }

    // Check for no breaks in streak
    const { data: student } = await supabase
      .from('students')
      .select('current_streak')
      .eq('id', studentId)
      .single();

    if (student && student.current_streak > 21) {
      indicators.push('No breaks taken in 3+ weeks');
      risk_level = 'high';
      recommended_break_days = 3;
    }

    return {
      risk_level,
      indicators,
      recommended_break_days,
    };
  }

  /**
   * Recommend if student should take a break
   */
  async recommendBreak(studentId: string): Promise<boolean> {
    const burnout = await this.detectBurnout(studentId);
    return burnout.risk_level === 'high' || burnout.recommended_break_days >= 2;
  }
}
