-- ============================================================================
-- CHAT LIMITS FOR FREE TIER (Safe Version)
-- Only creates what's needed for the 3-question FREE tier limit
-- ============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- CHAT USAGE TRACKING (For FREE tier limits)
-- ============================================================================

CREATE TABLE IF NOT EXISTS chat_usage (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  student_id UUID REFERENCES students(id) ON DELETE CASCADE,
  creator_id UUID REFERENCES creators(id) ON DELETE CASCADE,

  -- Tier and limits
  tier TEXT NOT NULL DEFAULT 'FREE',
  questions_asked INTEGER DEFAULT 0,
  questions_limit INTEGER DEFAULT 3, -- FREE: 3 total questions
  last_reset_at TIMESTAMPTZ DEFAULT NOW(),

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(user_id)
);

-- ============================================================================
-- CREATOR STORAGE TRACKING
-- ============================================================================

CREATE TABLE IF NOT EXISTS creator_storage (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  creator_id UUID REFERENCES creators(id) ON DELETE CASCADE UNIQUE,

  -- Storage metrics
  storage_used_bytes BIGINT DEFAULT 0,
  storage_limit_bytes BIGINT DEFAULT 5368709120, -- 5GB for FREE
  video_count INTEGER DEFAULT 0,
  max_video_count INTEGER DEFAULT 10, -- FREE: 10 videos

  -- Tier info
  tier TEXT NOT NULL DEFAULT 'FREE',

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- TIER CONFIGURATION TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS tier_configurations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tier_name TEXT UNIQUE NOT NULL,

  -- Limits
  storage_limit_gb INTEGER NOT NULL,
  max_videos INTEGER,
  daily_chat_limit INTEGER, -- NULL for unlimited

  -- Pricing
  price_monthly DECIMAL(10, 2) NOT NULL,

  -- Features (as JSONB for flexibility)
  features JSONB DEFAULT '{}',

  -- Active flag
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
-- FUNCTIONS FOR CHECKING LIMITS
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
  -- Get or create usage record
  SELECT * INTO v_usage FROM chat_usage WHERE user_id = p_user_id;

  IF v_usage IS NULL THEN
    -- Create new usage record for FREE tier
    INSERT INTO chat_usage (user_id, tier, questions_asked, questions_limit)
    VALUES (p_user_id, 'FREE', 0, 3)
    RETURNING * INTO v_usage;
  END IF;

  v_tier := v_usage.tier;

  -- Check limits based on tier
  IF v_tier = 'FREE' THEN
    -- FREE tier: 3 total questions (never resets)
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
    -- BASIC: 100 per day (resets daily)
    IF v_usage.last_reset_at < CURRENT_DATE THEN
      -- Reset daily counter
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
    -- PRO: 500 per day
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
    -- ENTERPRISE: unlimited
    RETURN QUERY SELECT
      true::BOOLEAN,
      -1, -- Unlimited
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
  -- Get existing usage
  SELECT * INTO v_usage FROM chat_usage WHERE user_id = p_user_id;

  IF v_usage IS NULL THEN
    -- Create new usage record
    INSERT INTO chat_usage (user_id, tier, questions_asked, questions_limit)
    VALUES (p_user_id, 'FREE', 1, 3)
    RETURNING * INTO v_usage;

    RETURN QUERY SELECT
      true::BOOLEAN,
      1,
      2; -- 2 remaining
  ELSE
    -- Increment usage
    UPDATE chat_usage
    SET
      questions_asked = questions_asked + 1,
      updated_at = NOW()
    WHERE user_id = p_user_id
    RETURNING * INTO v_usage;

    -- Calculate remaining based on tier
    IF v_usage.tier = 'FREE' THEN
      v_remaining := v_usage.questions_limit - v_usage.questions_asked;
    ELSIF v_usage.tier = 'BASIC' THEN
      v_remaining := 100 - v_usage.questions_asked;
    ELSIF v_usage.tier = 'PRO' THEN
      v_remaining := 500 - v_usage.questions_asked;
    ELSE
      v_remaining := -1; -- Unlimited
    END IF;

    RETURN QUERY SELECT
      true::BOOLEAN,
      v_usage.questions_asked,
      v_remaining;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- STORAGE LIMIT FUNCTIONS
-- ============================================================================

-- Function to check storage limits
CREATE OR REPLACE FUNCTION check_storage_limit(p_creator_id UUID, p_size_bytes BIGINT)
RETURNS TABLE(
  allowed BOOLEAN,
  current_usage_bytes BIGINT,
  limit_bytes BIGINT,
  message TEXT
) AS $$
DECLARE
  v_storage creator_storage;
BEGIN
  SELECT * INTO v_storage FROM creator_storage WHERE creator_id = p_creator_id;

  IF v_storage IS NULL THEN
    -- Create default FREE tier storage
    INSERT INTO creator_storage (creator_id, tier, storage_limit_bytes)
    VALUES (p_creator_id, 'FREE', 5368709120) -- 5GB
    RETURNING * INTO v_storage;
  END IF;

  IF (v_storage.storage_used_bytes + p_size_bytes) > v_storage.storage_limit_bytes THEN
    RETURN QUERY SELECT
      false::BOOLEAN,
      v_storage.storage_used_bytes,
      v_storage.storage_limit_bytes,
      format('Storage limit exceeded. Used: %s, Limit: %s',
        pg_size_pretty(v_storage.storage_used_bytes),
        pg_size_pretty(v_storage.storage_limit_bytes));
  ELSE
    RETURN QUERY SELECT
      true::BOOLEAN,
      v_storage.storage_used_bytes,
      v_storage.storage_limit_bytes,
      format('Storage available: %s of %s',
        pg_size_pretty(v_storage.storage_limit_bytes - v_storage.storage_used_bytes),
        pg_size_pretty(v_storage.storage_limit_bytes));
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Function to update storage usage
CREATE OR REPLACE FUNCTION update_storage_usage(
  p_creator_id UUID,
  p_size_change BIGINT, -- Can be negative for deletions
  p_video_count_change INTEGER DEFAULT 0
)
RETURNS creator_storage AS $$
DECLARE
  v_storage creator_storage;
BEGIN
  -- Get or create storage record
  SELECT * INTO v_storage FROM creator_storage WHERE creator_id = p_creator_id;

  IF v_storage IS NULL THEN
    INSERT INTO creator_storage (creator_id, tier)
    VALUES (p_creator_id, 'FREE')
    RETURNING * INTO v_storage;
  END IF;

  -- Update usage
  UPDATE creator_storage
  SET
    storage_used_bytes = GREATEST(0, storage_used_bytes + p_size_change),
    video_count = GREATEST(0, video_count + p_video_count_change),
    updated_at = NOW()
  WHERE creator_id = p_creator_id
  RETURNING * INTO v_storage;

  RETURN v_storage;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

-- Enable RLS on new tables
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
-- INDEXES FOR PERFORMANCE
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
GRANT EXECUTE ON FUNCTION check_storage_limit TO authenticated;
GRANT EXECUTE ON FUNCTION update_storage_usage TO authenticated;