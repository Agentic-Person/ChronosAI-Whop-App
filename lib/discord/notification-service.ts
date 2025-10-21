/**
 * Discord Notification Service
 *
 * Sends automated notifications to Discord channels and DMs.
 * Handles:
 * - XP gains and level-ups
 * - Achievement unlocks
 * - Quiz completions
 * - Daily summaries
 * - Study group invitations
 */

import { getDiscordBot } from './bot';
import { EmbedBuilder, TextChannel, User } from 'discord.js';
import { createClient } from '@/lib/supabase/server';

export interface NotificationEvent {
  type: string;
  data: Record<string, any>;
}

export class DiscordNotificationService {
  private bot = getDiscordBot();

  /**
   * Post XP gain notification
   */
  async notifyXPGain(
    studentName: string,
    xpEarned: number,
    reason: string,
    discordUserId?: string
  ): Promise<void> {
    try {
      const channel = await this.getChannel('achievements');
      if (!channel) return;

      const mention = discordUserId ? `<@${discordUserId}>` : studentName;

      await channel.send(
        `🎉 ${mention} just earned **${xpEarned} XP** for ${reason}!`
      );

      // Log notification
      if (discordUserId) {
        await this.logNotification(discordUserId, 'xp_gained', {
          xpEarned,
          reason,
        });
      }
    } catch (error) {
      console.error('Failed to send XP notification:', error);
    }
  }

  /**
   * Post level-up notification
   */
  async notifyLevelUp(
    studentName: string,
    newLevel: number,
    discordUserId?: string
  ): Promise<void> {
    try {
      const channel = await this.getChannel('achievements');
      if (!channel) return;

      const mention = discordUserId ? `<@${discordUserId}>` : studentName;

      const embed = new EmbedBuilder()
        .setColor('#FFD700')
        .setTitle('🚀 Level Up!')
        .setDescription(
          `${mention} just reached **Level ${newLevel}**! Keep crushing it! 🔥`
        )
        .setTimestamp();

      const message = await channel.send({ embeds: [embed] });

      // Add celebration reactions
      await message.react('🎉');
      await message.react('🚀');

      // Log notification
      if (discordUserId) {
        await this.logNotification(discordUserId, 'level_up', { newLevel });
      }
    } catch (error) {
      console.error('Failed to send level up notification:', error);
    }
  }

  /**
   * Post achievement unlock notification
   */
  async notifyAchievementUnlock(
    studentName: string,
    achievementName: string,
    achievementDescription: string,
    achievementEmoji: string,
    rarity: string,
    discordUserId?: string
  ): Promise<void> {
    try {
      const channel = await this.getChannel('achievements');
      if (!channel) return;

      const mention = discordUserId ? `<@${discordUserId}>` : studentName;

      const rarityColors: Record<string, number> = {
        common: 0x95a5a6,
        rare: 0x3498db,
        epic: 0x9b59b6,
        legendary: 0xff6b35,
      };

      const embed = new EmbedBuilder()
        .setColor(rarityColors[rarity] || 0xffd700)
        .setTitle(`${achievementEmoji} Achievement Unlocked!`)
        .setDescription(
          `${mention} unlocked **${achievementName}** (${rarity})\n\n` +
          `*${achievementDescription}*`
        )
        .setTimestamp();

      const message = await channel.send({ embeds: [embed] });

      // Add reactions based on rarity
      await message.react('🎉');
      await message.react('🎊');
      if (rarity === 'legendary' || rarity === 'epic') {
        await message.react('🏆');
      }

      // Log notification
      if (discordUserId) {
        await this.logNotification(discordUserId, 'achievement_unlocked', {
          achievementName,
          rarity,
        });
      }
    } catch (error) {
      console.error('Failed to send achievement notification:', error);
    }
  }

  /**
   * Post quiz perfect score notification
   */
  async notifyPerfectQuiz(
    studentName: string,
    quizTitle: string,
    discordUserId?: string
  ): Promise<void> {
    try {
      const channel = await this.getChannel('achievements');
      if (!channel) return;

      const mention = discordUserId ? `<@${discordUserId}>` : studentName;

      await channel.send(
        `⭐ ${mention} got a **perfect score** on "${quizTitle}"! 100% 🎯`
      );

      // Log notification
      if (discordUserId) {
        await this.logNotification(discordUserId, 'perfect_quiz', {
          quizTitle,
        });
      }
    } catch (error) {
      console.error('Failed to send quiz notification:', error);
    }
  }

  /**
   * Post project submission notification
   */
  async notifyProjectSubmission(
    studentName: string,
    projectTitle: string,
    submissionUrl: string,
    discordUserId?: string
  ): Promise<void> {
    try {
      const channel = await this.getChannel('showcase');
      if (!channel) return;

      const mention = discordUserId ? `<@${discordUserId}>` : studentName;

      const embed = new EmbedBuilder()
        .setColor('#5865F2')
        .setTitle('💻 New Project Submission!')
        .setDescription(
          `${mention} just submitted: **${projectTitle}**\n\n` +
          `[View Project](${submissionUrl})`
        )
        .setTimestamp();

      await channel.send({ embeds: [embed] });

      // Log notification
      if (discordUserId) {
        await this.logNotification(discordUserId, 'project_submitted', {
          projectTitle,
          submissionUrl,
        });
      }
    } catch (error) {
      console.error('Failed to send project notification:', error);
    }
  }

