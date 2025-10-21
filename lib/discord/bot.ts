/**
 * Discord Bot - Core Infrastructure
 *
 * Main bot instance with event handlers and initialization.
 * Handles:
 * - Bot lifecycle (connect, disconnect, error handling)
 * - Member events (join, leave)
 * - Message moderation
 * - Slash command interactions
 *
 * ENTERPRISE TIER ONLY
 */

import {
  Client,
  GatewayIntentBits,
  Events,
  Partials,
  Guild,
  GuildMember,
  Message,
  Interaction
} from 'discord.js';
import { registerCommands } from './commands/register';
import { handleCommand } from './commands/handler';
import { moderateMessage } from './moderation/content-filter';

export class DiscordBot {
  private client: Client;
  private isReady = false;
  private guildId: string;

  constructor() {
    this.guildId = process.env.DISCORD_GUILD_ID || '';

    this.client = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildScheduledEvents,
      ],
      partials: [Partials.Channel, Partials.Message],
    });

    this.setupEventHandlers();
  }

  /**
   * Setup all event handlers for the Discord bot
   */
  private setupEventHandlers() {
    // Bot ready event
    this.client.once(Events.ClientReady, async (client) => {
      console.log(`✅ Discord bot ready as ${client.user.tag}`);
      this.isReady = true;

      // Register slash commands
      if (this.guildId) {
        await registerCommands(client.application.id, this.guildId);
      } else {
        console.warn('⚠️ DISCORD_GUILD_ID not set - slash commands not registered');
      }
    });

    // Slash command interactions
    this.client.on(Events.InteractionCreate, async (interaction: Interaction) => {
      if (!interaction.isChatInputCommand()) return;

      try {
        await handleCommand(interaction);
      } catch (error) {
        console.error('❌ Command error:', error);

        const errorMessage = {
          content: 'There was an error executing this command. Please try again later.',
          ephemeral: true,
        };

        if (interaction.replied || interaction.deferred) {
          await interaction.followUp(errorMessage);
        } else {
          await interaction.reply(errorMessage);
        }
      }
    });

    // New member joins server
    this.client.on(Events.GuildMemberAdd, async (member: GuildMember) => {
      console.log(`👋 New member joined: ${member.user.tag}`);

      try {
        // Send welcome DM
        await member.send(
          `Welcome to the learning community, ${member.user.username}! 🎉\n\n` +
          `Get started by using \`/progress\` to see your learning journey.\n` +
          `Need help? Ask in #help-and-questions!\n\n` +
          `Link your account using \`/connect\` to unlock all features.`
        );
      } catch (error) {
        console.error('Could not send welcome DM:', error);
      }

      // Assign @Student role
      try {
        const studentRole = member.guild.roles.cache.find(role => role.name === 'Student');
        if (studentRole) {
          await member.roles.add(studentRole);
          console.log(`✅ Assigned @Student role to ${member.user.tag}`);
        }
      } catch (error) {
        console.error('Could not assign student role:', error);
      }
    });

    // Member leaves server
    this.client.on(Events.GuildMemberRemove, async (member: GuildMember) => {
      console.log(`👋 Member left: ${member.user.tag}`);
      // Could track this in analytics if needed
    });

    // Message moderation
    this.client.on(Events.MessageCreate, async (message: Message) => {
      // Ignore bot messages
      if (message.author.bot) return;

      // Moderate content
      try {
        const modResult = await moderateMessage(message);

        if (modResult.shouldDelete) {
          await message.delete();

          // Send warning to user
          try {
            await message.author.send(
              `⚠️ Your message in ${message.guild?.name} was removed.\n\n` +
              `**Reason:** ${modResult.reason}\n\n` +
              `Please follow our community guidelines.`
            );
          } catch (error) {
            console.error('Could not send moderation DM:', error);
          }

          console.log(`🚫 Deleted message from ${message.author.tag}: ${modResult.reason}`);
        }
      } catch (error) {
        console.error('Message moderation error:', error);
      }
    });

    // Error handling
    this.client.on(Events.Error, (error) => {
      console.error('❌ Discord client error:', error);
    });

    // Warning events
    this.client.on(Events.Warn, (warning) => {
      console.warn('⚠️ Discord warning:', warning);
    });

    // Debug events (only in development)
    if (process.env.NODE_ENV === 'development') {
      this.client.on(Events.Debug, (info) => {
        if (info.includes('Heartbeat')) return; // Skip heartbeat logs
        console.log('🔍 Discord debug:', info);
      });
    }
  }

  /**
   * Start the Discord bot
   */
  async start(): Promise<void> {
    if (!process.env.DISCORD_BOT_TOKEN) {
      throw new Error('DISCORD_BOT_TOKEN is not set in environment variables');
    }

    if (!this.guildId) {
      console.warn('⚠️ DISCORD_GUILD_ID not set - some features may not work');
    }

    try {
      await this.client.login(process.env.DISCORD_BOT_TOKEN);
      console.log('✅ Discord bot logged in successfully');
    } catch (error) {
      console.error('❌ Failed to start Discord bot:', error);
      throw error;
    }
  }

  /**
   * Stop the Discord bot gracefully
   */
  async stop(): Promise<void> {
    try {
      await this.client.destroy();
      this.isReady = false;
      console.log('✅ Discord bot stopped gracefully');
    } catch (error) {
      console.error('❌ Error stopping Discord bot:', error);
      throw error;
    }
  }

  /**
   * Get the Discord client instance
   */
  getClient(): Client {
    return this.client;
  }

  /**
   * Check if bot is ready and connected
   */
  ready(): boolean {
    return this.isReady;
  }

  /**
   * Get guild by ID
   */
  getGuild(): Guild | undefined {
    return this.client.guilds.cache.get(this.guildId);
  }
}

// Singleton instance
let botInstance: DiscordBot | null = null;

/**
 * Get the singleton Discord bot instance
 */
export function getDiscordBot(): DiscordBot {
  if (!botInstance) {
    botInstance = new DiscordBot();
  }
  return botInstance;
}

/**
 * Initialize and start the Discord bot
 */
export async function initializeDiscordBot(): Promise<DiscordBot> {
  const bot = getDiscordBot();

  if (!bot.ready()) {
    await bot.start();
  }

  return bot;
}
