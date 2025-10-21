/**
 * AI Insights Generator
 * Generates actionable insights for creators and students
 */

import { createClient } from '@/lib/supabase/server';
import { ContentHealthMonitor } from './content-health';
import { EngagementAnalytics } from './engagement-analytics';

export interface Insight {
  id: string;
  type: 'content_quality' | 'student_risk' | 'gap_detection' | 'engagement_drop' | 'performance_improvement';
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  actionable: boolean;
  actions: Action[];
  metadata: any;
  created_at: string;
}

export interface Action {
  title: string;
  description: string;
  action_type: 'review_video' | 'contact_student' | 'create_content' | 'update_quiz';
  resource_id?: string;
}

export class InsightsGenerator {
  private contentHealth: ContentHealthMonitor;
  private engagement: EngagementAnalytics;

  constructor() {
    this.contentHealth = new ContentHealthMonitor();
    this.engagement = new EngagementAnalytics();
  }

  /**
   * Generate weekly insights for a creator
   */
  async generateWeeklyInsights(creatorId: string): Promise<Insight[]> {
    const insights: Insight[] = [];

    // 1. Content quality insights
    const contentInsights = await this.generateContentInsights(creatorId);
    insights.push(...contentInsights);

    // 2. Student risk insights
    const riskInsights = await this.generateRiskInsights(creatorId);
    insights.push(...riskInsights);

    // 3. Content gap insights
    const gapInsights = await this.generateGapInsights(creatorId);
    insights.push(...gapInsights);

    // 4. Engagement insights
    const engagementInsights = await this.generateEngagementInsights(creatorId);
    insights.push(...engagementInsights);

    // Prioritize and store
    const prioritized = this.prioritizeInsights(insights);
    await this.storeInsights(creatorId, prioritized);

    return prioritized;
  }

  /**
   * Generate insights for a student
   */
  async generateStudentInsights(studentId: string): Promise<Insight[]> {
    const insights: Insight[] = [];
    const supabase = createClient();

    // Get student engagement
    const engagementScore = await this.engagement.predictEngagement(studentId);

    if (engagementScore.risk_level === 'high' || engagementScore.risk_level === 'critical') {
      insights.push({
        id: `engagement-${Date.now()}`,
        type: 'engagement_drop',
        title: 'Your engagement is dropping',
        description: `Your engagement score is ${engagementScore.score}/100. Let's get back on track!`,
        priority: 'high',
        actionable: true,
        actions: engagementScore.recommendations.map((rec) => ({
          title: rec,
          description: rec,
          action_type: 'review_video',
        })),
        metadata: { engagement_score: engagementScore },
        created_at: new Date().toISOString(),
      });
    }

    // Check for knowledge gaps
    const { data: gaps } = await supabase
      .from('knowledge_gaps')
      .select('*')
      .eq('student_id', studentId)
      .eq('status', 'open')
      .order('severity', { ascending: true })
      .limit(3);

    if (gaps && gaps.length > 0) {
      for (const gap of gaps) {
        insights.push({
          id: `gap-${gap.id}`,
          type: 'gap_detection',
          title: `Knowledge gap: ${gap.concept}`,
          description: `You're struggling with ${gap.concept}. Here's how to improve:`,
          priority: gap.severity === 'critical' ? 'high' : gap.severity as 'low' | 'medium' | 'high' | 'critical',
          actionable: true,
          actions:
            gap.recommendations?.map((rec: string) => ({
              title: rec,
              description: rec,
              action_type: 'review_video',
            })) || [],
          metadata: gap,
          created_at: new Date().toISOString(),
        });
      }
    }

    // Check streak
    const { data: student } = await supabase
      .from('students')
      .select('current_streak, longest_streak')
      .eq('id', studentId)
      .single();

    if (student && student.current_streak === 0 && student.longest_streak > 3) {
      insights.push({
        id: `streak-${Date.now()}`,
        type: 'performance_improvement',
        title: 'Start a new learning streak',
        description: `You had a ${student.longest_streak}-day streak before! Let's start a new one today.`,
        priority: 'medium',
        actionable: true,
        actions: [
          {
            title: 'Watch your next video',
            description: 'Complete one video to start your streak',
            action_type: 'review_video',
          },
        ],
        metadata: student,
        created_at: new Date().toISOString(),
      });
    }

    return insights;
  }

  /**
   * Generate content quality insights
   */
  private async generateContentInsights(creatorId: string): Promise<Insight[]> {
    const supabase = createClient();
    const insights: Insight[] = [];

    // Get videos with low health scores
    const { data: videos } = await supabase
      .from('videos')
      .select('id, title')
      .eq('creator_id', creatorId)
      .limit(20);

    if (!videos) return insights;

    for (const video of videos) {
      try {
        const health = await this.contentHealth.analyzeContentEffectiveness(video.id);

        if (health.overall_score < 60) {
          insights.push({
            id: `content-quality-${video.id}`,
            type: 'content_quality',
            title: `Video "${video.title}" needs improvement`,
            description: `This video scores ${health.overall_score}/100. ${health.recommendations[0] || 'Consider reviewing it.'}`,
            priority: health.overall_score < 40 ? 'high' : 'medium',
            actionable: true,
            actions: health.recommendations.map((rec) => ({
              title: rec,
              description: rec,
              action_type: 'review_video',
              resource_id: video.id,
            })),
            metadata: health,
            created_at: new Date().toISOString(),
          });
        }
      } catch (error) {
        console.error('Failed to analyze video health:', error);
      }
    }

    return insights;
  }

