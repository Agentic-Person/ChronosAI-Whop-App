-- ============================================================================
-- VECTOR SEARCH FUNCTION FOR RAG
-- ============================================================================

-- Function to match video chunks using vector similarity search
CREATE OR REPLACE FUNCTION match_video_chunks(
  query_embedding vector(1536),
  match_threshold float DEFAULT 0.7,
  match_count int DEFAULT 5,
  filter_creator_id uuid DEFAULT NULL,
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
    (filter_creator_id IS NULL OR v.creator_id = filter_creator_id)
    AND (filter_video_ids IS NULL OR vc.video_id = ANY(filter_video_ids))
    AND 1 - (vc.embedding <=> query_embedding) > match_threshold
  ORDER BY vc.embedding <=> query_embedding
  LIMIT match_count;
$$;

-- Create index for faster vector search if not exists
CREATE INDEX IF NOT EXISTS idx_video_chunks_embedding
ON video_chunks USING ivfflat (embedding vector_cosine_ops);

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION match_video_chunks TO authenticated, anon;
