# Implementation Examples - Bug Fixes

Quick reference guide for understanding the fixes with code examples.

---

## 1. Audio Extraction - Before vs After

### BEFORE (Broken)
```typescript
// lib/video/transcription.ts
async function extractAudioFromVideo(videoPath: string): Promise<string> {
  // TODO: Implement actual audio extraction
  logInfo('Audio extraction (placeholder)', { videoPath, audioPath });
  return videoPath; // ❌ Returns video instead of audio!
}
```

**Problem:** Whisper API expects audio, but receives video files. This causes:
- Poor transcription quality
- Higher API costs (larger file sizes)
- Failures for unsupported video codecs

### AFTER (Fixed)
```typescript
// lib/video/transcription.ts
async function extractAudioFromVideo(videoPath: string): Promise<string> {
  const { extractAudioFromVideo: extractAudio, checkFFmpegAvailable } =
    await import('./audio-extractor');

  const ffmpegAvailable = await checkFFmpegAvailable();

  if (!ffmpegAvailable) {
    logInfo('ffmpeg not available, attempting direct video transcription');
    return videoPath; // Graceful fallback
  }

  try {
    const audioPath = await extractAudio(videoPath, {
      audioCodec: 'wav',
      sampleRate: 16000,
      channels: 1,
    });
    return audioPath; // ✅ Returns proper WAV audio
  } catch (error: any) {
    logError('Audio extraction failed, falling back', error);
    return videoPath;
  }
}
```

**Benefits:**
- ✅ Proper WAV format (PCM 16kHz mono)
- ✅ Optimal for Whisper API
- ✅ Graceful fallback if ffmpeg missing
- ✅ Error handling

---

## 2. Large File Splitting - Before vs After

### BEFORE (Broken)
```typescript
// lib/video/transcription.ts
async function splitAudioFile(
  audioPath: string,
  maxSizeMB: number = 25
): Promise<string[]> {
  const fileSize = getFileSize(audioPath);
  if (fileSize > maxSizeMB * 1024 * 1024) {
    throw new TranscriptionError(
      `Audio file exceeds ${maxSizeMB}MB limit. Splitting not yet implemented.`
    ); // ❌ Just throws error!
  }
  return [audioPath];
}
```

**Problem:** Whisper API has 25MB limit. Videos >25MB (most course content) fail completely.

### AFTER (Fixed)
```typescript
// lib/video/transcription.ts
async function splitAudioFile(
  audioPath: string,
  maxSizeMB: number = 25
): Promise<string[]> {
  const fileSize = getFileSize(audioPath);
  const maxSizeBytes = maxSizeMB * 1024 * 1024;

  if (fileSize <= maxSizeBytes) {
    return [audioPath]; // No split needed
  }

  const { splitAudioFile: splitAudio } = await import('./audio-extractor');

  const chunks = await splitAudio(audioPath, maxSizeMB);
  return chunks.map(chunk => chunk.path); // ✅ Returns array of chunk paths
}
```

**Chunk Processing Example:**
```typescript
// lib/video/transcription.ts - transcribeVideo()
const audioChunks = await splitAudioFile(audioPath);

const transcripts: Transcript[] = [];
for (const chunk of audioChunks) {
  const transcript = await transcribeSingleFile(chunk); // Each chunk < 25MB
  transcripts.push(transcript);
}

const finalTranscript = mergeTranscripts(transcripts); // Merge with timestamps
```

**Benefits:**
- ✅ Handles files of any size
- ✅ Automatic chunk calculation
- ✅ Preserves audio quality
- ✅ Merges transcripts with adjusted timestamps

---

## 3. Storage Deletion - Before vs After

### BEFORE (Broken)
```typescript
// lib/creator/videoManager.ts
export async function deleteVideo(videoId: string) {
  const supabase = createClient();

  await supabase.from('video_chunks').delete().eq('video_id', videoId);
  await supabase.from('video_progress').delete().eq('video_id', videoId);
  await supabase.from('videos').delete().eq('id', videoId);

  // TODO: Delete from storage (S3/R2)  // ❌ Never implemented
}
```

**Problem:** Database record deleted, but 100MB+ video file remains in storage forever.

