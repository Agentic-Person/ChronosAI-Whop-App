/**
 * Inngest Background Jobs for Content Intelligence
 * Scheduled analytics and insight generation
 */

import { inngest } from '@/lib/inngest/client';
import { GapDetector } from './gap-detector';
import { EngagementAnalytics } from './engagement-analytics';
import { ContentHealthMonitor } from './content-health';
import { InsightsGenerator } from './insights-generator';
import { createClient } from '@/lib/supabase/server';

/**
 * Daily job: Update engagement scores for all students
 */
export const updateEngagementScores = inngest.createFunction(
  {
    id: 'intelligence-update-engagement-scores',
    name: 'Update Engagement Scores',
    retries: 1,
  },
  { cron: '0 2 * * *' }, // Daily at 2 AM
  async ({ step, logger }) => {
    const analytics = new EngagementAnalytics();
    const supabase = createClient();

    // Get all students
    const students = await step.run('fetch-students', async () => {
      const { data } = await supabase.from('students').select('id').limit(1000);
      return data || [];
    });

    logger.info(`Processing ${students.length} students`);

    let updatedCount = 0;

    for (const student of students) {
      try {
        await step.run(`update-engagement-${student.id}`, async () => {
          const engagement = await analytics.predictEngagement(student.id);

          // Update in database using SQL function
          await supabase.rpc('update_engagement_score', {
            p_student_id: student.id,
          });

          // Store prediction if at risk
          if (
            engagement.risk_level === 'high' ||
            engagement.risk_level === 'critical'
          ) {
            await supabase.from('student_predictions').insert({
              student_id: student.id,
              prediction_type: 'engagement_forecast',
              prediction_value: engagement.score,
              confidence: 0.85,
              factors: engagement.factors,
              interventions: engagement.recommendations.map((rec) => ({
                type: 'notification',
                message: rec,
              })),
              expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
            });
          }

          updatedCount++;
        });
      } catch (error) {
        logger.error(`Failed to update engagement for student ${student.id}:`, {
          error,
        });
      }
    }

    logger.info(`Updated engagement scores for ${updatedCount} students`);

    return { success: true, count: updatedCount };
  }
);

/**
 * Daily job: Detect knowledge gaps for active students
 */
export const detectKnowledgeGaps = inngest.createFunction(
  {
    id: 'intelligence-detect-knowledge-gaps',
    name: 'Detect Knowledge Gaps',
    retries: 1,
  },
  { cron: '0 3 * * *' }, // Daily at 3 AM
  async ({ step, logger }) => {
    const detector = new GapDetector();
    const supabase = createClient();

    // Get active students (active in last 30 days)
    const students = await step.run('fetch-active-students', async () => {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const { data } = await supabase
        .from('students')
        .select('id')
        .gte('last_active_at', thirtyDaysAgo.toISOString())
        .limit(500);
      return data || [];
    });

    logger.info(`Analyzing ${students.length} active students for knowledge gaps`);

    let gapsDetected = 0;

    for (const student of students) {
      try {
        await step.run(`detect-gaps-${student.id}`, async () => {
          const gaps = await detector.detectGaps(student.id);
          gapsDetected += gaps.length;
        });
      } catch (error) {
        logger.error(`Failed to detect gaps for student ${student.id}:`, {
          error,
        });
      }
    }

    logger.info(`Detected ${gapsDetected} total knowledge gaps`);

    return { success: true, gaps_detected: gapsDetected };
  }
);

/**
 * Weekly job: Analyze content health for all videos
 */
