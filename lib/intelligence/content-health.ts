/**
 * Content Health Monitor
 * Analyzes content quality and effectiveness
 */

import { createClient } from '@/lib/supabase/server';

export interface ContentHealth {
  video_id: string;
  overall_score: number; // 0-100
  metrics: {
    completion_rate: number;
    avg_quiz_score: number;
    rewatch_rate: number;
    confusion_signals: number;
    avg_satisfaction: number;
  };
  issues: ContentIssue[];
  recommendations: string[];
  last_updated: string;
}

export interface ContentIssue {
  type: 'low_completion' | 'poor_quiz_performance' | 'high_confusion' | 'outdated';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  affected_students: number;
}

export interface TopicGap {
  topic: string;
  evidence: {
    student_questions: number;
    mentioned_in_videos: number;
    prerequisite_for_videos: string[];
  };
  priority: 'low' | 'medium' | 'high' | 'critical';
}

export interface ImprovementReport {
  video_id: string;
  title: string;
  current_score: number;
  potential_score: number;
  improvements: Improvement[];
  estimated_impact: string;
}

export interface Improvement {
  category: 'content' | 'pacing' | 'clarity' | 'examples';
  description: string;
  priority: number; // 1-5
}

export class ContentHealthMonitor {
  /**
   * Analyze effectiveness of a video
   */
  async analyzeContentEffectiveness(videoId: string): Promise<ContentHealth> {
    const supabase = createClient();

    // Get video data
    const { data: video } = await supabase
      .from('videos')
      .select('id, title, duration_seconds')
      .eq('id', videoId)
      .single();

    if (!video) {
      throw new Error('Video not found');
    }

    // Calculate metrics
    const completionRate = await this.calculateCompletionRate(videoId);
    const avgQuizScore = await this.calculateAvgQuizScore(videoId);
    const rewatchRate = await this.calculateRewatchRate(videoId);
    const confusionSignals = await this.countConfusionSignals(videoId);
    const avgSatisfaction = 0; // Would come from feedback system

    // Calculate overall score (weighted)
    const overall_score = Math.round(
      completionRate * 0.3 + avgQuizScore * 0.35 + (100 - rewatchRate * 10) * 0.2 + 85 * 0.15
    );

    // Detect issues
    const issues: ContentIssue[] = [];

    if (completionRate < 50) {
      issues.push({
        type: 'low_completion',
        severity: completionRate < 30 ? 'critical' : 'high',
        description: 'Most students drop off before completing this video',
        affected_students: await this.countStudentsWatched(videoId),
      });
    }

    if (avgQuizScore < 60) {
      issues.push({
        type: 'poor_quiz_performance',
        severity: avgQuizScore < 40 ? 'critical' : 'high',
        description: 'Students perform poorly on quizzes after watching',
        affected_students: await this.countQuizTakers(videoId),
      });
    }

    if (confusionSignals > 10) {
      issues.push({
        type: 'high_confusion',
        severity: confusionSignals > 20 ? 'high' : 'medium',
        description: 'Many students ask clarifying questions about this content',
        affected_students: confusionSignals,
      });
    }

    // Generate recommendations
    const recommendations = this.generateRecommendations(issues, {
      completionRate,
      avgQuizScore,
      rewatchRate,
      confusionSignals,
    });

    const health: ContentHealth = {
      video_id: videoId,
      overall_score,
      metrics: {
        completion_rate: completionRate,
        avg_quiz_score: avgQuizScore,
        rewatch_rate: rewatchRate,
        confusion_signals: confusionSignals,
        avg_satisfaction: avgSatisfaction,
      },
      issues,
      recommendations,
      last_updated: new Date().toISOString(),
    };

    // Store metrics
    await this.storeMetrics(videoId, health.metrics);

    return health;
  }

