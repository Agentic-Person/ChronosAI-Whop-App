-- ============================================================================
-- Add YouTube Video Support
-- ============================================================================
-- Adds columns to support YouTube video imports alongside uploaded videos

-- Add source column to distinguish between upload and youtube
ALTER TABLE videos
ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'upload' CHECK (source IN ('upload', 'youtube'));

-- Add youtube_id for YouTube videos
ALTER TABLE videos
ADD COLUMN IF NOT EXISTS youtube_id TEXT;

-- Add external_url for YouTube video URLs
ALTER TABLE videos
ADD COLUMN IF NOT EXISTS external_url TEXT;

-- Add index for youtube_id lookups
CREATE INDEX IF NOT EXISTS idx_videos_youtube_id ON videos(youtube_id);

-- Add index for source filtering
CREATE INDEX IF NOT EXISTS idx_videos_source ON videos(source);

-- Update video_url to be nullable (YouTube videos don't have uploaded files)
ALTER TABLE videos
ALTER COLUMN video_url DROP NOT NULL;

-- Add comment for clarity
COMMENT ON COLUMN videos.source IS 'Video source type: upload (uploaded file) or youtube (embedded YouTube video)';
COMMENT ON COLUMN videos.youtube_id IS 'YouTube video ID (e.g., dQw4w9WgXcQ) for embedded videos';
COMMENT ON COLUMN videos.external_url IS 'Full external URL (primarily for YouTube videos)';
