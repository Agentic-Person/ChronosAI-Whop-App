# Module 10: Discord Integration - Implementation Guide

## Table of Contents
1. [Setup & Dependencies](#setup--dependencies)
2. [Discord Bot Setup](#discord-bot-setup)
3. [Discord OAuth](#discord-oauth)
4. [Bot Commands](#bot-commands)
5. [Slash Commands](#slash-commands)
6. [Notifications & Webhooks](#notifications--webhooks)
7. [Auto Channel Creation](#auto-channel-creation)
8. [n8n Workflows](#n8n-workflows)
9. [Moderation](#moderation)
10. [Events](#events)
11. [API Routes](#api-routes)
12. [Testing](#testing)

---

## Setup & Dependencies

### Install Discord.js

```bash
npm install discord.js
npm install @discordjs/rest
npm install @discordjs/builders
npm install dotenv
```

### Environment Variables

```bash
# .env.local

# Discord Application (from Discord Developer Portal)
DISCORD_CLIENT_ID=your-client-id
DISCORD_CLIENT_SECRET=your-client-secret
DISCORD_BOT_TOKEN=your-bot-token
DISCORD_GUILD_ID=your-server-id

# Discord OAuth
DISCORD_REDIRECT_URI=http://localhost:3000/api/auth/discord/callback

# n8n (optional)
N8N_WEBHOOK_URL=https://your-n8n-instance.app/webhook/study-group-created
```

### Create Discord Application

1. Go to https://discord.com/developers/applications
2. Click "New Application"
3. Name it "AI Video Learning Assistant"
4. Go to "Bot" tab → Click "Add Bot"
5. Copy Bot Token → Save to `DISCORD_BOT_TOKEN`
6. Enable these Privileged Gateway Intents:
   - ✅ Server Members Intent
   - ✅ Message Content Intent
7. Go to "OAuth2" tab
8. Copy Client ID → Save to `DISCORD_CLIENT_ID`
9. Copy Client Secret → Save to `DISCORD_CLIENT_SECRET`
10. Add Redirect URL: `http://localhost:3000/api/auth/discord/callback`

---

## Discord Bot Setup

### Bot Entry Point

Create `lib/discord/bot.ts`:

```typescript
// lib/discord/bot.ts

import { Client, GatewayIntentBits, Events, Partials } from 'discord.js';
import { registerCommands } from './commands/register';
import { handleCommand } from './commands/handler';
import { moderateMessage } from './moderation/content-filter';

export class DiscordBot {
  private client: Client;
  private isReady = false;

  constructor() {
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

  private setupEventHandlers() {
    // Bot ready
    this.client.once(Events.ClientReady, async (client) => {
      console.log(`✅ Discord bot ready as ${client.user.tag}`);
      this.isReady = true;

      // Register slash commands
      await registerCommands(client.application.id, process.env.DISCORD_GUILD_ID!);
    });

    // Slash command interactions
    this.client.on(Events.InteractionCreate, async (interaction) => {
      if (!interaction.isChatInputCommand()) return;

      try {
        await handleCommand(interaction);
      } catch (error) {
        console.error('Command error:', error);
        await interaction.reply({
          content: 'There was an error executing this command.',
          ephemeral: true,
        });
      }
    });

    // New member joins
    this.client.on(Events.GuildMemberAdd, async (member) => {
      console.log(`New member joined: ${member.user.tag}`);

      // Send welcome DM
      try {
        await member.send(
          `Welcome to the learning community, ${member.user.username}! 🎉\\n\\n` +
          `Get started by using \`/progress\` to see your learning journey.\\n` +
          `Need help? Ask in #help-and-questions!`
        );
      } catch (error) {
        console.error('Could not send welcome DM:', error);
      }

      // Assign @Student role
      const studentRole = member.guild.roles.cache.find(role => role.name === 'Student');
      if (studentRole) {
        await member.roles.add(studentRole);
      }
    });

    // Message moderation
    this.client.on(Events.MessageCreate, async (message) => {
      // Ignore bot messages
      if (message.author.bot) return;

      // Moderate content
      const modResult = await moderateMessage(message);
      if (modResult.shouldDelete) {
        await message.delete();
        await message.author.send(
          `Your message was removed for violating community guidelines: ${modResult.reason}`
        );
      }
    });

    // Error handling
    this.client.on(Events.Error, (error) => {
      console.error('Discord client error:', error);
    });
  }

  async start() {
    if (!process.env.DISCORD_BOT_TOKEN) {
      throw new Error('DISCORD_BOT_TOKEN is not set');
    }

    await this.client.login(process.env.DISCORD_BOT_TOKEN);
  }

  async stop() {
    await this.client.destroy();
  }

  getClient() {
    return this.client;
  }

  ready() {
    return this.isReady;
  }
}

// Singleton instance
let botInstance: DiscordBot | null = null;

export function getDiscordBot(): DiscordBot {
  if (!botInstance) {
    botInstance = new DiscordBot();
  }
  return botInstance;
}
```

### Start Bot on Server Init

Create `lib/discord/init.ts`:

```typescript
// lib/discord/init.ts

import { getDiscordBot } from './bot';

export async function initializeDiscordBot() {
  if (process.env.NODE_ENV === 'production' || process.env.ENABLE_DISCORD_BOT === 'true') {
    try {
      const bot = getDiscordBot();
      await bot.start();
      console.log('Discord bot initialized');
    } catch (error) {
      console.error('Failed to initialize Discord bot:', error);
    }
  } else {
    console.log('Discord bot disabled in development');
  }
}
```

Update `app/layout.tsx` or server startup:

```typescript
// app/layout.tsx or instrumentation.ts (Next.js 14)

import { initializeDiscordBot } from '@/lib/discord/init';

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await initializeDiscordBot();
  }
}
```

---

## Discord OAuth

### OAuth Service

Create `lib/discord/oauth-service.ts`:

```typescript
// lib/discord/oauth-service.ts

import { cookies } from 'next/headers';

export class DiscordOAuthService {
  private readonly clientId = process.env.DISCORD_CLIENT_ID!;
  private readonly clientSecret = process.env.DISCORD_CLIENT_SECRET!;
  private readonly redirectUri = process.env.DISCORD_REDIRECT_URI!;
  private readonly guildId = process.env.DISCORD_GUILD_ID!;

  /**
   * Generate Discord OAuth URL
   */
  getAuthorizationUrl(state: string): string {
    const params = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: this.redirectUri,
      response_type: 'code',
      scope: 'identify email guilds.join',
      state, // CSRF protection
    });

    return `https://discord.com/api/oauth2/authorize?${params.toString()}`;
  }

  /**
   * Exchange authorization code for tokens
   */
  async exchangeCodeForTokens(code: string): Promise<{
    access_token: string;
    token_type: string;
    expires_in: number;
    refresh_token: string;
    scope: string;
  }> {
    const response = await fetch('https://discord.com/api/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: this.clientId,
        client_secret: this.clientSecret,
        grant_type: 'authorization_code',
        code,
        redirect_uri: this.redirectUri,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to exchange code for tokens');
    }

    return response.json();
  }

  /**
   * Get user info from Discord
   */
  async getUserInfo(accessToken: string): Promise<{
    id: string;
    username: string;
    discriminator: string;
    avatar: string;
    email: string;
    verified: boolean;
  }> {
    const response = await fetch('https://discord.com/api/users/@me', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to get user info');
    }

    return response.json();
  }

  /**
   * Add user to guild (auto-join server)
   */
  async addGuildMember(userId: string, accessToken: string): Promise<void> {
    const botToken = process.env.DISCORD_BOT_TOKEN!;

    const response = await fetch(
      `https://discord.com/api/guilds/${this.guildId}/members/${userId}`,
      {
        method: 'PUT',
        headers: {
          Authorization: `Bot ${botToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          access_token: accessToken,
        }),
      }
    );

    if (!response.ok && response.status !== 204) {
      // 204 = already a member (OK)
      console.error('Failed to add guild member:', await response.text());
    }
  }

  /**
   * Store tokens in cookies
   */
  setTokenCookies(tokens: {
    access_token: string;
    refresh_token: string;
    expires_in: number;
  }): void {
    const expiresAt = new Date(Date.now() + tokens.expires_in * 1000);

    cookies().set('discord_access_token', tokens.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      expires: expiresAt,
    });

    cookies().set('discord_refresh_token', tokens.refresh_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60, // 30 days
    });
  }
}
```

---

## Bot Commands

### Command Registration

Create `lib/discord/commands/register.ts`:

```typescript
// lib/discord/commands/register.ts

import { REST, Routes, SlashCommandBuilder } from '@discordjs/rest';

const commands = [
  new SlashCommandBuilder()
    .setName('progress')
    .setDescription('View your learning progress'),

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
    .setName('quiz')
    .setDescription('Get a random practice question')
    .addIntegerOption(option =>
      option
        .setName('module')
        .setDescription('Which module to quiz on')
        .setRequired(false)
    ),

  new SlashCommandBuilder()
    .setName('buddy')
    .setDescription('Find a study buddy'),

  new SlashCommandBuilder()
    .setName('achievements')
    .setDescription('View your unlocked achievements'),

  new SlashCommandBuilder()
    .setName('help')
    .setDescription('List all available commands'),
];

export async function registerCommands(applicationId: string, guildId: string) {
  const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_BOT_TOKEN!);

  try {
    console.log('Registering slash commands...');

    await rest.put(Routes.applicationGuildCommands(applicationId, guildId), {
      body: commands.map(cmd => cmd.toJSON()),
    });

    console.log('✅ Slash commands registered');
  } catch (error) {
    console.error('Failed to register slash commands:', error);
  }
}
```

### Command Handler

Create `lib/discord/commands/handler.ts`:

```typescript
// lib/discord/commands/handler.ts

import { ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import { getSupabaseAdmin } from '@/lib/supabase/server';

export async function handleCommand(interaction: ChatInputCommandInteraction) {
  const commandName = interaction.commandName;

  // Get student from database using Discord ID
  const student = await getStudentByDiscordId(interaction.user.id);

  if (!student && commandName !== 'help') {
    await interaction.reply({
      content: 'You need to sign in on the platform first! Visit https://your-platform.com',
      ephemeral: true,
    });
    return;
  }

  switch (commandName) {
    case 'progress':
      await handleProgressCommand(interaction, student);
      break;

    case 'leaderboard':
      await handleLeaderboardCommand(interaction);
      break;

    case 'quiz':
      await handleQuizCommand(interaction, student);
      break;

    case 'buddy':
      await handleBuddyCommand(interaction, student);
      break;

    case 'achievements':
      await handleAchievementsCommand(interaction, student);
      break;

    case 'help':
      await handleHelpCommand(interaction);
      break;

    default:
      await interaction.reply({
        content: 'Unknown command',
        ephemeral: true,
      });
  }
}

async function getStudentByDiscordId(discordId: string) {
  const supabase = getSupabaseAdmin();

  const { data } = await supabase
    .from('discord_integrations')
    .select(`
      student_id,
      students (*)
    `)
    .eq('discord_user_id', discordId)
    .single();

  return data?.students;
}

async function handleProgressCommand(
  interaction: ChatInputCommandInteraction,
  student: any
) {
  // Calculate next level XP
  const nextLevelXP = Math.floor(100 * Math.pow(1.5, student.level));
  const progressToNext = Math.round((student.xp_points / nextLevelXP) * 100);

  const embed = new EmbedBuilder()
    .setColor('#5865F2')
    .setTitle(`${student.name}'s Progress`)
    .setDescription(`Keep up the great work! 🚀`)
    .addFields(
      { name: 'Level', value: `**${student.level}**`, inline: true },
      { name: 'XP', value: `**${student.xp_points.toLocaleString()}**`, inline: true },
      { name: 'Next Level', value: `${progressToNext}%`, inline: true },
      { name: 'Current Module', value: `**Module ${student.current_module}**`, inline: true },
      { name: 'Videos Completed', value: `**${student.videos_completed || 0}**`, inline: true },
      { name: 'Quizzes Passed', value: `**${student.quizzes_passed || 0}**`, inline: true },
      { name: '🔥 Streak', value: `**${student.current_streak || 0} days**`, inline: false }
    )
    .setThumbnail(student.avatar_url || null)
    .setFooter({ text: 'Use /help to see all commands' })
    .setTimestamp();

  await interaction.reply({ embeds: [embed] });
}

async function handleLeaderboardCommand(interaction: ChatInputCommandInteraction) {
  const timeframe = interaction.options.getString('timeframe') || 'all';
  const supabase = getSupabaseAdmin();

  // Build query based on timeframe
  let query = supabase
    .from('students')
    .select('name, level, xp_points, avatar_url')
    .order('xp_points', { ascending: false })
    .limit(10);

  if (timeframe === 'week') {
    // Get XP earned this week (simplified - would need separate tracking table)
    query = query.gte('updated_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());
  } else if (timeframe === 'month') {
    query = query.gte('updated_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());
  }

  const { data: topStudents } = await query;

  if (!topStudents || topStudents.length === 0) {
    await interaction.reply('No students found for this timeframe.');
    return;
  }

  // Format leaderboard
  const medals = ['🥇', '🥈', '🥉'];
  const leaderboardText = topStudents
    .map((student, index) => {
      const medal = index < 3 ? medals[index] : `**${index + 1}.**`;
      return `${medal} **${student.name}** - Level ${student.level} (${student.xp_points.toLocaleString()} XP)`;
    })
    .join('\\n');

  const embed = new EmbedBuilder()
    .setColor('#FFD700')
    .setTitle(`🏆 Leaderboard - ${timeframe === 'all' ? 'All Time' : timeframe === 'week' ? 'This Week' : 'This Month'}`)
    .setDescription(leaderboardText)
    .setFooter({ text: 'Keep learning to climb the ranks!' })
    .setTimestamp();

  await interaction.reply({ embeds: [embed] });
}

async function handleQuizCommand(interaction: ChatInputCommandInteraction, student: any) {
  const module = interaction.options.getInteger('module') || student.current_module;
  const supabase = getSupabaseAdmin();

  // Get a random quiz question from this module
  const { data: videos } = await supabase
    .from('videos')
    .select('id, title')
    .eq('module_number', module)
    .limit(10);

  if (!videos || videos.length === 0) {
    await interaction.reply({
      content: `No videos found for Module ${module}`,
      ephemeral: true,
    });
    return;
  }

  const randomVideo = videos[Math.floor(Math.random() * videos.length)];

  // Get a quiz question for this video
  const { data: quizzes } = await supabase
    .from('quizzes')
    .select(`
      id,
      quiz_questions (*)
    `)
    .eq('video_id', randomVideo.id)
    .limit(1)
    .single();

  if (!quizzes || !quizzes.quiz_questions?.length) {
    await interaction.reply({
      content: 'No quiz questions available for this module yet.',
      ephemeral: true,
    });
    return;
  }

  const question = quizzes.quiz_questions[0];
  const options = question.options || [];

  const embed = new EmbedBuilder()
    .setColor('#5865F2')
    .setTitle(`📝 Practice Question - Module ${module}`)
    .setDescription(`**${question.question_text}**\\n\\n${options.map((opt: any) => `${opt.id}. ${opt.text}`).join('\\n')}`)
    .setFooter({ text: `From: ${randomVideo.title}` });

  await interaction.reply({ embeds: [embed], ephemeral: true });

  // TODO: Add interactive buttons for answer selection
}

async function handleBuddyCommand(interaction: ChatInputCommandInteraction, student: any) {
  await interaction.deferReply({ ephemeral: true });

  // Use matching service to find buddies
  const { MatchingService } = await import('@/lib/study-buddy/matching-service');
  const matchingService = new MatchingService();

  try {
    const matches = await matchingService.findMatches(student.id, 3);

    if (matches.length === 0) {
      await interaction.editReply('No study buddy matches found right now. Try again later!');
      return;
    }

    const matchText = matches
      .map((match, index) => {
        return `**${index + 1}. ${match.student.name}** (Level ${match.student.level})\\n` +
          `   Match: ${match.matchScore.totalScore}% - ${match.matchScore.reasoning}`;
      })
      .join('\\n\\n');

    const embed = new EmbedBuilder()
      .setColor('#5865F2')
      .setTitle('🤝 Your Study Buddy Matches')
      .setDescription(matchText)
      .setFooter({ text: 'Visit the platform to send connection requests!' });

    await interaction.editReply({ embeds: [embed] });
  } catch (error) {
    console.error('Buddy command error:', error);
    await interaction.editReply('Failed to find study buddies. Please try again later.');
  }
}

async function handleAchievementsCommand(
  interaction: ChatInputCommandInteraction,
  student: any
) {
  const supabase = getSupabaseAdmin();

  const { data: unlockedAchievements } = await supabase
    .from('student_achievements')
    .select(`
      achievement_id,
      unlocked_at,
      achievements (
        name,
        description,
        icon_emoji,
        rarity,
        xp_reward
      )
    `)
    .eq('student_id', student.id)
    .order('unlocked_at', { ascending: false });

  if (!unlockedAchievements || unlockedAchievements.length === 0) {
    await interaction.reply({
      content: 'You haven\'t unlocked any achievements yet. Keep learning! 🚀',
      ephemeral: true,
    });
    return;
  }

  const achievementText = unlockedAchievements
    .map((ua: any) => {
      const a = ua.achievements;
      return `${a.icon_emoji} **${a.name}** (${a.rarity})\\n   ${a.description}`;
    })
    .join('\\n\\n');

  const embed = new EmbedBuilder()
    .setColor('#FFD700')
    .setTitle(`🏆 ${student.name}'s Achievements`)
    .setDescription(achievementText)
    .setFooter({ text: `${unlockedAchievements.length} achievements unlocked` })
    .setTimestamp();

  await interaction.reply({ embeds: [embed] });
}

async function handleHelpCommand(interaction: ChatInputCommandInteraction) {
  const embed = new EmbedBuilder()
    .setColor('#5865F2')
    .setTitle('🤖 Bot Commands')
    .setDescription('Here are all the commands you can use:')
    .addFields(
      { name: '/progress', value: 'View your learning progress and stats' },
      { name: '/leaderboard [timeframe]', value: 'See top students (all/week/month)' },
      { name: '/quiz [module]', value: 'Get a random practice question' },
      { name: '/buddy', value: 'Find compatible study buddies' },
      { name: '/achievements', value: 'View your unlocked achievements' },
      { name: '/help', value: 'Show this help message' }
    )
    .setFooter({ text: 'More commands coming soon!' });

  await interaction.reply({ embeds: [embed], ephemeral: true });
}
```

---

## Notifications & Webhooks

### Notification Service

Create `lib/discord/notification-service.ts`:

```typescript
// lib/discord/notification-service.ts

import { getDiscordBot } from './bot';
import { EmbedBuilder, TextChannel } from 'discord.js';

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
  ) {
    const channel = await this.getChannel('achievements');
    if (!channel) return;

    const mention = discordUserId ? `<@${discordUserId}>` : studentName;

    await channel.send(
      `🎉 ${mention} just earned **${xpEarned} XP** for ${reason}!`
    );
  }

  /**
   * Post level-up notification
   */
  async notifyLevelUp(
    studentName: string,
    newLevel: number,
    discordUserId?: string
  ) {
    const channel = await this.getChannel('achievements');
    if (!channel) return;

    const mention = discordUserId ? `<@${discordUserId}>` : studentName;

    const embed = new EmbedBuilder()
      .setColor('#FFD700')
      .setTitle('🚀 Level Up!')
      .setDescription(`${mention} just reached **Level ${newLevel}**! Keep crushing it! 🔥`)
      .setTimestamp();

    await channel.send({ embeds: [embed] });
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
  ) {
    const channel = await this.getChannel('achievements');
    if (!channel) return;

    const mention = discordUserId ? `<@${discordUserId}>` : studentName;

    const embed = new EmbedBuilder()
      .setColor(rarity === 'legendary' ? '#FF6B35' : '#FFD700')
      .setTitle(`${achievementEmoji} Achievement Unlocked!`)
      .setDescription(
        `${mention} unlocked **${achievementName}** (${rarity})\\n\\n` +
        `*${achievementDescription}*`
      )
      .setTimestamp();

    const message = await channel.send({ embeds: [embed] });

    // Add celebration reactions
    await message.react('🎉');
    await message.react('🎊');
    if (rarity === 'legendary') {
      await message.react('🏆');
    }
  }

  /**
   * Post quiz perfect score notification
   */
  async notifyPerfectQuiz(
    studentName: string,
    quizTitle: string,
    discordUserId?: string
  ) {
    const channel = await this.getChannel('achievements');
    if (!channel) return;

    const mention = discordUserId ? `<@${discordUserId}>` : studentName;

    await channel.send(
      `⭐ ${mention} got a **perfect score** on "${quizTitle}"! 100% 🎯`
    );
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
  }) {
    const channel = await this.getChannel('announcements');
    if (!channel) return;

    const topPerformersText = stats.topPerformers
      .slice(0, 3)
      .map((p, i) => {
        const medals = ['🥇', '🥈', '🥉'];
        return `${medals[i]} ${p.name} - ${p.xp} XP (Level ${p.level})`;
      })
      .join('\\n');

    const embed = new EmbedBuilder()
      .setColor('#5865F2')
      .setTitle(`📊 Daily Progress Recap - ${stats.date}`)
      .setDescription("Here's what the community accomplished today!")
      .addFields(
        { name: "Today's Top Performers", value: topPerformersText || 'No activity', inline: false },
        { name: 'Community Stats', value:
          `✅ ${stats.videosCompleted} videos completed\\n` +
          `✅ ${stats.quizzesPassed} quizzes passed\\n` +
          `✅ ${stats.achievementsUnlocked} achievements unlocked\\n` +
          `✅ ${stats.newStudyGroups} new study groups formed`,
          inline: false
        }
      )
      .setFooter({ text: 'Keep up the amazing work! 💪' })
      .setTimestamp();

    await channel.send({ embeds: [embed] });
  }

  /**
   * Get channel by name
   */
  private async getChannel(channelName: string): Promise<TextChannel | null> {
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
      console.error(`Channel #${channelName} not found`);
      return null;
    }

    return channel;
  }
}
```

### Webhook Handler

Create `app/api/webhooks/discord-notify/route.ts`:

```typescript
// app/api/webhooks/discord-notify/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { DiscordNotificationService } from '@/lib/discord/notification-service';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, data } = body;

    const notificationService = new DiscordNotificationService();

    switch (type) {
      case 'xp_gained':
        await notificationService.notifyXPGain(
          data.studentName,
          data.xpEarned,
          data.reason,
          data.discordUserId
        );
        break;

      case 'level_up':
        await notificationService.notifyLevelUp(
          data.studentName,
          data.newLevel,
          data.discordUserId
        );
        break;

      case 'achievement_unlocked':
        await notificationService.notifyAchievementUnlock(
          data.studentName,
          data.achievementName,
          data.achievementDescription,
          data.achievementEmoji,
          data.rarity,
          data.discordUserId
        );
        break;

      case 'perfect_quiz':
        await notificationService.notifyPerfectQuiz(
          data.studentName,
          data.quizTitle,
          data.discordUserId
        );
        break;

      default:
        return NextResponse.json({ error: 'Unknown notification type' }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Discord notification error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to send notification' },
      { status: 500 }
    );
  }
}
```

---

## Auto Channel Creation

### Channel Manager Service

Create `lib/discord/channel-manager.ts`:

```typescript
// lib/discord/channel-manager.ts

import { getDiscordBot } from './bot';
import { ChannelType, PermissionFlagsBits } from 'discord.js';
import { getSupabaseAdmin } from '@/lib/supabase/server';

export class DiscordChannelManager {
  private bot = getDiscordBot();

  /**
   * Create a private channel for a study group
   */
  async createStudyGroupChannel(
    groupId: string,
    groupName: string,
    memberDiscordIds: string[]
  ): Promise<string> {
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
          ],
        })),
      ],
    });

    // Send welcome message
    await channel.send(
      `🎉 Welcome to **${groupName}**!\\n\\n` +
      `This is your private study group channel. Here you can:\\n` +
      `• Discuss concepts and ask questions\\n` +
      `• Share resources and code snippets\\n` +
      `• Coordinate study sessions\\n` +
      `• Track your group progress\\n\\n` +
      `Let's learn together! 🚀`
    );

    // Store channel ID in database
    const supabase = getSupabaseAdmin();
    await supabase
      .from('study_groups')
      .update({ discord_channel_id: channel.id })
      .eq('id', groupId);

    return channel.id;
  }

  /**
   * Add member to study group channel
   */
  async addMemberToChannel(channelId: string, discordUserId: string) {
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
    });

    await channel.send(`Welcome <@${discordUserId}> to the study group! 👋`);
  }

  /**
   * Remove member from study group channel
   */
  async removeMemberFromChannel(channelId: string, discordUserId: string) {
    const client = this.bot.getClient();
    const guild = client.guilds.cache.get(process.env.DISCORD_GUILD_ID!);

    if (!guild) throw new Error('Guild not found');

    const channel = guild.channels.cache.get(channelId);
    if (!channel || !channel.isTextBased()) {
      throw new Error('Channel not found');
    }

    await channel.permissionOverwrites.delete(discordUserId);
  }

  /**
   * Delete study group channel
   */
  async deleteChannel(channelId: string) {
    const client = this.bot.getClient();
    const guild = client.guilds.cache.get(process.env.DISCORD_GUILD_ID!);

    if (!guild) throw new Error('Guild not found');

    const channel = guild.channels.cache.get(channelId);
    if (channel) {
      await channel.delete();
    }
  }
}
```

---

## n8n Workflows

### Example Workflow: Study Group Channel Creation

```json
{
  "name": "Create Study Group Discord Channel",
  "nodes": [
    {
      "parameters": {
        "path": "study-group-created",
        "responseMode": "onReceived",
        "options": {}
      },
      "name": "Webhook",
      "type": "n8n-nodes-base.webhook",
      "position": [250, 300]
    },
    {
      "parameters": {
        "authentication": "headerAuth",
        "requestMethod": "POST",
        "url": "={{ $env.API_BASE_URL }}/api/discord/create-channel",
        "options": {},
        "bodyParametersJson": "={{ JSON.stringify($json.body) }}"
      },
      "name": "Create Channel API Call",
      "type": "n8n-nodes-base.httpRequest",
      "position": [450, 300]
    },
    {
      "parameters": {
        "conditions": {
          "number": [
            {
              "value1": "={{ $json.statusCode }}",
              "operation": "equal",
              "value2": 200
            }
          ]
        }
      },
      "name": "Check Success",
      "type": "n8n-nodes-base.if",
      "position": [650, 300]
    },
    {
      "parameters": {
        "operation": "executeQuery",
        "query": "UPDATE study_groups SET discord_channel_id = '{{ $json.channelId }}' WHERE id = '{{ $json.body.groupId }}'",
        "options": {}
      },
      "name": "Update Database",
      "type": "n8n-nodes-base.postgres",
      "position": [850, 250]
    }
  ],
  "connections": {
    "Webhook": {
      "main": [[{ "node": "Create Channel API Call", "type": "main", "index": 0 }]]
    },
    "Create Channel API Call": {
      "main": [[{ "node": "Check Success", "type": "main", "index": 0 }]]
    },
    "Check Success": {
      "main": [
        [{ "node": "Update Database", "type": "main", "index": 0 }],
        []
      ]
    }
  }
}
```

---

## Moderation

### Content Filter

Create `lib/discord/moderation/content-filter.ts`:

```typescript
// lib/discord/moderation/content-filter.ts

