-- ============================================================================
-- FIX: match_video_chunks Multi-Tenant Security
-- ============================================================================
-- This migration fixes a critical security issue where creator_id filtering
-- was optional, allowing cross-creator content access.
-- ============================================================================

-- Drop the old function
DROP FUNCTION IF EXISTS match_video_chunks(vector(1536), float, int, uuid, uuid[]);

-- Recreate with REQUIRED creator_id parameter
CREATE OR REPLACE FUNCTION match_video_chunks(
  query_embedding vector(1536),
  match_threshold float,
  match_count int,
  filter_creator_id uuid,  -- REQUIRED, not nullable
  filter_video_ids uuid[] DEFAULT NULL
)
RETURNS TABLE (
  chunk_id uuid,
  video_id uuid,
  chunk_text text,
  chunk_index int,
  start_timestamp int,
  end_timestamp int,
  embedding vector(1536),
  topic_tags text[],
  created_at timestamp,
  similarity float,
  video_title text,
  video_url text
)
LANGUAGE sql STABLE
AS $$
  SELECT
    vc.id as chunk_id,
    vc.video_id,
    vc.chunk_text,
    vc.chunk_index,
    vc.start_timestamp,
    vc.end_timestamp,
    vc.embedding,
    vc.topic_tags,
    vc.created_at,
    1 - (vc.embedding <=> query_embedding) as similarity,
    v.title as video_title,
    v.video_url
  FROM video_chunks vc
  JOIN videos v ON v.id = vc.video_id
  WHERE
    -- CRITICAL: Multi-tenant isolation - ALWAYS filter by creator_id
    v.creator_id = filter_creator_id
    -- Optional video_ids filter
    AND (filter_video_ids IS NULL OR vc.video_id = ANY(filter_video_ids))
    -- Similarity threshold
    AND 1 - (vc.embedding <=> query_embedding) > match_threshold
  ORDER BY vc.embedding <=> query_embedding
  LIMIT match_count;
$$;

-- Add function comment explaining multi-tenant security
COMMENT ON FUNCTION match_video_chunks IS 'Vector similarity search with REQUIRED creator_id for multi-tenant isolation. Never returns content from other creators.';

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION match_video_chunks TO authenticated, anon;
