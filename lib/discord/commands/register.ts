/**
 * Discord Slash Command Registration
 *
 * Registers all slash commands with Discord API.
 * Commands are guild-specific for faster updates during development.
 */

import { REST, Routes, SlashCommandBuilder } from 'discord.js';

/**
 * Define all slash commands
 */
const commands = [
  new SlashCommandBuilder()
    .setName('progress')
    .setDescription('View your learning progress and stats'),

  new SlashCommandBuilder()
    .setName('leaderboard')
    .setDescription('See top students by XP')
    .addStringOption(option =>
      option
        .setName('timeframe')
        .setDescription('Timeframe for leaderboard')
        .setRequired(false)
        .addChoices(
          { name: 'All Time', value: 'all' },
          { name: 'This Week', value: 'week' },
          { name: 'This Month', value: 'month' }
        )
    ),

  new SlashCommandBuilder()
    .setName('ask')
    .setDescription('Ask a question about course content')
    .addStringOption(option =>
      option
        .setName('question')
        .setDescription('Your question')
        .setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName('quiz')
    .setDescription('Get a random practice question')
    .addIntegerOption(option =>
      option
        .setName('module')
        .setDescription('Which module to quiz on (optional)')
        .setRequired(false)
    ),

  new SlashCommandBuilder()
    .setName('schedule')
    .setDescription('View your upcoming learning schedule'),

  new SlashCommandBuilder()
    .setName('buddy')
    .setDescription('Find a study buddy match'),

  new SlashCommandBuilder()
    .setName('achievements')
    .setDescription('View your unlocked achievements'),

  new SlashCommandBuilder()
    .setName('studygroup')
    .setDescription('Study group commands')
    .addSubcommand(subcommand =>
      subcommand
        .setName('create')
        .setDescription('Create a new study group')
        .addStringOption(option =>
          option
            .setName('name')
            .setDescription('Study group name')
            .setRequired(true)
        )
        .addStringOption(option =>
          option
            .setName('description')
            .setDescription('Study group description')
            .setRequired(false)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('list')
        .setDescription('List available study groups')
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('join')
        .setDescription('Join a study group')
        .addStringOption(option =>
          option
            .setName('group')
            .setDescription('Study group name or ID')
            .setRequired(true)
        )
    ),

  new SlashCommandBuilder()
    .setName('stats')
    .setDescription('View platform-wide statistics'),

  new SlashCommandBuilder()
    .setName('connect')
    .setDescription('Link your Discord account to the platform')
    .addStringOption(option =>
      option
        .setName('code')
        .setDescription('Verification code from the platform')
        .setRequired(false)
    ),

  new SlashCommandBuilder()
    .setName('notify')
    .setDescription('Toggle Discord notifications')
    .addStringOption(option =>
      option
        .setName('setting')
        .setDescription('Enable or disable notifications')
        .setRequired(true)
        .addChoices(
          { name: 'On', value: 'on' },
          { name: 'Off', value: 'off' }
        )
    ),

  new SlashCommandBuilder()
    .setName('help')
    .setDescription('List all available commands'),
];

/**
 * Register slash commands with Discord
 */
export async function registerCommands(
  applicationId: string,
  guildId: string
): Promise<void> {
  const rest = new REST({ version: '10' }).setToken(
    process.env.DISCORD_BOT_TOKEN!
  );

  try {
    console.log('📝 Registering Discord slash commands...');

    // Register commands for the guild (faster updates)
    await rest.put(Routes.applicationGuildCommands(applicationId, guildId), {
      body: commands.map(cmd => cmd.toJSON()),
    });

    console.log(`✅ Registered ${commands.length} slash commands successfully`);
  } catch (error) {
    console.error('❌ Failed to register slash commands:', error);
    throw error;
  }
}

/**
 * Register commands globally (takes up to 1 hour to propagate)
 * Use for production deployment
 */
export async function registerGlobalCommands(
  applicationId: string
): Promise<void> {
  const rest = new REST({ version: '10' }).setToken(
    process.env.DISCORD_BOT_TOKEN!
  );

  try {
    console.log('📝 Registering global Discord slash commands...');

    await rest.put(Routes.applicationCommands(applicationId), {
      body: commands.map(cmd => cmd.toJSON()),
    });

    console.log('✅ Registered global slash commands (may take up to 1 hour to propagate)');
  } catch (error) {
    console.error('❌ Failed to register global slash commands:', error);
    throw error;
  }
}
