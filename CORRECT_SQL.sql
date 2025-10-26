-- ============================================================================
-- CORRECT SQL - MATCHES YOUR TYPESCRIPT CODE
-- Run this in Supabase Dashboard → SQL Editor
-- ============================================================================

-- STEP 1: Add creator_id to video_chunks
ALTER TABLE video_chunks
ADD COLUMN IF NOT EXISTS creator_id UUID REFERENCES creators(id) ON DELETE CASCADE;

UPDATE video_chunks
SET creator_id = v.creator_id
FROM videos v
WHERE video_chunks.video_id = v.id
AND video_chunks.creator_id IS NULL;

-- STEP 2: Create chat_usage table (using user_id to match TypeScript code)
CREATE TABLE IF NOT EXISTS chat_usage (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id TEXT NOT NULL UNIQUE,  -- Matches TypeScript: .eq('user_id', userId)
  tier TEXT NOT NULL DEFAULT 'FREE',
  questions_asked INTEGER DEFAULT 0,
  questions_limit INTEGER DEFAULT 3,
  daily_questions INTEGER DEFAULT 0,
  daily_reset_at TIMESTAMPTZ DEFAULT NOW(),
  last_question_at TIMESTAMPTZ,
  upgraded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- STEP 3: Create creator_storage table
CREATE TABLE IF NOT EXISTS creator_storage (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  creator_id UUID REFERENCES creators(id) ON DELETE CASCADE UNIQUE,
  storage_used_bytes BIGINT DEFAULT 0,
  storage_limit_bytes BIGINT DEFAULT 5368709120,
  video_count INTEGER DEFAULT 0,
  max_video_count INTEGER DEFAULT 10,
  tier TEXT NOT NULL DEFAULT 'FREE',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- STEP 4: Create tier_configurations table
CREATE TABLE IF NOT EXISTS tier_configurations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tier_name TEXT UNIQUE NOT NULL,
  storage_limit_gb INTEGER NOT NULL,
  max_videos INTEGER,
  daily_chat_limit INTEGER,
  price_monthly DECIMAL(10, 2) NOT NULL,
  features JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO tier_configurations (tier_name, storage_limit_gb, max_videos, daily_chat_limit, price_monthly, features) VALUES
  ('FREE', 5, 10, 3, 0, '{"chat_questions_total": 3}'),
  ('BASIC', 25, 50, 100, 29, '{"analytics": true}'),
  ('PRO', 100, 200, 500, 79, '{"analytics": true, "discord_bot": true}'),
  ('ENTERPRISE', 500, NULL, NULL, 299, '{"analytics": true, "discord_bot": true, "custom_branding": true}')
ON CONFLICT (tier_name) DO NOTHING;

-- STEP 5: Enable RLS
ALTER TABLE chat_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE creator_storage ENABLE ROW LEVEL SECURITY;
ALTER TABLE tier_configurations ENABLE ROW LEVEL SECURITY;

-- Allow service role full access (for API routes)
DROP POLICY IF EXISTS "Service role can manage chat_usage" ON chat_usage;
CREATE POLICY "Service role can manage chat_usage" ON chat_usage
  FOR ALL TO service_role USING (true);

DROP POLICY IF EXISTS "Service role can manage creator_storage" ON creator_storage;
CREATE POLICY "Service role can manage creator_storage" ON creator_storage
  FOR ALL TO service_role USING (true);

DROP POLICY IF EXISTS "Public can view tiers" ON tier_configurations;
CREATE POLICY "Public can view tiers" ON tier_configurations
  FOR SELECT USING (is_active = true);

-- STEP 6: Create indexes
CREATE INDEX IF NOT EXISTS idx_chat_usage_user_id ON chat_usage(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_usage_tier ON chat_usage(tier);
CREATE INDEX IF NOT EXISTS idx_creator_storage_creator_id ON creator_storage(creator_id);

-- STEP 7: Verification
SELECT 'Setup Complete! ✅' as status;
SELECT '' as space;
SELECT 'Tables created:' as info;
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('chat_usage', 'creator_storage', 'tier_configurations')
ORDER BY table_name;

SELECT '' as space;
SELECT 'Tier configurations:' as info;
SELECT tier_name, daily_chat_limit as chat_limit, price_monthly as price
FROM tier_configurations
ORDER BY price_monthly;

SELECT '' as space;
SELECT 'Chat usage table columns:' as info;
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'chat_usage'
ORDER BY ordinal_position;