import { Message } from 'discord.js';

const HARMFUL_KEYWORDS = [
  // Add profanity, slurs, etc. (redacted for this example)
];

const SPAM_THRESHOLD = 5; // messages
const SPAM_WINDOW = 10000; // 10 seconds

const messageHistory = new Map<string, number[]>();

export async function moderateMessage(
  message: Message
): Promise<{ shouldDelete: boolean; reason?: string }> {
  // 1. Check for harmful keywords
  const lowerContent = message.content.toLowerCase();
  for (const keyword of HARMFUL_KEYWORDS) {
    if (lowerContent.includes(keyword)) {
      return {
        shouldDelete: true,
        reason: 'Message contains inappropriate content',
      };
    }
  }

  // 2. Check for spam (rapid messages)
  const userId = message.author.id;
  const now = Date.now();

  if (!messageHistory.has(userId)) {
    messageHistory.set(userId, []);
  }

  const userHistory = messageHistory.get(userId)!;
  userHistory.push(now);

  // Remove old timestamps
  const recentMessages = userHistory.filter(timestamp => now - timestamp < SPAM_WINDOW);
  messageHistory.set(userId, recentMessages);

  if (recentMessages.length > SPAM_THRESHOLD) {
    // Timeout user for 5 minutes
    try {
      await message.member?.timeout(5 * 60 * 1000, 'Spam detected');
    } catch (error) {
      console.error('Failed to timeout user:', error);
    }

    return {
      shouldDelete: true,
      reason: 'Spam detected - you\'ve been timed out for 5 minutes',
    };
  }

  // 3. Check for excessive caps
  const capsRatio = (message.content.match(/[A-Z]/g) || []).length / message.content.length;
  if (message.content.length > 10 && capsRatio > 0.8) {
    return {
      shouldDelete: false, // Just warn, don't delete
      reason: 'Please avoid excessive caps lock',
    };
  }

  // 4. Check for mention spam
  const mentions = message.mentions.users.size;
  if (mentions > 5) {
    return {
      shouldDelete: true,
      reason: 'Please avoid excessive mentions',
    };
  }

  return { shouldDelete: false };
}
```

---

## Events

### Event Manager

Create `lib/discord/event-manager.ts`:

```typescript
// lib/discord/event-manager.ts

