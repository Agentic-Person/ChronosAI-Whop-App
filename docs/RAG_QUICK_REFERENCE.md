# RAG System Quick Reference

## Import Paths

```typescript
// Types
import {
  Creator,
  Video,
  VideoChunk,
  ChatSession,
  ChatMessage,
  Enrollment,
  ChunkSearchResult,
  ProcessingStatus,
  RewardReason,
} from '@/types/rag';

// Database helpers
import {
  // Creator ops
  getCreatorByWhopId,
  createCreator,
  getCreatorStats,

  // Video ops
  createVideo,
  updateVideoStatus,
  getCreatorVideos,
  deleteVideo,

  // Chunk ops
  insertChunks,
  searchChunks,
  getVideoChunks,

  // Chat ops
  createChatSession,
  addChatMessage,
  getChatMessages,

  // Enrollment ops
  enrollStudent,
  isStudentEnrolled,
  getStudentEnrollments,

  // Token ops
  awardTokens,
  getStudentChronosBalance,
} from '@/lib/supabase';
```

## Common Operations

### Video Lifecycle
```typescript
// 1. Create video
const video = await createVideo({
  creator_id: 'uuid',
  title: 'Video Title',
  video_url: 'https://...',
  storage_path: 's3://bucket/video.mp4',
  processing_status: 'pending',
  category: 'React',
  tags: ['react', 'hooks'],
  difficulty_level: 'intermediate',
  order_index: 1,
  transcript_processed: false,
});

// 2. Update status as processing
await updateVideoStatus(video.id, 'transcribing');
await updateVideoStatus(video.id, 'chunking');
await updateVideoStatus(video.id, 'embedding');

// 3. Complete processing
await updateVideoStatus(video.id, 'completed', 'Full transcript...');
```

### RAG Search
```typescript
// 1. Generate query embedding
const embedding = await openai.embeddings.create({
  model: 'text-embedding-ada-002',
  input: userQuery,
});

// 2. Search chunks
const results = await searchChunks(
  embedding.data[0].embedding,
  creatorId,
  5,   // top 5 results
  0.7  // 70% similarity threshold
);

// 3. Build context for AI
const context = results.map(r => `[${r.video_title} at ${r.start_seconds}s]: ${r.content}`).join('\n\n');

// 4. Call Claude API
const response = await anthropic.messages.create({
  model: 'claude-3-5-sonnet-20241022',
  messages: [
    { role: 'system', content: 'You are a helpful learning assistant...' },
    { role: 'user', content: `Context:\n${context}\n\nQuestion: ${userQuery}` },
  ],
});
```

### Chat Flow
```typescript
// 1. Create or get session
let session = await getChatSession(sessionId);
if (!session) {
  session = await createChatSession(studentId, creatorId, 'New Chat');
}

// 2. Add user message
await addChatMessage({
  session_id: session.id,
  role: 'user',
  content: userQuery,
  video_references: [],
});

// 3. Perform RAG search
const chunks = await searchChunks(queryEmbedding, creatorId, 5);

// 4. Generate AI response
const aiResponse = await generateResponse(userQuery, chunks);

// 5. Add assistant message
await addChatMessage({
  session_id: session.id,
  role: 'assistant',
  content: aiResponse.content,
  video_references: aiResponse.videoReferences,
});
```

### Enrollment Flow
```typescript
// 1. Check enrollment
const isEnrolled = await isStudentEnrolled(studentId, creatorId);

if (!isEnrolled) {
  // 2. Enroll student
  await enrollStudent(studentId, creatorId);

  // 3. Award welcome tokens
  await awardTokens(studentId, 50, 'enrollment', creatorId);
}

// 4. Get all enrollments
const enrollments = await getStudentEnrollments(studentId);
```

