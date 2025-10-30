# Troubleshooting Guide - Trial System Implementation

**Last Updated:** October 30, 2025
**Context:** 7-day trial system with demo content provisioning

---

## 🚨 Known Issues

### 1. Missing Demo Videos (RESOLVED ✅)

**Issue:** ~~Two YouTube videos failed to import~~ **UPDATE: All 6 videos actually imported successfully!**

**Resolution:** Server logs reveal ALL 6 videos were saved to database:

1. ✅ **Whop Tutorial For Beginners 2025**
   - Video ID: `66730f3c-81a5-4a18-a767-0e2ef871cd1f`
   - Transcript: 29,403 characters, 783 segments

2. ✅ **How to Sell Digital Downloads on Whop**
   - Video ID: `819a1cae-ce52-41c0-8989-a6c22827a096`
   - Transcript: 8,748 characters, 231 segments

3. ✅ **Whop: Sell Courses - Start your Online Shop**
   - Video ID: `d9db17f6-fe82-4dd0-802d-b96f689f0b61`
   - Transcript: 13,946 characters, 387 segments

4. ✅ **How To Make $100,000 Per Month With Whop**
   - Video ID: `57148cce-a6fb-4b7e-a8a2-aaad882695b0`
   - Transcript: 34,304 characters, 909 segments

5. ✅ **Alex Hormozi - How to Build a LEGIT Online Course** (was thought missing)
   - Video ID: `fc9415ec-b491-4a36-9e11-868bb7874a18`
   - Transcript: 7,590 characters, 200 segments

6. ✅ **Beginner's Guide to Making Money with Online Courses** (was thought missing)
   - Video ID: `9f9892f6-ccb7-4cbd-bb35-f240c64ceda0`
   - Transcript: 82,188 characters, 681 segments