import { getDiscordBot } from './bot';
import { GuildScheduledEventPrivacyLevel, GuildScheduledEventEntityType } from 'discord.js';
import { getSupabaseAdmin } from '@/lib/supabase/server';

export class DiscordEventManager {
  private bot = getDiscordBot();

  /**
   * Create a scheduled event in Discord
   */
  async createEvent(data: {
    title: string;
    description: string;
    scheduledStart: Date;
    scheduledEnd: Date;
    voiceChannelId?: string;
    type: 'qa' | 'study-session' | 'hackathon' | 'workshop';
  }): Promise<string> {
    const client = this.bot.getClient();
    const guild = client.guilds.cache.get(process.env.DISCORD_GUILD_ID!);

    if (!guild) throw new Error('Guild not found');

    // Create Discord event
    const event = await guild.scheduledEvents.create({
      name: data.title,
      description: data.description,
      scheduledStartTime: data.scheduledStart,
      scheduledEndTime: data.scheduledEnd,
      privacyLevel: GuildScheduledEventPrivacyLevel.GuildOnly,
      entityType: data.voiceChannelId
        ? GuildScheduledEventEntityType.Voice
        : GuildScheduledEventEntityType.External,
      channel: data.voiceChannelId || undefined,
      entityMetadata: data.voiceChannelId ? undefined : {
        location: 'Online - Platform',
      },
    });

    // Store in database
    const supabase = getSupabaseAdmin();
    await supabase.from('discord_events').insert({
      discord_event_id: event.id,
      event_type: data.type,
      title: data.title,
      description: data.description,
      scheduled_start: data.scheduledStart.toISOString(),
      scheduled_end: data.scheduledEnd.toISOString(),
      voice_channel_id: data.voiceChannelId,
    });

    return event.id;
  }
}
```

---

## API Routes

### Discord OAuth Routes

Create `app/api/auth/discord/route.ts`:

```typescript
// app/api/auth/discord/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { DiscordOAuthService } from '@/lib/discord/oauth-service';
import { cookies } from 'next/headers';
import crypto from 'crypto';

