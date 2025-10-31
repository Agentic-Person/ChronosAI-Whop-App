# Manual Database Cleanup Instructions

## Problem
Database has 12,742 videos (12,733 are test duplicates). Automated cleanup scripts timeout due to statement limits.

## Current State
- **Total Videos:** 12,742
- **Demo Videos:** 9 (these are good - keep them!)
- **Test Videos:** 12,733 (need to delete)
- **Courses:** 2 (1 demo course)
- **Chunks:** 9 (only for demo videos)

## Solution: Manual Cleanup via Supabase Dashboard

### Step 1: Access Supabase SQL Editor
1. Go to https://supabase.com/dashboard
2. Select your project: `dddttlnrkwaddzjvkacp`
3. Click "SQL Editor" in left sidebar

### Step 2: Delete Video Chunks First (Foreign Key)
Run this query first to delete chunks for non-demo videos:

```sql
DELETE FROM video_chunks
WHERE video_id IN (
  SELECT id FROM videos
  WHERE creator_id = '00000000-0000-0000-0000-000000000001'
  AND (is_demo_content = false OR is_demo_content IS NULL)
  LIMIT 5000
);
```

**Note:** You may need to run this multiple times if it times out.

### Step 3: Delete Test Videos in Batches
Run this query repeatedly until it returns 0 rows deleted:

```sql
DELETE FROM videos
WHERE id IN (
  SELECT id FROM videos
  WHERE creator_id = '00000000-0000-0000-0000-000000000001'
  AND (is_demo_content = false OR is_demo_content IS NULL)
  LIMIT 1000
)
RETURNING id;
```

### Step 4: Verify Cleanup
Check remaining videos:

```sql
SELECT
  COUNT(*) as total,
  SUM(CASE WHEN is_demo_content THEN 1 ELSE 0 END) as demo_count
FROM videos
WHERE creator_id = '00000000-0000-0000-0000-000000000001';
```

**Expected Result:**
- total: 9
- demo_count: 9

## Alternative: Nuclear Option (Delete All Non-Demo)

If batches still timeout, use this aggressive approach:

```sql
-- 1. Drop foreign key temporarily
ALTER TABLE video_chunks DROP CONSTRAINT IF EXISTS video_chunks_video_id_fkey;

-- 2. Delete all test videos
DELETE FROM videos
WHERE creator_id = '00000000-0000-0000-0000-000000000001'
AND (is_demo_content = false OR is_demo_content IS NULL);

-- 3. Delete orphaned chunks
DELETE FROM video_chunks
WHERE video_id NOT IN (SELECT id FROM videos);

-- 4. Re-add foreign key
ALTER TABLE video_chunks
ADD CONSTRAINT video_chunks_video_id_fkey
FOREIGN KEY (video_id) REFERENCES videos(id) ON DELETE CASCADE;
```

## After Cleanup

Once you have only 9 demo videos remaining, the app should work properly:
- ✅ Courses page will load (auth bypass is now in place)
- ✅ AI Chat will work with 9 demo videos
- ✅ No more "1000 videos" cluttering the dashboard

## Demo Videos (Should Remain)
1. Whop Tutorial For Beginners 2025 (Step-By-Step) [5 duplicates]
2. How to Sell Digital Downloads on Whop
3. Whop: Sell Courses - Start your Online Shop
4. How To Make $100,000 Per Month With Whop

---

**Created:** 2025-10-31
**Author:** Claude Code AI Assistant
