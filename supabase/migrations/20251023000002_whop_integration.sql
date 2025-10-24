-- Migration: Whop Platform Integration
-- Description: Add Whop-specific fields for OAuth, membership management, and multi-tenant support
-- Date: 2025-10-23
-- Agent: Agent 14 (Whop Integration Specialist)

-- ============================================================================
-- PART 1: Extend Creators Table with Whop Integration
-- ============================================================================

-- Add Whop company integration fields
ALTER TABLE creators
ADD COLUMN IF NOT EXISTS whop_company_id TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS whop_data JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS whop_plan_id TEXT,
ADD COLUMN IF NOT EXISTS membership_tier TEXT CHECK (membership_tier IN ('BASIC', 'PRO', 'ENTERPRISE')) DEFAULT 'BASIC',
ADD COLUMN IF NOT EXISTS whop_oauth_token_encrypted TEXT,
ADD COLUMN IF NOT EXISTS whop_oauth_refresh_token_encrypted TEXT,
ADD COLUMN IF NOT EXISTS whop_token_expires_at TIMESTAMPTZ;

-- Add indexes for Whop lookups
CREATE INDEX IF NOT EXISTS idx_creators_whop_company ON creators(whop_company_id);
CREATE INDEX IF NOT EXISTS idx_creators_membership_tier ON creators(membership_tier);

-- Add comments for documentation
COMMENT ON COLUMN creators.whop_company_id IS 'Unique Whop company ID from OAuth';
COMMENT ON COLUMN creators.whop_data IS 'Raw Whop company data from API';
COMMENT ON COLUMN creators.whop_plan_id IS 'Whop plan ID (maps to membership tier)';
COMMENT ON COLUMN creators.membership_tier IS 'Internal tier: BASIC, PRO, or ENTERPRISE';

-- ============================================================================
-- PART 2: Extend Students Table with Whop Integration
-- ============================================================================

-- Add Whop user/membership fields
ALTER TABLE students
ADD COLUMN IF NOT EXISTS whop_user_id TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS whop_membership_id TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS whop_data JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS membership_status TEXT CHECK (membership_status IN ('active', 'expired', 'cancelled', 'trialing')) DEFAULT 'active',
ADD COLUMN IF NOT EXISTS membership_tier TEXT CHECK (membership_tier IN ('BASIC', 'PRO', 'ENTERPRISE')) DEFAULT 'BASIC',
ADD COLUMN IF NOT EXISTS membership_started_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS membership_expires_at TIMESTAMPTZ;

-- Add indexes for Whop lookups
CREATE INDEX IF NOT EXISTS idx_students_whop_user ON students(whop_user_id);
CREATE INDEX IF NOT EXISTS idx_students_whop_membership ON students(whop_membership_id);
CREATE INDEX IF NOT EXISTS idx_students_membership_status ON students(membership_status);
CREATE INDEX IF NOT EXISTS idx_students_membership_tier ON students(membership_tier);

-- Add comments
COMMENT ON COLUMN students.whop_user_id IS 'Unique Whop user ID from OAuth';
COMMENT ON COLUMN students.whop_membership_id IS 'Whop membership ID for validation';
COMMENT ON COLUMN students.membership_status IS 'Current membership status from Whop';
COMMENT ON COLUMN students.membership_tier IS 'Student tier based on Whop plan';

-- ============================================================================
-- PART 3: Create Whop Webhook Logs Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS whop_webhook_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id TEXT UNIQUE NOT NULL,
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL,
  processed BOOLEAN DEFAULT FALSE,
  processed_at TIMESTAMPTZ,
  error TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for webhook processing
CREATE INDEX IF NOT EXISTS idx_webhook_logs_event_id ON whop_webhook_logs(event_id);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_event_type ON whop_webhook_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_processed ON whop_webhook_logs(processed);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_created_at ON whop_webhook_logs(created_at DESC);

-- Comments
COMMENT ON TABLE whop_webhook_logs IS 'Logs all Whop webhook events for idempotency and debugging';
COMMENT ON COLUMN whop_webhook_logs.event_id IS 'Whop event ID - ensures idempotent processing';
COMMENT ON COLUMN whop_webhook_logs.event_type IS 'Event type: membership.created, membership.expired, etc.';

-- ============================================================================
-- PART 4: Add creator_id to Multi-Tenant Tables (Content Isolation)
-- ============================================================================

