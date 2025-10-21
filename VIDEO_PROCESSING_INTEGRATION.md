# Video Processing Integration Guide

## For Agent 1 - RAG Chat Engine

The Video Processing module provides the foundation for RAG-based chat. Here's how to integrate:

### 1. Query Video Chunks with Semantic Search

```typescript
import { getSupabaseAdmin } from '@/lib/infrastructure/database/connection-pool';

async function searchVideoChunks(query: string, limit: number = 5) {
  const supabase = getSupabaseAdmin();

  // 1. Generate query embedding
  const queryEmbedding = await generateEmbedding(query);

  // 2. Perform similarity search using pgvector
  const { data, error } = await supabase.rpc('match_video_chunks', {
    query_embedding: queryEmbedding,
    match_threshold: 0.7,
    match_count: limit,
  });

  return data; // Returns chunks with similarity scores + timestamps
}
```

### 2. Create the `match_video_chunks` Database Function

```sql
-- Add to a migration file
CREATE OR REPLACE FUNCTION match_video_chunks(
  query_embedding vector(1536),
  match_threshold float,
  match_count int
)
RETURNS TABLE (
  id uuid,
  video_id uuid,
  chunk_text text,
  chunk_index int,
  start_timestamp int,
  end_timestamp int,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    video_chunks.id,
    video_chunks.video_id,
    video_chunks.chunk_text,
    video_chunks.chunk_index,
    video_chunks.start_timestamp,
    video_chunks.end_timestamp,
    1 - (video_chunks.embedding <=> query_embedding) as similarity
  FROM video_chunks
  WHERE 1 - (video_chunks.embedding <=> query_embedding) > match_threshold
  ORDER BY video_chunks.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
```

### 3. Build RAG Context

```typescript
import { searchVideoChunks } from '@/lib/rag/search';
import { getVideoById } from '@/lib/video';

async function buildRAGContext(userQuery: string) {
  // Get relevant chunks
  const chunks = await searchVideoChunks(userQuery, 5);

  // Get video metadata
  const videos = await Promise.all(
    chunks.map(c => getVideoById(c.video_id))
  );

  // Format context for Claude
  const context = chunks.map((chunk, i) => ({
    text: chunk.chunk_text,
    source: {
      videoId: chunk.video_id,
      videoTitle: videos[i]?.title,
      timestamp: chunk.start_timestamp,
      url: `${videos[i]?.video_url}?t=${chunk.start_timestamp}`,
    },
    relevance: chunk.similarity,
  }));

  return context;
}
```

### 4. Generate Chat Response with Video References

```typescript
import Anthropic from '@anthropic-ai/sdk';

async function generateChatResponse(userMessage: string, context: any[]) {
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const systemPrompt = `You are a helpful AI assistant. Use the following video content to answer the user's question.

Video Context:
${context.map((c, i) => `
[${i + 1}] From "${c.source.videoTitle}" at ${formatTimestamp(c.source.timestamp)}:
${c.text}
`).join('\n')}

When answering, cite specific videos with timestamps like: [Video Title @ MM:SS]
`;

  const response = await anthropic.messages.create({
    model: 'claude-3-5-sonnet-20241022',
    max_tokens: 1024,
    system: systemPrompt,
    messages: [
      { role: 'user', content: userMessage },
    ],
  });

  return {
    text: response.content[0].text,
    videoReferences: context.map(c => ({
      videoId: c.source.videoId,
      title: c.source.videoTitle,
      timestamp: c.source.timestamp,
      relevanceScore: c.relevance,
    })),
  };
}
```

---

## For Agent 6 - Creator Dashboard

Display video processing status and analytics.

### 1. Video Upload Section

```typescript
import { VideoUploader } from '@/components/video/VideoUploader';

function UploadSection() {
  return (
    <section>
      <h2>Upload Videos</h2>
      <VideoUploader
        onUploadComplete={(videoId) => {
          router.push(`/dashboard/videos/${videoId}`);
        }}
      />
    </section>
  );
}
```

### 2. Video List with Analytics

```typescript
import { VideoList } from '@/components/video/VideoList';
import { getCreatorVideos } from '@/lib/video';

async function VideosPage() {
  const creatorId = await getCreatorId();
  const { videos, total } = await getCreatorVideos(creatorId);

  const stats = {
    total,
    completed: videos.filter(v => v.processing_status === 'completed').length,
    processing: videos.filter(v => v.processing_status === 'processing').length,
    failed: videos.filter(v => v.processing_status === 'failed').length,
  };

  return (
    <div>
      <StatsCards stats={stats} />
      <VideoList creatorId={creatorId} />
    </div>
  );
}
```

### 3. Processing Cost Dashboard

```typescript
import { getSupabaseAdmin } from '@/lib/infrastructure/database/connection-pool';

async function getProcessingCosts(creatorId: string) {
  const supabase = getSupabaseAdmin();

  const { data } = await supabase
    .from('video_processing_costs')
    .select(`
      *,
      videos!inner(creator_id)
    `)
    .eq('videos.creator_id', creatorId);

  const totalCost = data?.reduce((sum, cost) => sum + parseFloat(cost.cost_usd), 0) || 0;

  const costByOperation = data?.reduce((acc, cost) => {
    acc[cost.operation_type] = (acc[cost.operation_type] || 0) + parseFloat(cost.cost_usd);
    return acc;
  }, {});

  return { totalCost, costByOperation };
}
```

