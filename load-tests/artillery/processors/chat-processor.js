/**
 * Chat-specific Artillery Processor
 * Handles chat flow logic and response validation
 */

const { faker } = require('@faker-js/faker');

/**
 * Generate contextually relevant chat questions
 */
function generateChatQuestion(context, events, done) {
  const topics = [
    'authentication', 'database', 'api', 'frontend', 'backend',
    'deployment', 'testing', 'security', 'performance', 'scalability'
  ];

  const questionTemplates = [
    `How do I implement ${faker.helpers.arrayElement(topics)} in my application?`,
    `What's the best way to handle ${faker.helpers.arrayElement(topics)}?`,
    `Can you explain ${faker.helpers.arrayElement(topics)} concepts?`,
    `What are common issues with ${faker.helpers.arrayElement(topics)}?`,
    `How can I optimize ${faker.helpers.arrayElement(topics)} performance?`,
  ];

  context.vars.chatQuestion = faker.helpers.arrayElement(questionTemplates);
  return done();
}

/**
 * Generate follow-up questions that reference previous context
 */
function generateFollowUpQuestion(context, events, done) {
  const followUps = [
    "Can you clarify that last explanation?",
    "What about edge cases?",
    "Could you provide a code example?",
    "How does this compare to alternative approaches?",
    "What are the performance implications?",
    "Are there any security concerns?",
    "What's the recommended best practice?",
    "How do I handle errors in this case?",
    "Can you elaborate on that point?",
    "What resources do you recommend for learning more?",
  ];

  context.vars.followUpQuestion = faker.helpers.arrayElement(followUps);
  return done();
}

/**
 * Validate chat response structure and quality
 */
function validateChatResponse(requestParams, response, context, ee, next) {
  try {
    const body = JSON.parse(response.body);

    // Check response structure
    if (!body.data || !body.data.content) {
      ee.emit('customStat', { stat: 'chat_invalid_response', value: 1 });
      return next(new Error('Invalid chat response structure'));
    }

    // Check response quality metrics
    const content = body.data.content;
    const wordCount = content.split(' ').length;

    // Response should be substantial (at least 20 words)
    if (wordCount < 20) {
      ee.emit('customStat', { stat: 'chat_short_response', value: 1 });
    }

    // Track response length distribution
    ee.emit('customStat', { stat: 'chat_response_word_count', value: wordCount });

    // Check for video references
    if (body.data.video_references && body.data.video_references.length > 0) {
      ee.emit('customStat', {
        stat: 'chat_with_video_references',
        value: body.data.video_references.length
      });
    } else {
      ee.emit('customStat', { stat: 'chat_no_video_references', value: 1 });
    }

    // Track confidence score if available
    if (body.meta && body.meta.confidence !== undefined) {
      ee.emit('customStat', {
        stat: 'chat_confidence_score',
        value: body.meta.confidence
      });
    }

    // Check CHRONOS rewards
    if (body.meta && body.meta.chronos_awarded) {
      ee.emit('customStat', {
        stat: 'chronos_tokens_awarded',
        value: body.meta.chronos_awarded
      });
    }

    // Track rate limit info
    if (body.meta && body.meta.usage) {
      ee.emit('customStat', {
        stat: 'chat_remaining_questions',
        value: body.meta.usage.remaining || 0
      });

      if (body.meta.usage.upgrade_required) {
        ee.emit('customStat', { stat: 'chat_upgrade_required', value: 1 });
      }
    }

    return next();
  } catch (error) {
    ee.emit('customStat', { stat: 'chat_response_parse_error', value: 1 });
    return next(error);
  }
}

/**
 * Track chat session metrics
 */
function trackChatSession(requestParams, response, context, ee, next) {
  try {
    const body = JSON.parse(response.body);

    // Track session creation
    if (body.data && body.data.session_id && !context.vars.sessionId) {
      ee.emit('customStat', { stat: 'chat_new_session_created', value: 1 });
      context.vars.sessionId = body.data.session_id;
      context.vars.messageCount = 1;
    } else if (body.data && body.data.session_id === context.vars.sessionId) {
      // Track messages in existing session
      context.vars.messageCount = (context.vars.messageCount || 0) + 1;
      ee.emit('customStat', {
        stat: 'chat_messages_per_session',
        value: context.vars.messageCount
      });
    }

    return next();
  } catch (error) {
    return next(error);
  }
}

/**
 * Handle rate limit responses gracefully
 */
function handleRateLimit(requestParams, response, context, ee, next) {
  if (response.statusCode === 429 || response.statusCode === 403) {
    try {
      const body = JSON.parse(response.body);

      // Track rate limit hits by tier
      if (body.error && body.error.code === 'CHAT_LIMIT_EXCEEDED') {
        const tier = body.error.details?.tier || 'unknown';
        ee.emit('customStat', {
          stat: `rate_limit_hit_${tier}`,
          value: 1
        });

        // Track how many questions were asked before limit
        if (body.error.details?.questions_asked) {
          ee.emit('customStat', {
            stat: 'questions_before_limit',
            value: body.error.details.questions_asked
          });
        }
      }

      // Track rate limit reset time
      if (response.headers['x-ratelimit-reset']) {
        const resetTime = parseInt(response.headers['x-ratelimit-reset']);
        const now = Math.floor(Date.now() / 1000);
        const waitTime = resetTime - now;

        ee.emit('customStat', {
          stat: 'rate_limit_wait_seconds',
          value: Math.max(0, waitTime)
        });
      }
    } catch (error) {
      // Ignore parsing errors for rate limit responses
    }
  }

  return next();
}

/**
 * Simulate realistic user think time based on response length
 */
function calculateThinkTime(context, events, done) {
  // Longer responses = more reading time
  const content = context.vars.lastResponseContent || '';
  const wordCount = content.split(' ').length;

  // Assume 200 words per minute reading speed
  const readTimeSeconds = Math.ceil(wordCount / 200 * 60);

  // Add some randomness (±30%)
  const variance = 0.3;
  const minTime = readTimeSeconds * (1 - variance);
  const maxTime = readTimeSeconds * (1 + variance);

  context.vars.thinkTime = Math.floor(Math.random() * (maxTime - minTime) + minTime);

  return done();
}

module.exports = {
  generateChatQuestion,
  generateFollowUpQuestion,
  validateChatResponse,
  trackChatSession,
  handleRateLimit,
  calculateThinkTime,
};
