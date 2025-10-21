-- Infrastructure Tables Migration
-- Performance metrics, job tracking, and system health monitoring

-- ===== JOB QUEUE TRACKING =====
-- Track background jobs for video processing, quiz generation, etc.
CREATE TABLE IF NOT EXISTS job_queue (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_type TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
  payload JSONB NOT NULL,
  result JSONB,
  priority INTEGER DEFAULT 0,
  attempts INTEGER DEFAULT 0,
  max_attempts INTEGER DEFAULT 3,
  scheduled_for TIMESTAMPTZ DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  error_message TEXT,
  error_details JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for job queue
CREATE INDEX idx_job_queue_status ON job_queue(status, scheduled_for) WHERE status IN ('pending', 'processing');
CREATE INDEX idx_job_queue_type ON job_queue(job_type, created_at DESC);
CREATE INDEX idx_job_queue_created ON job_queue(created_at DESC);

-- ===== PERFORMANCE METRICS =====
-- Store performance and monitoring metrics
CREATE TABLE IF NOT EXISTS performance_metrics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  metric_name TEXT NOT NULL,
  metric_value DECIMAL NOT NULL,
  metric_unit TEXT DEFAULT 'ms',
  tags JSONB DEFAULT '{}',
  metadata JSONB DEFAULT '{}',
  recorded_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for metrics queries
CREATE INDEX idx_metrics_name_time ON performance_metrics(metric_name, recorded_at DESC);
CREATE INDEX idx_metrics_recorded ON performance_metrics(recorded_at DESC);

-- ===== SYSTEM HEALTH LOGS =====
-- Track system health check results
CREATE TABLE IF NOT EXISTS system_health_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  check_type TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('healthy', 'degraded', 'unhealthy')),
  latency INTEGER, -- in milliseconds
  error_message TEXT,
  metadata JSONB DEFAULT '{}',
  checked_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for health logs
CREATE INDEX idx_health_logs_checked ON system_health_logs(checked_at DESC);
CREATE INDEX idx_health_logs_type ON system_health_logs(check_type, checked_at DESC);

-- ===== CACHE STATISTICS =====
-- Track cache performance (optional, for monitoring)
CREATE TABLE IF NOT EXISTS cache_statistics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cache_key_pattern TEXT NOT NULL,
  hits INTEGER DEFAULT 0,
  misses INTEGER DEFAULT 0,
  evictions INTEGER DEFAULT 0,
  avg_latency_ms DECIMAL,
  recorded_date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(cache_key_pattern, recorded_date)
);

-- Index for cache stats
CREATE INDEX idx_cache_stats_date ON cache_statistics(recorded_date DESC);

-- ===== API REQUEST LOGS (optional, for analytics) =====
-- Store API request metadata for analysis
CREATE TABLE IF NOT EXISTS api_request_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  request_id TEXT NOT NULL,
  user_id TEXT,
  method TEXT NOT NULL,
  path TEXT NOT NULL,
  status_code INTEGER NOT NULL,
  duration_ms INTEGER NOT NULL,
  user_agent TEXT,
  ip_address TEXT,
  error_message TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for API logs (partitioned by date for performance)
CREATE INDEX idx_api_logs_created ON api_request_logs(created_at DESC);
CREATE INDEX idx_api_logs_user ON api_request_logs(user_id, created_at DESC) WHERE user_id IS NOT NULL;
CREATE INDEX idx_api_logs_path ON api_request_logs(path, created_at DESC);
CREATE INDEX idx_api_logs_status ON api_request_logs(status_code, created_at DESC);

-- ===== RATE LIMIT VIOLATIONS =====
-- Track rate limit violations for monitoring and abuse detection
CREATE TABLE IF NOT EXISTS rate_limit_violations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  identifier TEXT NOT NULL, -- User ID or IP
  endpoint TEXT NOT NULL,
  limit_type TEXT NOT NULL,
  attempts INTEGER NOT NULL,
  violated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for violations
