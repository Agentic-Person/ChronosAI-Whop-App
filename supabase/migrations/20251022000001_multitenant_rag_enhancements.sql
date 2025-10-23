-- ============================================================================
-- Multi-Tenant RAG Enhancements Migration
-- ============================================================================
-- Enhances the existing schema with:
-- - enrollments table for student-creator relationships
-- - creator handle field for unique URLs
-- - chunks table with proper multi-tenant indexes
-- - Enhanced RLS policies for multi-tenant isolation
-- - Improved match_chunks function for creator-scoped search
-- ============================================================================

-- Enable extensions (idempotent)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ============================================================================
-- ALTER: creators table - add handle field
-- ============================================================================
-- Add unique handle for creator URLs (e.g., /c/johndoe)
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'creators' AND column_name = 'handle'
  ) THEN
    ALTER TABLE creators ADD COLUMN handle VARCHAR(50) UNIQUE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_creators_handle ON creators(handle);

-- ============================================================================
-- TABLE: enrollments
-- ============================================================================
-- Tracks which students are enrolled with which creators
-- Supports multi-creator access for students
-- ============================================================================

CREATE TABLE IF NOT EXISTS enrollments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  creator_id UUID NOT NULL REFERENCES creators(id) ON DELETE CASCADE,
  enrolled_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

  -- Ensure one enrollment per student-creator pair
  UNIQUE(student_id, creator_id)
);

