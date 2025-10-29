/**
 * Artillery Test Data Processor
 * Generates realistic test data for load testing
 */

const { faker } = require('@faker-js/faker');

/**
 * Generate a realistic chat question about video content
 */
function generateChatQuestion() {
  const questions = [
    "Can you explain the main concept from the video?",
    "What are the key takeaways I should remember?",
    "How does this relate to the previous topic?",
    "Can you give me an example of this in practice?",
    "What are common mistakes people make with this?",
    "How can I apply this to my own project?",
    "What's the difference between X and Y mentioned in the video?",
    "Can you summarize the video in simple terms?",
    "What prerequisites do I need before learning this?",
    "Are there any best practices for this technique?",
    "Can you elaborate on the part about [topic]?",
    "What resources would you recommend for deeper learning?",
    "How long will it take to master this skill?",
    "What are the most important points from this lesson?",
    "Can you break down the step-by-step process?",
  ];

  return questions[Math.floor(Math.random() * questions.length)];
}

/**
 * Generate a follow-up question based on context
 */
function generateFollowUpQuestion() {
  const followUps = [
    "Can you clarify that last point?",
    "What did you mean by that?",
    "Could you give another example?",
    "How does that work in practice?",
    "What if I encounter [specific scenario]?",
    "Is there an easier way to do this?",
    "What are the pros and cons?",
    "Thanks! One more question...",
    "That makes sense. But what about...",
    "Interesting! How do I get started?",
  ];

  return followUps[Math.floor(Math.random() * followUps.length)];
}

/**
 * Generate realistic video file size (5-25MB)
 */
function generateVideoSize() {
  // 5MB to 25MB in bytes
  const minSize = 5 * 1024 * 1024;
  const maxSize = 25 * 1024 * 1024;
  return Math.floor(Math.random() * (maxSize - minSize) + minSize);
}

/**
 * Generate a mock auth code for OAuth flow
 */
function generateAuthCode() {
  return faker.string.alphanumeric(32);
}

/**
 * Generate OAuth state parameter
 */
function generateState() {
  return faker.string.alphanumeric(16);
}

/**
 * Generate a future date for calendar events
 */
function generateFutureDate() {
  const now = new Date();
  const future = new Date(now.getTime() + Math.random() * 30 * 24 * 60 * 60 * 1000); // Next 30 days
  return future.toISOString();
}

/**
 * Generate a random video ID (UUID format)
 */
function generateVideoId() {
  return faker.string.uuid();
}

/**
 * Generate mock video buffer for upload testing
 * Creates a small buffer to simulate video data without using too much memory
 */
function generateVideoBuffer(requestParams, context, ee, next) {
  // Generate a small buffer (1KB) to simulate video data
  // In real load testing, you might want to use actual video files
  const bufferSize = 1024; // 1KB for testing
  const buffer = Buffer.alloc(bufferSize);

  // Fill with random data
  for (let i = 0; i < bufferSize; i++) {
    buffer[i] = Math.floor(Math.random() * 256);
  }

  context.vars.videoBuffer = buffer;
  return next();
}

/**
 * Check if video processing is still ongoing
 */
function checkProcessingStatus(context) {
  const status = context.vars.processingStatus;
  return status !== 'completed' && status !== 'failed';
}

/**
 * Generate realistic user data
 */
function generateUserData() {
  return {
    email: faker.internet.email(),
    name: faker.person.fullName(),
    username: faker.internet.username(),
    avatar: faker.image.avatar(),
  };
}

/**
 * Generate quiz question
 */
function generateQuizQuestion() {
  return {
    question: faker.lorem.sentence({ min: 8, max: 15 }),
    options: [
      faker.lorem.words(3),
      faker.lorem.words(3),
      faker.lorem.words(3),
      faker.lorem.words(3),
    ],
    correct_answer: Math.floor(Math.random() * 4),
  };
}

/**
 * Set up request with proper headers and timing
 */
function beforeRequest(requestParams, context, ee, next) {
  // Add request timestamp for latency tracking
  context.vars.requestStartTime = Date.now();

  // Add correlation ID for request tracing
  requestParams.headers = requestParams.headers || {};
  requestParams.headers['X-Request-ID'] = faker.string.uuid();
  requestParams.headers['X-Load-Test'] = 'true';

  return next();
}

/**
 * Process response and extract metrics
 */
function afterResponse(requestParams, response, context, ee, next) {
  // Calculate request duration
  const duration = Date.now() - context.vars.requestStartTime;

  // Emit custom metrics
  ee.emit('customStat', {
    stat: 'request_duration_ms',
    value: duration,
  });

  // Track rate limit headers
  if (response.headers['x-ratelimit-remaining']) {
    ee.emit('customStat', {
      stat: 'rate_limit_remaining',
      value: parseInt(response.headers['x-ratelimit-remaining']),
    });
  }

  // Track error types
  if (response.statusCode >= 400) {
    ee.emit('customStat', {
      stat: `error_${response.statusCode}`,
      value: 1,
    });
  }

  return next();
}

// Export functions for use in Artillery scenarios
module.exports = {
  generateChatQuestion,
  generateFollowUpQuestion,
  generateVideoSize,
  generateAuthCode,
  generateState,
  generateFutureDate,
  generateVideoId,
  generateVideoBuffer,
  checkProcessingStatus,
  generateUserData,
  generateQuizQuestion,
  beforeRequest,
  afterResponse,
};