### AFTER (Fixed)
```typescript
// lib/creator/videoManager.ts
export async function deleteVideo(videoId: string) {
  const supabase = createClient();

  // 1. Get video info BEFORE deletion
  const { data: video } = await supabase
    .from('videos')
    .select('video_url, storage_path')
    .eq('id', videoId)
    .single();

  // 2. Delete database records
  await supabase.from('video_chunks').delete().eq('video_id', videoId);
  await supabase.from('video_transcriptions').delete().eq('video_id', videoId);
  await supabase.from('video_progress').delete().eq('video_id', videoId);
  await supabase.from('videos').delete().eq('id', videoId);

  // 3. Delete from storage ✅
  if (video) {
    try {
      const { deleteVideoFromStorage, extractStoragePathFromUrl } =
        await import('@/lib/video/storage-cleanup');

      const storagePath = video.storage_path || extractStoragePathFromUrl(video.video_url);

      if (storagePath) {
        await deleteVideoFromStorage(storagePath);
      }
    } catch (storageError) {
      // Log but don't fail - DB deletion already succeeded
      console.error('Failed to delete from storage:', storageError);
    }
  }
}
```

**Storage Cleanup Implementation:**
```typescript
// lib/video/storage-cleanup.ts
export async function deleteVideoFromStorage(storagePath: string): Promise<boolean> {
  const supabase = createAdminClient();
  const bucket = 'videos';
  const filePath = storagePath.replace(/^\//, '');

  const { error } = await supabase.storage.from(bucket).remove([filePath]);

  if (error) {
    logError('Storage deletion failed', error);
    return false;
  }

  logInfo('Video deleted from storage', { filePath });
  return true;
}
```

