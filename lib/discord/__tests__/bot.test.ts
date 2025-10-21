/**
 * Discord Bot Tests
 *
 * Basic tests for Discord bot functionality.
 * Note: These are unit tests. Integration tests require a real Discord server.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from '@jest/globals';
import { DiscordBot } from '../bot';

// Mock Discord.js
vi.mock('discord.js', () => ({
  Client: vi.fn().mockImplementation(() => ({
    login: vi.fn().mockResolvedValue(undefined),
    destroy: vi.fn().mockResolvedValue(undefined),
    on: vi.fn(),
    once: vi.fn(),
    guilds: {
      cache: new Map(),
    },
  })),
  GatewayIntentBits: {
    Guilds: 1,
    GuildMembers: 2,
    GuildMessages: 4,
    MessageContent: 8,
    GuildVoiceStates: 16,
    GuildScheduledEvents: 32,
  },
  Events: {
    ClientReady: 'ready',
    InteractionCreate: 'interactionCreate',
    GuildMemberAdd: 'guildMemberAdd',
    GuildMemberRemove: 'guildMemberRemove',
    MessageCreate: 'messageCreate',
    Error: 'error',
    Warn: 'warn',
    Debug: 'debug',
  },
  Partials: {
    Channel: 'CHANNEL',
    Message: 'MESSAGE',
  },
}));

// Mock command registration
vi.mock('../commands/register', () => ({
  registerCommands: vi.fn().mockResolvedValue(undefined),
}));

describe('DiscordBot', () => {
  let bot: DiscordBot;

  beforeEach(() => {
    // Set required environment variables
    process.env.DISCORD_BOT_TOKEN = 'test_token';
    process.env.DISCORD_GUILD_ID = 'test_guild_id';
  });

  afterEach(async () => {
    if (bot) {
      await bot.stop();
    }
    vi.clearAllMocks();
  });

  describe('Constructor', () => {
    it('should create a bot instance', () => {
      bot = new DiscordBot();
      expect(bot).toBeDefined();
      expect(bot).toBeInstanceOf(DiscordBot);
    });

    it('should not be ready initially', () => {
      bot = new DiscordBot();
      expect(bot.ready()).toBe(false);
    });
  });

  describe('start()', () => {
    it('should start the bot successfully', async () => {
      bot = new DiscordBot();
      await expect(bot.start()).resolves.not.toThrow();
    });

    it('should throw error if DISCORD_BOT_TOKEN is not set', async () => {
      delete process.env.DISCORD_BOT_TOKEN;
      bot = new DiscordBot();

      await expect(bot.start()).rejects.toThrow('DISCORD_BOT_TOKEN is not set');
    });

    it('should warn if DISCORD_GUILD_ID is not set', async () => {
      delete process.env.DISCORD_GUILD_ID;
      const consoleSpy = vi.spyOn(console, 'warn');

      bot = new DiscordBot();
      await bot.start();

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('DISCORD_GUILD_ID not set')
      );
    });
  });

  describe('stop()', () => {
    it('should stop the bot gracefully', async () => {
      bot = new DiscordBot();
      await bot.start();
      await expect(bot.stop()).resolves.not.toThrow();
    });
  });

  describe('getClient()', () => {
    it('should return the Discord client', () => {
      bot = new DiscordBot();
      const client = bot.getClient();
      expect(client).toBeDefined();
    });
  });

  describe('ready()', () => {
    it('should return false before bot is ready', () => {
      bot = new DiscordBot();
      expect(bot.ready()).toBe(false);
    });
  });

  describe('getGuild()', () => {
    it('should return undefined if guild is not cached', () => {
      bot = new DiscordBot();
      const guild = bot.getGuild();
      expect(guild).toBeUndefined();
    });
  });
});
