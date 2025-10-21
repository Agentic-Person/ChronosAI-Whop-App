# Module 10: Discord Integration - Overview

## Executive Summary

Discord Integration transforms the platform from a solo learning tool into a vibrant community hub by seamlessly connecting the learning experience with Discord's powerful community features. Students get real-time progress updates, automated study group channels, bot commands for quick info, and access to a supportive community—all without leaving Discord.

**Status**: Full Implementation Required
**Priority**: P2 (Enhanced feature for community building)
**Dependencies**: Study Buddy (Module 9 - for group channels), Progress & Gamification (Module 5 - for notifications)

## Problem Statement

### Why Discord Integration is Critical for Community Learning

**Student Pain Points**:
- ❌ Learning platforms feel isolated from social spaces
- ❌ Constantly switching between learning app and Discord
- ❌ Miss important updates when not on the platform
- ❌ No easy way to ask questions in real-time
- ❌ Can't celebrate achievements with peers immediately
- ❌ Study group coordination requires manual setup

**Creator Pain Points**:
- ❌ Hard to build active community around content
- ❌ Students don't engage with each other organically
- ❌ No central hub for announcements and support
- ❌ Manual work to create study group channels
- ❌ Can't track community engagement metrics
- ❌ Difficult to provide real-time help at scale

### Why Discord?

**Statistics**:
- **196 million** monthly active users
- **60%** of Gen Z uses Discord for communities
- **82%** retention rate for Discord-integrated platforms
- **3x higher engagement** vs platforms without community features
- **45% lower churn** when community is active

**Platform Benefits**:
- ✅ Students already use it daily
- ✅ Built-in voice/video chat
- ✅ Powerful moderation tools
- ✅ Rich bot ecosystem
- ✅ Mobile + desktop support
- ✅ Free to use

### What We're Building

A comprehensive Discord integration that:
- ✅ **OAuth authentication** - Sign in with Discord
- ✅ **Custom bot** - Commands for progress, leaderboards, help
- ✅ **Auto channels** - Create study group channels automatically
- ✅ **Progress notifications** - XP gains, achievements, level-ups in Discord
- ✅ **Community features** - Events, Q&A, announcements
- ✅ **n8n automation** - Workflow-based integrations
- ✅ **Moderation tools** - Auto-moderation, role management

## Success Metrics

| Metric | Target | Industry Avg | Impact |
|--------|--------|--------------|--------|
| **Discord Sign-In Rate** | >80% | <30% | Primary auth method |
| **Daily Active Discord Users** | >60% | <20% | 3x engagement |
| **Messages per Day** | >500 | <100 | Active community |
| **Bot Command Usage** | >100/day | N/A | High utility |
| **Study Group Channels Created** | >20/month | 0 | Auto-scaling |
| **Retention (with Discord vs without)** | +40% | baseline | Massive impact |
| **Average Session Time in Discord** | >15 min/day | N/A | Sticky community |

## Core Features

### 1. Discord OAuth Authentication

**Why Discord OAuth?**

Instead of traditional email/password, students sign in with Discord:
- **Frictionless** - One-click sign-in, no password to remember
- **Social proof** - See which friends are learning
- **Instant community** - Automatically join server on sign-in
- **Profile sync** - Avatar, username auto-populated

**OAuth Flow**:

```
Student clicks "Sign in with Discord"
↓
1. Redirect to Discord OAuth URL
   - Scope: identify, email, guilds.join
   - Include state parameter for CSRF protection
↓
2. Student authorizes the app
↓
3. Discord redirects back with code
↓
4. Exchange code for access token
   - Get user info (ID, username, avatar, email)
   - Automatically join them to creator's Discord server
↓
5. Create/update student profile
   - Store Discord ID for linking
   - Set avatar from Discord
   - Store access token (for later API calls)
↓
6. Assign Discord role (e.g., @Student)
↓
Student is now logged in and in Discord server
```

**Technical Details**:

