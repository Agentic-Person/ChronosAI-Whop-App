/**
 * Discord Command Handler
 *
 * Central handler for all Discord slash command interactions.
 * Routes commands to appropriate handlers and manages error handling.
 */

import { ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import { createClient } from '@/lib/supabase/server';

/**
 * Main command handler
 */
export async function handleCommand(
  interaction: ChatInputCommandInteraction
): Promise<void> {
  const commandName = interaction.commandName;

  // Get student from database using Discord ID
  const student = await getStudentByDiscordId(interaction.user.id);

  // Allow help and connect commands without account link
  if (!student && !['help', 'connect', 'stats'].includes(commandName)) {
    await interaction.reply({
      content:
        '⚠️ Your Discord account is not linked to the platform.\n\n' +
        'Please link your account using `/connect` or sign in at the platform first.',
      ephemeral: true,
    });
    return;
  }

  // Route to appropriate handler
  switch (commandName) {
    case 'progress':
      await handleProgressCommand(interaction, student);
      break;

    case 'leaderboard':
      await handleLeaderboardCommand(interaction);
      break;

    case 'ask':
      await handleAskCommand(interaction, student);
      break;

    case 'quiz':
      await handleQuizCommand(interaction, student);
      break;

    case 'schedule':
      await handleScheduleCommand(interaction, student);
      break;

    case 'buddy':
      await handleBuddyCommand(interaction, student);
      break;

    case 'achievements':
      await handleAchievementsCommand(interaction, student);
      break;

    case 'studygroup':
      await handleStudyGroupCommand(interaction, student);
      break;

    case 'stats':
      await handleStatsCommand(interaction);
      break;

    case 'connect':
      await handleConnectCommand(interaction);
      break;

    case 'notify':
      await handleNotifyCommand(interaction, student);
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

/**
 * Get student by Discord ID
 */
async function getStudentByDiscordId(discordId: string): Promise<any | null> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('discord_integrations')
    .select(`
      student_id,
      students (*)
    `)
    .eq('discord_user_id', discordId)
    .single();

  if (error || !data) {
    return null;
  }

  return data.students;
}

/**
 * /progress - Show user's learning progress
 */
async function handleProgressCommand(
  interaction: ChatInputCommandInteraction,
  student: any
): Promise<void> {
  // Calculate next level XP
  const nextLevelXP = Math.floor(100 * Math.pow(1.5, student.level));
  const progressToNext = Math.round((student.xp_points / nextLevelXP) * 100);

  // Get additional stats
  const supabase = createClient();
  const { data: videoProgress } = await supabase
    .from('video_progress')
    .select('completed')
    .eq('student_id', student.id)
    .eq('completed', true);

  const { data: quizAttempts } = await supabase
    .from('quiz_attempts')
    .select('passed')
    .eq('student_id', student.id)
    .eq('passed', true);

  const videosCompleted = videoProgress?.length || 0;
  const quizzesPassed = quizAttempts?.length || 0;

  const embed = new EmbedBuilder()
    .setColor('#5865F2')
    .setTitle(`${student.name}'s Progress`)
    .setDescription('Keep up the great work! 🚀')
    .addFields(
      { name: 'Level', value: `**${student.level}**`, inline: true },
      { name: 'XP', value: `**${student.xp_points.toLocaleString()}**`, inline: true },
      { name: 'Next Level', value: `${progressToNext}%`, inline: true },
      { name: 'Videos Completed', value: `**${videosCompleted}**`, inline: true },
      { name: 'Quizzes Passed', value: `**${quizzesPassed}**`, inline: true },
      { name: '🔥 Streak', value: `**${student.streak_days || 0} days**`, inline: true }
    )
    .setFooter({ text: 'Use /help to see all commands' })
    .setTimestamp();

  await interaction.reply({ embeds: [embed] });
}

/**
 * /leaderboard - Show top students
 */
async function handleLeaderboardCommand(
  interaction: ChatInputCommandInteraction
): Promise<void> {
  const timeframe = interaction.options.getString('timeframe') || 'all';
  const supabase = createClient();

  // Get top 10 students
  const { data: topStudents, error } = await supabase
    .from('students')
    .select('name, level, xp_points')
    .order('xp_points', { ascending: false })
    .limit(10);

  if (error || !topStudents || topStudents.length === 0) {
    await interaction.reply({
      content: 'No students found for this timeframe.',
      ephemeral: true,
    });
    return;
  }

  // Format leaderboard
  const medals = ['🥇', '🥈', '🥉'];
  const leaderboardText = topStudents
    .map((student, index) => {
      const medal = index < 3 ? medals[index] : `**${index + 1}.**`;
      return `${medal} **${student.name}** - Level ${student.level} (${student.xp_points.toLocaleString()} XP)`;
    })
    .join('\n');

  const embed = new EmbedBuilder()
    .setColor('#FFD700')
    .setTitle(`🏆 Leaderboard - ${timeframe === 'all' ? 'All Time' : timeframe === 'week' ? 'This Week' : 'This Month'}`)
    .setDescription(leaderboardText)
    .setFooter({ text: 'Keep learning to climb the ranks!' })
    .setTimestamp();

  await interaction.reply({ embeds: [embed] });
}

/**
 * /ask - Ask a question using RAG
 */
async function handleAskCommand(
  interaction: ChatInputCommandInteraction,
  student: any
): Promise<void> {
  await interaction.deferReply({ ephemeral: true });

  const question = interaction.options.getString('question', true);

  try {
    // Call RAG API
    const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/student/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        student_id: student.id,
        message: question,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to get answer');
    }

    const data = await response.json();

    const embed = new EmbedBuilder()
      .setColor('#5865F2')
      .setTitle('💬 AI Answer')
      .setDescription(data.answer.substring(0, 4000)) // Discord limit
      .setFooter({ text: 'Powered by Claude AI' });

    // Add video references if available
    if (data.video_references && data.video_references.length > 0) {
      const references = data.video_references
        .slice(0, 3)
        .map((ref: any) => `• ${ref.title} (${ref.timestamp})`)
        .join('\n');

      embed.addFields({
        name: '📹 Related Videos',
        value: references,
      });
    }

    await interaction.editReply({ embeds: [embed] });
  } catch (error) {
    console.error('Ask command error:', error);
    await interaction.editReply({
      content: 'Failed to get an answer. Please try again later.',
    });
  }
}

/**
 * /quiz - Get a random practice question
 */
async function handleQuizCommand(
  interaction: ChatInputCommandInteraction,
  student: any
): Promise<void> {
  await interaction.reply({
    content: '📝 Quiz feature coming soon! Use the platform to take quizzes.',
    ephemeral: true,
  });
}

/**
 * /schedule - View upcoming learning schedule
 */
async function handleScheduleCommand(
  interaction: ChatInputCommandInteraction,
  student: any
): Promise<void> {
  const supabase = createClient();

  const { data: events } = await supabase
    .from('calendar_events')
    .select('*')
    .eq('student_id', student.id)
    .eq('status', 'pending')
    .gte('scheduled_date', new Date().toISOString().split('T')[0])
    .order('scheduled_date', { ascending: true })
    .limit(5);

  if (!events || events.length === 0) {
    await interaction.reply({
      content: '📅 No upcoming events scheduled. Visit the platform to create your learning schedule!',
      ephemeral: true,
    });
    return;
  }

  const eventsList = events
    .map((event: any) => {
      const date = new Date(event.scheduled_date).toLocaleDateString();
      return `• **${event.title}** - ${date}`;
    })
    .join('\n');

  const embed = new EmbedBuilder()
    .setColor('#5865F2')
    .setTitle('📅 Your Upcoming Schedule')
    .setDescription(eventsList)
    .setFooter({ text: 'Next 5 events shown' });

  await interaction.reply({ embeds: [embed] });
}

/**
 * /buddy - Find a study buddy
 */
async function handleBuddyCommand(
  interaction: ChatInputCommandInteraction,
  student: any
): Promise<void> {
  await interaction.reply({
    content: '🤝 Study buddy matching coming soon! Check the platform to find your perfect match.',
    ephemeral: true,
  });
}

/**
 * /achievements - View unlocked achievements
 */
async function handleAchievementsCommand(
  interaction: ChatInputCommandInteraction,
  student: any
): Promise<void> {
  const supabase = createClient();

  const { data: unlocked } = await supabase
    .from('student_achievements')
    .select(`
      achievement_id,
      unlocked_at,
      achievements (
        name,
        description,
        icon_url,
        rarity,
        xp_value
      )
    `)
    .eq('student_id', student.id)
    .order('unlocked_at', { ascending: false })
    .limit(10);

  if (!unlocked || unlocked.length === 0) {
    await interaction.reply({
      content: 'You haven\'t unlocked any achievements yet. Keep learning! 🚀',
      ephemeral: true,
    });
    return;
  }

  const achievementText = unlocked
    .map((ua: any) => {
      const a = ua.achievements;
      return `🏆 **${a.name}** (${a.rarity})\n   ${a.description}`;
    })
    .join('\n\n');

  const embed = new EmbedBuilder()
    .setColor('#FFD700')
    .setTitle(`🏆 ${student.name}'s Achievements`)
    .setDescription(achievementText)
    .setFooter({ text: `${unlocked.length} achievements unlocked` });

  await interaction.reply({ embeds: [embed] });
}

/**
 * /studygroup - Study group commands
 */
async function handleStudyGroupCommand(
  interaction: ChatInputCommandInteraction,
  student: any
): Promise<void> {
  const subcommand = interaction.options.getSubcommand();

  switch (subcommand) {
    case 'create':
      await interaction.reply({
        content: '📚 Study group creation coming soon! Use the platform to create groups.',
        ephemeral: true,
      });
      break;

    case 'list':
      await interaction.reply({
        content: '📚 Study group listing coming soon!',
        ephemeral: true,
      });
      break;

    case 'join':
      await interaction.reply({
        content: '📚 Study group joining coming soon!',
        ephemeral: true,
      });
      break;
  }
}

/**
 * /stats - Platform-wide statistics
 */
async function handleStatsCommand(
  interaction: ChatInputCommandInteraction
): Promise<void> {
  const supabase = createClient();

  const [
    { count: totalStudents },
    { count: totalVideos },
    { count: totalGroups },
  ] = await Promise.all([
    supabase.from('students').select('*', { count: 'exact', head: true }),
    supabase.from('videos').select('*', { count: 'exact', head: true }),
    supabase.from('study_groups').select('*', { count: 'exact', head: true }),
  ]);

  const embed = new EmbedBuilder()
    .setColor('#5865F2')
    .setTitle('📊 Platform Statistics')
    .addFields(
      { name: 'Total Students', value: `**${totalStudents || 0}**`, inline: true },
      { name: 'Total Videos', value: `**${totalVideos || 0}**`, inline: true },
      { name: 'Study Groups', value: `**${totalGroups || 0}**`, inline: true }
    )
    .setTimestamp();

  await interaction.reply({ embeds: [embed] });
}

/**
 * /connect - Link Discord account
 */
async function handleConnectCommand(
  interaction: ChatInputCommandInteraction
): Promise<void> {
  const code = interaction.options.getString('code');

  if (!code) {
    await interaction.reply({
      content:
        '🔗 To link your Discord account:\n\n' +
        '1. Go to the platform settings\n' +
        '2. Generate a verification code\n' +
        '3. Use `/connect <code>` with your code\n',
      ephemeral: true,
    });
    return;
  }

  // Verify code and link account
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/discord/link`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        discord_id: interaction.user.id,
        discord_username: interaction.user.username,
        verification_code: code,
      }),
    });

    if (!response.ok) {
      throw new Error('Invalid code');
    }

    await interaction.reply({
      content: '✅ Successfully linked your Discord account!',
      ephemeral: true,
    });
  } catch (error) {
    await interaction.reply({
      content: '❌ Invalid or expired verification code. Please generate a new code on the platform.',
      ephemeral: true,
    });
  }
}

/**
 * /notify - Toggle notifications
 */
async function handleNotifyCommand(
  interaction: ChatInputCommandInteraction,
  student: any
): Promise<void> {
  const setting = interaction.options.getString('setting', true);
  const enabled = setting === 'on';

  const supabase = createClient();

  await supabase
    .from('discord_integrations')
    .update({ notifications_enabled: enabled })
    .eq('student_id', student.id);

  await interaction.reply({
    content: `🔔 Notifications ${enabled ? 'enabled' : 'disabled'} successfully!`,
    ephemeral: true,
  });
}

/**
 * /help - List all commands
 */
async function handleHelpCommand(
  interaction: ChatInputCommandInteraction
): Promise<void> {
  const embed = new EmbedBuilder()
    .setColor('#5865F2')
    .setTitle('🤖 Bot Commands')
    .setDescription('Here are all the commands you can use:')
    .addFields(
      { name: '/progress', value: 'View your learning progress and stats' },
      { name: '/leaderboard [timeframe]', value: 'See top students (all/week/month)' },
      { name: '/ask <question>', value: 'Ask a question about course content' },
      { name: '/quiz [module]', value: 'Get a random practice question' },
      { name: '/schedule', value: 'View your upcoming learning schedule' },
      { name: '/buddy', value: 'Find a compatible study buddy' },
      { name: '/achievements', value: 'View your unlocked achievements' },
      { name: '/studygroup', value: 'Manage study groups' },
      { name: '/stats', value: 'View platform-wide statistics' },
      { name: '/connect [code]', value: 'Link your Discord account' },
      { name: '/notify <on|off>', value: 'Toggle Discord notifications' },
      { name: '/help', value: 'Show this help message' }
    )
    .setFooter({ text: 'ENTERPRISE feature - powered by Mentora' });

  await interaction.reply({ embeds: [embed], ephemeral: true });
}
