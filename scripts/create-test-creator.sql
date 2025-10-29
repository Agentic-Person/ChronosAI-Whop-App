-- Create a test creator for development
-- Run this in your Supabase SQL Editor

INSERT INTO creators (
  id,
  whop_company_id,
  whop_user_id,
  company_name,
  subscription_tier
) VALUES (
  '00000000-0000-0000-0000-000000000001',
  'dev-test-company',
  'dev-test-user',
  'Test Creator (Dev)',
  'pro'
) ON CONFLICT (id) DO NOTHING;
