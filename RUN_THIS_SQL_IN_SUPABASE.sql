-- ============================================================================
-- RUN THIS SQL IN YOUR SUPABASE DASHBOARD
-- Go to: Supabase Dashboard → SQL Editor → New Query
-- Paste this entire file and click "Run"
-- ============================================================================

-- STEP 1: Add missing creator_id column to video_chunks
-- (Skip if it already exists)
ALTER TABLE video_chunks
ADD COLUMN IF NOT EXISTS creator_id UUID REFERENCES creators(id) ON DELETE CASCADE;

-- Update existing chunks to have creator_id from their videos
UPDATE video_chunks
SET creator_id = v.creator_id
FROM videos v
WHERE video_chunks.video_id = v.id
AND video_chunks.creator_id IS NULL;

-- ============================================================================
-- STEP 2: CREATE CHAT LIMITS FOR FREE TIER
-- ============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Chat usage tracking table
CREATE TABLE IF NOT EXISTS chat_usage (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  student_id UUID REFERENCES students(id) ON DELETE CASCADE,
  creator_id UUID REFERENCES creators(id) ON DELETE CASCADE,
  tier TEXT NOT NULL DEFAULT 'FREE',
  questions_asked INTEGER DEFAULT 0,
  questions_limit INTEGER DEFAULT 3,
  last_reset_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Creator storage tracking table
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

-- Tier configuration table
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

-- Insert tier configurations
INSERT INTO tier_configurations (tier_name, storage_limit_gb, max_videos, daily_chat_limit, price_monthly, features) VALUES
  ('FREE', 5, 10, 3, 0, '{"chat_questions_total": 3, "support": "community", "analytics": false}'),
  ('BASIC', 25, 50, 100, 29, '{"support": "email", "analytics": true, "quiz_generation": true}'),
  ('PRO', 100, 200, 500, 79, '{"support": "priority", "analytics": true, "quiz_generation": true, "discord_bot": true}'),
  ('ENTERPRISE', 500, NULL, NULL, 299, '{"support": "dedicated", "analytics": true, "quiz_generation": true, "discord_bot": true, "custom_branding": true}')
ON CONFLICT (tier_name) DO NOTHING;

-- ============================================================================
-- CRITICAL FUNCTIONS FOR FREE TIER LIMITS
-- ============================================================================

-- Function to check if user can ask more questions
CREATE OR REPLACE FUNCTION check_chat_limit(p_user_id UUID)
RETURNS TABLE(
  allowed BOOLEAN,
  questions_remaining INTEGER,
  tier TEXT,
  message TEXT
) AS $$
DECLARE
  v_usage chat_usage;
  v_tier TEXT;
  v_limit INTEGER;
  v_remaining INTEGER;
BEGIN
  SELECT * INTO v_usage FROM chat_usage WHERE user_id = p_user_id;

  IF v_usage IS NULL THEN
    INSERT INTO chat_usage (user_id, tier, questions_asked, questions_limit)
    VALUES (p_user_id, 'FREE', 0, 3)
    RETURNING * INTO v_usage;
  END IF;

  v_tier := v_usage.tier;

  IF v_tier = 'FREE' THEN
    v_remaining := v_usage.questions_limit - v_usage.questions_asked;
    IF v_remaining > 0 THEN
      RETURN QUERY SELECT
        true::BOOLEAN,
        v_remaining,
        v_tier,
        CASE
          WHEN v_remaining = 1 THEN 'Last free question! Upgrade to continue.'
          ELSE format('%s questions remaining', v_remaining)
        END;
    ELSE
      RETURN QUERY SELECT
        false::BOOLEAN,
        0,
        v_tier,
        'Free tier limit reached. Please upgrade to continue.';
    END IF;
  ELSIF v_tier = 'BASIC' THEN
    IF v_usage.last_reset_at < CURRENT_DATE THEN
      UPDATE chat_usage
      SET questions_asked = 0, last_reset_at = NOW()
      WHERE user_id = p_user_id
      RETURNING * INTO v_usage;
    END IF;
    v_remaining := 100 - v_usage.questions_asked;
    RETURN QUERY SELECT
      (v_remaining > 0)::BOOLEAN,
      v_remaining,
      v_tier,
      CASE
        WHEN v_remaining <= 0 THEN 'Daily limit reached. Resets tomorrow.'
        ELSE format('%s questions remaining today', v_remaining)
      END;
  ELSIF v_tier = 'PRO' THEN
    IF v_usage.last_reset_at < CURRENT_DATE THEN
      UPDATE chat_usage
      SET questions_asked = 0, last_reset_at = NOW()
      WHERE user_id = p_user_id
      RETURNING * INTO v_usage;
    END IF;
    v_remaining := 500 - v_usage.questions_asked;
    RETURN QUERY SELECT
      (v_remaining > 0)::BOOLEAN,
      v_remaining,
      v_tier,
      CASE
        WHEN v_remaining <= 0 THEN 'Daily limit reached. Resets tomorrow.'
        ELSE format('%s questions remaining today', v_remaining)
      END;
  ELSE
    RETURN QUERY SELECT
      true::BOOLEAN,
      -1,
      v_tier,
      'Unlimited questions';
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Function to increment chat usage
CREATE OR REPLACE FUNCTION increment_chat_usage(p_user_id UUID)
RETURNS TABLE(
  success BOOLEAN,
  new_count INTEGER,
  questions_remaining INTEGER
) AS $$
DECLARE
  v_usage chat_usage;
  v_remaining INTEGER;
BEGIN
  SELECT * INTO v_usage FROM chat_usage WHERE user_id = p_user_id;

  IF v_usage IS NULL THEN
    INSERT INTO chat_usage (user_id, tier, questions_asked, questions_limit)
    VALUES (p_user_id, 'FREE', 1, 3)
    RETURNING * INTO v_usage;
    RETURN QUERY SELECT true::BOOLEAN, 1, 2;
  ELSE
    UPDATE chat_usage
    SET questions_asked = questions_asked + 1, updated_at = NOW()
    WHERE user_id = p_user_id
    RETURNING * INTO v_usage;

    IF v_usage.tier = 'FREE' THEN
      v_remaining := v_usage.questions_limit - v_usage.questions_asked;
    ELSIF v_usage.tier = 'BASIC' THEN
      v_remaining := 100 - v_usage.questions_asked;
    ELSIF v_usage.tier = 'PRO' THEN
      v_remaining := 500 - v_usage.questions_asked;
    ELSE
      v_remaining := -1;
    END IF;

    RETURN QUERY SELECT true::BOOLEAN, v_usage.questions_asked, v_remaining;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- ENABLE ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE chat_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE creator_storage ENABLE ROW LEVEL SECURITY;
ALTER TABLE tier_configurations ENABLE ROW LEVEL SECURITY;

-- Chat usage policies
CREATE POLICY "Users can view own chat usage" ON chat_usage
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can manage chat usage" ON chat_usage
  FOR ALL USING (true);

-- Creator storage policies
CREATE POLICY "Creators can view own storage" ON creator_storage
  FOR SELECT USING (
    creator_id IN (
      SELECT id FROM creators WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "System can manage creator storage" ON creator_storage
  FOR ALL USING (true);

-- Tier configurations are public read
CREATE POLICY "Everyone can view tier configurations" ON tier_configurations
  FOR SELECT USING (is_active = true);

-- ============================================================================
-- CREATE INDEXES FOR PERFORMANCE
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_chat_usage_user_id ON chat_usage(user_id);
CREATE INDEX IF NOT EXISTS idx_creator_storage_creator_id ON creator_storage(creator_id);
CREATE INDEX IF NOT EXISTS idx_tier_configurations_tier_name ON tier_configurations(tier_name);

-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================

GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT, INSERT, UPDATE ON chat_usage TO authenticated;
GRANT SELECT, INSERT, UPDATE ON creator_storage TO authenticated;
GRANT SELECT ON tier_configurations TO authenticated;
GRANT EXECUTE ON FUNCTION check_chat_limit TO authenticated;
GRANT EXECUTE ON FUNCTION increment_chat_usage TO authenticated;

-- ============================================================================
-- VERIFICATION QUERIES (Run these to check if everything worked)
-- ============================================================================

-- Check tables were created
SELECT 'Tables Created:' as status;
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('chat_usage', 'creator_storage', 'tier_configurations');

-- Check functions were created
SELECT 'Functions Created:' as status;
SELECT routine_name FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name IN ('check_chat_limit', 'increment_chat_usage');

-- Check tier configurations
SELECT 'Tier Configurations:' as status;
SELECT tier_name, storage_limit_gb, daily_chat_limit, price_monthly
FROM tier_configurations
ORDER BY price_monthly;

-- Test the chat limit function (replace with a real user_id if you want to test)
-- SELECT * FROM check_chat_limit('00000000-0000-0000-0000-000000000000'::uuid);