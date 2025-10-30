-- ============================================================================
-- TRIAL SYSTEM MIGRATION
-- Add 7-day trial functionality with demo content provisioning
-- ============================================================================

-- Add trial tracking fields to creators table
ALTER TABLE creators
  ADD COLUMN IF NOT EXISTS trial_started_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS trial_expires_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS trial_status VARCHAR(20) DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS has_demo_content BOOLEAN DEFAULT FALSE;

-- Add demo content flag to videos table
ALTER TABLE videos
  ADD COLUMN IF NOT EXISTS is_demo_content BOOLEAN DEFAULT FALSE;

-- Add demo content flag to courses table (if table exists)
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'courses') THEN
    ALTER TABLE courses
      ADD COLUMN IF NOT EXISTS is_demo BOOLEAN DEFAULT FALSE;
  END IF;
END $$;

-- Create index for efficient trial expiration queries
CREATE INDEX IF NOT EXISTS idx_creators_trial_expires
  ON creators(trial_expires_at)
  WHERE trial_status = 'active';

-- Create index for demo content queries
CREATE INDEX IF NOT EXISTS idx_videos_demo_content
  ON videos(is_demo_content)
  WHERE is_demo_content = true;

-- Add comment for documentation
COMMENT ON COLUMN creators.trial_started_at IS 'When the 7-day trial started';
COMMENT ON COLUMN creators.trial_expires_at IS 'When the trial expires (7 days after start)';
COMMENT ON COLUMN creators.trial_status IS 'Trial status: active, expired, converted';
COMMENT ON COLUMN creators.has_demo_content IS 'Whether creator has demo content provisioned';
COMMENT ON COLUMN videos.is_demo_content IS 'Marks videos as demo content (deleted after upgrade)';
