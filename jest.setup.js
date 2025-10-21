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