### Token Rewards
```typescript
// Video completion
await awardTokens(studentId, 100, 'video_completion', creatorId, {
  video_id: videoId,
  completion_percentage: 100,
});

// Quiz completion
await awardTokens(studentId, 50, 'quiz_complete', creatorId, {
  quiz_id: quizId,
  score: 85,
});

// Chat message
await awardTokens(studentId, 5, 'chat_message', creatorId);

// Get balance
const balance = await getStudentChronosBalance(studentId);
```

## Processing Status Flow

```
pending → transcribing → chunking → embedding → completed
                    ↓ (on error)
                   failed
```

## Database Functions (SQL)

```sql
-- Vector search
SELECT * FROM match_chunks(
  query_embedding := ARRAY[0.1, 0.2, ...],
  filter_creator_id := 'uuid',
  match_count := 5,
  match_threshold := 0.7
);

-- Creator stats
SELECT * FROM get_creator_stats('creator_uuid');

-- Student enrollments
SELECT * FROM get_student_enrollments('student_uuid');

-- Enroll student
SELECT enroll_student('student_uuid', 'creator_uuid');

-- Award tokens
SELECT award_tokens(
  p_student_id := 'student_uuid',
  p_amount := 100,
  p_source := 'video_completion',
  p_source_id := 'video_uuid',
  p_metadata := '{"completion_percentage": 100}'::jsonb
);
```

## Enums

```typescript
// Processing status
'pending' | 'transcribing' | 'chunking' | 'embedding' | 'completed' | 'failed'

// Message role
'user' | 'assistant' | 'system'

// Reward reason
'video_completion' | 'video_watch' | 'chat_message' | 'quiz_complete' |
'achievement_unlock' | 'daily_streak' | 'milestone' | 'project_submission'

// Enrollment status
'active' | 'inactive' | 'suspended'

// Redemption type
'paypal' | 'gift_card' | 'platform_credit'

// Difficulty level
'beginner' | 'intermediate' | 'advanced'
```

## Error Handling

```typescript
try {
  const video = await createVideo(data);
} catch (error) {
  if (error.message.includes('unique constraint')) {
    // Duplicate video
  } else if (error.message.includes('foreign key')) {
    // Invalid creator_id
  } else {
    // Generic error
  }
}
```

## RLS Bypass (Service Role)

```typescript
import { supabaseAdmin } from '@/lib/utils/supabase-client';

// All functions in ragHelpers.ts use supabaseAdmin
// This bypasses RLS for backend operations
```

## Performance Tips

```typescript
// ✅ Good: Batch operations
await insertChunks(allChunks);

// ❌ Bad: Loop operations
for (const chunk of allChunks) {
  await insertChunk(chunk);
}

// ✅ Good: Specific fields
const videos = await supabaseAdmin
  .from('videos')
  .select('id, title, creator_id')
  .eq('creator_id', creatorId);

// ❌ Bad: Select all
const videos = await supabaseAdmin
  .from('videos')
  .select('*')
  .eq('creator_id', creatorId);
```

## Testing Checklist

- [ ] Creator CRUD operations
- [ ] Video status transitions
- [ ] Chunk insertion and search
- [ ] Chat session creation
- [ ] Message history retrieval
- [ ] Enrollment validation
- [ ] Token award/balance
- [ ] RLS policy enforcement
- [ ] Vector search accuracy
- [ ] Multi-tenant isolation

## File Locations

```
supabase/migrations/20251022000001_multitenant_rag_enhancements.sql
types/rag.ts
lib/supabase/ragHelpers.ts
lib/supabase/index.ts
docs/RAG_SYSTEM_GUIDE.md (this file)
```

## Next Implementation Steps

1. Create `/api/videos/upload` endpoint
2. Implement transcription service (Whisper API)
3. Implement chunking service
4. Implement embedding service (OpenAI ada-002)
5. Create `/api/chat` RAG endpoint
6. Build student dashboard UI
7. Build creator dashboard UI
8. Add token reward triggers
9. Implement redemption system
10. Deploy to production