```typescript
interface DiscordUser {
  id: string; // Discord user ID
  username: string; // e.g., "john#1234"
  avatar: string; // Avatar hash
  email: string;
  verified: boolean;
}

interface DiscordTokens {
  access_token: string;
  token_type: 'Bearer';
  expires_in: number; // seconds
  refresh_token: string;
  scope: string;
}
```

### 2. Custom Discord Bot

**Bot Capabilities**:

The custom bot responds to commands and automates workflows:

**Student Commands**:

| Command | Description | Example Output |
|---------|-------------|----------------|
| `/progress` | Show your current progress | "Level 15, Module 4, 1,250 XP" |
| `/leaderboard` | Top 10 students by XP | "1. Sarah - Level 25..." |
| `/quiz` | Get a random practice question | "What is a React Hook?" |
| `/buddy` | Find a study partner | "These students match you..." |
| `/achievements` | Show your achievements | "🎓 Quiz Master, ⭐ Perfect Score..." |
| `/help` | List all commands | Command reference |

**Creator Commands**:

| Command | Description | Example Output |
|---------|-------------|----------------|
| `/announce` | Send announcement to all | Announcement posted |
| `/stats` | Platform statistics | "150 students, 80% active..." |
| `/quiz-create` | Create quiz from video | Quiz generated |
| `/moderate [user]` | Moderation actions | User warned/banned |

**Bot Architecture**:

```typescript
// Bot event handlers
bot.on('messageCreate', async (message) => {
  if (message.author.bot) return;

  // Check for commands
  if (message.content.startsWith('/')) {
    await handleCommand(message);
  }

  // Check for questions (AI detection)
  if (isQuestion(message.content)) {
    await handleQuestion(message);
  }
});

bot.on('guildMemberAdd', async (member) => {
  // Send welcome message
  await sendWelcome(member);

  // Assign @Student role
  await assignRole(member, 'Student');
});
```

**AI-Powered Features**:

The bot uses Claude AI to:
- **Answer questions** - "How do I use useState?" → AI provides explanation
- **Generate quizzes** - `/quiz-create <video-id>` → AI creates quiz
- **Moderate content** - Auto-detect toxic messages
- **Suggest resources** - "I'm stuck on X" → AI suggests relevant videos

### 3. Automated Study Group Channels

**The Problem**:

When students create a study group, they need a place to communicate. Manually creating Discord channels is tedious.

**The Solution**:

Automatically create a Discord channel when a study group is formed:

```
Student creates "React Mastery Circle" study group
↓
1. Trigger n8n workflow via webhook
2. n8n calls Discord API:
   - Create private channel "#react-mastery-circle"
   - Set permissions: only group members can see/write
   - Create initial message with group info
3. Add all group members to channel
4. Send welcome message with guidelines
↓
Study group now has dedicated Discord channel
```

**Channel Structure**:

```
📚 Learning Groups
├─ #announcements (read-only)
├─ #general-chat
├─ #help-and-questions
└─ Study Group Channels (private)
    ├─ #react-mastery-circle
    ├─ #game-dev-squad
    └─ #portfolio-builders

🎮 Community
├─ #introductions
├─ #showcase (project demos)
├─ #off-topic
└─ Voice Channels
    ├─ 🔊 Study Room 1
    ├─ 🔊 Study Room 2
    └─ 🔊 Co-working Space

📊 Progress & Stats
├─ #achievements (auto-posted)
├─ #leaderboard (auto-updated)
└─ #daily-challenges
```

**Permissions Management**:

```typescript
// When student joins study group
async function addStudentToGroupChannel(
  studentDiscordId: string,
  channelId: string
) {
  await channel.permissionOverwrites.create(studentDiscordId, {
    ViewChannel: true,
    SendMessages: true,
    ReadMessageHistory: true,
  });
}

// When student leaves group
async function removeStudentFromGroupChannel(
  studentDiscordId: string,
  channelId: string
) {
  await channel.permissionOverwrites.delete(studentDiscordId);
}
```

### 4. Real-Time Progress Notifications

**What Gets Posted to Discord**:

Students receive real-time updates in a dedicated `#achievements` channel:

