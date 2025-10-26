-- ============================================================================
-- FIXED SQL FOR WHOP INTEGRATION
-- RUN THIS IN YOUR SUPABASE DASHBOARD
-- Go to: Supabase Dashboard → SQL Editor → New Query
-- ============================================================================

-- STEP 1: Add missing creator_id column to video_chunks
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

-- Chat usage tracking table (using student_id instead of auth.users)
CREATE TABLE IF NOT EXISTS chat_usage (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID REFERENCES students(id) ON DELETE CASCADE UNIQUE,
  whop_user_id VARCHAR(255) NOT NULL,
  tier TEXT NOT NULL DEFAULT 'FREE',
  questions_asked INTEGER DEFAULT 0,
  questions_limit INTEGER DEFAULT 3,
  last_reset_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Creator storage tracking table
CREATE TABLE IF NOT EXISTS creator_storage (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  creator_id UUID REFERENCES creators(id) ON DELETE CASCADE UNIQUE,
  whop_company_id VARCHAR(255) NOT NULL,
  storage_used_bytes BIGINT DEFAULT 0,
  storage_limit_bytes BIGINT DEFAULT 5368709120, -- 5GB
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

-- Function to check if student can ask more questions
CREATE OR REPLACE FUNCTION check_chat_limit(p_student_id UUID)
RETURNS TABLE(
  allowed BOOLEAN,
  questions_remaining INTEGER,
  tier TEXT,
  message TEXT
) AS $$
DECLARE
  v_usage chat_usage;
  v_tier TEXT;
  v_remaining INTEGER;
BEGIN
  -- Get or create usage record
  SELECT * INTO v_usage FROM chat_usage WHERE student_id = p_student_id;

  IF v_usage IS NULL THEN
    -- Get student's whop_user_id
    DECLARE
      v_whop_user_id VARCHAR(255);
    BEGIN
      SELECT whop_user_id INTO v_whop_user_id FROM students WHERE id = p_student_id;

      -- Create new usage record for FREE tier
      INSERT INTO chat_usage (student_id, whop_user_id, tier, questions_asked, questions_limit)
      VALUES (p_student_id, v_whop_user_id, 'FREE', 0, 3)
      RETURNING * INTO v_usage;
    END;
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
      UPDATE chat_usage
      SET questions_asked = 0, last_reset_at = NOW()
      WHERE student_id = p_student_id
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
      WHERE student_id = p_student_id
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
      -1,
      v_tier,
      'Unlimited questions';
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Function to increment chat usage
CREATE OR REPLACE FUNCTION increment_chat_usage(p_student_id UUID)
RETURNS TABLE(
  success BOOLEAN,
  new_count INTEGER,
  questions_remaining INTEGER
) AS $$
DECLARE
  v_usage chat_usage;
  v_remaining INTEGER;
  v_whop_user_id VARCHAR(255);
BEGIN
  -- Get existing usage
  SELECT * INTO v_usage FROM chat_usage WHERE student_id = p_student_id;

  IF v_usage IS NULL THEN
    -- Get student's whop_user_id
    SELECT whop_user_id INTO v_whop_user_id FROM students WHERE id = p_student_id;

    -- Create new usage record
    INSERT INTO chat_usage (student_id, whop_user_id, tier, questions_asked, questions_limit)
    VALUES (p_student_id, v_whop_user_id, 'FREE', 1, 3)
    RETURNING * INTO v_usage;

    RETURN QUERY SELECT true::BOOLEAN, 1, 2;
  ELSE
    -- Increment usage
    UPDATE chat_usage
    SET questions_asked = questions_asked + 1, updated_at = NOW()
    WHERE student_id = p_student_id
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

    RETURN QUERY SELECT true::BOOLEAN, v_usage.questions_asked, v_remaining;
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
  v_whop_company_id VARCHAR(255);
BEGIN
  SELECT * INTO v_storage FROM creator_storage WHERE creator_id = p_creator_id;

  IF v_storage IS NULL THEN
    -- Get creator's whop_company_id
    SELECT whop_company_id INTO v_whop_company_id FROM creators WHERE id = p_creator_id;

    -- Create default FREE tier storage
    INSERT INTO creator_storage (creator_id, whop_company_id, tier, storage_limit_bytes)
    VALUES (p_creator_id, v_whop_company_id, 'FREE', 5368709120)
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
  p_size_change BIGINT,
  p_video_count_change INTEGER DEFAULT 0
)
RETURNS creator_storage AS $$
DECLARE
  v_storage creator_storage;
  v_whop_company_id VARCHAR(255);
BEGIN
  SELECT * INTO v_storage FROM creator_storage WHERE creator_id = p_creator_id;

  IF v_storage IS NULL THEN
    SELECT whop_company_id INTO v_whop_company_id FROM creators WHERE id = p_creator_id;

    INSERT INTO creator_storage (creator_id, whop_company_id, tier)
    VALUES (p_creator_id, v_whop_company_id, 'FREE')
    RETURNING * INTO v_storage;
  END IF;

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

ALTER TABLE chat_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE creator_storage ENABLE ROW LEVEL SECURITY;
ALTER TABLE tier_configurations ENABLE ROW LEVEL SECURITY;

-- Chat usage policies (students can view their own)
CREATE POLICY "Students can view own chat usage" ON chat_usage
  FOR SELECT USING (
    student_id IN (SELECT id FROM students WHERE whop_user_id = current_setting('request.jwt.claims', true)::json->>'whop_user_id')
  );

CREATE POLICY "Service role can manage chat usage" ON chat_usage
  FOR ALL USING (true);

-- Creator storage policies
CREATE POLICY "Creators can view own storage" ON creator_storage
  FOR SELECT USING (
    creator_id IN (
      SELECT id FROM creators WHERE whop_company_id = current_setting('request.jwt.claims', true)::json->>'whop_company_id'
    )
  );

CREATE POLICY "Service role can manage creator storage" ON creator_storage
  FOR ALL USING (true);

-- Tier configurations are public read
CREATE POLICY "Everyone can view tier configurations" ON tier_configurations
  FOR SELECT USING (is_active = true);

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_chat_usage_student_id ON chat_usage(student_id);
CREATE INDEX IF NOT EXISTS idx_chat_usage_whop_user_id ON chat_usage(whop_user_id);
CREATE INDEX IF NOT EXISTS idx_creator_storage_creator_id ON creator_storage(creator_id);
CREATE INDEX IF NOT EXISTS idx_creator_storage_whop_company_id ON creator_storage(whop_company_id);
CREATE INDEX IF NOT EXISTS idx_tier_configurations_tier_name ON tier_configurations(tier_name);

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

SELECT 'Tables Created:' as status;
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('chat_usage', 'creator_storage', 'tier_configurations');

SELECT 'Functions Created:' as status;
SELECT routine_name FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name IN ('check_chat_limit', 'increment_chat_usage', 'check_storage_limit', 'update_storage_usage');

SELECT 'Tier Configurations:' as status;
SELECT tier_name, storage_limit_gb, daily_chat_limit, price_monthly
FROM tier_configurations
ORDER BY price_monthly;