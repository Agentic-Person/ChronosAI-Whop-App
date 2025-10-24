-- ============================================================================
-- VIDEO PROCESSING ENHANCEMENTS
-- Adds fields and tables to support complete video processing pipeline
-- ============================================================================

-- Update videos table with processing status tracking
ALTER TABLE videos ADD COLUMN IF NOT EXISTS processing_status TEXT DEFAULT 'pending';
ALTER TABLE videos ADD COLUMN IF NOT EXISTS processing_progress INTEGER DEFAULT 0;
ALTER TABLE videos ADD COLUMN IF NOT EXISTS processing_step TEXT;
ALTER TABLE videos ADD COLUMN IF NOT EXISTS processing_error TEXT;
ALTER TABLE videos ADD COLUMN IF NOT EXISTS audio_extracted_at TIMESTAMPTZ;
ALTER TABLE videos ADD COLUMN IF NOT EXISTS transcribed_at TIMESTAMPTZ;
ALTER TABLE videos ADD COLUMN IF NOT EXISTS chunked_at TIMESTAMPTZ;
ALTER TABLE videos ADD COLUMN IF NOT EXISTS embedded_at TIMESTAMPTZ;
ALTER TABLE videos ADD COLUMN IF NOT EXISTS s3_key TEXT;
ALTER TABLE videos ADD COLUMN IF NOT EXISTS file_size_bytes BIGINT;
ALTER TABLE videos ADD COLUMN IF NOT EXISTS mime_type TEXT;

-- Add check constraint for processing_status
ALTER TABLE videos ADD CONSTRAINT videos_processing_status_check
  CHECK (processing_status IN ('pending', 'uploading', 'processing', 'completed', 'failed'));

-- ============================================================================
-- VIDEO PROCESSING JOBS TABLE
-- Track individual processing jobs for monitoring and debugging
-- ============================================================================
CREATE TABLE IF NOT EXISTS video_processing_jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  video_id UUID REFERENCES videos(id) ON DELETE CASCADE,
  job_type TEXT NOT NULL, -- 'transcribe', 'chunk', 'embed', 'full-pipeline'
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'running', 'completed', 'failed'
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  error_message TEXT,
  error_stack TEXT,
  metadata JSONB DEFAULT '{}',
  retry_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add check constraint for job status
ALTER TABLE video_processing_jobs ADD CONSTRAINT jobs_status_check
  CHECK (status IN ('pending', 'running', 'completed', 'failed', 'retrying'));

-- Add check constraint for job type
ALTER TABLE video_processing_jobs ADD CONSTRAINT jobs_type_check
  CHECK (job_type IN ('transcribe', 'chunk', 'embed', 'full-pipeline', 'audio-extract'));

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_videos_processing_status ON videos(processing_status);
CREATE INDEX IF NOT EXISTS idx_videos_creator_status ON videos(creator_id, processing_status);
CREATE INDEX IF NOT EXISTS idx_video_processing_jobs_video ON video_processing_jobs(video_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_video_processing_jobs_status ON video_processing_jobs(status, created_at DESC);

-- ============================================================================
-- TRANSCRIPTION METADATA TABLE
-- Store detailed transcription information
-- ============================================================================
CREATE TABLE IF NOT EXISTS video_transcriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  video_id UUID UNIQUE REFERENCES videos(id) ON DELETE CASCADE,
  transcript_text TEXT NOT NULL,
  segments JSONB, -- Array of {id, start, end, text, words[]}
  language VARCHAR(10) DEFAULT 'en',
  word_count INTEGER,
  confidence_score DECIMAL(3,2), -- Average confidence 0.00-1.00
  duration_seconds INTEGER,
  whisper_model VARCHAR(50) DEFAULT 'whisper-1',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_transcriptions_video ON video_transcriptions(video_id);

-- ============================================================================
-- UPDATE VIDEO_CHUNKS TABLE
-- Add missing fields for enhanced chunking
-- ============================================================================
ALTER TABLE video_chunks ADD COLUMN IF NOT EXISTS word_count INTEGER;
ALTER TABLE video_chunks ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';

-- Update existing records to have word_count
UPDATE video_chunks
SET word_count = array_length(regexp_split_to_array(chunk_text, '\s+'), 1)
WHERE word_count IS NULL;

-- ============================================================================
-- PROCESSING COST TRACKING
-- Track API costs for budgeting and optimization
-- ============================================================================
CREATE TABLE IF NOT EXISTS video_processing_costs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  video_id UUID REFERENCES videos(id) ON DELETE CASCADE,
  operation_type TEXT NOT NULL, -- 'transcription', 'embedding', 'storage'
  provider TEXT NOT NULL, -- 'openai', 'aws-s3', 'cloudflare-r2'
  cost_usd DECIMAL(10,4) NOT NULL,
  tokens_used INTEGER,
  api_calls INTEGER DEFAULT 1,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_processing_costs_video ON video_processing_costs(video_id);
CREATE INDEX IF NOT EXISTS idx_processing_costs_created ON video_processing_costs(created_at DESC);

-- ============================================================================
-- HELPER FUNCTION: Calculate total processing cost
-- ============================================================================
CREATE OR REPLACE FUNCTION get_video_processing_cost(p_video_id UUID)
RETURNS DECIMAL(10,4) AS $$
  SELECT COALESCE(SUM(cost_usd), 0.00)
  FROM video_processing_costs
  WHERE video_id = p_video_id;
$$ LANGUAGE SQL STABLE;

-- ============================================================================
-- HELPER FUNCTION: Get creator's total video count
-- Used for plan limit enforcement
-- ============================================================================
CREATE OR REPLACE FUNCTION get_creator_video_count(p_creator_id UUID)
RETURNS INTEGER AS $$
  SELECT COUNT(*)::INTEGER
  FROM videos
  WHERE creator_id = p_creator_id;
$$ LANGUAGE SQL STABLE;

-- ============================================================================
-- HELPER FUNCTION: Cleanup old failed processing jobs
-- Run periodically to keep job table manageable
-- ============================================================================
CREATE OR REPLACE FUNCTION cleanup_old_processing_jobs()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  -- Delete failed jobs older than 30 days
  WITH deleted AS (
    DELETE FROM video_processing_jobs
    WHERE status = 'failed'
      AND created_at < NOW() - INTERVAL '30 days'
    RETURNING id
  )
  SELECT COUNT(*)::INTEGER INTO deleted_count FROM deleted;

  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================
ALTER TABLE video_processing_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE video_transcriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE video_processing_costs ENABLE ROW LEVEL SECURITY;

-- Policies will be added based on specific requirements
-- For now, service role key will handle backend operations

-- ============================================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================================
COMMENT ON TABLE video_processing_jobs IS 'Tracks individual video processing jobs for monitoring, debugging, and retry logic';
COMMENT ON TABLE video_transcriptions IS 'Stores complete transcription data with segments and metadata from Whisper API';
COMMENT ON TABLE video_processing_costs IS 'Tracks API costs per video for budgeting and cost optimization';
COMMENT ON FUNCTION get_video_processing_cost IS 'Returns total processing cost in USD for a given video';
COMMENT ON FUNCTION get_creator_video_count IS 'Returns total video count for a creator (used for plan limits)';
COMMENT ON FUNCTION cleanup_old_processing_jobs IS 'Removes failed jobs older than 30 days to keep table manageable';
