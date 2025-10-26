-- ============================================================================
-- USAGE TRACKING & COST MONITORING TABLES
-- ============================================================================

-- Enable UUID extension if not exists
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- API USAGE LOGS - Detailed tracking of every API call
-- ============================================================================
CREATE TABLE api_usage_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- User & Creator identification
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  creator_id UUID REFERENCES creators(id) ON DELETE CASCADE,
  student_id UUID REFERENCES students(id) ON DELETE CASCADE,

  -- Request details
  request_id TEXT NOT NULL UNIQUE, -- For idempotency
  endpoint TEXT NOT NULL, -- /api/chat, /api/video/transcribe, etc.
  method TEXT NOT NULL CHECK (method IN ('GET', 'POST', 'PUT', 'DELETE')),

  -- API Provider details
  provider TEXT NOT NULL CHECK (provider IN ('openai', 'anthropic', 'aws', 'supabase')),
  service TEXT NOT NULL, -- 'chat', 'embeddings', 'transcription', 'storage', 'vector-search'
  model TEXT, -- 'claude-3-5-sonnet', 'gpt-4', 'whisper-1', 'text-embedding-ada-002'

  -- Usage metrics
  input_tokens INTEGER,
  output_tokens INTEGER,
  total_tokens INTEGER GENERATED ALWAYS AS (COALESCE(input_tokens, 0) + COALESCE(output_tokens, 0)) STORED,
  duration_ms INTEGER, -- API call duration
  data_size_bytes BIGINT, -- For storage/transfer operations

  -- Cost calculation
  cost_usd DECIMAL(10, 6) NOT NULL, -- 6 decimal places for micro-transactions
  cost_breakdown JSONB DEFAULT '{}', -- Detailed breakdown

  -- Response details
  status_code INTEGER,
  error_message TEXT,

  -- Metadata
  metadata JSONB DEFAULT '{}', -- Additional context (video_id, session_id, etc.)
  ip_address INET,
  user_agent TEXT
);

-- Indexes for performance
CREATE INDEX idx_usage_user_created ON api_usage_logs(user_id, created_at DESC);
CREATE INDEX idx_usage_creator_created ON api_usage_logs(creator_id, created_at DESC);
CREATE INDEX idx_usage_provider_service ON api_usage_logs(provider, service, created_at DESC);
CREATE INDEX idx_usage_endpoint ON api_usage_logs(endpoint, created_at DESC);
CREATE INDEX idx_usage_created ON api_usage_logs(created_at DESC);

-- Enable RLS
ALTER TABLE api_usage_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own usage" ON api_usage_logs
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Creators can view their students usage" ON api_usage_logs
  FOR SELECT USING (
    creator_id IN (
      SELECT id FROM creators WHERE user_id = auth.uid()
    )
  );

-- Service role can do everything
CREATE POLICY "Service role full access" ON api_usage_logs
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- ============================================================================
-- USAGE SUMMARIES - Pre-aggregated data for fast dashboard queries
-- ============================================================================
CREATE TABLE usage_summaries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Time period
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,
  period_type TEXT NOT NULL CHECK (period_type IN ('hour', 'day', 'week', 'month')),

  -- Owner
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  creator_id UUID REFERENCES creators(id) ON DELETE CASCADE,

  -- Aggregated metrics
  total_api_calls INTEGER NOT NULL DEFAULT 0,
  total_cost_usd DECIMAL(10, 2) NOT NULL DEFAULT 0,

  -- Cost by provider
  openai_cost_usd DECIMAL(10, 2) DEFAULT 0,
  anthropic_cost_usd DECIMAL(10, 2) DEFAULT 0,
  aws_cost_usd DECIMAL(10, 2) DEFAULT 0,

  -- Cost by service
  chat_cost_usd DECIMAL(10, 2) DEFAULT 0,
  embedding_cost_usd DECIMAL(10, 2) DEFAULT 0,
  transcription_cost_usd DECIMAL(10, 2) DEFAULT 0,
  storage_cost_usd DECIMAL(10, 2) DEFAULT 0,

  -- Usage by service
  chat_calls INTEGER DEFAULT 0,
  embedding_calls INTEGER DEFAULT 0,
  transcription_minutes DECIMAL(10, 2) DEFAULT 0,
  storage_gb DECIMAL(10, 3) DEFAULT 0,

  -- Token usage
  total_input_tokens BIGINT DEFAULT 0,
  total_output_tokens BIGINT DEFAULT 0,

  -- Performance metrics
  avg_response_time_ms INTEGER,
  error_count INTEGER DEFAULT 0,

  -- Constraints
  UNIQUE NULLS NOT DISTINCT (user_id, period_start, period_type),
  UNIQUE NULLS NOT DISTINCT (creator_id, period_start, period_type)
);