export async function GET(request: NextRequest) {
  const oauthService = new DiscordOAuthService();

  // Generate state for CSRF protection
  const state = crypto.randomBytes(16).toString('hex');

  // Store state in cookie
  cookies().set('discord_oauth_state', state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 600, // 10 minutes
  });

  const authUrl = oauthService.getAuthorizationUrl(state);

  return NextResponse.redirect(authUrl);
}
```

Create `app/api/auth/discord/callback/route.ts`:

```typescript
// app/api/auth/discord/callback/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { DiscordOAuthService } from '@/lib/discord/oauth-service';
import { cookies } from 'next/headers';
import { getSupabaseAdmin } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state');

  // Verify state (CSRF protection)
  const storedState = cookies().get('discord_oauth_state')?.value;
  if (!state || state !== storedState) {
    return NextResponse.redirect(new URL('/login?error=invalid_state', request.url));
  }

  if (!code) {
    return NextResponse.redirect(new URL('/login?error=no_code', request.url));
  }

  const oauthService = new DiscordOAuthService();

  try {
    // Exchange code for tokens
    const tokens = await oauthService.exchangeCodeForTokens(code);

    // Get user info
    const discordUser = await oauthService.getUserInfo(tokens.access_token);

    // Add user to Discord server
    await oauthService.addGuildMember(discordUser.id, tokens.access_token);

    // Create or update student in database
    const supabase = getSupabaseAdmin();

    // Check if Discord integration exists
    const { data: existingIntegration } = await supabase
      .from('discord_integrations')
      .select('student_id')
      .eq('discord_user_id', discordUser.id)
      .single();

    if (existingIntegration) {
      // Update existing
      await supabase
        .from('discord_integrations')
        .update({
          discord_username: `${discordUser.username}#${discordUser.discriminator}`,
          discord_avatar: discordUser.avatar,
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token,
          token_expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
        })
        .eq('discord_user_id', discordUser.id);
    } else {
      // Create new student
      const { data: newStudent } = await supabase
        .from('students')
        .insert({
          name: discordUser.username,
          email: discordUser.email,
          avatar_url: `https://cdn.discordapp.com/avatars/${discordUser.id}/${discordUser.avatar}.png`,
        })
        .select()
        .single();

      if (newStudent) {
        await supabase.from('discord_integrations').insert({
          student_id: newStudent.id,
          discord_user_id: discordUser.id,
          discord_username: `${discordUser.username}#${discordUser.discriminator}`,
          discord_avatar: discordUser.avatar,
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token,
          token_expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
        });
      }
    }

    // Set session cookies
    oauthService.setTokenCookies(tokens);

    return NextResponse.redirect(new URL('/dashboard', request.url));
  } catch (error: any) {
    console.error('Discord OAuth error:', error);
    return NextResponse.redirect(new URL('/login?error=oauth_failed', request.url));
  }
}
```

---

## Testing

### Bot Command Test

Create `__tests__/discord/commands.test.ts`:

```typescript
// __tests__/discord/commands.test.ts