  /**
   * Detect outdated content
   */
  async detectOutdatedContent(creatorId: string): Promise<any[]> {
    const supabase = createClient();

    // Get videos older than 1 year
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

    const { data: oldVideos } = await supabase
      .from('videos')
      .select('id, title, created_at')
      .eq('creator_id', creatorId)
      .lt('created_at', oneYearAgo.toISOString());

    if (!oldVideos) return [];

    // Check for signs of being outdated (student questions mentioning "old", "outdated", etc.)
    const outdated = [];

    for (const video of oldVideos) {
      const { count } = await supabase
        .from('chat_messages')
        .select('*', { count: 'exact', head: true })
        .eq('video_id', video.id)
        .or(
          'message.ilike.%outdated%,message.ilike.%old version%,message.ilike.%deprecated%'
        );

      if (count && count > 3) {
        outdated.push({
          ...video,
          outdated_signals: count,
        });
      }
    }

    return outdated;
  }

  /**
   * Find content gaps
   */
  async findContentGaps(creatorId: string): Promise<TopicGap[]> {
    const supabase = createClient();

    // Get all student questions
    const { data: questions } = await supabase
      .from('chat_messages')
      .select('message')
      .eq('role', 'user')
      .in(
        'student_id',
        supabase.from('students').select('id').eq('creator_id', creatorId)
      )
      .limit(500);

    if (!questions) return [];

    // Extract commonly asked topics (simplified - would use AI in production)
    const topicCounts: Map<string, number> = new Map();

    const commonTopics = [
      'deployment',
      'testing',
      'authentication',
      'database',
      'API',
      'state management',
      'error handling',
      'performance',
      'security',
    ];

    for (const q of questions) {
      const msg = q.message.toLowerCase();
      for (const topic of commonTopics) {
        if (msg.includes(topic.toLowerCase())) {
          topicCounts.set(topic, (topicCounts.get(topic) || 0) + 1);
        }
      }
    }

    // Get existing videos to see what's covered
    const { data: videos } = await supabase
      .from('videos')
      .select('title')
      .eq('creator_id', creatorId);

    const videoTitles = videos?.map((v) => v.title.toLowerCase()).join(' ') || '';

    // Identify gaps (topics asked about but not covered)
    const gaps: TopicGap[] = [];

    for (const [topic, count] of topicCounts.entries()) {
      if (!videoTitles.includes(topic.toLowerCase()) && count >= 3) {
        let priority: 'low' | 'medium' | 'high' | 'critical';
        if (count >= 20) priority = 'critical';
        else if (count >= 10) priority = 'high';
        else if (count >= 5) priority = 'medium';
        else priority = 'low';

        gaps.push({
          topic,
          evidence: {
            student_questions: count,
            mentioned_in_videos: 0,
            prerequisite_for_videos: [],
          },
          priority,
        });
      }
    }

    return gaps.sort((a, b) => {
      const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });
  }

  /**
   * Generate improvement report for a video
   */
  async generateImprovementReport(videoId: string): Promise<ImprovementReport> {
    const health = await this.analyzeContentEffectiveness(videoId);

    const supabase = createClient();
    const { data: video } = await supabase
      .from('videos')
      .select('title')
      .eq('id', videoId)
      .single();

    const improvements: Improvement[] = [];

    // Based on issues, suggest improvements
    for (const issue of health.issues) {
      switch (issue.type) {
        case 'low_completion':
          improvements.push({
            category: 'pacing',
            description: 'Consider breaking this into shorter videos (5-10 min each)',
            priority: 5,
          });
          improvements.push({
            category: 'content',
            description: 'Add a compelling hook in the first 30 seconds',
            priority: 4,
          });
          break;

        case 'poor_quiz_performance':
          improvements.push({
            category: 'clarity',
            description: 'Add more detailed explanations of core concepts',
            priority: 5,
          });
          improvements.push({
            category: 'examples',
            description: 'Include 2-3 practical examples for each concept',
            priority: 4,
          });
          break;

        case 'high_confusion':
          improvements.push({
            category: 'clarity',
            description: 'Address commonly asked questions directly in the video',
            priority: 5,
          });
          improvements.push({
            category: 'content',
            description: 'Add visual diagrams to explain abstract concepts',
            priority: 4,
          });
          break;
      }
    }

    // Estimate potential score improvement
    const potentialScore = Math.min(100, health.overall_score + improvements.length * 8);

    return {
      video_id: videoId,
      title: video?.title || 'Unknown',
      current_score: health.overall_score,
      potential_score: potentialScore,
      improvements: improvements.sort((a, b) => b.priority - a.priority),
      estimated_impact: `+${potentialScore - health.overall_score} points`,
    };
  }