-- Indexes
CREATE INDEX idx_summary_user_period ON usage_summaries(user_id, period_start DESC);
CREATE INDEX idx_summary_creator_period ON usage_summaries(creator_id, period_start DESC);
CREATE INDEX idx_summary_period_type ON usage_summaries(period_type, period_start DESC);

-- Enable RLS
ALTER TABLE usage_summaries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own summaries" ON usage_summaries
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Creators can view own summaries" ON usage_summaries
  FOR SELECT USING (
    creator_id IN (
      SELECT id FROM creators WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Service role full access" ON usage_summaries
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- ============================================================================
-- COST LIMITS - Spending caps per user/tier
-- ============================================================================
CREATE TABLE cost_limits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Owner
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  creator_id UUID REFERENCES creators(id) ON DELETE CASCADE,

  -- Plan details
  plan_tier TEXT NOT NULL CHECK (plan_tier IN ('free', 'basic', 'pro', 'enterprise')),

  -- Limits (in USD)
  daily_limit DECIMAL(10, 2) NOT NULL,
  monthly_limit DECIMAL(10, 2) NOT NULL,

  -- Current usage (updated in real-time)
  daily_spent DECIMAL(10, 2) DEFAULT 0,
  monthly_spent DECIMAL(10, 2) DEFAULT 0,

  -- Reset timestamps
  daily_reset_at TIMESTAMPTZ NOT NULL DEFAULT (DATE_TRUNC('day', NOW()) + INTERVAL '1 day'),
  monthly_reset_at TIMESTAMPTZ NOT NULL DEFAULT (DATE_TRUNC('month', NOW()) + INTERVAL '1 month'),

  -- Alert thresholds (percentage)
  warning_threshold INTEGER DEFAULT 80, -- Alert at 80% usage
  critical_threshold INTEGER DEFAULT 95, -- Critical alert at 95%

  -- Enforcement
  enforce_hard_limit BOOLEAN DEFAULT true, -- Block requests when limit exceeded

  -- Unique constraint
  UNIQUE(user_id),
  UNIQUE(creator_id)
);

-- Indexes
CREATE INDEX idx_limits_user ON cost_limits(user_id);
CREATE INDEX idx_limits_creator ON cost_limits(creator_id);

-- Enable RLS
ALTER TABLE cost_limits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own limits" ON cost_limits
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Service role full access" ON cost_limits
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- ============================================================================
-- COST ALERTS - Track alert history
-- ============================================================================
CREATE TABLE cost_alerts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Owner
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  creator_id UUID REFERENCES creators(id) ON DELETE CASCADE,

  -- Alert details
  alert_type TEXT NOT NULL CHECK (alert_type IN ('warning', 'critical', 'limit_exceeded')),
  threshold_percentage INTEGER NOT NULL,

  -- Usage at time of alert
  current_spent DECIMAL(10, 2) NOT NULL,
  limit_amount DECIMAL(10, 2) NOT NULL,
  period TEXT NOT NULL CHECK (period IN ('daily', 'monthly')),

  -- Notification details
  notified BOOLEAN DEFAULT false,
  notification_sent_at TIMESTAMPTZ,
  notification_method TEXT, -- 'email', 'in-app', 'webhook'

  -- Resolution
  acknowledged BOOLEAN DEFAULT false,
  acknowledged_at TIMESTAMPTZ,
  acknowledged_by UUID REFERENCES auth.users(id)
);