-- Add creator_id to videos table
ALTER TABLE videos
ADD COLUMN IF NOT EXISTS creator_id UUID REFERENCES creators(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_videos_creator ON videos(creator_id);

-- Add creator_id to video_chunks table
ALTER TABLE video_chunks
ADD COLUMN IF NOT EXISTS creator_id UUID REFERENCES creators(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_video_chunks_creator ON video_chunks(creator_id);

-- Add creator_id to chat_sessions table
ALTER TABLE chat_sessions
ADD COLUMN IF NOT EXISTS creator_id UUID REFERENCES creators(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_chat_sessions_creator ON chat_sessions(creator_id);

-- Add creator_id to chat_messages table
ALTER TABLE chat_messages
ADD COLUMN IF NOT EXISTS creator_id UUID REFERENCES creators(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_chat_messages_creator ON chat_messages(creator_id);

-- ============================================================================
-- PART 5: Row Level Security (RLS) for Multi-Tenancy
-- ============================================================================

-- Enable RLS on videos
ALTER TABLE videos ENABLE ROW LEVEL SECURITY;

-- Policy: Creators can only see their own videos
CREATE POLICY videos_creator_isolation ON videos
  FOR ALL
  USING (creator_id = auth.uid()::uuid OR creator_id = (
    SELECT creator_id FROM students WHERE id = auth.uid()::uuid
  ));

-- Enable RLS on video_chunks
ALTER TABLE video_chunks ENABLE ROW LEVEL SECURITY;

-- Policy: Only show chunks from creator's videos
CREATE POLICY video_chunks_creator_isolation ON video_chunks
  FOR ALL
  USING (creator_id = auth.uid()::uuid OR creator_id = (
    SELECT creator_id FROM students WHERE id = auth.uid()::uuid
  ));

-- Enable RLS on chat_sessions
ALTER TABLE chat_sessions ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own sessions within their creator's scope
CREATE POLICY chat_sessions_user_isolation ON chat_sessions
  FOR ALL
  USING (
    student_id = auth.uid()::uuid
    OR creator_id = auth.uid()::uuid
  );

-- Enable RLS on chat_messages
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- Policy: Messages scoped by session ownership
CREATE POLICY chat_messages_user_isolation ON chat_messages
  FOR ALL
  USING (
    session_id IN (
      SELECT id FROM chat_sessions
      WHERE student_id = auth.uid()::uuid
      OR creator_id = auth.uid()::uuid
    )
  );

-- ============================================================================
-- PART 6: Helper Functions for Whop Integration
-- ============================================================================

-- Function: Get creator's membership tier from Whop membership ID
CREATE OR REPLACE FUNCTION get_membership_tier(membership_id TEXT)
RETURNS TEXT AS $$
DECLARE
  tier TEXT;
BEGIN
  SELECT membership_tier INTO tier
  FROM students
  WHERE whop_membership_id = membership_id
  LIMIT 1;

  RETURN COALESCE(tier, 'BASIC');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Check if membership is active
CREATE OR REPLACE FUNCTION is_membership_active(membership_id TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  status TEXT;
  expires_at TIMESTAMPTZ;
BEGIN
  SELECT membership_status, membership_expires_at INTO status, expires_at
  FROM students
  WHERE whop_membership_id = membership_id
  LIMIT 1;

  -- Active if status is 'active' and not expired
  RETURN (
    status = 'active' AND
    (expires_at IS NULL OR expires_at > NOW())
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Update membership status from webhook
CREATE OR REPLACE FUNCTION update_membership_status(
  p_whop_membership_id TEXT,
  p_status TEXT,
  p_expires_at TIMESTAMPTZ DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
  UPDATE students
  SET
    membership_status = p_status,
    membership_expires_at = p_expires_at,
    updated_at = NOW()
  WHERE whop_membership_id = p_whop_membership_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- PART 7: Materialized View for Creator Analytics
-- ============================================================================

-- Drop existing view if exists
DROP MATERIALIZED VIEW IF EXISTS creator_analytics_summary;

-- Create materialized view for fast creator dashboard queries
CREATE MATERIALIZED VIEW creator_analytics_summary AS
SELECT
  c.id AS creator_id,
  c.whop_company_id,
  c.membership_tier,
  COUNT(DISTINCT s.id) AS total_students,
  COUNT(DISTINCT CASE WHEN s.membership_status = 'active' THEN s.id END) AS active_students,
  COUNT(DISTINCT v.id) AS total_videos,
  COUNT(DISTINCT cs.id) AS total_chat_sessions,
  COUNT(DISTINCT cm.id) AS total_chat_messages,
  MAX(s.created_at) AS last_student_joined,
  MAX(cs.created_at) AS last_chat_session
FROM creators c
LEFT JOIN students s ON s.creator_id = c.id
LEFT JOIN videos v ON v.creator_id = c.id
LEFT JOIN chat_sessions cs ON cs.creator_id = c.id
LEFT JOIN chat_messages cm ON cm.creator_id = c.id
GROUP BY c.id, c.whop_company_id, c.membership_tier;

-- Create index on materialized view
CREATE UNIQUE INDEX idx_creator_analytics_creator_id ON creator_analytics_summary(creator_id);

-- ============================================================================
-- PART 8: Triggers for Automatic Updates
-- ============================================================================

-- Trigger: Auto-update updated_at on whop_webhook_logs
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_whop_webhook_logs_updated_at
  BEFORE UPDATE ON whop_webhook_logs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- PART 9: Refresh Function for Materialized View
-- ============================================================================

-- Function to refresh creator analytics (call from cron or after major updates)
CREATE OR REPLACE FUNCTION refresh_creator_analytics()
RETURNS VOID AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY creator_analytics_summary;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

-- Grant necessary permissions
GRANT SELECT ON whop_webhook_logs TO authenticated;
GRANT SELECT ON creator_analytics_summary TO authenticated;

-- Refresh analytics view
SELECT refresh_creator_analytics();
