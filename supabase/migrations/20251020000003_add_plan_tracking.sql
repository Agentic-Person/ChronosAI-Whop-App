/**
 * Migration: Add Plan Tracking Fields
 * Adds columns for feature gating and plan management
 */

-- Add plan tracking columns to creators table
ALTER TABLE creators
  ADD COLUMN IF NOT EXISTS current_plan TEXT DEFAULT 'basic' CHECK (current_plan IN ('basic', 'pro', 'enterprise')),
  ADD COLUMN IF NOT EXISTS plan_expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS plan_metadata JSONB DEFAULT '{}';

-- Add feature access tracking to analytics_events
ALTER TABLE analytics_events
  ADD COLUMN IF NOT EXISTS feature_accessed TEXT;

-- Create index for faster plan lookups
CREATE INDEX IF NOT EXISTS idx_creators_current_plan ON creators(current_plan);
CREATE INDEX IF NOT EXISTS idx_creators_plan_expires_at ON creators(plan_expires_at) WHERE plan_expires_at IS NOT NULL;

-- Create index for feature access analytics
CREATE INDEX IF NOT EXISTS idx_analytics_feature_accessed ON analytics_events(feature_accessed) WHERE feature_accessed IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_analytics_feature_type ON analytics_events(event_type) WHERE event_type = 'feature_access';

-- Add comment documenting the plan fields
COMMENT ON COLUMN creators.current_plan IS 'User subscription plan tier: basic, pro, or enterprise';
COMMENT ON COLUMN creators.plan_expires_at IS 'When the current plan expires (null for lifetime/no expiration)';
COMMENT ON COLUMN creators.plan_metadata IS 'Additional plan-related metadata from Whop (e.g., trial status, payment info)';

-- Update existing creators to have basic plan if null
UPDATE creators
SET current_plan = 'basic'
WHERE current_plan IS NULL;

-- Create view for plan analytics
CREATE OR REPLACE VIEW plan_distribution AS
SELECT
  current_plan,
  COUNT(*) as user_count,
  COUNT(*) FILTER (WHERE plan_expires_at IS NOT NULL AND plan_expires_at > NOW()) as active_count,
  COUNT(*) FILTER (WHERE plan_expires_at IS NOT NULL AND plan_expires_at <= NOW()) as expired_count,
  COUNT(*) FILTER (WHERE plan_expires_at IS NULL) as lifetime_count
FROM creators
GROUP BY current_plan;

-- Grant access to the view
GRANT SELECT ON plan_distribution TO authenticated;

-- Create function to check if user's plan is active
CREATE OR REPLACE FUNCTION is_plan_active(user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  expiration TIMESTAMPTZ;
BEGIN
  SELECT plan_expires_at INTO expiration
  FROM creators
  WHERE id = user_id;

  -- If no expiration date, plan is active (lifetime)
  IF expiration IS NULL THEN
    RETURN TRUE;
  END IF;

  -- Check if expiration is in the future
  RETURN expiration > NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION is_plan_active TO authenticated;

-- Create function to log feature access
CREATE OR REPLACE FUNCTION log_feature_access(
  user_id UUID,
  feature_name TEXT,
  access_granted BOOLEAN
)
RETURNS VOID AS $$
BEGIN
  INSERT INTO analytics_events (student_id, event_type, feature_accessed, event_data)
  VALUES (
    user_id,
    'feature_access',
    feature_name,
    jsonb_build_object(
      'feature', feature_name,
      'access_granted', access_granted,
      'timestamp', NOW()
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION log_feature_access TO authenticated;

-- Add RLS policies for plan data
ALTER TABLE creators ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own plan
CREATE POLICY creators_view_own_plan ON creators
  FOR SELECT
  USING (auth.uid() = id OR auth.uid() IN (SELECT id FROM creators WHERE whop_user_id = creators.whop_user_id));

-- Policy: Users can update their own non-critical plan fields
CREATE POLICY creators_update_own_metadata ON creators
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);
