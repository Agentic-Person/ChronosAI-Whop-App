# Discord Integration Guide

Complete guide for setting up and using the Discord bot integration (ENTERPRISE tier feature).

## Table of Contents

1. [Overview](#overview)
2. [Setup](#setup)
3. [Bot Commands](#bot-commands)
4. [Features](#features)
5. [API Reference](#api-reference)
6. [Troubleshooting](#troubleshooting)

---

## Overview

The Discord integration connects your learning platform with Discord, providing:

- **Slash Commands** - Students can check progress, ask questions, and manage study groups
- **Auto Notifications** - XP gains, level-ups, achievements posted to Discord
- **Auto Channels** - Study group channels created automatically
- **OAuth Login** - Sign in with Discord account
- **Content Moderation** - Automated spam and toxicity filtering

**Tier:** ENTERPRISE only

---

## Setup

### 1. Create Discord Application

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Click "New Application"
3. Name it "ChronosAI" (or your platform name)
4. Go to "Bot" tab
5. Click "Add Bot"
6. Copy **Bot Token** → Save to `.env` as `DISCORD_BOT_TOKEN`
7. Enable these Privileged Gateway Intents:
   - ✅ Server Members Intent
   - ✅ Message Content Intent

### 2. Configure OAuth

1. Go to "OAuth2" tab
2. Copy **Client ID** → Save to `.env` as `DISCORD_CLIENT_ID`
3. Copy **Client Secret** → Save to `.env` as `DISCORD_CLIENT_SECRET`
4. Add Redirect URL:
   - Development: `http://localhost:3000/api/discord/auth/callback`
   - Production: `https://your-domain.com/api/discord/auth/callback`

### 3. Create Discord Server

1. Create a new Discord server (or use existing one)
2. Copy **Server ID** (Right-click server → Copy ID)
3. Save to `.env` as `DISCORD_GUILD_ID`

### 4. Set Up Server Channels

Create these text channels:

```
📢 Announcements
├─ #announcements (read-only)
├─ #general-chat
└─ #help-and-questions

🎉 Community
├─ #achievements (auto-posted)
├─ #leaderboard
└─ #showcase (project submissions)

📚 Study Groups (category - auto-populated)

🎙️ Voice Channels
├─ 🔊 Study Room 1
├─ 🔊 Study Room 2
└─ 🔊 Co-working Space
```

### 5. Create Roles

Create these roles with permissions:

- `@Creator` - Full admin access
- `@Moderator` - Timeout users, delete messages
- `@Student` - Send messages, join voice (auto-assigned)
- `@Muted` - Read-only access

### 6. Environment Variables

Add to `.env`:

```bash
# Discord Bot
DISCORD_BOT_TOKEN=your_bot_token_here
DISCORD_CLIENT_ID=your_client_id_here
DISCORD_CLIENT_SECRET=your_client_secret_here
DISCORD_GUILD_ID=your_server_id_here
ENABLE_DISCORD_BOT=true # Set to true to enable in development
```

### 7. Invite Bot to Server

1. Go to Discord Developer Portal → OAuth2 → URL Generator
2. Select scopes:
   - ✅ `bot`
   - ✅ `applications.commands`
3. Select bot permissions:
   - ✅ Manage Channels
   - ✅ Manage Roles
   - ✅ Send Messages
   - ✅ Manage Messages
   - ✅ Embed Links
   - ✅ Read Message History
   - ✅ Add Reactions
   - ✅ Use Slash Commands
   - ✅ Moderate Members (for timeout)
4. Copy generated URL
5. Open URL in browser and add bot to your server

### 8. Start the Bot

**Development:**
```bash
npm run dev
```

**Production:**
```bash
npm run build
npm run start
```

Bot will auto-start if `DISCORD_BOT_TOKEN` is set.

---

## Bot Commands

### Student Commands

#### `/progress`
View your learning progress and stats.

**Example:**
```
/progress
```

**Response:**
```
Level: 15
XP: 1,250
Next Level: 60%
Videos Completed: 42
Quizzes Passed: 18
🔥 Streak: 7 days
```

---

#### `/leaderboard [timeframe]`
See top students by XP.

**Options:**
- `timeframe` - all (default), week, month

**Example:**
```
/leaderboard timeframe:week
```

**Response:**
```
🏆 Leaderboard - This Week
🥇 Sarah - Level 25 (3,450 XP)
🥈 Mike - Level 22 (2,890 XP)
🥉 Alex - Level 20 (2,650 XP)
```

---

#### `/ask <question>`
Ask a question about course content (uses RAG).

**Example:**
```
/ask question:What is a React Hook?
```

**Response:**
AI answer with video citations and timestamps.

---

#### `/quiz [module]`
Get a random practice question.

**Example:**
```
/quiz module:3
```

---

#### `/schedule`
View your upcoming learning schedule.

**Example:**
```
/schedule
```

**Response:**
```
📅 Your Upcoming Schedule
• React Fundamentals - Dec 15
• State Management Quiz - Dec 16
• Project: Todo App - Dec 18
```

---

#### `/achievements`
View your unlocked achievements.

**Example:**
```
/achievements
```

---

#### `/buddy`
Find a study buddy match.

**Example:**
```
/buddy
```

---

#### `/studygroup create <name>`
Create a new study group (auto-creates Discord channel).

**Example:**
```
/studygroup create name:React Masters
```

---

#### `/studygroup list`
List available study groups.

---

#### `/studygroup join <group>`
Join a study group.

---

#### `/stats`
View platform-wide statistics.

**Example:**
```
/stats
```

---

#### `/connect [code]`
Link your Discord account to the platform.

**Without code:**
```
/connect
```
Shows instructions for generating a code.

**With code:**
```
/connect code:ABC123
```

---

#### `/notify <on|off>`
Toggle Discord notifications.

**Example:**
```
/notify setting:off
```

---

#### `/help`
List all available commands.

---

## Features

### Automatic Notifications

The platform automatically posts to Discord:

#### XP Gains
```
🎉 @Sarah just earned 100 XP for completing "React Hooks Tutorial"!
```

#### Level-Ups
```
🚀 @Mike leveled up! They're now Level 15. Keep crushing it! 🔥
```

#### Achievements
```
🏆 Achievement Unlocked!
@Alex unlocked Quiz Master (epic)
Pass 10 quizzes with 100% score
```

#### Quiz Results
```
⭐ @Jordan got a perfect score on "JavaScript Fundamentals Quiz"! 100% 🎯
```

#### Project Submissions
```
💻 New Project Submission!
@Taylor just submitted: Todo App with Redux
[View Project]
```

#### Streaks
```
🔥 @Chris has a 30-day learning streak! Legendary dedication! 🏅
```

#### Daily Summary
```
📊 Daily Progress Recap - December 15, 2025

Today's Top Performers:
🥇 Sarah - 850 XP (Level 18 → 19)
🥈 Mike - 720 XP (3 quizzes passed)
🥉 Alex - 650 XP (2 videos completed)

Community Stats:
✅ 45 videos completed
✅ 28 quizzes passed
✅ 12 achievements unlocked
✅ 5 new study groups formed

Keep up the amazing work! 💪
```

---

### Auto Study Group Channels

When a student creates a study group on the platform:

1. **Private Discord channel auto-created** - `#react-mastery-circle`
2. **Members auto-added** - All group members get access
3. **Welcome message posted** - Guidelines and group info
4. **Category organized** - Under "Study Groups"

**Channel Permissions:**
- Only group members can view/write
- Auto-updates when members join/leave
- Archives when group disbands

---

### Content Moderation

The bot automatically filters:

#### Spam Detection
- More than 5 messages in 10 seconds → Timeout 5 minutes
- Same message repeated 3 times → Delete + warning

#### Inappropriate Content
- Harmful keywords → Delete message + DM warning
- Suspicious links → Delete if not whitelisted

#### Caps Lock
- More than 80% caps → Reminder to avoid excessive caps

#### Mention Spam
- More than 5 @mentions in one message → Delete + warning

**Whitelisted Domains:**
- youtube.com
- github.com
- stackoverflow.com
- medium.com
- dev.to
- discord.com

---

### Account Linking

**Method 1: OAuth (Recommended)**

1. Go to platform Settings → Discord
2. Click "Link Discord Account"
3. Authorize on Discord
4. Redirected back to platform
5. Account linked ✅

**Method 2: Verification Code**

1. Go to platform Settings → Discord
2. Click "Generate Code"
3. Copy code (e.g., `ABC123`)
4. In Discord, run `/connect code:ABC123`
5. Account linked ✅

**Benefits:**
- Progress notifications mention you
- Access to `/progress` and other personal commands
- Auto-join study group channels

---

## API Reference

### POST /api/discord/notify

Send a notification to Discord.

**Request:**
```json
{
  "type": "level_up",
  "data": {
    "student_id": "uuid",
    "studentName": "Sarah",
    "newLevel": 15
  }
}
```

**Notification Types:**
- `xp_gained` - XP gain notification
- `level_up` - Level-up notification
- `achievement_unlocked` - Achievement unlock
- `perfect_quiz` - Perfect quiz score
- `project_submitted` - Project submission
- `streak_milestone` - Streak milestone
- `daily_summary` - Daily recap
- `dm` - Direct message to user

**Response:**
```json
{
  "success": true,
  "message": "Notification sent successfully"
}
```

---

### POST /api/discord/channel

Create a Discord channel.

**Request:**
```json
{
  "type": "study_group",
  "name": "React Masters",
  "creator_id": "uuid",
  "group_id": "uuid",
  "member_discord_ids": ["discord_id_1", "discord_id_2"]
}
```

**Response:**
```json
{
  "success": true,
  "channel_id": "123456789",
  "message": "Study group channel created successfully"
}
```

---

### PATCH /api/discord/channel

Update channel (add/remove members).

**Request:**
```json
{
  "channel_id": "123456789",
  "action": "add_member",
  "discord_user_id": "discord_id"
}
```

**Actions:**
- `add_member` - Add member to channel
- `remove_member` - Remove member from channel
- `archive` - Archive channel (make read-only)

---

### DELETE /api/discord/channel

Delete a Discord channel.

**Request:**
```json
{
  "channel_id": "123456789"
}
```

---

### POST /api/discord/link

Link Discord account via verification code.

**Request:**
```json
{
  "discord_id": "discord_user_id",
  "discord_username": "username#1234",
  "verification_code": "ABC123"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Discord account linked successfully",
  "student": {
    "id": "uuid",
    "name": "Sarah"
  }
}
```

---

### GET /api/discord/link

Generate verification code for current user.

**Response:**
```json
{
  "code": "ABC123",
  "expires_at": "2025-12-15T10:30:00Z",
  "instructions": "Use /connect <code> in Discord to link your account"
}
```

---

## Troubleshooting

### Bot Not Starting

**Problem:** Bot doesn't connect to Discord.

**Solutions:**
1. Check `DISCORD_BOT_TOKEN` is set correctly
2. Verify bot token is valid (generate new one if needed)
3. Check console for error messages
4. Ensure `ENABLE_DISCORD_BOT=true` in development

---

### Slash Commands Not Appearing

**Problem:** Commands don't show up when typing `/`.

**Solutions:**
1. Check `DISCORD_GUILD_ID` is set
2. Wait up to 5 minutes for commands to register
3. Restart bot
4. Check bot has `applications.commands` scope

---

### Notifications Not Posting

**Problem:** Notifications don't appear in channels.

**Solutions:**
1. Check channels exist (#achievements, #announcements, etc.)
2. Verify bot has "Send Messages" permission
3. Check bot is in the server
4. Review server logs for errors

---

### Auto Channel Creation Fails

**Problem:** Study group channels not created.

**Solutions:**
1. Check bot has "Manage Channels" permission
2. Verify "Study Groups" category exists
3. Check bot role is higher than @everyone
4. Review API error logs

---

### Account Linking Fails

**Problem:** `/connect` command doesn't work.

**Solutions:**
1. Generate fresh verification code (10-minute expiration)
2. Check code is entered correctly (case-insensitive)
3. Verify student is logged into platform
4. Check database connection

---

### Moderation Not Working

**Problem:** Spam messages not deleted.

**Solutions:**
1. Check bot has "Manage Messages" permission
2. Verify bot has "Moderate Members" permission (for timeout)
3. Ensure bot role is higher than member roles
4. Review moderation logs

---

## Support

For issues with Discord integration:

1. Check console logs for errors
2. Review [Discord.js documentation](https://discord.js.org)
3. Check [Discord Developer Portal](https://discord.com/developers/docs)
4. Contact support with error logs

---

**ENTERPRISE feature - powered by ChronosAI**