  // Helper methods

  private async calculateCompletionRate(videoId: string): Promise<number> {
    const supabase = createClient();

    const { count: total } = await supabase
      .from('learning_progress')
      .select('*', { count: 'exact', head: true })
      .eq('video_id', videoId);

    const { count: completed } = await supabase
      .from('learning_progress')
      .select('*', { count: 'exact', head: true })
      .eq('video_id', videoId)
      .eq('completed', true);

    if (!total || total === 0) return 0;
    return Math.round((completed / total) * 100);
  }

  private async calculateAvgQuizScore(videoId: string): Promise<number> {
    const supabase = createClient();

    const { data: quizzes } = await supabase
      .from('quizzes')
      .select('id')
      .eq('video_id', videoId);

    if (!quizzes || quizzes.length === 0) return 0;

    const quizIds = quizzes.map((q) => q.id);

    const { data: attempts } = await supabase
      .from('quiz_attempts')
      .select('score')
      .in('quiz_id', quizIds);

    if (!attempts || attempts.length === 0) return 0;

    const avg = attempts.reduce((sum, a) => sum + a.score, 0) / attempts.length;
    return Math.round(avg);
  }

  private async calculateRewatchRate(videoId: string): Promise<number> {
    // Simplified - would need watch event tracking
    return 0;
  }

  private async countConfusionSignals(videoId: string): Promise<number> {
    const supabase = createClient();

    const { count } = await supabase
      .from('chat_messages')
      .select('*', { count: 'exact', head: true })
      .eq('video_id', videoId)
      .or(
        "message.ilike.%don't understand%,message.ilike.%confused%,message.ilike.%what is%"
      );

    return count || 0;
  }

  private async countStudentsWatched(videoId: string): Promise<number> {
    const supabase = createClient();

    const { count } = await supabase
      .from('learning_progress')
      .select('*', { count: 'exact', head: true })
      .eq('video_id', videoId);

    return count || 0;
  }

  private async countQuizTakers(videoId: string): Promise<number> {
    const supabase = createClient();

    const { data: quizzes } = await supabase
      .from('quizzes')
      .select('id')
      .eq('video_id', videoId);

    if (!quizzes) return 0;

    const { count } = await supabase
      .from('quiz_attempts')
      .select('*', { count: 'exact', head: true })
      .in(
        'quiz_id',
        quizzes.map((q) => q.id)
      );

    return count || 0;
  }

  private generateRecommendations(
    issues: ContentIssue[],
    metrics: any
  ): string[] {
    const recommendations: string[] = [];

    if (metrics.completionRate < 50) {
      recommendations.push('Consider breaking this video into shorter segments');
      recommendations.push('Add chapters/timestamps for easier navigation');
    }

    if (metrics.avgQuizScore < 60) {
      recommendations.push('Add more examples and practice problems');
      recommendations.push('Slow down explanations of complex concepts');
    }

    if (metrics.confusionSignals > 10) {
      recommendations.push('Create a FAQ section addressing common questions');
      recommendations.push('Add supplementary materials (diagrams, code examples)');
    }

    if (metrics.rewatchRate > 2) {
      recommendations.push('Improve clarity of initial explanation');
      recommendations.push('Add visual aids to complement verbal explanations');
    }

    return recommendations;
  }

  private async storeMetrics(videoId: string, metrics: ContentHealth['metrics']): Promise<void> {
    const supabase = createClient();

    await supabase.from('content_health_metrics').upsert(
      {
        video_id: videoId,
        metric_date: new Date().toISOString().split('T')[0],
        completion_rate: metrics.completion_rate / 100,
        avg_quiz_score: metrics.avg_quiz_score,
        rewatch_rate: metrics.rewatch_rate / 100,
        confusion_signals: metrics.confusion_signals,
        avg_satisfaction: metrics.avg_satisfaction,
        student_count: await this.countStudentsWatched(videoId),
      },
      { onConflict: 'video_id,metric_date' }
    );
  }
}
