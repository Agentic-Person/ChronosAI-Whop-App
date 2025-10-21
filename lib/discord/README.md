# Discord Integration Library

**Status:** ✅ COMPLETE
**Agent:** Agent 10 - Discord Integration Specialist
**Tier:** ENTERPRISE only

Complete Discord bot integration with slash commands, notifications, auto channels, and OAuth.

---

## Directory Structure

```
lib/discord/
├── bot.ts                      # Core bot with event handlers
├── init.ts                     # Bot initialization service
├── oauth-service.ts            # Discord OAuth authentication
├── notification-service.ts     # Auto notifications system
├── channel-manager.ts          # Auto channel creation
├── commands/
│   ├── register.ts            # Slash command registration
│   └── handler.ts             # Command execution router
├── moderation/
│   └── content-filter.ts      # Spam and toxicity filtering
└── __tests__/
    ├── bot.test.ts            # Bot core tests
    └── notification-service.test.ts

```

---

## Core Components

### `bot.ts` - Discord Bot Core
Main bot instance with event handlers:
- Client initialization
- Slash command interactions
- Member join/leave events
- Message moderation
- Error handling

**Usage:**
```typescript
import { getDiscordBot, initializeDiscordBot } from '@/lib/discord/bot';

// Start bot
const bot = await initializeDiscordBot();

// Check if ready
if (bot.ready()) {
  console.log('Bot is connected');
}
```

---

### `notification-service.ts` - Notifications
Sends automated notifications to Discord:
- XP gains
- Level-ups
- Achievement unlocks
- Quiz results
- Project submissions
- Daily summaries

**Usage:**
```typescript
import { DiscordNotificationService } from '@/lib/discord/notification-service';

const service = new DiscordNotificationService();

await service.notifyLevelUp('Sarah', 15, 'discord_user_id');
```

---

### `channel-manager.ts` - Channel Management
Auto-creates and manages Discord channels:
- Study group channels
- Permission management
- Member add/remove
- Channel archival

**Usage:**
```typescript
import { DiscordChannelManager } from '@/lib/discord/channel-manager';

const manager = new DiscordChannelManager();

const channelId = await manager.createStudyGroupChannel(
  'group_id',
  'React Masters',
  'creator_id',
  ['discord_id_1', 'discord_id_2']
);
```

---

### `oauth-service.ts` - OAuth Authentication
Handles Discord OAuth for account linking:
- Authorization URL generation
- Token exchange
- User info retrieval
- Guild membership

**Usage:**
```typescript
import { DiscordOAuthService } from '@/lib/discord/oauth-service';

const oauth = new DiscordOAuthService();

// Get auth URL
const authUrl = oauth.getAuthorizationUrl('csrf_state');

// Exchange code for tokens
const tokens = await oauth.exchangeCodeForTokens('auth_code');

// Get user info
const user = await oauth.getUserInfo(tokens.access_token);
```

---

### `commands/` - Slash Commands

**12 Commands Implemented:**

1. `/progress` - View learning progress
2. `/leaderboard [timeframe]` - Top students
3. `/ask <question>` - RAG chat
4. `/quiz [module]` - Practice questions
5. `/schedule` - Upcoming events
6. `/buddy` - Study buddy matching
7. `/achievements` - Unlocked badges
8. `/studygroup create/list/join` - Group management
9. `/stats` - Platform statistics
10. `/connect [code]` - Link account
11. `/notify <on|off>` - Toggle notifications
12. `/help` - Command reference

**Command Handler:**
```typescript
import { handleCommand } from '@/lib/discord/commands/handler';

// Called automatically by bot on interaction
await handleCommand(interaction);
```

---

### `moderation/content-filter.ts` - Moderation
Automatic content filtering:
- Spam detection (5 msgs / 10s → timeout)
- Harmful keywords
- Excessive caps (>80%)
- Mention spam (>5 mentions)
- Suspicious links

**Usage:**
```typescript
import { moderateMessage } from '@/lib/discord/moderation/content-filter';

const result = await moderateMessage(message);

if (result.shouldDelete) {
  await message.delete();
  console.log(`Deleted: ${result.reason}`);
}
```

---

## Environment Variables

Required in `.env`:

```bash
DISCORD_BOT_TOKEN=your_bot_token
DISCORD_CLIENT_ID=your_client_id
DISCORD_CLIENT_SECRET=your_client_secret
DISCORD_GUILD_ID=your_server_id
ENABLE_DISCORD_BOT=true # For development
```

---

## API Endpoints

### Account Linking
- `GET /api/discord/auth` - Start OAuth flow
- `GET /api/discord/auth/callback` - OAuth callback
- `POST /api/discord/link` - Link via code
- `GET /api/discord/link` - Generate code

### Notifications
- `POST /api/discord/notify` - Send notification

### Channel Management
- `POST /api/discord/channel` - Create channel
- `PATCH /api/discord/channel` - Update channel
- `DELETE /api/discord/channel` - Delete channel

---

## Integration Examples

### Send Notification When Student Levels Up

```typescript
// In your gamification service
async function awardXP(studentId: string, xp: number) {
  // Award XP in database
  const newLevel = await updateStudentXP(studentId, xp);

  // Notify Discord
  if (newLevel > oldLevel) {
    await fetch('/api/discord/notify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'level_up',
        data: {
          student_id: studentId,
          studentName: student.name,
          newLevel: newLevel
        }
      })
    });
  }
}
```

### Auto-Create Channel for Study Group

```typescript
// In your study group creation handler
async function createStudyGroup(data: StudyGroupData) {
  // Create group in database
  const group = await createGroup(data);

  // Get member Discord IDs
  const memberIds = await getDiscordIds(data.memberIds);

  // Create Discord channel
  await fetch('/api/discord/channel', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      type: 'study_group',
      name: data.name,
      creator_id: data.creatorId,
      group_id: group.id,
      member_discord_ids: memberIds
    })
  });
}
```

---

## Feature Gating

**All Discord features require ENTERPRISE tier:**

```typescript
import { Feature } from '@/lib/features/types';
import { withFeatureGate } from '@/lib/middleware/feature-gate';

export const POST = withFeatureGate(
  { feature: Feature.FEATURE_DISCORD_INTEGRATION },
  async (req) => {
    // Only accessible to ENTERPRISE customers
  }
);
```

---

## Testing

### Run Tests
```bash
npm test lib/discord/__tests__
```

### Manual Testing Checklist

✅ Bot connects to Discord
✅ Slash commands appear when typing `/`
✅ `/progress` shows student stats
✅ `/help` lists all commands
✅ Notifications post to channels
✅ Study group channels auto-create
✅ Account linking works (OAuth + code)
✅ Moderation deletes spam
✅ Feature gating blocks non-ENTERPRISE

---

## Documentation

See `/docs/DISCORD_INTEGRATION.md` for:
- Complete setup guide
- Discord Developer Portal configuration
- Command reference with examples
- Troubleshooting

---

## Dependencies

- `discord.js` v14.16.3
- `@discordjs/rest`
- `discord-interactions`

---

## Deployment

**Recommended:** Deploy bot as separate service (Railway.app, DigitalOcean)

**Alternative:** Run alongside Next.js (may have timeout issues on serverless)

---

**ENTERPRISE TIER FEATURE - Discord integration complete and production-ready.**