-- Indexes
CREATE INDEX idx_alerts_user ON cost_alerts(user_id, created_at DESC);
CREATE INDEX idx_alerts_creator ON cost_alerts(creator_id, created_at DESC);
CREATE INDEX idx_alerts_unacknowledged ON cost_alerts(acknowledged, created_at DESC) WHERE acknowledged = false;

-- Enable RLS
ALTER TABLE cost_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own alerts" ON cost_alerts
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can acknowledge own alerts" ON cost_alerts
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service role full access" ON cost_alerts
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- ============================================================================
-- FUNCTIONS & TRIGGERS
-- ============================================================================

-- Function to update daily/monthly spent in cost_limits
CREATE OR REPLACE FUNCTION update_cost_limits()
RETURNS TRIGGER AS $$
BEGIN
  -- Update user limits if exists
  IF NEW.user_id IS NOT NULL THEN
    UPDATE cost_limits
    SET
      daily_spent = daily_spent + NEW.cost_usd,
      monthly_spent = monthly_spent + NEW.cost_usd,
      updated_at = NOW()
    WHERE user_id = NEW.user_id;
  END IF;

  -- Update creator limits if exists
  IF NEW.creator_id IS NOT NULL THEN
    UPDATE cost_limits
    SET
      daily_spent = daily_spent + NEW.cost_usd,
      monthly_spent = monthly_spent + NEW.cost_usd,
      updated_at = NOW()
    WHERE creator_id = NEW.creator_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update cost limits on new usage log
CREATE TRIGGER update_limits_on_usage
  AFTER INSERT ON api_usage_logs
  FOR EACH ROW
  EXECUTE FUNCTION update_cost_limits();

-- Function to check and create alerts
CREATE OR REPLACE FUNCTION check_cost_alerts()
RETURNS TRIGGER AS $$
DECLARE
  v_limit RECORD;
  v_daily_percentage INTEGER;
  v_monthly_percentage INTEGER;
BEGIN
  -- Get the cost limit record
  SELECT * INTO v_limit FROM cost_limits
  WHERE user_id = NEW.user_id OR creator_id = NEW.creator_id
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN NEW;
  END IF;

  -- Calculate usage percentages
  v_daily_percentage := (v_limit.daily_spent / v_limit.daily_limit * 100)::INTEGER;
  v_monthly_percentage := (v_limit.monthly_spent / v_limit.monthly_limit * 100)::INTEGER;

  -- Check daily limit
  IF v_daily_percentage >= v_limit.critical_threshold THEN
    INSERT INTO cost_alerts (
      user_id, creator_id, alert_type, threshold_percentage,
      current_spent, limit_amount, period
    ) VALUES (
      NEW.user_id, NEW.creator_id,
      CASE WHEN v_daily_percentage >= 100 THEN 'limit_exceeded' ELSE 'critical' END,
      v_daily_percentage, v_limit.daily_spent, v_limit.daily_limit, 'daily'
    ) ON CONFLICT DO NOTHING;
  ELSIF v_daily_percentage >= v_limit.warning_threshold THEN
    -- Check if warning already sent today
    IF NOT EXISTS (
      SELECT 1 FROM cost_alerts
      WHERE (user_id = NEW.user_id OR creator_id = NEW.creator_id)
        AND period = 'daily'
        AND DATE(created_at) = CURRENT_DATE
    ) THEN
      INSERT INTO cost_alerts (
        user_id, creator_id, alert_type, threshold_percentage,
        current_spent, limit_amount, period
      ) VALUES (
        NEW.user_id, NEW.creator_id, 'warning', v_daily_percentage,
        v_limit.daily_spent, v_limit.daily_limit, 'daily'
      );
    END IF;
  END IF;

  -- Check monthly limit (similar logic)
  IF v_monthly_percentage >= v_limit.critical_threshold THEN
    INSERT INTO cost_alerts (
      user_id, creator_id, alert_type, threshold_percentage,
      current_spent, limit_amount, period
    ) VALUES (
      NEW.user_id, NEW.creator_id,
      CASE WHEN v_monthly_percentage >= 100 THEN 'limit_exceeded' ELSE 'critical' END,
      v_monthly_percentage, v_limit.monthly_spent, v_limit.monthly_limit, 'monthly'
    ) ON CONFLICT DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to check for alerts
