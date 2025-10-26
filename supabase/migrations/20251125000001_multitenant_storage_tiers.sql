-- ============================================================================
-- MULTI-TENANT STORAGE & TIER LIMITS
-- Description: Complete multi-tenant setup with FREE tier limits
-- Date: 2025-11-25
-- ============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";

-- ============================================================================
-- TIER DEFINITIONS
-- ============================================================================

-- Update creators table with tier limits
ALTER TABLE creators
ADD COLUMN IF NOT EXISTS membership_tier TEXT DEFAULT 'FREE'
  CHECK (membership_tier IN ('FREE', 'BASIC', 'PRO', 'ENTERPRISE'));

ALTER TABLE creators
ADD COLUMN IF NOT EXISTS storage_used_bytes BIGINT DEFAULT 0,
ADD COLUMN IF NOT EXISTS storage_limit_bytes BIGINT DEFAULT 5368709120, -- 5GB default for FREE
ADD COLUMN IF NOT EXISTS video_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS max_video_count INTEGER DEFAULT 10; -- FREE tier: 10 videos max

-- Update students table with tier tracking
ALTER TABLE students
ADD COLUMN IF NOT EXISTS membership_tier TEXT DEFAULT 'FREE'
  CHECK (membership_tier IN ('FREE', 'BASIC', 'PRO', 'ENTERPRISE'));

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
  questions_limit INTEGER DEFAULT 3, -- FREE: 3, BASIC: 100, PRO: 500, ENTERPRISE: NULL (unlimited)

  -- Reset tracking
  daily_questions INTEGER DEFAULT 0,
  daily_reset_at TIMESTAMPTZ DEFAULT CURRENT_DATE + INTERVAL '1 day',

  -- Subscription tracking
  upgraded_at TIMESTAMPTZ,
  last_question_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(user_id),
  UNIQUE(student_id)
);

-- Create indexes for fast lookups
CREATE INDEX idx_chat_usage_user ON chat_usage(user_id);
CREATE INDEX idx_chat_usage_student ON chat_usage(student_id);
CREATE INDEX idx_chat_usage_tier ON chat_usage(tier);

-- ============================================================================
-- CREATOR STORAGE TRACKING
-- ============================================================================

