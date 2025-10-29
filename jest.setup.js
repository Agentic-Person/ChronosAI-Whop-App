// Learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom'

// Mock environment variables for tests
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key'
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key'
process.env.ANTHROPIC_API_KEY = 'test-anthropic-key'
process.env.OPENAI_API_KEY = 'test-openai-key'
process.env.WHOP_API_KEY = 'test-whop-key'
process.env.WHOP_WEBHOOK_SECRET = 'test-webhook-secret'
process.env.WHOP_CLIENT_ID = 'test-client-id'
process.env.WHOP_CLIENT_SECRET = 'test-client-secret'
process.env.WHOP_TOKEN_ENCRYPTION_KEY = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef'

// Polyfill setImmediate for jsdom environment (needed by Pino logger)
if (typeof setImmediate === 'undefined') {
  global.setImmediate = setTimeout;
}

// Mock Redis client to avoid ES module issues
jest.mock('@/lib/infrastructure/cache/redis-client', () => ({
  cache: {
    get: jest.fn(async () => null),
    set: jest.fn(async () => undefined),
    del: jest.fn(async () => undefined),
    exists: jest.fn(async () => false),
  },
}));

// Mock OpenAI client to avoid browser environment error
jest.mock('openai', () => {
  return {
    __esModule: true,
    default: jest.fn().mockImplementation(() => ({
      embeddings: {
        create: jest.fn(async () => ({
          data: [{ embedding: Array(1536).fill(0.1) }],
          usage: { total_tokens: 100 },
        })),
      },
    })),
  };
});

// Global test utilities
global.mockFetch = (response) => {
  global.fetch = jest.fn(() =>
    Promise.resolve({
      ok: true,
      status: 200,
      json: async () => response,
      text: async () => JSON.stringify(response),
    })
  )
}

global.mockFetchError = (error) => {
  global.fetch = jest.fn(() => Promise.reject(error))
}
