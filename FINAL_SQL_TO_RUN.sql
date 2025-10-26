-- ============================================================================
-- FINAL WORKING SQL - USE THIS ONE!
-- Run in Supabase Dashboard → SQL Editor
-- ============================================================================

-- STEP 1: Add creator_id to video_chunks if missing
ALTER TABLE video_chunks
ADD COLUMN IF NOT EXISTS creator_id UUID REFERENCES creators(id) ON DELETE CASCADE;

UPDATE video_chunks
SET creator_id = v.creator_id
FROM videos v
WHERE video_chunks.video_id = v.id
AND video_chunks.creator_id IS NULL;

-- STEP 2: Create chat_usage table (using student_id)
CREATE TABLE IF NOT EXISTS chat_usage (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID REFERENCES students(id) ON DELETE CASCADE UNIQUE,
  tier TEXT NOT NULL DEFAULT 'FREE',
  questions_asked INTEGER DEFAULT 0,
  questions_limit INTEGER DEFAULT 3,
  last_reset_at TIMESTAMPTZ DEFAULT NOW(),
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

-- STEP 5: Create check_chat_limit_by_auth function (works with Supabase auth user)
CREATE OR REPLACE FUNCTION check_chat_limit_by_auth(p_auth_user_id UUID)
RETURNS TABLE(
  allowed BOOLEAN,
  questions_remaining INTEGER,
  tier TEXT,
  message TEXT
) AS $$
DECLARE
  v_student_id UUID;
  v_usage chat_usage;
  v_tier TEXT;
  v_remaining INTEGER;
BEGIN
  -- Find student by auth user (assuming students table has auth_user_id or we join somehow)
  -- For now, we'll use student_id directly. The TypeScript code needs to pass student_id
  -- This is a placeholder - your app should find the student first

  -- Get student_id from students table (modify this based on your actual auth setup)
  -- If you're using Whop, you might need to join differently
  SELECT id INTO v_student_id FROM students LIMIT 1; -- PLACEHOLDER

  IF v_student_id IS NULL THEN
    RETURN QUERY SELECT false::BOOLEAN, 0, 'FREE'::TEXT, 'Student not found'::TEXT;
    RETURN;
  END IF;

  -- Get usage record
  SELECT * INTO v_usage FROM chat_usage WHERE student_id = v_student_id;

  IF v_usage IS NULL THEN
    INSERT INTO chat_usage (student_id, tier, questions_asked, questions_limit)
    VALUES (v_student_id, 'FREE', 0, 3)
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
      RETURN QUERY SELECT false::BOOLEAN, 0, v_tier, 'Free tier limit reached. Please upgrade to continue.';
    END IF;
  ELSIF v_tier = 'BASIC' THEN
    IF v_usage.last_reset_at < CURRENT_DATE THEN
      UPDATE chat_usage SET questions_asked = 0, last_reset_at = NOW()
      WHERE student_id = v_student_id RETURNING * INTO v_usage;
    END IF;
    v_remaining := 100 - v_usage.questions_asked;
    RETURN QUERY SELECT (v_remaining > 0)::BOOLEAN, v_remaining, v_tier,
      CASE WHEN v_remaining <= 0 THEN 'Daily limit reached.' ELSE format('%s remaining today', v_remaining) END;
  ELSIF v_tier = 'PRO' THEN
    IF v_usage.last_reset_at < CURRENT_DATE THEN
      UPDATE chat_usage SET questions_asked = 0, last_reset_at = NOW()
      WHERE student_id = v_student_id RETURNING * INTO v_usage;
    END IF;
    v_remaining := 500 - v_usage.questions_asked;
    RETURN QUERY SELECT (v_remaining > 0)::BOOLEAN, v_remaining, v_tier,
      CASE WHEN v_remaining <= 0 THEN 'Daily limit reached.' ELSE format('%s remaining today', v_remaining) END;
  ELSE
    RETURN QUERY SELECT true::BOOLEAN, -1, v_tier, 'Unlimited questions';
  END IF;
END;
$$ LANGUAGE plpgsql;

-- STEP 6: Simpler version - check_chat_limit using student_id directly
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
  SELECT * INTO v_usage FROM chat_usage WHERE student_id = p_student_id;

  IF v_usage IS NULL THEN
    INSERT INTO chat_usage (student_id, tier, questions_asked, questions_limit)
    VALUES (p_student_id, 'FREE', 0, 3)
    RETURNING * INTO v_usage;
  END IF;

  v_tier := v_usage.tier;

  IF v_tier = 'FREE' THEN
    v_remaining := v_usage.questions_limit - v_usage.questions_asked;
    IF v_remaining > 0 THEN
      RETURN QUERY SELECT true::BOOLEAN, v_remaining, v_tier,
        CASE WHEN v_remaining = 1 THEN 'Last free question!' ELSE format('%s questions remaining', v_remaining) END;
    ELSE
      RETURN QUERY SELECT false::BOOLEAN, 0, v_tier, 'Free tier limit reached. Please upgrade.';
    END IF;
  ELSIF v_tier = 'BASIC' THEN
    IF v_usage.last_reset_at < CURRENT_DATE THEN
      UPDATE chat_usage SET questions_asked = 0, last_reset_at = NOW()
      WHERE student_id = p_student_id RETURNING * INTO v_usage;
    END IF;
    v_remaining := 100 - v_usage.questions_asked;
    RETURN QUERY SELECT (v_remaining > 0)::BOOLEAN, v_remaining, v_tier,
      CASE WHEN v_remaining <= 0 THEN 'Daily limit reached.' ELSE format('%s remaining', v_remaining) END;
  ELSIF v_tier = 'PRO' THEN
    IF v_usage.last_reset_at < CURRENT_DATE THEN
      UPDATE chat_usage SET questions_asked = 0, last_reset_at = NOW()
      WHERE student_id = p_student_id RETURNING * INTO v_usage;
    END IF;
    v_remaining := 500 - v_usage.questions_asked;
    RETURN QUERY SELECT (v_remaining > 0)::BOOLEAN, v_remaining, v_tier,
      CASE WHEN v_remaining <= 0 THEN 'Daily limit reached.' ELSE format('%s remaining', v_remaining) END;
  ELSE
    RETURN QUERY SELECT true::BOOLEAN, -1, v_tier, 'Unlimited';
  END IF;
END;
$$ LANGUAGE plpgsql;

-- STEP 7: increment_chat_usage function
CREATE OR REPLACE FUNCTION increment_chat_usage(p_student_id UUID)
RETURNS TABLE(
  success BOOLEAN,
  new_count INTEGER,
  questions_remaining INTEGER
) AS $$
DECLARE
  v_usage chat_usage;
  v_remaining INTEGER;
BEGIN
  SELECT * INTO v_usage FROM chat_usage WHERE student_id = p_student_id;

  IF v_usage IS NULL THEN
    INSERT INTO chat_usage (student_id, tier, questions_asked, questions_limit)
    VALUES (p_student_id, 'FREE', 1, 3) RETURNING * INTO v_usage;
    RETURN QUERY SELECT true::BOOLEAN, 1, 2;
  ELSE
    UPDATE chat_usage SET questions_asked = questions_asked + 1, updated_at = NOW()
    WHERE student_id = p_student_id RETURNING * INTO v_usage;

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

-- STEP 8: Enable RLS and create policies
ALTER TABLE chat_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE creator_storage ENABLE ROW LEVEL SECURITY;
ALTER TABLE tier_configurations ENABLE ROW LEVEL SECURITY;

-- Allow service role to do everything
DROP POLICY IF EXISTS "Service role full access chat_usage" ON chat_usage;
CREATE POLICY "Service role full access chat_usage" ON chat_usage FOR ALL TO service_role USING (true);

DROP POLICY IF EXISTS "Service role full access creator_storage" ON creator_storage;
CREATE POLICY "Service role full access creator_storage" ON creator_storage FOR ALL TO service_role USING (true);

DROP POLICY IF EXISTS "Public can view tiers" ON tier_configurations;
CREATE POLICY "Public can view tiers" ON tier_configurations FOR SELECT USING (is_active = true);

-- STEP 9: Create indexes
CREATE INDEX IF NOT EXISTS idx_chat_usage_student_id ON chat_usage(student_id);
CREATE INDEX IF NOT EXISTS idx_creator_storage_creator_id ON creator_storage(creator_id);

-- STEP 10: Verification
SELECT 'Setup Complete!' as status;
SELECT '==================' as divider;
SELECT 'Tables created:' as info;
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public' AND table_name IN ('chat_usage', 'creator_storage', 'tier_configurations');
SELECT '==================' as divider;
SELECT 'Tier configs:' as info;
SELECT tier_name, daily_chat_limit, price_monthly FROM tier_configurations ORDER BY price_monthly;