**XP Gains**:
```
🎉 @Sarah just earned 100 XP for completing "React Hooks Tutorial"!
```

**Level-Ups**:
```
🚀 @Mike leveled up! They're now Level 15. Keep crushing it! 🔥
```

**Achievements Unlocked**:
```
🏆 @Alex unlocked "Quiz Master" achievement! (Pass 10 quizzes)
```

**Quiz Results**:
```
⭐ @Jordan got a perfect score on "JavaScript Fundamentals Quiz"! 100% 🎯
```

**Project Submissions**:
```
💻 @Taylor just submitted their first project: "Todo App". Check it out! [Link]
```

**Streaks**:
```
🔥 @Chris has a 30-day learning streak! Legendary dedication! 🏅
```

**Notification Flow**:

```
Student completes video
↓
1. XP awarded on platform
2. Check if level-up occurred
3. Check if achievement unlocked
↓
4. Send webhook to n8n
5. n8n posts to Discord via bot
6. @mention student in message
↓
Community sees and celebrates 🎉
```

**Batching Strategy**:

To avoid spam, batch notifications:
- **Individual achievements** - Post immediately
- **Small XP gains** - Batch every 5 minutes
- **Daily summaries** - Post at 8pm (configurable)

**Daily Summary Example**:

```
📊 Daily Progress Recap - June 15, 2025

Today's Top Performers:
1. 🥇 @Sarah - 850 XP (Level 18 → 19)
2. 🥈 @Mike - 720 XP (3 quizzes passed)
3. 🥉 @Alex - 650 XP (2 videos completed)

Community Stats:
✅ 45 videos completed
✅ 28 quizzes passed
✅ 12 achievements unlocked
✅ 5 new study groups formed

Keep up the amazing work! 💪
```

### 5. Discord Slash Commands (Native)

**Using Discord's Native Slash Commands**:

Instead of text-based commands (`!progress`), use Discord's modern slash commands (`/progress`):

**Benefits**:
- ✅ Auto-complete and hints
- ✅ Parameter validation
- ✅ Better UX (cleaner, professional)
- ✅ Works on mobile
- ✅ Discoverable (type `/` to see all)

**Command Registration**:

```typescript
const commands = [
  {
    name: 'progress',
    description: 'View your learning progress',
  },
  {
    name: 'leaderboard',
    description: 'See top students by XP',
    options: [
      {
        name: 'timeframe',
        description: 'Timeframe for leaderboard',
        type: 3, // STRING
        required: false,
        choices: [
          { name: 'All Time', value: 'all' },
          { name: 'This Week', value: 'week' },
          { name: 'This Month', value: 'month' },
        ],
      },
    ],
  },
  {
    name: 'quiz',
    description: 'Get a random practice question',
    options: [
      {
        name: 'module',
        description: 'Which module to quiz on',
        type: 4, // INTEGER
        required: false,
      },
    ],
  },
  {
    name: 'buddy',
    description: 'Find a study buddy',
  },
];

// Register commands with Discord API
await rest.put(Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID), {
  body: commands,
});
```

**Command Response Example**:

```typescript
client.on('interactionCreate', async (interaction) => {
  if (!interaction.isCommand()) return;

  if (interaction.commandName === 'progress') {
    // Get student from database
    const student = await getStudentByDiscordId(interaction.user.id);

    // Create embed response
    const embed = new EmbedBuilder()
      .setColor('#5865F2')
      .setTitle(`${student.name}'s Progress`)
      .addFields(
        { name: 'Level', value: `${student.level}`, inline: true },
        { name: 'XP', value: `${student.xp_points}`, inline: true },
        { name: 'Module', value: `${student.current_module}`, inline: true },
        { name: 'Videos Completed', value: `${student.videos_completed}`, inline: true },
        { name: 'Quizzes Passed', value: `${student.quizzes_passed}`, inline: true },
        { name: 'Streak', value: `${student.current_streak} days 🔥`, inline: true }
      )
      .setThumbnail(student.avatar_url)
      .setFooter({ text: 'Keep up the great work!' });

    await interaction.reply({ embeds: [embed] });
  }
});
```

### 6. n8n Automation Workflows

**What is n8n?**

n8n is a workflow automation tool (like Zapier) that we use to connect our platform to Discord without writing complex code.

**Key Workflows**:

**1. Study Group Channel Creation**:

```
Trigger: Webhook from platform when study group created
↓
Step 1: Create Discord channel
  - Name: Group name (sanitized)
  - Type: Private text channel
  - Category: "Study Groups"