CREATE INDEX idx_rate_violations_identifier ON rate_limit_violations(identifier, violated_at DESC);
CREATE INDEX idx_rate_violations_endpoint ON rate_limit_violations(endpoint, violated_at DESC);

-- ===== AI API USAGE TRACKING =====
-- Track AI API calls for cost monitoring and analytics
CREATE TABLE IF NOT EXISTS ai_api_usage (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  provider TEXT NOT NULL CHECK (provider IN ('claude', 'openai')),
  operation TEXT NOT NULL,
  model TEXT,
  tokens_used INTEGER,
  estimated_cost DECIMAL(10, 6),
  duration_ms INTEGER,
  user_id TEXT,
  creator_id TEXT,
  success BOOLEAN DEFAULT true,
  error_message TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for AI usage
CREATE INDEX idx_ai_usage_created ON ai_api_usage(created_at DESC);
CREATE INDEX idx_ai_usage_provider ON ai_api_usage(provider, created_at DESC);
CREATE INDEX idx_ai_usage_creator ON ai_api_usage(creator_id, created_at DESC) WHERE creator_id IS NOT NULL;

-- ===== FUNCTIONS =====

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for job_queue
CREATE TRIGGER update_job_queue_updated_at
  BEFORE UPDATE ON job_queue
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger for cache_statistics
CREATE TRIGGER update_cache_stats_updated_at
  BEFORE UPDATE ON cache_statistics
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ===== CLEANUP FUNCTIONS =====

-- Function to clean up old job queue records (keep last 30 days)
CREATE OR REPLACE FUNCTION cleanup_old_job_queue_records()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM job_queue
  WHERE completed_at < NOW() - INTERVAL '30 days'
    AND status IN ('completed', 'failed', 'cancelled');

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Function to clean up old performance metrics (keep last 90 days)
CREATE OR REPLACE FUNCTION cleanup_old_performance_metrics()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM performance_metrics
  WHERE recorded_at < NOW() - INTERVAL '90 days';

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Function to clean up old API logs (keep last 30 days)
CREATE OR REPLACE FUNCTION cleanup_old_api_logs()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM api_request_logs
  WHERE created_at < NOW() - INTERVAL '30 days';

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- ===== RLS POLICIES =====

-- Job queue: Only accessible by service role
ALTER TABLE job_queue ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Job queue is service-only" ON job_queue
  FOR ALL USING (false);

-- Performance metrics: Service-only
ALTER TABLE performance_metrics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Performance metrics are service-only" ON performance_metrics
  FOR ALL USING (false);

-- System health logs: Service-only
ALTER TABLE system_health_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Health logs are service-only" ON system_health_logs
  FOR ALL USING (false);

-- Cache statistics: Service-only
ALTER TABLE cache_statistics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Cache stats are service-only" ON cache_statistics
  FOR ALL USING (false);

-- API request logs: Service-only
ALTER TABLE api_request_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "API logs are service-only" ON api_request_logs
  FOR ALL USING (false);

-- Rate limit violations: Service-only
ALTER TABLE rate_limit_violations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Rate limit violations are service-only" ON rate_limit_violations
  FOR ALL USING (false);

-- AI API usage: Service-only
ALTER TABLE ai_api_usage ENABLE ROW LEVEL SECURITY;
CREATE POLICY "AI usage is service-only" ON ai_api_usage
  FOR ALL USING (false);

-- ===== COMMENTS =====

COMMENT ON TABLE job_queue IS 'Tracks background job execution (video processing, quiz generation, etc.)';
COMMENT ON TABLE performance_metrics IS 'Stores performance and timing metrics for monitoring';
COMMENT ON TABLE system_health_logs IS 'Records system health check results';
COMMENT ON TABLE cache_statistics IS 'Tracks cache hit/miss rates and performance';
COMMENT ON TABLE api_request_logs IS 'Logs API requests for analytics and debugging';
COMMENT ON TABLE rate_limit_violations IS 'Records rate limit violations for abuse detection';
COMMENT ON TABLE ai_api_usage IS 'Tracks AI API calls for cost monitoring';