import { describe, it, expect, vi } from 'vitest';
import { handleCommand } from '@/lib/discord/commands/handler';

describe('Discord Commands', () => {
  it('should handle /progress command', async () => {
    const mockInteraction = {
      commandName: 'progress',
      user: { id: 'test-discord-id' },
      reply: vi.fn(),
    };

    // Mock database response
    vi.mock('@/lib/supabase/server', () => ({
      getSupabaseAdmin: () => ({
        from: () => ({
          select: () => ({
            eq: () => ({
              single: () => ({
                data: {
                  students: {
                    id: 'test-student-id',
                    name: 'Test Student',
                    level: 10,
                    xp_points: 1500,
                  },
                },
              }),
            }),
          }),
        }),
      }),
    }));

    await handleCommand(mockInteraction as any);

    expect(mockInteraction.reply).toHaveBeenCalled();
  });
});
```

---

## Summary

You now have a complete Discord integration with:

✅ **Bot setup** - Custom bot with slash commands
✅ **OAuth** - Sign in with Discord
✅ **Notifications** - Real-time progress updates
✅ **Auto channels** - Study group channels created automatically
✅ **Moderation** - Auto-filter spam and toxic content
✅ **Events** - Scheduled community events
✅ **n8n workflows** - Automation without code

**Next Steps**:
1. Deploy bot to production (Heroku/Railway)
2. Set up n8n workflows
3. Create Discord server structure
4. Test all commands and notifications
5. Monitor bot performance and logs
