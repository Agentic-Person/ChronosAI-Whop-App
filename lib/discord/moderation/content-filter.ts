/**
 * Discord Content Moderation
 *
 * Automatically filters and moderates messages for:
 * - Inappropriate content
 * - Spam
 * - Excessive caps
 * - Mention spam
 */

import { Message } from 'discord.js';

/**
 * Harmful keywords to filter (add more as needed)
 * In production, use a more comprehensive list or AI-based moderation
 */
const HARMFUL_KEYWORDS = [
  // Add profanity, slurs, and inappropriate terms
  // Redacted for this example
];

/**
 * Spam detection configuration
 */
const SPAM_THRESHOLD = 5; // messages
const SPAM_WINDOW = 10000; // 10 seconds
const MENTION_SPAM_THRESHOLD = 5; // mentions in one message

/**
 * Message history for spam detection
 */
const messageHistory = new Map<string, number[]>();

/**
 * Moderation result
 */
export interface ModerationResult {
  shouldDelete: boolean;
  reason?: string;
  action?: 'warn' | 'timeout' | 'kick' | 'ban';
  duration?: number; // For timeout, in milliseconds
}

/**
 * Moderate a Discord message
 */
export async function moderateMessage(
  message: Message
): Promise<ModerationResult> {
  // 1. Check for harmful keywords
  const keywordCheck = checkHarmfulKeywords(message.content);
  if (keywordCheck.shouldDelete) {
    return keywordCheck;
  }

  // 2. Check for spam (rapid messages)
  const spamCheck = checkSpam(message);
  if (spamCheck.shouldDelete) {
    return spamCheck;
  }

  // 3. Check for excessive caps
  const capsCheck = checkExcessiveCaps(message.content);
  if (capsCheck.shouldDelete) {
    return capsCheck;
  }

  // 4. Check for mention spam
  const mentionCheck = checkMentionSpam(message);
  if (mentionCheck.shouldDelete) {
    return mentionCheck;
  }

  // 5. Check for suspicious links
  const linkCheck = checkSuspiciousLinks(message.content);
  if (linkCheck.shouldDelete) {
    return linkCheck;
  }

  return { shouldDelete: false };
}

/**
 * Check for harmful keywords
 */
function checkHarmfulKeywords(content: string): ModerationResult {
  const lowerContent = content.toLowerCase();

  for (const keyword of HARMFUL_KEYWORDS) {
    if (lowerContent.includes(keyword)) {
      return {
        shouldDelete: true,
        reason: 'Message contains inappropriate content',
        action: 'warn',
      };
    }
  }

  return { shouldDelete: false };
}

/**
 * Check for spam (rapid messages)
 */
function checkSpam(message: Message): ModerationResult {
  const userId = message.author.id;
  const now = Date.now();

  if (!messageHistory.has(userId)) {
    messageHistory.set(userId, []);
  }

  const userHistory = messageHistory.get(userId)!;
  userHistory.push(now);

  // Remove old timestamps outside the spam window
  const recentMessages = userHistory.filter(
    timestamp => now - timestamp < SPAM_WINDOW
  );
  messageHistory.set(userId, recentMessages);

  if (recentMessages.length > SPAM_THRESHOLD) {
    // Timeout user for 5 minutes
    try {
      message.member?.timeout(5 * 60 * 1000, 'Spam detected');
    } catch (error) {
      console.error('Failed to timeout user:', error);
    }

    return {
      shouldDelete: true,
      reason: 'Spam detected - you have been timed out for 5 minutes',
      action: 'timeout',
      duration: 5 * 60 * 1000,
    };
  }

  return { shouldDelete: false };
}

/**
 * Check for excessive caps
 */
function checkExcessiveCaps(content: string): ModerationResult {
  // Only check messages longer than 10 characters
  if (content.length < 10) {
    return { shouldDelete: false };
  }

  const capsCount = (content.match(/[A-Z]/g) || []).length;
  const totalLetters = (content.match(/[A-Za-z]/g) || []).length;

  if (totalLetters === 0) {
    return { shouldDelete: false };
  }

  const capsRatio = capsCount / totalLetters;

  // More than 80% caps
  if (capsRatio > 0.8) {
    return {
      shouldDelete: false, // Just warn, don't delete
      reason: 'Please avoid excessive caps lock',
      action: 'warn',
    };
  }

  return { shouldDelete: false };
}

/**
 * Check for mention spam
 */
function checkMentionSpam(message: Message): ModerationResult {
  const mentions = message.mentions.users.size;

  if (mentions > MENTION_SPAM_THRESHOLD) {
    return {
      shouldDelete: true,
      reason: 'Please avoid excessive mentions',
      action: 'warn',
    };
  }

  return { shouldDelete: false };
}

/**
 * Check for suspicious links
 */
function checkSuspiciousLinks(content: string): ModerationResult {
  // List of allowed domains
  const allowedDomains = [
    'youtube.com',
    'youtu.be',
    'github.com',
    'stackoverflow.com',
    'medium.com',
    'dev.to',
    'discord.com',
    'discord.gg',
  ];

  // Extract URLs from content
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const urls = content.match(urlRegex) || [];

  for (const url of urls) {
    try {
      const urlObj = new URL(url);
      const domain = urlObj.hostname.replace('www.', '');

      // Check if domain is allowed
      const isAllowed = allowedDomains.some(allowed => domain.includes(allowed));

      if (!isAllowed) {
        return {
          shouldDelete: true,
          reason: 'Suspicious link detected. Only whitelisted domains are allowed.',
          action: 'warn',
        };
      }
    } catch (error) {
      // Invalid URL, skip
      continue;
    }
  }

  return { shouldDelete: false };
}

/**
 * Clean up old message history (call periodically)
 */
export function cleanupMessageHistory(): void {
  const now = Date.now();

  messageHistory.forEach((timestamps, userId) => {
    const recent = timestamps.filter(
      timestamp => now - timestamp < SPAM_WINDOW
    );

    if (recent.length === 0) {
      messageHistory.delete(userId);
    } else {
      messageHistory.set(userId, recent);
    }
  });
}

// Cleanup every 5 minutes
setInterval(cleanupMessageHistory, 5 * 60 * 1000);