**Status:** Videos successfully imported, transcripts extracted. Real issue is RAG processing (see Issue #2 below).

**Fix Priority:** ~~Low~~ **RESOLVED** (all videos in database)

---

### 2. RAG Processing Failures - Chunk Validation Error (CRITICAL ⚠️)

**Issue:** Video embeddings not generated due to chunk validation failures

**Root Cause Identified:** `ChunkingError: Invalid chunks` at storeChunks validation

**Full Error Stack:**
```
❌ Error processing transcript: ChunkingError: Invalid chunks
    at storeChunks (webpack-internal:///(rsc)/./lib/video/chunking.ts:261:15)
    at POST (webpack-internal:///(rsc)/./app/api/video/youtube-import/route.ts:241:87)
{
  code: 'CHUNKING_ERROR',
  videoId: '66730f3c-81a5-4a18-a767-0e2ef871cd1f',
  details: { errors: [ 'Chunk 8 failed validation' ] }
}
```

**Symptoms:**
- API logs show: `⚠️ Video imported but RAG processing failed`
- Videos saved to database ✅
- Transcripts stored ✅
- **Chunks created but validation fails** ❌
- `video_chunks` table empty (no embeddings) ❌
- AI chat will not work on demo videos ❌

**Affected Videos:**
- ALL 6 imported videos (including Alex Hormozi, Beginner's Guide)
- Video 1: "Chunk 8 failed validation" (out of 9 chunks)
- Video 2: "Chunk 2 failed validation" (out of 3 chunks)
- All demo content lacks vector embeddings

**Code Location:**
- [lib/video/chunking.ts:261](../lib/video/chunking.ts#L261) - Validation failure
- [app/api/video/youtube-import/route.ts:237-241](../app/api/video/youtube-import/route.ts#L237) - Chunk processing

**What Actually Works:**
- ✅ Transcript extraction (all 6 videos)
- ✅ Transcript storage in database
- ✅ Video metadata saved
- ✅ **Chunk creation** (9, 3, 4, 10, 3, 25 chunks created)
- ✅ Chunk debug logs show proper timestamps and text

**What Fails:**
- ❌ **Chunk validation** in `storeChunks()` at line 261
- ❌ Database insert for `video_chunks` table
- ❌ Embedding generation (never reached due to validation failure)

**Actual Root Cause:**
The chunking process creates chunks successfully, but the `storeChunks()` validation function at line 261 is rejecting specific chunks. Debug logs show:
- Chunk metadata looks correct (timestamps, text, word counts)
- All chunks have `startTimestamp: 0.00s` (suspicious - may be the issue!)
- Each chunk shows `endTimestamp` progressing correctly
- Validation logic may expect non-zero start timestamps

**Hypothesis:**
The validation function is checking that `startTimestamp` differs from `endTimestamp`, but ALL chunks have `startTimestamp: 0.00s` due to segment-based timestamp calculation bug. The debug logs explicitly state:
```
Manual chunkStartTime (ignored): 161.19s
Using segment-based timestamps:
  startTimestamp: 0.00s (from first segment)  <-- BUG: Always 0!
  endTimestamp: 336.56s (from last segment)
```

**Potential Fixes:**
1. Fix timestamp calculation to use `chunkStartTime` instead of first segment
2. Update validation logic to allow zero start timestamps
3. Investigate why "Manual chunkStartTime (ignored)" is being ignored

**Investigation Steps:**
```bash
# 1. Inspect chunking validation logic (line 261)
# Check what validation is failing for chunks

# 2. View chunk debug output for failed chunks
# Server logs show: "Chunk 8 failed validation", "Chunk 2 failed validation"

# 3. Examine timestamp calculation bug
# All chunks show startTimestamp: 0.00s instead of progressive timestamps

# 4. Check if validation requires startTimestamp != endTimestamp
# Possible validation: if (chunk.start === chunk.end) throw error
```

**Fix Priority:** **CRITICAL** (completely breaks AI chat feature on ALL videos)

**Recommended Solution (Immediate Fix):**

**Option 1: Fix Timestamp Calculation (Best)**
In `lib/video/chunking.ts`, change line ~89 to use the manual `chunkStartTime` instead of first segment:
```typescript
// BEFORE (BROKEN):
startTimestamp: segments[0].offset  // Always 0.00s

// AFTER (FIXED):
startTimestamp: chunkStartTime      // Progressive: 161.19s, 357.26s, etc.
```

**Option 2: Relax Validation (Quick Fix)**
In `lib/video/chunking.ts` line 261, allow zero start timestamps:
```typescript
// Allow startTimestamp === 0 for first chunk
if (chunk.startTimestamp < 0 || chunk.endTimestamp <= chunk.startTimestamp) {
  // Change to: chunk.endTimestamp < chunk.startTimestamp
}
```

**Option 3: Skip Validation (Temporary Workaround)**
Comment out validation at line 261 to allow all chunks through for testing.

---

### 3. Database Cleanup Timeout

**Issue:** Deleting 12,733 test videos caused statement timeout

**Error:**
```
❌ Error: canceling statement due to statement timeout
```

**Context:**
- System demo creator had 12,733+ test videos from development
- Single DELETE query exceeded Supabase timeout limit

**Attempted Fix:**
- Batch deletion script (1000 videos at a time)
- Result: `❌ Error: Bad Request`

**Workaround:**
- Left test videos in database
- Trial system ignores them (only uses `is_demo_content = true`)
- No impact on production functionality

**Long-term Solution:**
```sql
-- Manual cleanup via Supabase SQL Editor
DELETE FROM videos
WHERE creator_id = '00000000-0000-0000-0000-000000000001'
AND is_demo_content = false
AND created_at < NOW() - INTERVAL '1 day'
LIMIT 5000;

-- Run multiple times until all test data removed
```

**Fix Priority:** Low (doesn't affect functionality)

---

## ✅ Working Demo Content

**Successfully Imported:**

1. **Whop Tutorial For Beginners 2025 (Step-By-Step)**
   - URL: https://youtu.be/e6NKN9QlirM
   - Status: ✅ Imported, transcript extracted, marked as demo

2. **How to Sell Digital Downloads on Whop**
   - URL: https://www.youtube.com/watch?v=tnEAjKoTD64
   - Status: ✅ Imported, transcript extracted, marked as demo

3. **Whop: Sell Courses - Start your Online Shop**
   - URL: https://www.youtube.com/watch?v=A7_-EqnstnQ
   - Status: ✅ Imported, transcript extracted, marked as demo

4. **How To Make $100,000 Per Month With Whop**
   - URL: https://www.youtube.com/watch?v=vMZHiBhr0SM
   - Status: ✅ Imported, transcript extracted, marked as demo

**Course Created:**
- **"Getting Started with Whop"**
- Course ID: `98e45c09-b513-4019-9eca-a7f16d241241`
- Videos: 4
- `is_demo = true` ✅

---

## 🔧 Debug Scripts

**Check Migration Status:**
```bash
npx tsx scripts/check-migration.ts
```

**Verify Demo Videos:**
```bash
npx tsx scripts/check-demo-videos.ts
npx tsx scripts/check-whop-videos.ts
```

**Re-create Demo Course:**
```bash
npx tsx scripts/create-demo-course.ts
```

**Manual Database Queries:**
```sql
-- Count demo content
SELECT COUNT(*) FROM videos WHERE is_demo_content = true;
SELECT COUNT(*) FROM courses WHERE is_demo = true;

-- View demo content
SELECT id, title, is_demo_content, created_at
FROM videos
WHERE creator_id = '00000000-0000-0000-0000-000000000001'
AND is_demo_content = true;

-- Check RAG chunks
SELECT v.title, COUNT(vc.id) as chunk_count
FROM videos v
LEFT JOIN video_chunks vc ON v.id = vc.video_id
WHERE v.is_demo_content = true
GROUP BY v.id, v.title;
```

---

## 🚀 Production Deployment Checklist

Before deploying, ensure:

- [ ] Migration applied: `npx tsx scripts/check-migration.ts`
- [ ] 4 demo videos exist with `is_demo_content = true`
- [ ] Demo course exists with `is_demo = true`
- [ ] System demo creator exists (ID: `00000000-0000-0000-0000-000000000001`)
- [ ] Environment variables set (WHOP product IDs)
- [ ] Whop webhooks configured
- [ ] **Fix RAG processing before launch** (AI chat won't work otherwise)

---

## 📞 Support Contacts

**If issues persist:**
- GitHub Issues: https://github.com/Agentic-Person/ChronosAI-Whop-App/issues
- Developer: Jimmy@agenticpersonnel.com
- Documentation: [docs/TRIAL_SYSTEM_IMPLEMENTATION.md](./TRIAL_SYSTEM_IMPLEMENTATION.md)

---

## 📝 Change Log

**October 30, 2025:**
- Documented 2 missing demo videos (Alex Hormozi, Beginner's Guide)
- Identified RAG processing failures
- Noted database cleanup timeout issue
- Confirmed 4/6 videos working successfully
- Created troubleshooting guide

---

**Next Review:** Before production deployment
