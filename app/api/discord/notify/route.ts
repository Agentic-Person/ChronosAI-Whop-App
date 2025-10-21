/**
 * Discord Notification Webhook Route
 *
 * Internal API for triggering Discord notifications.
 * Used by other parts of the platform to send notifications to Discord.
 *
 * ENTERPRISE TIER ONLY
 */

import { NextRequest, NextResponse } from 'next/server';
import { DiscordNotificationService } from '@/lib/discord/notification-service';
import { withFeatureGate } from '@/lib/middleware/feature-gate';
import { Feature } from '@/lib/features/types';

/**
 * POST /api/discord/notify
 * Body: { type, data }
 */
export const POST = withFeatureGate(
  { feature: Feature.FEATURE_DISCORD_INTEGRATION },
  async (request: NextRequest) => {
    try {
      const body = await request.json();
      const { type, data } = body;

      if (!type) {
        return NextResponse.json(
          { error: 'Missing notification type' },
          { status: 400 }
        );
      }

      const notificationService = new DiscordNotificationService();

      // Get Discord user ID if student_id is provided
      let discordUserId: string | undefined;
      if (data.student_id) {
        discordUserId = (await notificationService.getDiscordUserId(data.student_id)) || undefined;
      }

      // Route to appropriate notification handler
      switch (type) {
        case 'xp_gained':
          await notificationService.notifyXPGain(
            data.studentName,
            data.xpEarned,
            data.reason,
            discordUserId
          );
          break;

        case 'level_up':
          await notificationService.notifyLevelUp(
            data.studentName,
            data.newLevel,
            discordUserId
          );
          break;

        case 'achievement_unlocked':
          await notificationService.notifyAchievementUnlock(
            data.studentName,
            data.achievementName,
            data.achievementDescription,
            data.achievementEmoji,
            data.rarity,
            discordUserId
          );
          break;

        case 'perfect_quiz':
          await notificationService.notifyPerfectQuiz(
            data.studentName,
            data.quizTitle,
            discordUserId
          );
          break;

        case 'project_submitted':
          await notificationService.notifyProjectSubmission(
            data.studentName,
            data.projectTitle,
            data.submissionUrl,
            discordUserId
          );
          break;

        case 'streak_milestone':
          await notificationService.notifyStreakMilestone(
            data.studentName,
            data.streakDays,
            discordUserId
          );
          break;

        case 'daily_summary':
          await notificationService.postDailySummary(data);
          break;

        case 'dm':
          if (discordUserId) {
            await notificationService.sendDM(discordUserId, data.message);
          }
          break;

        default:
          return NextResponse.json(
            { error: 'Unknown notification type' },
            { status: 400 }
          );
      }

      return NextResponse.json({
        success: true,
        message: 'Notification sent successfully',
      });
    } catch (error: any) {
      console.error('Discord notification error:', error);
      return NextResponse.json(
        { error: 'Failed to send notification', details: error.message },
        { status: 500 }
      );
    }
  }
);
