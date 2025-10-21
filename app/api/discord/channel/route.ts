/**
 * Discord Channel Management Route
 *
 * API for managing Discord channels (create, archive, delete).
 * Used for study groups and other platform features.
 *
 * ENTERPRISE TIER ONLY
 */

import { NextRequest, NextResponse } from 'next/server';
import { DiscordChannelManager } from '@/lib/discord/channel-manager';
import { withFeatureGate } from '@/lib/middleware/feature-gate';
import { Feature } from '@/lib/features/types';

/**
 * POST /api/discord/channel
 * Create a new Discord channel
 * Body: { type, name, creator_id, group_id, member_discord_ids }
 */
export const POST = withFeatureGate(
  { feature: Feature.FEATURE_DISCORD_INTEGRATION },
  async (request: NextRequest) => {
    try {
      const body = await request.json();
      const { type, name, creator_id, group_id, member_discord_ids } = body;

      if (!type || !name || !creator_id) {
        return NextResponse.json(
          { error: 'Missing required fields' },
          { status: 400 }
        );
      }

      const channelManager = new DiscordChannelManager();

      if (type === 'study_group') {
        if (!group_id || !Array.isArray(member_discord_ids)) {
          return NextResponse.json(
            { error: 'group_id and member_discord_ids required for study group channels' },
            { status: 400 }
          );
        }

        const channelId = await channelManager.createStudyGroupChannel(
          group_id,
          name,
          creator_id,
          member_discord_ids
        );

        return NextResponse.json({
          success: true,
          channel_id: channelId,
          message: 'Study group channel created successfully',
        });
      }

      return NextResponse.json(
        { error: 'Unsupported channel type' },
        { status: 400 }
      );
    } catch (error: any) {
      console.error('Channel creation error:', error);
      return NextResponse.json(
        { error: 'Failed to create channel', details: error.message },
        { status: 500 }
      );
    }
  }
);

/**
 * PATCH /api/discord/channel
 * Update channel (add/remove members)
 * Body: { channel_id, action, discord_user_id }
 */
export const PATCH = withFeatureGate(
  { feature: Feature.FEATURE_DISCORD_INTEGRATION },
  async (request: NextRequest) => {
    try {
      const body = await request.json();
      const { channel_id, action, discord_user_id } = body;

      if (!channel_id || !action || !discord_user_id) {
        return NextResponse.json(
          { error: 'Missing required fields' },
          { status: 400 }
        );
      }

      const channelManager = new DiscordChannelManager();

      switch (action) {
        case 'add_member':
          await channelManager.addMemberToChannel(channel_id, discord_user_id);
          break;

        case 'remove_member':
          await channelManager.removeMemberFromChannel(channel_id, discord_user_id);
          break;

        case 'archive':
          await channelManager.archiveChannel(channel_id);
          break;

        default:
          return NextResponse.json(
            { error: 'Invalid action' },
            { status: 400 }
          );
      }

      return NextResponse.json({
        success: true,
        message: `Channel ${action} completed successfully`,
      });
    } catch (error: any) {
      console.error('Channel update error:', error);
      return NextResponse.json(
        { error: 'Failed to update channel', details: error.message },
        { status: 500 }
      );
    }
  }
);

/**
 * DELETE /api/discord/channel
 * Delete a Discord channel
 * Body: { channel_id }
 */
export const DELETE = withFeatureGate(
  { feature: Feature.FEATURE_DISCORD_INTEGRATION },
  async (request: NextRequest) => {
    try {
      const body = await request.json();
      const { channel_id } = body;

      if (!channel_id) {
        return NextResponse.json(
          { error: 'Missing channel_id' },
          { status: 400 }
        );
      }

      const channelManager = new DiscordChannelManager();
      await channelManager.deleteChannel(channel_id);

      return NextResponse.json({
        success: true,
        message: 'Channel deleted successfully',
      });
    } catch (error: any) {
      console.error('Channel deletion error:', error);
      return NextResponse.json(
        { error: 'Failed to delete channel', details: error.message },
        { status: 500 }
      );
    }
  }
);
