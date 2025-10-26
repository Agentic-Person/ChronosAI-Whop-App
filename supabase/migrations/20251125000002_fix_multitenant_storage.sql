-- ============================================================================
-- FIX: Add missing creator_id column to video_chunks
-- This needs to run BEFORE the multitenant storage migration
-- ============================================================================

-- Add creator_id to video_chunks table if it doesn't exist
ALTER TABLE video_chunks
ADD COLUMN IF NOT EXISTS creator_id UUID REFERENCES creators(id) ON DELETE CASCADE;

-- Update existing chunks to have creator_id from their videos
UPDATE video_chunks
SET creator_id = v.creator_id
FROM videos v
WHERE video_chunks.video_id = v.id
AND video_chunks.creator_id IS NULL;

-- Now you can safely run the original migration
-- The index creation will work because creator_id now exists