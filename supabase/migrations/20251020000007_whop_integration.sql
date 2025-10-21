-- Whop Integration Migration
-- Adds tables for webhook event logging, token storage, and membership history

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Webhook event log for idempotency and debugging
CREATE TABLE IF NOT EXISTS whop_webhook_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  whop_event_id TEXT UNIQUE NOT NULL, -- Whop's event ID for idempotency
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL,
  processed BOOLEAN DEFAULT FALSE,
  processed_at TIMESTAMPTZ,
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_whop_webhook_events_type
  ON whop_webhook_events(event_type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_whop_webhook_events_processed
  ON whop_webhook_events(processed, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_whop_webhook_events_whop_id
  ON whop_webhook_events(whop_event_id);

-- Membership change history for analytics and auditing
CREATE TABLE IF NOT EXISTS membership_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES creators(id) ON DELETE CASCADE,
  whop_user_id TEXT NOT NULL,
  membership_id TEXT,
  plan_tier TEXT NOT NULL,
  status TEXT NOT NULL,
  changed_from TEXT,
  changed_to TEXT,
  change_reason TEXT, -- 'webhook:membership.updated', 'manual', 'expired', etc.
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for user history lookups
CREATE INDEX IF NOT EXISTS idx_membership_history_user
  ON membership_history(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_membership_history_whop_user
  ON membership_history(whop_user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_membership_history_plan_tier
  ON membership_history(plan_tier, created_at DESC);

-- Add columns to creators table if they don't exist
DO $$
BEGIN
  -- Add membership tracking columns
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name='creators' AND column_name='membership_id') THEN
    ALTER TABLE creators ADD COLUMN membership_id TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name='creators' AND column_name='membership_valid') THEN
    ALTER TABLE creators ADD COLUMN membership_valid BOOLEAN DEFAULT FALSE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name='creators' AND column_name='current_plan') THEN
    ALTER TABLE creators ADD COLUMN current_plan TEXT DEFAULT 'basic';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name='creators' AND column_name='plan_expires_at') THEN
    ALTER TABLE creators ADD COLUMN plan_expires_at TIMESTAMPTZ;
  END IF;

  -- Add Whop OAuth token columns (encrypted)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name='creators' AND column_name='access_token') THEN
    ALTER TABLE creators ADD COLUMN access_token TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name='creators' AND column_name='refresh_token') THEN
    ALTER TABLE creators ADD COLUMN refresh_token TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name='creators' AND column_name='expires_at') THEN
    ALTER TABLE creators ADD COLUMN expires_at TIMESTAMPTZ;
  END IF;
END $$;

-- Create index for faster membership validation
CREATE INDEX IF NOT EXISTS idx_creators_membership
  ON creators(membership_id) WHERE membership_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_creators_whop_user_id
  ON creators(whop_user_id);

CREATE INDEX IF NOT EXISTS idx_creators_plan
  ON creators(current_plan);

-- Function to log membership changes automatically
CREATE OR REPLACE FUNCTION log_membership_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Only log if plan or membership status changed
  IF (TG_OP = 'UPDATE' AND (
    OLD.current_plan IS DISTINCT FROM NEW.current_plan OR
    OLD.membership_valid IS DISTINCT FROM NEW.membership_valid OR
    OLD.membership_id IS DISTINCT FROM NEW.membership_id
  )) THEN
    INSERT INTO membership_history (
      user_id,
      whop_user_id,
      membership_id,
      plan_tier,
      status,
      changed_from,
      changed_to,
      change_reason,
      metadata
    ) VALUES (
      NEW.id,
      NEW.whop_user_id,
      NEW.membership_id,
      NEW.current_plan,
      CASE WHEN NEW.membership_valid THEN 'active' ELSE 'inactive' END,
      OLD.current_plan,
      NEW.current_plan,
      'database_update',
      jsonb_build_object(
        'old_membership_id', OLD.membership_id,
        'new_membership_id', NEW.membership_id,
        'old_valid', OLD.membership_valid,
        'new_valid', NEW.membership_valid
      )
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic membership change logging
DROP TRIGGER IF EXISTS membership_change_logger ON creators;
CREATE TRIGGER membership_change_logger
  AFTER UPDATE ON creators
  FOR EACH ROW
  EXECUTE FUNCTION log_membership_change();

-- Add comments for documentation
COMMENT ON TABLE whop_webhook_events IS 'Stores all Whop webhook events for idempotency and debugging';
COMMENT ON TABLE membership_history IS 'Tracks all membership plan changes for analytics and auditing';
COMMENT ON COLUMN creators.membership_id IS 'Whop membership ID for the creator';
COMMENT ON COLUMN creators.membership_valid IS 'Whether the membership is currently valid';
COMMENT ON COLUMN creators.current_plan IS 'Current plan tier: basic, pro, or enterprise';
COMMENT ON COLUMN creators.plan_expires_at IS 'When the current plan expires';
COMMENT ON COLUMN creators.access_token IS 'Encrypted Whop OAuth access token';
COMMENT ON COLUMN creators.refresh_token IS 'Encrypted Whop OAuth refresh token';
COMMENT ON COLUMN creators.expires_at IS 'When the OAuth access token expires';
