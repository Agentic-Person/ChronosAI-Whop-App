/**
 * Test Utilities and Helpers
 * Shared testing utilities for all modules
 */

import { render, RenderOptions } from '@testing-library/react';
import { ReactElement } from 'react';

// Mock Supabase client for tests
export const mockSupabaseClient = {
  from: jest.fn(() => ({
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    single: jest.fn(),
  })),
  auth: {
    getUser: jest.fn(),
    signInWithOAuth: jest.fn(),
    signOut: jest.fn(),
  },
};

// Mock fetch for API tests
export const mockFetch = (response: any, status: number = 200) => {
  global.fetch = jest.fn(() =>
    Promise.resolve({
      ok: status >= 200 && status < 300,
      status,
      json: () => Promise.resolve(response),
    })
  ) as jest.Mock;
};

// Custom render function for React components
export function renderWithProviders(
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) {
  return render(ui, { ...options });
}

// Mock user data
export const mockStudent = {
  id: 'test-student-id',
  whop_user_id: 'whop-user-123',
  whop_membership_id: 'whop-membership-123',
  email: 'test@example.com',
  name: 'Test Student',
  xp_points: 500,
  level: 5,
  streak_days: 7,
};

export const mockCreator = {
  id: 'test-creator-id',
  whop_company_id: 'whop-company-123',
  whop_user_id: 'whop-creator-456',
  company_name: 'Test Academy',
  subscription_tier: 'pro',
};

export const mockVideo = {
  id: 'test-video-id',
  creator_id: 'test-creator-id',
  title: 'Introduction to React',
  description: 'Learn React basics',
  video_url: 'https://example.com/video.mp4',
  duration_seconds: 600,
  transcript: 'This is a test transcript...',
  transcript_processed: true,
};

export const mockChatMessage = {
  id: 'test-message-id',
  session_id: 'test-session-id',
  role: 'assistant',
  content: 'This is a test response',
  video_references: [
    {
      video_id: 'test-video-id',
      title: 'Introduction to React',
      timestamp: 120,
      relevance_score: 0.95,
    },
  ],
};

// Wait for async operations
export const waitFor = (ms: number) =>
  new Promise((resolve) => setTimeout(resolve, ms));

// Mock Claude API response
export const mockClaudeResponse = (content: string) => ({
  id: 'msg_test',
  type: 'message',
  role: 'assistant',
  content: [{ type: 'text', text: content }],
  model: 'claude-3-5-sonnet-20241022',
  stop_reason: 'end_turn',
  usage: { input_tokens: 10, output_tokens: 50 },
});

// Mock OpenAI embedding
export const mockEmbedding = new Array(1536).fill(0.1);

// Mock Whop webhook signature
export const generateWhopSignature = (payload: string, secret: string) => {
  // This is a simplified version - real implementation would use crypto
  return Buffer.from(`${payload}${secret}`).toString('base64');
};