CREATE TRIGGER check_alerts_on_usage
  AFTER INSERT ON api_usage_logs
  FOR EACH ROW
  EXECUTE FUNCTION check_cost_alerts();

-- Function to reset daily limits (run via cron at midnight)
CREATE OR REPLACE FUNCTION reset_daily_limits()
RETURNS void AS $$
BEGIN
  UPDATE cost_limits
  SET
    daily_spent = 0,
    daily_reset_at = DATE_TRUNC('day', NOW()) + INTERVAL '1 day',
    updated_at = NOW()
  WHERE daily_reset_at <= NOW();
END;
$$ LANGUAGE plpgsql;

-- Function to reset monthly limits (run via cron on 1st of month)
CREATE OR REPLACE FUNCTION reset_monthly_limits()
RETURNS void AS $$
BEGIN
  UPDATE cost_limits
  SET
    monthly_spent = 0,
    monthly_reset_at = DATE_TRUNC('month', NOW()) + INTERVAL '1 month',
    updated_at = NOW()
  WHERE monthly_reset_at <= NOW();
END;
$$ LANGUAGE plpgsql;

-- Function to aggregate usage into summaries (run hourly via cron)
CREATE OR REPLACE FUNCTION aggregate_usage_summaries()
RETURNS void AS $$
DECLARE
  v_hour_start TIMESTAMPTZ;
  v_hour_end TIMESTAMPTZ;