CREATE TABLE IF NOT EXISTS creator_storage (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  creator_id UUID REFERENCES creators(id) ON DELETE CASCADE UNIQUE,

  -- Tier-based limits
  tier TEXT NOT NULL DEFAULT 'FREE',
  bytes_used BIGINT DEFAULT 0 CHECK (bytes_used >= 0),
  bytes_limit BIGINT DEFAULT 5368709120, -- 5GB for FREE

  -- Video tracking
  video_count INTEGER DEFAULT 0,
  max_videos INTEGER DEFAULT 10, -- FREE: 10, BASIC: 50, PRO: 200, ENTERPRISE: unlimited

  -- Processing limits
  monthly_processing_minutes INTEGER DEFAULT 0,
  max_processing_minutes INTEGER DEFAULT 60, -- FREE: 60 min/month
  processing_reset_at TIMESTAMPTZ DEFAULT CURRENT_DATE + INTERVAL '1 month',

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_creator_storage_creator ON creator_storage(creator_id);
CREATE INDEX idx_creator_storage_tier ON creator_storage(tier);

-- ============================================================================
-- TIER CONFIGURATION TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS tier_configurations (
  tier TEXT PRIMARY KEY CHECK (tier IN ('FREE', 'BASIC', 'PRO', 'ENTERPRISE')),

  -- Storage limits
  storage_limit_gb INTEGER NOT NULL,
  max_video_count INTEGER, -- NULL means unlimited
  max_video_size_mb INTEGER DEFAULT 500,

  -- Chat limits
  daily_chat_limit INTEGER, -- NULL means unlimited

  -- Processing limits
  monthly_processing_minutes INTEGER, -- NULL means unlimited

  -- Features
  features JSONB DEFAULT '{}',

  -- Pricing
  monthly_price_usd DECIMAL(10, 2),

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert tier configurations
INSERT INTO tier_configurations (tier, storage_limit_gb, max_video_count, daily_chat_limit, monthly_processing_minutes, monthly_price_usd, features) VALUES
('FREE', 5, 10, 3, 60, 0.00, '{"chat": true, "upload": true, "analytics": false, "api": false, "team": false}'),
('BASIC', 25, 50, 100, 300, 29.00, '{"chat": true, "upload": true, "analytics": true, "api": false, "team": false}'),
('PRO', 100, 200, 500, 1000, 79.00, '{"chat": true, "upload": true, "analytics": true, "api": true, "team": false}'),
('ENTERPRISE', 500, NULL, NULL, NULL, 299.00, '{"chat": true, "upload": true, "analytics": true, "api": true, "team": true}')
ON CONFLICT (tier) DO UPDATE SET
  storage_limit_gb = EXCLUDED.storage_limit_gb,
  max_video_count = EXCLUDED.max_video_count,
  daily_chat_limit = EXCLUDED.daily_chat_limit,
  monthly_processing_minutes = EXCLUDED.monthly_processing_minutes,
  monthly_price_usd = EXCLUDED.monthly_price_usd,
  features = EXCLUDED.features;

-- ============================================================================
-- FUNCTIONS FOR TIER ENFORCEMENT
-- ============================================================================

-- Function to check if user can ask more questions
CREATE OR REPLACE FUNCTION check_chat_limit(p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_usage RECORD;
  v_tier_config RECORD;
BEGIN
  -- Get user's usage record
  SELECT * INTO v_usage FROM chat_usage WHERE user_id = p_user_id;

  IF NOT FOUND THEN
    -- Create default FREE tier record
    INSERT INTO chat_usage (user_id, tier) VALUES (p_user_id, 'FREE');
    RETURN TRUE; -- First question is always allowed
  END IF;

  -- Get tier configuration
  SELECT * INTO v_tier_config FROM tier_configurations WHERE tier = v_usage.tier;

  -- Check daily reset
  IF v_usage.daily_reset_at < NOW() THEN
    UPDATE chat_usage
    SET daily_questions = 0,
        daily_reset_at = CURRENT_DATE + INTERVAL '1 day'
    WHERE user_id = p_user_id;
    v_usage.daily_questions := 0;
  END IF;

  -- For FREE tier, check total questions
  IF v_usage.tier = 'FREE' THEN
    RETURN v_usage.questions_asked < v_usage.questions_limit;
  END IF;

  -- For paid tiers, check daily limit
  IF v_tier_config.daily_chat_limit IS NULL THEN
    RETURN TRUE; -- Unlimited
  END IF;

  RETURN v_usage.daily_questions < v_tier_config.daily_chat_limit;
END;
$$ LANGUAGE plpgsql;

-- Function to increment chat usage
CREATE OR REPLACE FUNCTION increment_chat_usage(p_user_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_usage RECORD;
  v_remaining INTEGER;
BEGIN
  -- Update usage
  UPDATE chat_usage
  SET questions_asked = questions_asked + 1,
      daily_questions = daily_questions + 1,
      last_question_at = NOW(),
      updated_at = NOW()
  WHERE user_id = p_user_id
  RETURNING * INTO v_usage;

  -- Calculate remaining questions
  IF v_usage.tier = 'FREE' THEN
    v_remaining := v_usage.questions_limit - v_usage.questions_asked;
  ELSE
    SELECT daily_chat_limit - v_usage.daily_questions
    INTO v_remaining
    FROM tier_configurations
    WHERE tier = v_usage.tier;
  END IF;

  -- Return usage info
  RETURN jsonb_build_object(
    'tier', v_usage.tier,
    'questions_asked', v_usage.questions_asked,
    'remaining', COALESCE(v_remaining, -1), -- -1 means unlimited
    'is_free_tier', v_usage.tier = 'FREE',
    'upgrade_required', v_usage.tier = 'FREE' AND v_usage.questions_asked >= v_usage.questions_limit
  );
END;
$$ LANGUAGE plpgsql;

-- Function to check storage limit
CREATE OR REPLACE FUNCTION check_storage_limit(p_creator_id UUID, p_file_size_bytes BIGINT)
RETURNS BOOLEAN AS $$
DECLARE
  v_storage RECORD;
  v_tier_config RECORD;
  v_limit_bytes BIGINT;
BEGIN
  -- Get creator's storage record
  SELECT * INTO v_storage FROM creator_storage WHERE creator_id = p_creator_id;

  IF NOT FOUND THEN
    -- Create default FREE tier record
    INSERT INTO creator_storage (creator_id, tier) VALUES (p_creator_id, 'FREE');
    SELECT * INTO v_storage FROM creator_storage WHERE creator_id = p_creator_id;
  END IF;

  -- Get tier configuration
  SELECT * INTO v_tier_config FROM tier_configurations WHERE tier = v_storage.tier;

  -- Convert GB to bytes
  v_limit_bytes := v_tier_config.storage_limit_gb::BIGINT * 1024 * 1024 * 1024;

  -- Check if adding this file would exceed limit
  RETURN (v_storage.bytes_used + p_file_size_bytes) <= v_limit_bytes;
END;
$$ LANGUAGE plpgsql;

-- Function to update storage usage
CREATE OR REPLACE FUNCTION update_storage_usage(
  p_creator_id UUID,
  p_bytes_delta BIGINT,
  p_video_count_delta INTEGER DEFAULT 0
)
RETURNS JSONB AS $$
DECLARE
  v_storage RECORD;
  v_tier_config RECORD;
  v_limit_bytes BIGINT;
  v_percentage_used DECIMAL;
BEGIN
  -- Update storage
  UPDATE creator_storage
  SET bytes_used = bytes_used + p_bytes_delta,
      video_count = video_count + p_video_count_delta,
      updated_at = NOW()
  WHERE creator_id = p_creator_id
  RETURNING * INTO v_storage;

  -- Get tier configuration
  SELECT * INTO v_tier_config FROM tier_configurations WHERE tier = v_storage.tier;

  -- Calculate usage percentage
  v_limit_bytes := v_tier_config.storage_limit_gb::BIGINT * 1024 * 1024 * 1024;
  v_percentage_used := (v_storage.bytes_used::DECIMAL / v_limit_bytes) * 100;

  -- Return storage info
  RETURN jsonb_build_object(
    'tier', v_storage.tier,
    'bytes_used', v_storage.bytes_used,
    'bytes_limit', v_limit_bytes,
    'percentage_used', ROUND(v_percentage_used, 2),
    'video_count', v_storage.video_count,
    'max_videos', v_storage.max_videos,
    'can_upload', v_storage.video_count < COALESCE(v_storage.max_videos, 999999)
  );
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- MULTI-TENANT VECTOR SEARCH OPTIMIZATION
-- ============================================================================

-- Add creator_id index to video_chunks for faster filtering
CREATE INDEX IF NOT EXISTS idx_video_chunks_creator_id_embedding
ON video_chunks USING ivfflat (embedding vector_cosine_ops)
WHERE creator_id IS NOT NULL;

-- Update the match_video_chunks function for better multi-tenant performance
CREATE OR REPLACE FUNCTION match_video_chunks_multitenant(
  query_embedding vector(1536),
  p_creator_id UUID,
  match_count INT DEFAULT 5,
  similarity_threshold FLOAT DEFAULT 0.7
)
RETURNS TABLE(
  chunk_id UUID,
  video_id UUID,
  chunk_text TEXT,
  start_timestamp INT,
  end_timestamp INT,
  similarity FLOAT,
  video_title TEXT,
  creator_id UUID
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    vc.id AS chunk_id,
    vc.video_id,
    vc.chunk_text,
    vc.start_timestamp,
    vc.end_timestamp,
    1 - (vc.embedding <=> query_embedding) AS similarity,
    v.title AS video_title,
    vc.creator_id
  FROM video_chunks vc
  JOIN videos v ON v.id = vc.video_id
  WHERE
    vc.creator_id = p_creator_id -- Multi-tenant isolation
    AND vc.embedding IS NOT NULL
    AND 1 - (vc.embedding <=> query_embedding) > similarity_threshold
  ORDER BY vc.embedding <=> query_embedding
  LIMIT match_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- ROW LEVEL SECURITY POLICIES
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE chat_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE creator_storage ENABLE ROW LEVEL SECURITY;
ALTER TABLE tier_configurations ENABLE ROW LEVEL SECURITY;

-- Chat usage policies
CREATE POLICY "Users can view own chat usage"
  ON chat_usage FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own chat usage"
  ON chat_usage FOR UPDATE
  USING (auth.uid() = user_id);

-- Creator storage policies
CREATE POLICY "Creators can view own storage"
  ON creator_storage FOR SELECT
  USING (creator_id IN (
    SELECT id FROM creators WHERE user_id = auth.uid()
  ));

CREATE POLICY "Creators can update own storage"
  ON creator_storage FOR UPDATE
  USING (creator_id IN (
    SELECT id FROM creators WHERE user_id = auth.uid()
  ));

-- Tier configurations are public read
CREATE POLICY "Anyone can view tier configurations"
  ON tier_configurations FOR SELECT
  USING (true);

-- ============================================================================
-- TRIGGERS FOR AUTOMATIC UPDATES
-- ============================================================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_chat_usage_updated_at
  BEFORE UPDATE ON chat_usage
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_creator_storage_updated_at
  BEFORE UPDATE ON creator_storage
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- ============================================================================
-- INITIAL DATA & PERMISSIONS
-- ============================================================================

-- Grant permissions to authenticated users
GRANT SELECT ON tier_configurations TO authenticated;
GRANT SELECT, INSERT, UPDATE ON chat_usage TO authenticated;
GRANT SELECT, INSERT, UPDATE ON creator_storage TO authenticated;

-- Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION check_chat_limit(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION increment_chat_usage(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION check_storage_limit(UUID, BIGINT) TO authenticated;
GRANT EXECUTE ON FUNCTION update_storage_usage(UUID, BIGINT, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION match_video_chunks_multitenant(vector(1536), UUID, INT, FLOAT) TO authenticated;

-- ============================================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE chat_usage IS 'Tracks chat usage per user with tier-based limits';
COMMENT ON TABLE creator_storage IS 'Tracks storage usage per creator with tier-based limits';
COMMENT ON TABLE tier_configurations IS 'Defines limits and features for each membership tier';

COMMENT ON FUNCTION check_chat_limit IS 'Returns true if user can ask another question based on their tier limits';
COMMENT ON FUNCTION increment_chat_usage IS 'Increments chat usage and returns remaining questions';
COMMENT ON FUNCTION check_storage_limit IS 'Returns true if creator can upload a file of given size';
COMMENT ON FUNCTION update_storage_usage IS 'Updates storage usage and returns current storage info';

-- ============================================================================
-- SUCCESS MESSAGE
-- ============================================================================
DO $$
BEGIN
  RAISE NOTICE 'Multi-tenant storage and tier limits setup complete!';
  RAISE NOTICE 'FREE tier: 5GB storage, 3 chat questions';
  RAISE NOTICE 'BASIC tier: 25GB storage, 100 questions/day';
  RAISE NOTICE 'PRO tier: 100GB storage, 500 questions/day';
  RAISE NOTICE 'ENTERPRISE tier: 500GB storage, unlimited questions';
END $$;