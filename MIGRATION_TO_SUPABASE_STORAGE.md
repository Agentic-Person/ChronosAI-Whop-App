# Migration from AWS S3 to Supabase Storage

## Overview
This document outlines the migration from AWS S3 to Supabase Storage for video file storage in the AI Video Learning Assistant platform.

## Changes Summary

### 1. New Storage Limits Module
**File:** `lib/features/storage-limits.ts`

Created a comprehensive storage limits module with:
- Tier-based storage configurations (FREE, BASIC, PRO, ENTERPRISE)
- Storage quota enforcement functions
- Multi-tenant storage tracking
- Usage summary utilities

**Tier Limits:**
- **FREE**: 5GB storage, 10 videos max, 3 chat questions
- **BASIC**: 25GB storage, 50 videos max, 100 questions/day
- **PRO**: 100GB storage, 200 videos max, 500 questions/day
- **ENTERPRISE**: 500GB storage, unlimited videos, unlimited questions

### 2. Updated Upload Handler
**File:** `lib/video/upload-handler.ts`

**Removed:**
- AWS SDK imports (`@aws-sdk/client-s3`, `@aws-sdk/s3-request-presigner`)
- S3 client configuration
- `generateS3Key()` function
- `getVideoLimits()` function
- `validateVideoLimits()` function
- `createVideoRecord()` function

**Added:**
- Supabase Storage integration
- `generateStoragePath()` - Creates isolated storage paths per creator
- `confirmVideoUpload()` - Confirms upload and updates storage usage
- Storage limit checks before upload
- Multi-tenant folder structure: `{creator_id}/{video_id}/original.{ext}`

**Modified:**
- `generateUploadUrl()` - Now uses Supabase `createSignedUploadUrl()`
- `createVideoPlaceholder()` - Updated to use `storage_path` instead of `s3_key`

### 3. Updated Video Types
**File:** `lib/video/types.ts`

**Changed:**
- `UploadUrlResponse.s3Key` → `UploadUrlResponse.storagePath`
- `CreateVideoData.s3Key` → `CreateVideoData.storagePath`
- `Video.s3_key` → `Video.storage_path`

### 4. Updated API Routes

**File:** `app/api/video/upload-url/route.ts`
- Now generates Supabase signed URLs
- Includes storage usage summary in response
- Enforces tier-based storage limits

**File:** `app/api/video/create/route.ts`
- Renamed to confirm upload endpoint
- Changed from `createVideoRecord()` to `confirmVideoUpload()`
- Updates storage usage after successful upload

### 5. Updated Exports
**File:** `lib/video/index.ts`
- Removed: `getVideoLimits`, `validateVideoLimits`, `createVideoRecord`
- Added: `confirmVideoUpload`
- Updated usage examples to reflect Supabase Storage

## Database Schema Changes

The following database migration already exists:
**File:** `supabase/migrations/20251125000001_multitenant_storage_tiers.sql`

This migration provides:
- `creator_storage` table for tracking usage
- `tier_configurations` table for tier limits
- `check_storage_limit()` function for atomic checks
- `update_storage_usage()` function for atomic updates
- RLS policies for multi-tenant isolation

## Storage Bucket Setup

**Bucket Name:** `videos`

### Required Supabase Storage Configuration:

1. **Create Storage Bucket:**
   ```sql
   INSERT INTO storage.buckets (id, name, public)
   VALUES ('videos', 'videos', true);
   ```

2. **Storage Policies:**
   ```sql
   -- Allow creators to upload to their own folder
   CREATE POLICY "Creators can upload to own folder"
   ON storage.objects FOR INSERT
   TO authenticated
   WITH CHECK (
     bucket_id = 'videos' AND
     (storage.foldername(name))[1] IN (
       SELECT id::text FROM creators WHERE user_id = auth.uid()
     )
   );

   -- Allow creators to read from their own folder
   CREATE POLICY "Creators can read own videos"
   ON storage.objects FOR SELECT
   TO authenticated
   USING (
     bucket_id = 'videos' AND
     (storage.foldername(name))[1] IN (
       SELECT id::text FROM creators WHERE user_id = auth.uid()
     )
   );

   -- Allow creators to delete from their own folder
   CREATE POLICY "Creators can delete own videos"
   ON storage.objects FOR DELETE
   TO authenticated
   USING (
     bucket_id = 'videos' AND
     (storage.foldername(name))[1] IN (
       SELECT id::text FROM creators WHERE user_id = auth.uid()
     )
   );
   ```