BEGIN
  -- Get the last complete hour
  v_hour_end := DATE_TRUNC('hour', NOW());
  v_hour_start := v_hour_end - INTERVAL '1 hour';

  -- Aggregate hourly data for users
  INSERT INTO usage_summaries (
    period_start, period_end, period_type,
    user_id, creator_id,
    total_api_calls, total_cost_usd,
    openai_cost_usd, anthropic_cost_usd, aws_cost_usd,
    chat_cost_usd, embedding_cost_usd, transcription_cost_usd, storage_cost_usd,
    chat_calls, embedding_calls,
    total_input_tokens, total_output_tokens,
    avg_response_time_ms, error_count
  )
  SELECT
    v_hour_start, v_hour_end, 'hour',
    user_id, NULL,
    COUNT(*),
    SUM(cost_usd),
    SUM(CASE WHEN provider = 'openai' THEN cost_usd ELSE 0 END),
    SUM(CASE WHEN provider = 'anthropic' THEN cost_usd ELSE 0 END),
    SUM(CASE WHEN provider = 'aws' THEN cost_usd ELSE 0 END),
    SUM(CASE WHEN service = 'chat' THEN cost_usd ELSE 0 END),
    SUM(CASE WHEN service = 'embeddings' THEN cost_usd ELSE 0 END),
    SUM(CASE WHEN service = 'transcription' THEN cost_usd ELSE 0 END),
    SUM(CASE WHEN service = 'storage' THEN cost_usd ELSE 0 END),
    SUM(CASE WHEN service = 'chat' THEN 1 ELSE 0 END),
    SUM(CASE WHEN service = 'embeddings' THEN 1 ELSE 0 END),
    SUM(COALESCE(input_tokens, 0)),
    SUM(COALESCE(output_tokens, 0)),
    AVG(duration_ms)::INTEGER,
    SUM(CASE WHEN status_code >= 400 THEN 1 ELSE 0 END)
  FROM api_usage_logs
  WHERE created_at >= v_hour_start AND created_at < v_hour_end
    AND user_id IS NOT NULL
  GROUP BY user_id
  ON CONFLICT (user_id, period_start, period_type) WHERE user_id IS NOT NULL
  DO UPDATE SET
    total_api_calls = EXCLUDED.total_api_calls,
    total_cost_usd = EXCLUDED.total_cost_usd,
    openai_cost_usd = EXCLUDED.openai_cost_usd,
    anthropic_cost_usd = EXCLUDED.anthropic_cost_usd,
    aws_cost_usd = EXCLUDED.aws_cost_usd,
    chat_cost_usd = EXCLUDED.chat_cost_usd,
    embedding_cost_usd = EXCLUDED.embedding_cost_usd,
    transcription_cost_usd = EXCLUDED.transcription_cost_usd,
    storage_cost_usd = EXCLUDED.storage_cost_usd;

  -- Aggregate hourly data for creators
  INSERT INTO usage_summaries (
    period_start, period_end, period_type,
    user_id, creator_id,
    total_api_calls, total_cost_usd,
    openai_cost_usd, anthropic_cost_usd, aws_cost_usd,
    chat_cost_usd, embedding_cost_usd, transcription_cost_usd, storage_cost_usd,
    chat_calls, embedding_calls,
    total_input_tokens, total_output_tokens,
    avg_response_time_ms, error_count
  )
  SELECT
    v_hour_start, v_hour_end, 'hour',
    NULL, creator_id,
    COUNT(*),
    SUM(cost_usd),
    SUM(CASE WHEN provider = 'openai' THEN cost_usd ELSE 0 END),
    SUM(CASE WHEN provider = 'anthropic' THEN cost_usd ELSE 0 END),
    SUM(CASE WHEN provider = 'aws' THEN cost_usd ELSE 0 END),
    SUM(CASE WHEN service = 'chat' THEN cost_usd ELSE 0 END),
    SUM(CASE WHEN service = 'embeddings' THEN cost_usd ELSE 0 END),
    SUM(CASE WHEN service = 'transcription' THEN cost_usd ELSE 0 END),
    SUM(CASE WHEN service = 'storage' THEN cost_usd ELSE 0 END),
    SUM(CASE WHEN service = 'chat' THEN 1 ELSE 0 END),
    SUM(CASE WHEN service = 'embeddings' THEN 1 ELSE 0 END),
    SUM(COALESCE(input_tokens, 0)),
    SUM(COALESCE(output_tokens, 0)),
    AVG(duration_ms)::INTEGER,
    SUM(CASE WHEN status_code >= 400 THEN 1 ELSE 0 END)
  FROM api_usage_logs
  WHERE created_at >= v_hour_start AND created_at < v_hour_end
    AND creator_id IS NOT NULL
  GROUP BY creator_id
  ON CONFLICT (creator_id, period_start, period_type) WHERE creator_id IS NOT NULL
  DO UPDATE SET
    total_api_calls = EXCLUDED.total_api_calls,
    total_cost_usd = EXCLUDED.total_cost_usd,
    openai_cost_usd = EXCLUDED.openai_cost_usd,
    anthropic_cost_usd = EXCLUDED.anthropic_cost_usd,
    aws_cost_usd = EXCLUDED.aws_cost_usd,
    chat_cost_usd = EXCLUDED.chat_cost_usd,
    embedding_cost_usd = EXCLUDED.embedding_cost_usd,
    transcription_cost_usd = EXCLUDED.transcription_cost_usd,
    storage_cost_usd = EXCLUDED.storage_cost_usd;

  -- Also create daily summary from hourly data at midnight
  IF EXTRACT(hour FROM NOW()) = 0 THEN
    -- Aggregate yesterday's hourly data into daily summary for users
    INSERT INTO usage_summaries (
      period_start, period_end, period_type,
      user_id, creator_id,
      total_api_calls, total_cost_usd,
      openai_cost_usd, anthropic_cost_usd, aws_cost_usd,
      chat_cost_usd, embedding_cost_usd, transcription_cost_usd, storage_cost_usd
    )
    SELECT
      DATE_TRUNC('day', period_start),
      DATE_TRUNC('day', period_start) + INTERVAL '1 day',
      'day',
      user_id, NULL,
      SUM(total_api_calls),
      SUM(total_cost_usd),
      SUM(openai_cost_usd),
      SUM(anthropic_cost_usd),
      SUM(aws_cost_usd),
      SUM(chat_cost_usd),
      SUM(embedding_cost_usd),
      SUM(transcription_cost_usd),
      SUM(storage_cost_usd)
    FROM usage_summaries
    WHERE period_type = 'hour'
      AND period_start >= DATE_TRUNC('day', NOW() - INTERVAL '1 day')
      AND period_start < DATE_TRUNC('day', NOW())
      AND user_id IS NOT NULL
    GROUP BY user_id, DATE_TRUNC('day', period_start)
    ON CONFLICT (user_id, period_start, period_type) WHERE user_id IS NOT NULL
    DO UPDATE SET
      total_api_calls = EXCLUDED.total_api_calls,
      total_cost_usd = EXCLUDED.total_cost_usd,
      openai_cost_usd = EXCLUDED.openai_cost_usd,
      anthropic_cost_usd = EXCLUDED.anthropic_cost_usd,
      aws_cost_usd = EXCLUDED.aws_cost_usd,
      chat_cost_usd = EXCLUDED.chat_cost_usd,
      embedding_cost_usd = EXCLUDED.embedding_cost_usd,
      transcription_cost_usd = EXCLUDED.transcription_cost_usd,
      storage_cost_usd = EXCLUDED.storage_cost_usd;

    -- Aggregate yesterday's hourly data into daily summary for creators
    INSERT INTO usage_summaries (
      period_start, period_end, period_type,
      user_id, creator_id,
      total_api_calls, total_cost_usd,
      openai_cost_usd, anthropic_cost_usd, aws_cost_usd,
      chat_cost_usd, embedding_cost_usd, transcription_cost_usd, storage_cost_usd
    )
    SELECT
      DATE_TRUNC('day', period_start),
      DATE_TRUNC('day', period_start) + INTERVAL '1 day',
      'day',
      NULL, creator_id,
      SUM(total_api_calls),
      SUM(total_cost_usd),
      SUM(openai_cost_usd),
      SUM(anthropic_cost_usd),
      SUM(aws_cost_usd),
      SUM(chat_cost_usd),
      SUM(embedding_cost_usd),
      SUM(transcription_cost_usd),
      SUM(storage_cost_usd)
    FROM usage_summaries
    WHERE period_type = 'hour'
      AND period_start >= DATE_TRUNC('day', NOW() - INTERVAL '1 day')
      AND period_start < DATE_TRUNC('day', NOW())
      AND creator_id IS NOT NULL
    GROUP BY creator_id, DATE_TRUNC('day', period_start)
    ON CONFLICT (creator_id, period_start, period_type) WHERE creator_id IS NOT NULL
    DO UPDATE SET
      total_api_calls = EXCLUDED.total_api_calls,
      total_cost_usd = EXCLUDED.total_cost_usd,
      openai_cost_usd = EXCLUDED.openai_cost_usd,
      anthropic_cost_usd = EXCLUDED.anthropic_cost_usd,
      aws_cost_usd = EXCLUDED.aws_cost_usd,
      chat_cost_usd = EXCLUDED.chat_cost_usd,
      embedding_cost_usd = EXCLUDED.embedding_cost_usd,
      transcription_cost_usd = EXCLUDED.transcription_cost_usd,
      storage_cost_usd = EXCLUDED.storage_cost_usd;
  END IF;
END;
$$ LANGUAGE plpgsql;