  /**
   * Generate student risk insights
   */
  private async generateRiskInsights(creatorId: string): Promise<Insight[]> {
    const insights: Insight[] = [];

    const atRiskStudents = await this.engagement.identifyAtRiskStudents(creatorId);

    const criticalCount = atRiskStudents.filter((s) => s.risk_level === 'critical').length;
    const highCount = atRiskStudents.filter((s) => s.risk_level === 'high').length;

    if (criticalCount > 0 || highCount > 3) {
      insights.push({
        id: `at-risk-${Date.now()}`,
        type: 'student_risk',
        title: `${criticalCount + highCount} students at risk of dropping out`,
        description: `${criticalCount} critical, ${highCount} high risk. Reach out to these students to keep them engaged.`,
        priority: criticalCount > 0 ? 'critical' : 'high',
        actionable: true,
        actions: [
          {
            title: 'View at-risk students',
            description: 'See list of students who need attention',
            action_type: 'contact_student',
          },
          {
            title: 'Send engagement reminder',
            description: 'Automated message to encourage return',
            action_type: 'contact_student',
          },
        ],
        metadata: { critical_count: criticalCount, high_count: highCount, students: atRiskStudents },
        created_at: new Date().toISOString(),
      });
    }

    return insights;
  }

  /**
   * Generate content gap insights
   */
  private async generateGapInsights(creatorId: string): Promise<Insight[]> {
    const insights: Insight[] = [];

    const gaps = await this.contentHealth.findContentGaps(creatorId);

    for (const gap of gaps.slice(0, 3)) {
      // Top 3 gaps
      insights.push({
        id: `gap-${gap.topic}`,
        type: 'gap_detection',
        title: `Missing content: ${gap.topic}`,
        description: `${gap.evidence.student_questions} students have asked about ${gap.topic}, but you don't have a video covering it.`,
        priority: gap.priority,
        actionable: true,
        actions: [
          {
            title: `Create "${gap.topic}" video`,
            description: `Add a video teaching ${gap.topic}`,
            action_type: 'create_content',
          },
        ],
        metadata: gap,
        created_at: new Date().toISOString(),
      });
    }

    return insights;
  }

  /**
   * Generate engagement insights
   */
  private async generateEngagementInsights(creatorId: string): Promise<Insight[]> {
    const supabase = createClient();
    const insights: Insight[] = [];

    // Check overall engagement trend
    const { data: students } = await supabase
      .from('students')
      .select('engagement_score')
      .eq('creator_id', creatorId);

    if (students && students.length > 0) {
      const avgEngagement =
        students.reduce((sum, s) => sum + (s.engagement_score || 50), 0) / students.length;

      if (avgEngagement < 50) {
        insights.push({
          id: `engagement-low-${Date.now()}`,
          type: 'engagement_drop',
          title: 'Overall student engagement is low',
          description: `Average engagement score is ${Math.round(avgEngagement)}/100. Consider adding more interactive content or adjusting difficulty.`,
          priority: avgEngagement < 40 ? 'high' : 'medium',
          actionable: true,
          actions: [
            {
              title: 'Review low-engagement videos',
              description: 'Identify videos with high drop-off rates',
              action_type: 'review_video',
            },
            {
              title: 'Create interactive quizzes',
              description: 'Add quizzes to boost engagement',
              action_type: 'update_quiz',
            },
          ],
          metadata: { avg_engagement: avgEngagement, student_count: students.length },
          created_at: new Date().toISOString(),
        });
      }
    }

    return insights;
  }

  /**
   * Prioritize insights by impact and urgency
   */
  private prioritizeInsights(insights: Insight[]): Insight[] {
    const priorityOrder: Record<string, number> = {
      critical: 0,
      high: 1,
      medium: 2,
      low: 3,
    };

    return insights.sort((a, b) => {
      // First by priority
      const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
      if (priorityDiff !== 0) return priorityDiff;

      // Then by actionability
      if (a.actionable !== b.actionable) {
        return a.actionable ? -1 : 1;
      }

      // Then by creation date (newest first)
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  }

  /**
   * Store insights in database
   */
  private async storeInsights(creatorId: string, insights: Insight[]): Promise<void> {
    const supabase = createClient();

    const records = insights.map((insight) => ({
      creator_id: creatorId,
      insight_type: insight.type,
      title: insight.title,
      description: insight.description,
      priority: insight.priority,
      actionable: insight.actionable,
      actions: insight.actions,
      metadata: insight.metadata,
    }));

    if (records.length > 0) {
      await supabase.from('ai_insights').insert(records);
    }
  }
}