export const analyzeContentHealth = inngest.createFunction(
  {
    id: 'intelligence-analyze-content-health',
    name: 'Analyze Content Health',
    retries: 1,
  },
  { cron: '0 4 * * 0' }, // Weekly on Sunday at 4 AM
  async ({ step, logger }) => {
    const monitor = new ContentHealthMonitor();
    const supabase = createClient();

    // Get all videos
    const videos = await step.run('fetch-videos', async () => {
      const { data } = await supabase
        .from('videos')
        .select('id, title')
        .limit(1000);
      return data || [];
    });

    logger.info(`Analyzing health of ${videos.length} videos`);

    let analyzedCount = 0;
    const lowQualityVideos: any[] = [];

    for (const video of videos) {
      try {
        await step.run(`analyze-health-${video.id}`, async () => {
          const health = await monitor.analyzeContentEffectiveness(video.id);

          if (health.overall_score < 60) {
            lowQualityVideos.push({
              video_id: video.id,
              title: video.title,
              score: health.overall_score,
              issues: health.issues,
            });
          }

          analyzedCount++;
        });
      } catch (error) {
        logger.error(`Failed to analyze health for video ${video.id}:`, {
          error,
        });
      }
    }

    logger.info(`Analyzed ${analyzedCount} videos, found ${lowQualityVideos.length} with low quality`);

    return {
      success: true,
      analyzed: analyzedCount,
      low_quality_count: lowQualityVideos.length,
      low_quality_videos: lowQualityVideos.slice(0, 10), // Top 10
    };
  }
);

/**
 * Weekly job: Generate creator insights
 */
export const generateCreatorInsights = inngest.createFunction(
  {
    id: 'intelligence-generate-creator-insights',
    name: 'Generate Creator Insights',
    retries: 1,
  },
  { cron: '0 6 * * 1' }, // Weekly on Monday at 6 AM
  async ({ step, logger }) => {
    const generator = new InsightsGenerator();
    const supabase = createClient();

    // Get all creators
    const creators = await step.run('fetch-creators', async () => {
      const { data } = await supabase.from('creators').select('id, email').limit(1000);
      return data || [];
    });

    logger.info(`Generating insights for ${creators.length} creators`);

    let insightsGenerated = 0;

    for (const creator of creators) {
      try {
        await step.run(`generate-insights-${creator.id}`, async () => {
          const insights = await generator.generateWeeklyInsights(creator.id);
          insightsGenerated += insights.length;

          // TODO: Send email notification to creator with top insights
          logger.info(`Generated ${insights.length} insights for creator ${creator.id}`);
        });
      } catch (error) {
        logger.error(`Failed to generate insights for creator ${creator.id}:`, {
          error,
        });
      }
    }

    logger.info(`Generated ${insightsGenerated} total insights`);

    return { success: true, insights_count: insightsGenerated };
  }
);

/**
 * Daily job: Identify at-risk students
 */
export const identifyAtRiskStudents = inngest.createFunction(
  {
    id: 'intelligence-identify-at-risk-students',
    name: 'Identify At-Risk Students',
    retries: 1,
  },
  { cron: '0 7 * * *' }, // Daily at 7 AM
  async ({ step, logger }) => {
    const analytics = new EngagementAnalytics();
    const supabase = createClient();

    // Get all creators
    const creators = await step.run('fetch-creators', async () => {
      const { data } = await supabase.from('creators').select('id, email');
      return data || [];
    });

    logger.info(`Checking for at-risk students across ${creators.length} creators`);

    let totalAtRisk = 0;

    for (const creator of creators) {
      try {
        await step.run(`check-at-risk-${creator.id}`, async () => {
          const atRiskStudents = await analytics.identifyAtRiskStudents(creator.id);

          if (atRiskStudents.length > 0) {
            totalAtRisk += atRiskStudents.length;

            // Create insight for creator
            await supabase.from('ai_insights').insert({
              creator_id: creator.id,
              insight_type: 'student_risk',
              title: `${atRiskStudents.length} students at risk`,
              description: `You have ${atRiskStudents.length} students who may drop out soon. Consider reaching out.`,
              priority:
                atRiskStudents.filter((s) => s.risk_level === 'critical').length > 0
                  ? 'high'
                  : 'medium',
              actionable: true,
              actions: [
                {
                  title: 'View at-risk students',
                  description: 'See list and take action',
                },
              ],
              metadata: { students: atRiskStudents.slice(0, 10) },
            });

            logger.info(`Found ${atRiskStudents.length} at-risk students for creator ${creator.id}`);
          }
        });
      } catch (error) {
        logger.error(`Failed to check at-risk students for creator ${creator.id}:`, {
          error,
        });
      }
    }

    logger.info(`Identified ${totalAtRisk} at-risk students across all creators`);

    return { success: true, at_risk_count: totalAtRisk };
  }
);
