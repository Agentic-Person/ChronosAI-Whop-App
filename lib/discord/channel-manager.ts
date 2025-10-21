/**
 * Discord Channel Manager
 *
 * Automatically creates and manages Discord channels for:
 * - Study groups
 * - Projects
 * - Courses
 *
 * Handles permissions, member management, and archival.
 */

import { getDiscordBot } from './bot';
import { ChannelType, PermissionFlagsBits, TextChannel } from 'discord.js';
import { createClient } from '@/lib/supabase/server';

export class DiscordChannelManager {
  private bot = getDiscordBot();

  /**
   * Create a private channel for a study group
   */
  async createStudyGroupChannel(
    groupId: string,
    groupName: string,
    creatorId: string,
    memberDiscordIds: string[]
  ): Promise<string> {
    try {
      const client = this.bot.getClient();
      const guild = client.guilds.cache.get(process.env.DISCORD_GUILD_ID!);

      if (!guild) {
        throw new Error('Guild not found');
      }

      // Sanitize channel name
      const channelName = groupName
        .toLowerCase()
        .replace(/[^a-z0-9-]/g, '-')
        .replace(/-+/g, '-')
        .substring(0, 100);

      // Find or create "Study Groups" category
      let category = guild.channels.cache.find(
        ch => ch.name === 'Study Groups' && ch.type === ChannelType.GuildCategory
      );

      if (!category) {
        category = await guild.channels.create({
          name: 'Study Groups',
          type: ChannelType.GuildCategory,
        });
      }

      // Create private channel
      const channel = await guild.channels.create({
        name: channelName,
        type: ChannelType.GuildText,
        parent: category.id,
        permissionOverwrites: [
          {
            id: guild.id, // @everyone
            deny: [PermissionFlagsBits.ViewChannel],
          },
          ...memberDiscordIds.map(discordId => ({
            id: discordId,
            allow: [
              PermissionFlagsBits.ViewChannel,
              PermissionFlagsBits.SendMessages,
              PermissionFlagsBits.ReadMessageHistory,
              PermissionFlagsBits.AttachFiles,
              PermissionFlagsBits.EmbedLinks,
            ],
          })),
        ],
      });

      // Send welcome message
      await channel.send(
        `🎉 Welcome to **${groupName}**!\n\n` +
        `This is your private study group channel. Here you can:\n` +
        `• Discuss concepts and ask questions\n` +
        `• Share resources and code snippets\n` +
        `• Coordinate study sessions\n` +
        `• Track your group progress\n\n` +
        `Let's learn together! 🚀`
      );

      // Store channel ID in database
      const supabase = createClient();

      await supabase.from('discord_channels').insert({
        creator_id: creatorId,
        discord_channel_id: channel.id,
        channel_name: channelName,
        channel_type: 'study_group',
        linked_entity_id: groupId,
        linked_entity_type: 'study_group',
        is_private: true,
      });

      // Update study group with channel ID
      await supabase
        .from('study_groups')
        .update({ discord_channel_id: channel.id })
        .eq('id', groupId);

      console.log(`✅ Created study group channel: #${channelName}`);

      return channel.id;
    } catch (error) {
      console.error('Failed to create study group channel:', error);
      throw error;
    }
  }

  /**
   * Add member to existing channel
   */
  async addMemberToChannel(
    channelId: string,
    discordUserId: string
  ): Promise<void> {
    try {
      const client = this.bot.getClient();
      const guild = client.guilds.cache.get(process.env.DISCORD_GUILD_ID!);

      if (!guild) throw new Error('Guild not found');

      const channel = guild.channels.cache.get(channelId);
      if (!channel || !channel.isTextBased()) {
        throw new Error('Channel not found');
      }

      await channel.permissionOverwrites.create(discordUserId, {
        ViewChannel: true,
        SendMessages: true,
        ReadMessageHistory: true,
        AttachFiles: true,
        EmbedLinks: true,
      });

      // Send welcome message
      const textChannel = channel as TextChannel;
      await textChannel.send(`Welcome <@${discordUserId}> to the study group! 👋`);

      console.log(`✅ Added member to channel: ${discordUserId}`);
    } catch (error) {
      console.error('Failed to add member to channel:', error);
      throw error;
    }
  }