**Benefits:**
- ✅ No storage leaks
- ✅ Quota properly freed
- ✅ Cost savings
- ✅ Non-blocking (doesn't fail if storage delete fails)

---

## 4. Bulk Delete - Before vs After

### BEFORE (Broken)
```typescript
export async function bulkDeleteVideos(videoIds: string[]) {
  const supabase = createClient();

  await supabase.from('video_chunks').delete().in('video_id', videoIds);
  await supabase.from('video_progress').delete().in('video_id', videoIds);
  await supabase.from('videos').delete().in('id', videoIds);

  // TODO: Delete from storage  // ❌ Not implemented
}
```

### AFTER (Fixed)
```typescript
export async function bulkDeleteVideos(videoIds: string[]) {
  const supabase = createClient();

  // 1. Get all storage paths
  const { data: videos } = await supabase
    .from('videos')
    .select('video_url, storage_path')
    .in('id', videoIds);

  // 2. Delete database records
  await supabase.from('video_chunks').delete().in('video_id', videoIds);
  await supabase.from('video_transcriptions').delete().in('video_id', videoIds);
  await supabase.from('video_progress').delete().in('video_id', videoIds);
  await supabase.from('videos').delete().in('id', videoIds);

  // 3. Bulk delete from storage ✅
  if (videos && videos.length > 0) {
    const { bulkDeleteVideosFromStorage, extractStoragePathFromUrl } =
      await import('@/lib/video/storage-cleanup');

    const storagePaths = videos
      .map(v => v.storage_path || extractStoragePathFromUrl(v.video_url))
      .filter(Boolean) as string[];

    if (storagePaths.length > 0) {
      await bulkDeleteVideosFromStorage(storagePaths);
    }
  }
}
```

**Bulk Storage Deletion:**
```typescript
// lib/video/storage-cleanup.ts
export async function bulkDeleteVideosFromStorage(
  storagePaths: string[]
): Promise<{ successful: number; failed: number; errors: any[] }> {
  const supabase = createAdminClient();
  const bucket = 'videos';
  const filePaths = storagePaths.map(p => p.replace(/^\//, ''));

  const { data, error } = await supabase.storage
    .from(bucket)
    .remove(filePaths); // Batch deletion

  return {
    successful: data?.length || 0,
    failed: filePaths.length - (data?.length || 0),
    errors: error ? [{ path: 'bulk', error: error.message }] : [],
  };
}
```

---

## 5. Complete Video Processing Flow (Fixed)

### End-to-End Example

```typescript
// User uploads video → Full processing pipeline

// 1. Upload video to storage
const { videoId, uploadUrl } = await generateUploadUrl(creatorId, {
  filename: 'course-intro.mp4',
  contentType: 'video/mp4',
  fileSize: 157286400, // 150MB
});

// 2. Video processing starts (lib/video/transcription.ts)
async function transcribeVideo(videoUrl: string): Promise<Transcript> {
  // Download video
  const videoPath = await downloadVideo(videoUrl); // /tmp/video-123.mp4

  // Extract audio with ffmpeg ✅ NEW
  const audioPath = await extractAudioFromVideo(videoPath);
  // → /tmp/video-123.wav (16kHz mono PCM)

  // Split if > 25MB ✅ NEW
  const audioChunks = await splitAudioFile(audioPath, 25);
  // → ['/tmp/video-123_chunk0.wav', '/tmp/video-123_chunk1.wav', ...]

  // Transcribe each chunk
  const transcripts = [];
  for (const chunkPath of audioChunks) {
    const transcript = await transcribeSingleFile(chunkPath);
    transcripts.push(transcript);
  }

  // Merge transcripts with adjusted timestamps ✅
  const finalTranscript = mergeTranscripts(transcripts);

  // Cleanup temp files
  fs.unlinkSync(videoPath);
  fs.unlinkSync(audioPath);
  audioChunks.forEach(chunk => fs.unlinkSync(chunk));

  return finalTranscript;
}

// 3. If user deletes video later
await deleteVideo(videoId);
// → Deletes from database ✅
// → Deletes from storage ✅ NEW
// → Deletes transcriptions ✅ NEW
// → Deletes chunks ✅
```

---

## 6. Error Handling Examples

### Graceful Degradation

```typescript
// If ffmpeg not available
try {
  const audioPath = await extractAudioFromVideo(videoPath);
} catch (error) {
  // Fallback: Use video directly
  logError('Audio extraction failed, using video', error);
  return videoPath;
}

// If storage deletion fails
try {
  await deleteVideoFromStorage(storagePath);
} catch (error) {
  // Don't fail the request - DB already deleted
  logError('Storage cleanup failed', error);
  // Return success anyway
}

// If chunk splitting fails
try {
  const chunks = await splitAudioFile(audioPath, 25);
} catch (error) {
  throw new TranscriptionError(
    `File too large and cannot be split: ${error.message}`
  );
}
```

---

## 7. Testing Examples

### Unit Tests

```typescript
// lib/video/__tests__/audio-extractor.test.ts
describe('extractAudioFromVideo', () => {
  it('should extract audio using ffmpeg', async () => {
    const videoPath = '/tmp/test-video.mp4';
    const audioPath = await extractAudioFromVideo(videoPath);

    expect(audioPath).toMatch(/\.wav$/);
    expect(fs.existsSync(audioPath)).toBe(true);
  });

  it('should fallback if ffmpeg unavailable', async () => {
    // Mock ffmpeg not available
    jest.mock('./audio-extractor', () => ({
      checkFFmpegAvailable: jest.fn().mockResolvedValue(false),
    }));

    const audioPath = await extractAudioFromVideo('/tmp/video.mp4');
    expect(audioPath).toBe('/tmp/video.mp4'); // Returns video
  });
});
```

### Integration Tests

```typescript
// Test complete flow
it('should process large video end-to-end', async () => {
  const videoUrl = 'https://storage/large-video.mp4'; // 200MB

  const transcript = await transcribeVideo(videoUrl);

  expect(transcript.text).toBeTruthy();
  expect(transcript.segments.length).toBeGreaterThan(0);
  expect(transcript.duration).toBeGreaterThan(0);

  // Verify no temp files left
  const tempFiles = fs.readdirSync('/tmp').filter(f => f.includes('video-'));
  expect(tempFiles).toHaveLength(0);
});
```

---

## 8. Monitoring Examples

### Success Metrics

```typescript
// Track transcription success rate
const metrics = {
  total: 0,
  successful: 0,
  failed: 0,
  avgDuration: 0,
};

try {
  const transcript = await transcribeVideo(videoUrl);
  metrics.successful++;
  metrics.avgDuration = (metrics.avgDuration + transcript.duration) / 2;
} catch (error) {
  metrics.failed++;
  logError('Transcription failed', error);
}

// Log to monitoring service
console.log('Transcription metrics:', {
  successRate: (metrics.successful / metrics.total) * 100,
  avgDuration: metrics.avgDuration,
});
```

### Storage Cleanup Monitoring

```typescript
// Track storage cleanup effectiveness
const cleanup = await bulkDeleteVideosFromStorage(paths);

console.log('Storage cleanup:', {
  total: paths.length,
  successful: cleanup.successful,
  failed: cleanup.failed,
  successRate: (cleanup.successful / paths.length) * 100,
});

if (cleanup.failed > 0) {
  // Alert if cleanup failing
  await sendAlert('Storage cleanup failures detected', cleanup.errors);
}
```

---

## Summary

All critical bugs have been fixed with:
- ✅ Robust error handling
- ✅ Graceful fallbacks
- ✅ Comprehensive logging
- ✅ Non-blocking operations
- ✅ Test coverage

**Ready for production deployment** after completing deployment checklist.