## Environment Variables

### Remove (AWS S3):
```bash
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_REGION=
AWS_S3_BUCKET=
```

### Ensure These Exist (Supabase):
```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

## Migration Steps

### 1. Database Setup
```bash
# Run the storage migration if not already applied
npx supabase migration up
```

### 2. Create Storage Bucket
In Supabase Dashboard:
- Navigate to Storage
- Create bucket named `videos`
- Set to public
- Apply the RLS policies above

### 3. Update Dependencies (Optional)
```bash
# Remove AWS SDK (optional - doesn't hurt to leave)
npm uninstall @aws-sdk/client-s3 @aws-sdk/s3-request-presigner
```

### 4. Test Upload Flow
```typescript
// 1. Request upload URL
const response = await fetch('/api/video/upload-url', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-creator-id': creatorId,
  },
  body: JSON.stringify({
    filename: 'test-video.mp4',
    contentType: 'video/mp4',
    fileSize: 1024 * 1024 * 100, // 100MB
  }),
});

const { uploadUrl, videoId, storagePath, storage } = await response.json();

// 2. Upload video to Supabase Storage
await fetch(uploadUrl, {
  method: 'PUT',
  body: videoFile,
  headers: { 'Content-Type': 'video/mp4' },
});

// 3. Confirm upload
await fetch('/api/video/confirm', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-creator-id': creatorId,
  },
  body: JSON.stringify({ videoId }),
});
```

## Multi-Tenant Isolation

### Storage Path Structure
```
videos/
  ├── {creator_id_1}/
  │   ├── {video_id_1}/
  │   │   └── original.mp4
  │   └── {video_id_2}/
  │       └── original.mp4
  └── {creator_id_2}/
      └── {video_id_3}/
          └── original.mp4
```

### Isolation Guarantees
1. **Storage Policies**: RLS policies ensure creators can only access their own folders
2. **Path Generation**: `generateStoragePath()` always includes creator_id
3. **Database Functions**: `check_storage_limit()` and `update_storage_usage()` are creator-scoped
4. **API Validation**: All endpoints validate creator_id from session

## Benefits of Supabase Storage

1. **Unified Infrastructure**: Single platform for database, auth, and storage
2. **Integrated Security**: RLS policies work seamlessly with Supabase Auth
3. **Cost Efficiency**: No separate S3 costs, included in Supabase pricing
4. **Simplified Deployment**: No AWS credentials to manage
5. **Better DX**: Single SDK for all operations
6. **CDN Integration**: Built-in CDN for video delivery

## Testing Checklist

- [ ] Upload video successfully generates signed URL
- [ ] Storage limits are enforced (FREE tier: 5GB)
- [ ] Video count limits are enforced (FREE tier: 10 videos)
- [ ] Creator A cannot access Creator B's videos
- [ ] Storage usage updates after upload
- [ ] Processing pipeline works with new storage paths
- [ ] Video playback works from Supabase Storage
- [ ] Upgrade flow changes tier limits correctly

## Rollback Plan

If issues occur:

1. **Revert Code Changes:**
   ```bash
   git revert <commit-hash>
   ```

2. **Restore AWS Environment Variables:**
   Add back AWS credentials to `.env.local`

3. **Switch Upload Logic:**
   Temporarily route uploads to S3 while debugging Supabase Storage

## Notes

- AWS SDK dependencies can be removed but are left in `package.json` for now
- Existing S3 videos should be migrated separately (not covered here)
- Video processing pipeline uses `storage_path` field instead of `s3_key`
- The `videos` table still has `video_url` which points to public Supabase Storage URL

## Support

For issues or questions:
1. Check Supabase Storage documentation: https://supabase.com/docs/guides/storage
2. Review RLS policies in Supabase Dashboard
3. Check logs in Supabase Dashboard > Logs > Storage
4. Verify bucket permissions and policies