↓
Step 2: Set channel permissions
  - Add group members
  - Set read/write permissions
↓
Step 3: Post welcome message
  - Include group description
  - List members
  - Share guidelines
↓
Step 4: Update database
  - Store channel ID in study_groups table
```

**2. Achievement Notification**:

```
Trigger: Webhook when achievement unlocked
↓
Step 1: Format Discord message
  - Achievement emoji
  - Student @mention
  - Achievement description
↓
Step 2: Post to #achievements channel
↓
Step 3: Check if Legendary achievement
  - If yes: Also post to #announcements
  - Add 🎉 reactions
```

**3. Weekly Leaderboard Update**:

```
Trigger: Schedule (Every Sunday 8pm)
↓
Step 1: Query top 10 students from database
↓
Step 2: Generate leaderboard image (using Bannerbear or similar)
↓
Step 3: Post to #leaderboard channel
  - Include image
  - List top 10 with XP
  - Congratulate #1
```

**4. New Student Welcome**:

```
Trigger: Webhook when student signs up
↓
Step 1: Send DM to new student
  - Welcome message
  - Quick start guide
  - Link to first video
↓
Step 2: Post in #introductions
  - "@NewStudent just joined! Welcome them!"
↓
Step 3: Assign @Student role
```

**Workflow Configuration**:

```json
{
  "nodes": [
    {
      "name": "Webhook",
      "type": "n8n-nodes-base.webhook",
      "parameters": {
        "path": "study-group-created",
        "responseMode": "onReceived"
      }
    },
    {
      "name": "Create Channel",
      "type": "n8n-nodes-base.discord",
      "parameters": {
        "resource": "channel",
        "operation": "create",
        "guildId": "={{ $env.DISCORD_GUILD_ID }}",
        "name": "={{ $json.body.groupName.toLowerCase().replace(/\\s+/g, '-') }}",
        "type": "text"
      }
    },
    {
      "name": "Update Database",
      "type": "n8n-nodes-base.postgres",
      "parameters": {
        "operation": "executeQuery",
        "query": "UPDATE study_groups SET discord_channel_id = '{{ $json.id }}' WHERE id = '{{ $json.body.groupId }}'"
      }
    }
  ]
}
```

### 7. Community Events System

**Event Types**:

1. **Live Q&A Sessions**
   - Creator hosts weekly Q&A in voice channel
   - Announced 24 hours in advance
   - Auto-create event in Discord

2. **Study Together Sessions**
   - Scheduled co-working time
   - Everyone works on their own projects
   - Background music + accountability

3. **Code Reviews**
   - Students submit code for peer review
   - Creator provides feedback live
   - Recorded and shared after

4. **Hackathons**
   - 24-48 hour coding challenges
   - Team formation
   - Live leaderboard
   - Prizes for winners

5. **Module Launch Parties**
   - Celebrate new module releases
   - Preview content
   - Special challenges

**Discord Events Integration**:

```typescript
// Create Discord event
const event = await guild.scheduledEvents.create({
  name: 'Weekly Q&A with Creator',
  scheduledStartTime: new Date('2025-06-20T19:00:00'),
  scheduledEndTime: new Date('2025-06-20T20:00:00'),
  privacyLevel: 2, // GUILD_ONLY
  entityType: 2, // VOICE
  channel: voiceChannel,
  description: 'Ask anything about React, Next.js, or your projects!',
});

