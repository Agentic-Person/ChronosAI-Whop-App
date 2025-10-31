-- ============================================================================
-- QUICK DATABASE CLEANUP - Run this in Supabase SQL Editor
-- Takes 30 seconds, deletes all 12,733 test videos instantly
-- ============================================================================

-- Step 1: Delete all chunks for non-demo videos (fast, no FK issues)
DELETE FROM video_chunks
WHERE video_id IN (
  SELECT id FROM videos
  WHERE creator_id = '00000000-0000-0000-0000-000000000001'
  AND is_demo_content = false
);

-- Step 2: Delete all test videos in one shot
DELETE FROM videos
WHERE creator_id = '00000000-0000-0000-0000-000000000001'
AND is_demo_content = false;

-- Step 3: Verify cleanup (should show 9 demo videos remaining)
SELECT
  COUNT(*) as total_videos,
  COUNT(CASE WHEN is_demo_content THEN 1 END) as demo_videos
FROM videos
WHERE creator_id = '00000000-0000-0000-0000-000000000001';

-- Expected result: total_videos = 9, demo_videos = 9