---

## For All Agents - Feature Integration

### Check Video Limits Before Upload

```typescript
import { validateVideoLimits, getVideoLimits } from '@/lib/video';

async function canUploadVideo(creatorId: string) {
  const canUpload = await validateVideoLimits(creatorId);

  if (!canUpload) {
    const limits = await getVideoLimits(creatorId);
    return {
      allowed: false,
      message: `You've reached your video limit (${limits.maxVideos}). Upgrade to upload more.`,
      upgradeUrl: process.env.NEXT_PUBLIC_WHOP_PRO_CHECKOUT_URL,
    };
  }

  return { allowed: true };
}
```

### Subscribe to Processing Events

```typescript
// Listen for completion events
inngest.on('video/upload.completed', async ({ data }) => {
  console.log(`Video ${data.videoId} completed processing`);

  // Trigger other workflows
  await inngest.send({
    name: 'analytics/video.processed',
    data: {
      videoId: data.videoId,
      creatorId: data.creatorId,
    },
  });
});
```

### Access Video Chunks in Custom Workflows

```typescript
import { getVideoChunks, getChunkStatistics } from '@/lib/video';

async function analyzeVideoContent(videoId: string) {
  const chunks = await getVideoChunks(videoId);
  const stats = await getChunkStatistics(videoId);

  // Extract topics from chunks
  const topics = chunks.flatMap(c => c.topic_tags || []);
  const uniqueTopics = [...new Set(topics)];

  return {
    totalChunks: stats.totalChunks,
    totalWords: stats.totalWords,
    topics: uniqueTopics,
    avgChunkSize: stats.avgWordCount,
  };
}
```

---

## Database Queries

### Get Videos with Transcription Status

```sql
SELECT
  v.id,
  v.title,
  v.processing_status,
  t.word_count,
  t.language,
  COUNT(c.id) as chunk_count
FROM videos v
LEFT JOIN video_transcriptions t ON t.video_id = v.id
LEFT JOIN video_chunks c ON c.video_id = v.id
WHERE v.creator_id = 'creator-uuid'
GROUP BY v.id, t.id;
```

### Get Processing Job History

```sql
SELECT
  j.*,
  v.title as video_title
FROM video_processing_jobs j
JOIN videos v ON v.id = j.video_id
WHERE v.creator_id = 'creator-uuid'
ORDER BY j.created_at DESC
LIMIT 50;
```

### Find Videos with Failed Processing

```sql
SELECT
  v.*,
  j.error_message,
  j.retry_count
FROM videos v
LEFT JOIN video_processing_jobs j ON j.video_id = v.id
WHERE v.processing_status = 'failed'
  AND v.creator_id = 'creator-uuid';
```

---

## Performance Tips

### 1. Cache Frequently Accessed Videos

```typescript
import { cache } from '@/lib/infrastructure/cache/redis-client';
import { CacheKeys, CacheTTL } from '@/lib/infrastructure/cache/cache-keys';

async function getCachedVideo(videoId: string) {
  const cacheKey = CacheKeys.video(videoId);

  return cache.getOrCompute(
    cacheKey,
    async () => await getVideoById(videoId),
    CacheTTL.LONG
  );
}
```

### 2. Invalidate Cache on Status Change

```typescript
import { CacheInvalidator } from '@/lib/infrastructure/cache/cache-invalidation';

async function onVideoProcessingComplete(videoId: string, creatorId: string) {
  await CacheInvalidator.invalidateVideo(videoId, creatorId);
}
```

### 3. Use Pagination for Large Lists

```typescript
import { getCreatorVideos } from '@/lib/video';

async function getVideosPaginated(creatorId: string, page: number = 1) {
  const limit = 20;
  const offset = (page - 1) * limit;

  return await getCreatorVideos(creatorId, { limit, offset });
}
```

---

## Testing Integration

### Mock Video Processing in Tests

```typescript
import { transcribeVideo, chunkTranscript, generateEmbeddings } from '@/lib/video';

// Mock for tests
jest.mock('@/lib/video', () => ({
  transcribeVideo: jest.fn().mockResolvedValue({
    text: 'Mock transcript',
    segments: [],
    language: 'en',
    duration: 60,
  }),
  chunkTranscript: jest.fn().mockReturnValue([
    { text: 'Chunk 1', index: 0, wordCount: 100 },
  ]),
  generateEmbeddings: jest.fn().mockResolvedValue({
    embeddings: [],
    totalTokens: 1000,
    estimatedCost: 0.001,
  }),
}));
```

---

## Migration Path

If you need to migrate existing videos:

```typescript
import { regenerateEmbeddings } from '@/lib/video';

async function migrateVideos(videoIds: string[]) {
  for (const videoId of videoIds) {
    try {
      await regenerateEmbeddings(videoId, {
        model: 'text-embedding-ada-002',
      });
      console.log(`✓ Migrated ${videoId}`);
    } catch (error) {
      console.error(`✗ Failed ${videoId}:`, error);
    }
  }
}
```

---

## Support

For questions or issues:
1. Review `/docs/VIDEO_PROCESSING.md`
2. Check test files for examples
3. Inspect Inngest dashboard for job failures
4. Contact Agent 3 (Video Processing specialist)