  /**
   * Remove member from channel
   */
  async removeMemberFromChannel(
    channelId: string,
    discordUserId: string
  ): Promise<void> {
    try {
      const client = this.bot.getClient();
      const guild = client.guilds.cache.get(process.env.DISCORD_GUILD_ID!);

      if (!guild) throw new Error('Guild not found');

      const channel = guild.channels.cache.get(channelId);
      if (!channel || !channel.isTextBased()) {
        throw new Error('Channel not found');
      }

      await channel.permissionOverwrites.delete(discordUserId);

      console.log(`✅ Removed member from channel: ${discordUserId}`);
    } catch (error) {
      console.error('Failed to remove member from channel:', error);
      throw error;
    }
  }

  /**
   * Archive channel (make read-only)
   */
  async archiveChannel(channelId: string): Promise<void> {
    try {
      const client = this.bot.getClient();
      const guild = client.guilds.cache.get(process.env.DISCORD_GUILD_ID!);

      if (!guild) throw new Error('Guild not found');

      const channel = guild.channels.cache.get(channelId);
      if (!channel) {
        throw new Error('Channel not found');
      }

      // Make channel read-only
      await channel.permissionOverwrites.edit(guild.id, {
        SendMessages: false,
      });

      // Send archive message
      if (channel.isTextBased()) {
        const textChannel = channel as TextChannel;
        await textChannel.send(
          `📦 This channel has been archived and is now read-only.`
        );
      }

      // Update database
      const supabase = createClient();
      await supabase
        .from('discord_channels')
        .update({
          archived: true,
          archived_at: new Date().toISOString(),
        })
        .eq('discord_channel_id', channelId);

      console.log(`✅ Archived channel: ${channelId}`);
    } catch (error) {
      console.error('Failed to archive channel:', error);
      throw error;
    }
  }

  /**
   * Delete channel permanently
   */
  async deleteChannel(channelId: string): Promise<void> {
    try {
      const client = this.bot.getClient();
      const guild = client.guilds.cache.get(process.env.DISCORD_GUILD_ID!);

      if (!guild) throw new Error('Guild not found');

      const channel = guild.channels.cache.get(channelId);
      if (channel) {
        await channel.delete();
      }

      // Update database
      const supabase = createClient();
      await supabase
        .from('discord_channels')
        .delete()
        .eq('discord_channel_id', channelId);

      console.log(`✅ Deleted channel: ${channelId}`);
    } catch (error) {
      console.error('Failed to delete channel:', error);
      throw error;
    }
  }

  /**
   * Post announcement to channel
   */
  async postAnnouncement(
    channelId: string,
    message: string,
    mentionEveryone = false
  ): Promise<void> {
    try {
      const client = this.bot.getClient();
      const guild = client.guilds.cache.get(process.env.DISCORD_GUILD_ID!);

      if (!guild) throw new Error('Guild not found');

      const channel = guild.channels.cache.get(channelId);
      if (!channel || !channel.isTextBased()) {
        throw new Error('Channel not found');
      }

      const textChannel = channel as TextChannel;
      const content = mentionEveryone ? `@everyone\n\n${message}` : message;

      await textChannel.send(content);

      console.log(`✅ Posted announcement to channel: ${channelId}`);
    } catch (error) {
      console.error('Failed to post announcement:', error);
      throw error;
    }
  }

  /**
   * Get channel members
   */
  async getChannelMembers(channelId: string): Promise<string[]> {
    try {
      const client = this.bot.getClient();
      const guild = client.guilds.cache.get(process.env.DISCORD_GUILD_ID!);

      if (!guild) throw new Error('Guild not found');

      const channel = guild.channels.cache.get(channelId);
      if (!channel) {
        throw new Error('Channel not found');
      }

      const members: string[] = [];

      channel.permissionOverwrites.cache.forEach((overwrite) => {
        if (overwrite.type === 1) { // Type 1 = Member
          members.push(overwrite.id);
        }
      });

      return members;
    } catch (error) {
      console.error('Failed to get channel members:', error);
      return [];
    }
  }
}