CREATE INDEX IF NOT EXISTS idx_enrollments_student ON enrollments(student_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_creator ON enrollments(creator_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_status ON enrollments(status);

-- ============================================================================
-- ALTER: video_chunks - add creator_id for multi-tenant isolation
-- ============================================================================
-- Add creator_id to video_chunks for faster multi-tenant queries
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'video_chunks' AND column_name = 'creator_id'
  ) THEN
    ALTER TABLE video_chunks ADD COLUMN creator_id UUID REFERENCES creators(id) ON DELETE CASCADE;

    -- Populate creator_id from videos table
    UPDATE video_chunks vc
    SET creator_id = v.creator_id
    FROM videos v
    WHERE vc.video_id = v.id;

    -- Make it NOT NULL after population
    ALTER TABLE video_chunks ALTER COLUMN creator_id SET NOT NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_video_chunks_creator ON video_chunks(creator_id);

-- ============================================================================
-- ALTER: videos - add storage_path and processing_status
-- ============================================================================
-- Add storage_path for S3/R2 storage and processing status tracking
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'videos' AND column_name = 'storage_path'
  ) THEN
    ALTER TABLE videos ADD COLUMN storage_path TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'videos' AND column_name = 'processing_status'
  ) THEN
    ALTER TABLE videos ADD COLUMN processing_status TEXT DEFAULT 'pending'
      CHECK (processing_status IN ('pending', 'transcribing', 'chunking', 'embedding', 'completed', 'failed'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_videos_processing_status ON videos(processing_status);

-- ============================================================================
-- FUNCTION: match_chunks (Enhanced for multi-tenant)
-- ============================================================================
-- Optimized vector search function with creator-scoped filtering
-- Returns relevant chunks with video metadata and similarity scores
-- ============================================================================

CREATE OR REPLACE FUNCTION match_chunks(
  query_embedding vector(1536),
  filter_creator_id UUID,
  match_count INT DEFAULT 5,
  match_threshold FLOAT DEFAULT 0.7
)
RETURNS TABLE (
  chunk_id UUID,
  video_id UUID,
  video_title TEXT,
  content TEXT,
  start_seconds INT,
  end_seconds INT,
  similarity FLOAT
)
LANGUAGE sql STABLE
AS $$
  SELECT
    c.id AS chunk_id,
    c.video_id,
    v.title AS video_title,
    c.chunk_text AS content,
    c.start_timestamp AS start_seconds,
    c.end_timestamp AS end_seconds,
    1 - (c.embedding <=> query_embedding) AS similarity
  FROM video_chunks c
  JOIN videos v ON v.id = c.video_id
  WHERE
    c.creator_id = filter_creator_id
    AND 1 - (c.embedding <=> query_embedding) > match_threshold
  ORDER BY c.embedding <=> query_embedding
  LIMIT match_count;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION match_chunks TO authenticated, anon;

-- ============================================================================
-- FUNCTION: get_student_enrollments
-- ============================================================================
-- Returns all active creator enrollments for a student
-- ============================================================================

CREATE OR REPLACE FUNCTION get_student_enrollments(p_student_id UUID)
RETURNS TABLE (
  enrollment_id UUID,
  creator_id UUID,
  creator_name TEXT,
  creator_handle TEXT,
  enrolled_at TIMESTAMPTZ,
  status TEXT
)
LANGUAGE sql STABLE
AS $$
  SELECT
    e.id AS enrollment_id,
    c.id AS creator_id,
    c.company_name AS creator_name,
    c.handle AS creator_handle,
    e.enrolled_at,
    e.status
  FROM enrollments e
  JOIN creators c ON e.creator_id = c.id
  WHERE e.student_id = p_student_id
  ORDER BY e.enrolled_at DESC;
$$;

GRANT EXECUTE ON FUNCTION get_student_enrollments TO authenticated, anon;

-- ============================================================================
-- FUNCTION: get_creator_stats
-- ============================================================================
-- Returns enrollment and content statistics for a creator
-- ============================================================================

CREATE OR REPLACE FUNCTION get_creator_stats(p_creator_id UUID)
RETURNS TABLE (
  total_students BIGINT,
  active_students BIGINT,
  total_videos BIGINT,
  processed_videos BIGINT,
  total_chunks BIGINT,
  total_chat_sessions BIGINT
)
LANGUAGE sql STABLE
AS $$
  SELECT
    COUNT(DISTINCT e.student_id) AS total_students,
    COUNT(DISTINCT CASE WHEN e.status = 'active' THEN e.student_id END) AS active_students,
    COUNT(DISTINCT v.id) AS total_videos,
    COUNT(DISTINCT CASE WHEN v.processing_status = 'completed' THEN v.id END) AS processed_videos,
    COUNT(DISTINCT vc.id) AS total_chunks,
    COUNT(DISTINCT cs.id) AS total_chat_sessions
  FROM creators c
  LEFT JOIN enrollments e ON c.id = e.creator_id
  LEFT JOIN videos v ON c.id = v.creator_id
  LEFT JOIN video_chunks vc ON c.id = vc.creator_id
  LEFT JOIN chat_sessions cs ON c.id = cs.creator_id
  WHERE c.id = p_creator_id
  GROUP BY c.id;
$$;

GRANT EXECUTE ON FUNCTION get_creator_stats TO authenticated, anon;

-- ============================================================================
-- Enhanced RLS Policies
-- ============================================================================

-- Enable RLS on enrollments
ALTER TABLE enrollments ENABLE ROW LEVEL SECURITY;

-- Students can view their own enrollments
CREATE POLICY "Students can view own enrollments"
  ON enrollments FOR SELECT
  USING (student_id = auth.uid());

-- Creators can view enrollments for their students
CREATE POLICY "Creators can view their enrollments"
  ON enrollments FOR SELECT
  USING (
    creator_id IN (
      SELECT id FROM creators WHERE whop_user_id = auth.uid()
    )
  );

-- Creators can manage enrollments
CREATE POLICY "Creators can manage enrollments"
  ON enrollments FOR ALL
  USING (
    creator_id IN (
      SELECT id FROM creators WHERE whop_user_id = auth.uid()
    )
  );

-- Students can only view videos from creators they're enrolled with
DROP POLICY IF EXISTS "Students view enrolled creator videos" ON videos;
CREATE POLICY "Students view enrolled creator videos"
  ON videos FOR SELECT
  USING (
    creator_id IN (
      SELECT creator_id FROM enrollments
      WHERE student_id = auth.uid() AND status = 'active'
    )
  );

-- Students can only view chunks from creators they're enrolled with
DROP POLICY IF EXISTS "Students view enrolled creator chunks" ON video_chunks;
CREATE POLICY "Students view enrolled creator chunks"
  ON video_chunks FOR SELECT
  USING (
    creator_id IN (
      SELECT creator_id FROM enrollments
      WHERE student_id = auth.uid() AND status = 'active'
    )
  );

-- Students can only view chat sessions from creators they're enrolled with
DROP POLICY IF EXISTS "Students view own chat sessions" ON chat_sessions;
CREATE POLICY "Students view own chat sessions"
  ON chat_sessions FOR SELECT
  USING (
    student_id = auth.uid()
    AND creator_id IN (
      SELECT creator_id FROM enrollments
      WHERE student_id = auth.uid() AND status = 'active'
    )
  );

-- Creators can view all data for their content
DROP POLICY IF EXISTS "Creators view own videos" ON videos;
CREATE POLICY "Creators view own videos"
  ON videos FOR ALL
  USING (
    creator_id IN (
      SELECT id FROM creators WHERE whop_user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Creators view own chunks" ON video_chunks;
CREATE POLICY "Creators view own chunks"
  ON video_chunks FOR ALL
  USING (
    creator_id IN (
      SELECT id FROM creators WHERE whop_user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Creators view own chat sessions" ON chat_sessions;
CREATE POLICY "Creators view own chat sessions"
  ON chat_sessions FOR SELECT
  USING (
    creator_id IN (
      SELECT id FROM creators WHERE whop_user_id = auth.uid()
    )
  );

-- ============================================================================
-- FUNCTION: enroll_student
-- ============================================================================
-- Enrolls a student with a creator
-- Returns the enrollment ID
-- ============================================================================

CREATE OR REPLACE FUNCTION enroll_student(
  p_student_id UUID,
  p_creator_id UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_enrollment_id UUID;
BEGIN
  -- Check if enrollment already exists
  SELECT id INTO v_enrollment_id
  FROM enrollments
  WHERE student_id = p_student_id AND creator_id = p_creator_id;

  IF v_enrollment_id IS NOT NULL THEN
    -- Reactivate if exists
    UPDATE enrollments
    SET status = 'active', enrolled_at = NOW()
    WHERE id = v_enrollment_id;
    RETURN v_enrollment_id;
  END IF;

  -- Create new enrollment
  INSERT INTO enrollments (student_id, creator_id, status)
  VALUES (p_student_id, p_creator_id, 'active')
  RETURNING id INTO v_enrollment_id;

  RETURN v_enrollment_id;
END;
$$;

GRANT EXECUTE ON FUNCTION enroll_student TO authenticated, anon;

-- ============================================================================
-- FUNCTION: unenroll_student
-- ============================================================================
-- Unenrolls a student from a creator (soft delete)
-- ============================================================================

CREATE OR REPLACE FUNCTION unenroll_student(
  p_student_id UUID,
  p_creator_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE enrollments
  SET status = 'inactive'
  WHERE student_id = p_student_id
    AND creator_id = p_creator_id
    AND status = 'active';

  RETURN FOUND;
END;
$$;

GRANT EXECUTE ON FUNCTION unenroll_student TO authenticated, anon;

-- ============================================================================
-- Comments for Documentation
-- ============================================================================

COMMENT ON TABLE enrollments IS 'Tracks student enrollments with creators (multi-tenant)';
COMMENT ON FUNCTION match_chunks IS 'Vector similarity search for creator-scoped RAG chat';
COMMENT ON FUNCTION get_student_enrollments IS 'Returns all active creator enrollments for a student';
COMMENT ON FUNCTION get_creator_stats IS 'Returns enrollment and content statistics for a creator';
COMMENT ON FUNCTION enroll_student IS 'Enrolls a student with a creator';
COMMENT ON FUNCTION unenroll_student IS 'Unenrolls a student from a creator (soft delete)';

-- ============================================================================
-- End of Migration
-- ============================================================================