// Notify interested members
await event.createInviteURL();
```

**Event Notifications**:

- **24 hours before** - Posted in #announcements
- **1 hour before** - @everyone ping
- **5 minutes before** - DM to RSVPs
- **Event start** - Open voice channel, start recording

### 8. Moderation & Safety

**Auto-Moderation**:

```typescript
// Scan messages for toxic content
bot.on('messageCreate', async (message) => {
  const toxicityScore = await checkToxicity(message.content);

  if (toxicityScore > 0.8) {
    // Delete message
    await message.delete();

    // Warn user
    await message.author.send('Your message was removed for violating community guidelines.');

    // Log for creator review
    await logModeration(message);
  }
});
```

**Auto-Actions**:

1. **Spam Detection**
   - >5 messages in 10 seconds → Timeout 5 minutes
   - Same message repeated 3x → Delete + warning

2. **Link Filtering**
   - Block suspicious links
   - Whitelist approved domains

3. **Caps Lock**
   - >80% caps → Auto-convert to lowercase + reminder

4. **Mention Spam**
   - >5 @mentions in one message → Delete + timeout

**Role-Based Permissions**:

| Role | Permissions |
|------|-------------|
| **@Creator** | Full admin access, manage channels, kick/ban |
| **@Moderator** | Timeout users, delete messages, manage roles |
| **@Student** | Send messages, react, join voice |
| **@Muted** | Read-only access |

## Technical Implementation

### Discord Bot Setup

**Required Scopes**:
- `bot` - Bot functionality
- `applications.commands` - Slash commands
- `guilds` - Server info
- `guilds.members.read` - Member list

**Bot Permissions**:
- Manage Channels
- Manage Roles
- Send Messages
- Embed Links
- Read Message History
- Add Reactions
- Use Slash Commands

### Database Schema

```sql
-- Discord Integration
CREATE TABLE discord_integrations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID REFERENCES students(id) ON DELETE CASCADE,

  discord_user_id VARCHAR(100) UNIQUE NOT NULL,
  discord_username VARCHAR(100),
  discord_avatar VARCHAR(255),

  access_token TEXT,
  refresh_token TEXT,
  token_expires_at TIMESTAMP,

  -- Guild membership
  guild_joined_at TIMESTAMP,
  guild_member_id VARCHAR(100),

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Study group Discord channels
ALTER TABLE study_groups ADD COLUMN discord_channel_id VARCHAR(100);
ALTER TABLE study_groups ADD COLUMN discord_role_id VARCHAR(100);

-- Event tracking
CREATE TABLE discord_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_type VARCHAR(50) NOT NULL, -- 'qa', 'study-session', 'hackathon', etc.
  discord_event_id VARCHAR(100),

  title VARCHAR(255) NOT NULL,
  description TEXT,

  scheduled_start TIMESTAMP NOT NULL,
  scheduled_end TIMESTAMP NOT NULL,

  voice_channel_id VARCHAR(100),
  created_by UUID REFERENCES creators(id),

  -- Stats
  attendee_count INTEGER DEFAULT 0,

  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_discord_integrations_user ON discord_integrations(discord_user_id);
CREATE INDEX idx_discord_integrations_student ON discord_integrations(student_id);
CREATE INDEX idx_discord_events_schedule ON discord_events(scheduled_start);
```

## Cost Estimate

| Component | Usage | Cost/Month |
|-----------|-------|------------|
| **Discord** | Free tier | $0 |
| **n8n Cloud** | 5,000 executions/month | $20 |
| **Bot Hosting** | Heroku/Railway | $5 |
| **Image Generation** (Bannerbear) | 100 images/month | $9 |
| **Total** | | **~$34/month** |

**Per Creator**: $0.34/month (at 100 creators)

**Note**: Can self-host n8n to eliminate the $20/month cost.

## Next Steps

1. Read `IMPLEMENTATION.md` - Step-by-step build guide
2. Review `BOT_COMMANDS.md` - Complete bot command reference
3. Check `N8N_WORKFLOWS.md` - Pre-built automation workflows
4. See `MODERATION.md` - Auto-moderation setup

---

**This is the COMMUNITY module - build together, win together!** 💬