  /**
   * Post streak milestone notification
   */
  async notifyStreakMilestone(
    studentName: string,
    streakDays: number,
    discordUserId?: string
  ): Promise<void> {
    try {
      const channel = await this.getChannel('achievements');
      if (!channel) return;

      const mention = discordUserId ? `<@${discordUserId}>` : studentName;

      await channel.send(
        `🔥 ${mention} has a **${streakDays}-day learning streak**! Legendary dedication! 🏅`
      );

      // Log notification
      if (discordUserId) {
        await this.logNotification(discordUserId, 'streak_milestone', {
          streakDays,
        });
      }
    } catch (error) {
      console.error('Failed to send streak notification:', error);
    }
  }

  /**
   * Post daily summary
   */
  async postDailySummary(stats: {
    date: string;
    topPerformers: Array<{ name: string; xp: number; level: number }>;
    videosCompleted: number;
    quizzesPassed: number;
    achievementsUnlocked: number;
    newStudyGroups: number;
  }): Promise<void> {
    try {
      const channel = await this.getChannel('announcements');
      if (!channel) return;

      const topPerformersText = stats.topPerformers
        .slice(0, 3)
        .map((p, i) => {
          const medals = ['🥇', '🥈', '🥉'];
          return `${medals[i]} ${p.name} - ${p.xp.toLocaleString()} XP (Level ${p.level})`;
        })
        .join('\n');

      const embed = new EmbedBuilder()
        .setColor('#5865F2')
        .setTitle(`📊 Daily Progress Recap - ${stats.date}`)
        .setDescription("Here's what the community accomplished today!")
        .addFields(
          {
            name: "Today's Top Performers",
            value: topPerformersText || 'No activity',
            inline: false,
          },
          {
            name: 'Community Stats',
            value:
              `✅ ${stats.videosCompleted} videos completed\n` +
              `✅ ${stats.quizzesPassed} quizzes passed\n` +
              `✅ ${stats.achievementsUnlocked} achievements unlocked\n` +
              `✅ ${stats.newStudyGroups} new study groups formed`,
            inline: false,
          }
        )
        .setFooter({ text: 'Keep up the amazing work! 💪' })
        .setTimestamp();

      await channel.send({ embeds: [embed] });
    } catch (error) {
      console.error('Failed to post daily summary:', error);
    }
  }

  /**
   * Send DM to user
   */
  async sendDM(userId: string, message: string): Promise<void> {
    try {
      const client = this.bot.getClient();
      const user = await client.users.fetch(userId);

      if (user) {
        await user.send(message);
      }
    } catch (error) {
      console.error('Failed to send DM:', error);
    }
  }

  /**
   * Send DM with embed
   */
  async sendDMEmbed(userId: string, embed: EmbedBuilder): Promise<void> {
    try {
      const client = this.bot.getClient();
      const user = await client.users.fetch(userId);

      if (user) {
        await user.send({ embeds: [embed] });
      }
    } catch (error) {
      console.error('Failed to send DM embed:', error);
    }
  }

  /**
   * Get Discord user ID from student ID
   */
  async getDiscordUserId(studentId: string): Promise<string | null> {
    try {
      const supabase = createClient();

      const { data, error } = await supabase
        .from('discord_integrations')
        .select('discord_user_id')
        .eq('student_id', studentId)
        .single();

      if (error || !data) {
        return null;
      }

      return data.discord_user_id;
    } catch (error) {
      console.error('Failed to get Discord user ID:', error);
      return null;
    }
  }

  /**
   * Get channel by name
   */
  private async getChannel(channelName: string): Promise<TextChannel | null> {
    try {
      const client = this.bot.getClient();
      const guild = client.guilds.cache.get(process.env.DISCORD_GUILD_ID!);

      if (!guild) {
        console.error('Guild not found');
        return null;
      }

      const channel = guild.channels.cache.find(
        ch => ch.name === channelName && ch.isTextBased()
      ) as TextChannel;

      if (!channel) {
        console.warn(`Channel #${channelName} not found`);
        return null;
      }

      return channel;
    } catch (error) {
      console.error('Failed to get channel:', error);
      return null;
    }
  }

  /**
   * Log notification to database
   */
  private async logNotification(
    discordUserId: string,
    eventType: string,
    content: Record<string, any>
  ): Promise<void> {
    try {
      const supabase = createClient();

      // Get student ID from Discord user ID
      const { data: integration } = await supabase
        .from('discord_integrations')
        .select('student_id')
        .eq('discord_user_id', discordUserId)
        .single();

      if (!integration) return;

      await supabase.from('discord_notifications').insert({
        student_id: integration.student_id,
        event_type: eventType,
        content,
        sent_successfully: true,
      });
    } catch (error) {
      console.error('Failed to log notification:', error);
    }
  }
}
