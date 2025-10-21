/**
 * Discord Bot Initialization
 *
 * Initializes the Discord bot when the server starts.
 * Only runs in production or when ENABLE_DISCORD_BOT=true
 */

import { initializeDiscordBot } from './bot';

/**
 * Initialize Discord bot on server startup
 *
 * This should be called from Next.js instrumentation.ts or app initialization
 */
export async function startDiscordBot(): Promise<void> {
  // Only start bot in production or if explicitly enabled
  const shouldStart =
    process.env.NODE_ENV === 'production' ||
    process.env.ENABLE_DISCORD_BOT === 'true';

  if (!shouldStart) {
    console.log('ℹ️ Discord bot disabled in development (set ENABLE_DISCORD_BOT=true to enable)');
    return;
  }

  if (!process.env.DISCORD_BOT_TOKEN) {
    console.warn('⚠️ DISCORD_BOT_TOKEN not set - Discord bot will not start');
    return;
  }

  try {
    await initializeDiscordBot();
    console.log('✅ Discord bot initialized successfully');
  } catch (error) {
    console.error('❌ Failed to initialize Discord bot:', error);
    // Don't throw - allow app to continue even if Discord bot fails
  }
}
