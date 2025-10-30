# Troubleshooting Guide - Trial System Implementation

**Last Updated:** October 30, 2025
**Context:** 7-day trial system with demo content provisioning

---

## 🚨 Known Issues

### 1. Missing Demo Videos (2 of 6)

**Issue:** Two YouTube videos failed to import during demo content setup

**Videos That Failed:**
1. **Alex Hormozi - How to Build a LEGIT Online Course (Works in 2025)**
   - URL: https://www.youtube.com/watch?v=oTQPxPFROck
   - Status: API processed successfully (200 OK), but not saved to database
   - Log: "Sample segment: {"text":"you've probably seen these make ten","offset":0,"duration":2.58}"

2. **A Beginner's Guide to Making Money with Online Courses**
   - URL: https://www.youtube.com/watch?v=TmuDsq4m4Ts
   - Status: API processed successfully (200 OK), but not saved to database
   - Log: "Sample segment: {"text":"","offset":0,"duration":86}"

**What Worked:**
- Transcript extraction succeeded ✅
- YouTube metadata fetched ✅
- API returned 200 status ✅

**What Failed:**
- Database insert (records not found in `videos` table) ❌
- No error logged in API response ❌

**Workaround Applied:**
- Simplified demo content from 6 videos to 4 videos
- Created single course instead of 2 courses
- All 4 working videos successfully marked with `is_demo_content = true`

**Potential Root Causes:**
1. Silent database error during insert (not caught by error handler)
2. Transaction rollback without logging
3. Row Level Security (RLS) policy blocking system demo creator
4. Duplicate video detection logic (category field collision)

**Investigation Steps:**
```typescript
// Check if videos exist with different creator_id
SELECT id, title, creator_id, created_at
FROM videos
WHERE title ILIKE '%Alex Hormozi%'
OR title ILIKE '%Beginner%Guide%Online Course%';

// Check for database constraints
SELECT conname, contype, pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conrelid = 'videos'::regclass;

// Check RLS policies
SELECT * FROM pg_policies WHERE tablename = 'videos';
```

**Fix Priority:** Low (system works with 4 videos)

---

### 2. RAG Processing Failures

**Issue:** Video embeddings not generated during import

**Symptoms:**
- API logs show: `⚠️ Video imported but RAG processing failed`
- Videos saved to database ✅
- Transcripts stored ✅
- `video_chunks` table empty (no embeddings) ❌
- AI chat will not work on demo videos ❌

**Affected Videos:**
- All 4 Whop tutorial videos
- All demo content lacks vector embeddings

**Code Location:**
- [app/api/video/youtube-import/route.ts](../app/api/video/youtube-import/route.ts) (lines 250-295)

**Error Pattern:**
```
Sample segment: {"text":"Hey everyone, my name is Riley and in","offset":0.08,"duration":2.559}
✅ Using system demo creator for demo content setup
⚠️  Video imported but RAG processing failed
 POST /api/video/youtube-import 200 in 1851ms
```

**What Works:**
- Transcript extraction ✅
- Transcript storage in database ✅
- Video metadata saved ✅

**What Fails:**
- `chunkTranscript()` - Text chunking
- `generateEmbeddings()` - OpenAI API call
- `storeChunks()` / `storeEmbeddings()` - Database insert

**Potential Root Causes:**
1. OpenAI API key not accessible in route context
2. Embedding generation timeout
3. `video_chunks` table missing or incorrect schema
4. Service role permissions issue

**Investigation Steps:**
```bash
# Test OpenAI API access
curl https://api.openai.com/v1/embeddings \
  -H "Authorization: Bearer $OPENAI_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"input":"test","model":"text-embedding-ada-002"}'

# Check video_chunks table exists
npx tsx -e "
import { createClient } from '@supabase/supabase-js';
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const { data, error } = await supabase.from('video_chunks').select('*').limit(1);
console.log('Table exists:', !error);
"

# Test manual embedding generation
npx tsx scripts/test-rag-processing.ts
```

**Fix Priority:** **HIGH** (breaks AI chat feature)

**Recommended Solution:**
1. Add comprehensive error logging in RAG processing
2. Verify `video_chunks` schema matches embedding dimensions (1536 for ada-002)
3. Test OpenAI API call isolation
4. Add retry logic with exponential backoff
5. Consider async processing (background job queue)

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
