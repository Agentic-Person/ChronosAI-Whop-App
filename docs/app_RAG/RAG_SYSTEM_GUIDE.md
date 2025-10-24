# RAG System Implementation Guide

## Overview

The Chronos AI RAG (Retrieval-Augmented Generation) system provides multi-tenant vector search for video learning content. This guide covers the foundational data layer implementation.

## Architecture

### Multi-Tenant Design

- **Single Supabase Database**: All creators share one database instance
- **Creator Isolation**: RLS policies enforce strict data separation
- **Student Enrollments**: Students can access multiple creators' content
- **Universal CHRONOS Tokens**: Single token system across all creators

### Database Schema

```
creators (multi-tenant hub)
  ├── videos (creator-owned content)
  │   └── video_chunks (vectorized segments with creator_id)
  ├── enrollments (student-creator relationships)
  ├── chat_sessions (RAG conversations)
  │   └── chat_messages (user/assistant messages)
  └── token_wallets (CHRONOS rewards)
      └── token_transactions (earn/spend/redeem)
```

## Key Files Created

### 1. Database Migration
**File**: `supabase/migrations/20251022000001_multitenant_rag_enhancements.sql`

**What it adds**:
- `enrollments` table for student-creator relationships
- `creator.handle` field for unique URLs (`/c/johndoe`)
- `video_chunks.creator_id` for multi-tenant isolation
- `videos.storage_path` for S3/R2 file storage
- `videos.processing_status` enum tracking
- Enhanced RLS policies for multi-tenant security
- `match_chunks()` function for creator-scoped vector search
- Helper functions: `enroll_student()`, `unenroll_student()`, `get_creator_stats()`

**Run with**:
```bash
# Manual migration (if using Supabase CLI)
supabase db push

# Or run SQL directly in Supabase dashboard
```

### 2. TypeScript Types
**File**: `types/rag.ts`

**Exports**:
- Core entity interfaces: `Creator`, `Video`, `VideoChunk`, `ChatSession`, `ChatMessage`, `Enrollment`
- Token system: `TokenWallet`, `TokenTransaction`, `RedemptionRequest`
- RAG search: `ChunkSearchResult`, `RAGSearchQuery`, `RAGChatRequest`
- Processing: `VideoProcessingJob`, `TranscriptionResult`, `ChunkingResult`
- Analytics: `CreatorStats`, `VideoAnalytics`
- Enums: `ProcessingStatus`, `RewardReason`, `EnrollmentStatus`

**Usage**:
```typescript
import { Video, ProcessingStatus, ChunkSearchResult } from '@/types/rag';

const video: Video = {
  id: 'uuid',
  creator_id: 'uuid',
  title: 'Introduction to React',
  processing_status: ProcessingStatus.COMPLETED,
  // ... other fields
};
```

### 3. Database Helpers
**File**: `lib/supabase/ragHelpers.ts`

**Exports 40+ helper functions**:

#### Creator Operations
```typescript
import { getCreatorByWhopId, createCreator, getCreatorStats } from '@/lib/supabase';

// Get creator by Whop company ID
const creator = await getCreatorByWhopId('comp_abc123');

// Create new creator
const newCreator = await createCreator(
  'comp_abc123',
  'user_xyz789',
  'Acme Learning',
  'acme-learning'
);

// Get statistics
const stats = await getCreatorStats(creator.id);
// Returns: { total_students, active_students, total_videos, processed_videos, total_chunks, total_chat_sessions }
```

#### Video Operations
```typescript
import { createVideo, updateVideoStatus, getCreatorVideos } from '@/lib/supabase';

// Create video
const video = await createVideo({
  creator_id: 'uuid',
  title: 'React Hooks Deep Dive',
  description: 'Learn useState, useEffect, and custom hooks',
  video_url: 'https://storage.example.com/video.mp4',
  storage_path: 's3://bucket/videos/video.mp4',
  processing_status: 'pending',
  category: 'React',
  tags: ['react', 'hooks', 'frontend'],
  difficulty_level: 'intermediate',
  order_index: 1,
  transcript_processed: false,
});

// Update processing status
await updateVideoStatus(video.id, 'transcribing');
await updateVideoStatus(video.id, 'completed', 'Full transcript text...');

// Get all videos for creator
const videos = await getCreatorVideos('creator_uuid');
```

#### Chunk Operations (Vector Search)
```typescript
import { insertChunks, searchChunks } from '@/lib/supabase';

// Insert chunks after transcription
await insertChunks([
  {
    video_id: 'video_uuid',
    creator_id: 'creator_uuid',
    chunk_text: 'React hooks are functions that let you hook into React state...',
    chunk_index: 0,
    start_timestamp: 0,
    end_timestamp: 30,
    embedding: [0.012, -0.045, ...], // 1536 dimensions
    topic_tags: ['hooks', 'state'],
  },
  // ... more chunks
]);

// Search chunks with vector similarity
const queryEmbedding = await getOpenAIEmbedding('How do I use useState?');
const results = await searchChunks(
  queryEmbedding,
  'creator_uuid',
  5,    // match_count
  0.7   // match_threshold
);

// results: ChunkSearchResult[]
// [
//   {
//     chunk_id: 'uuid',
//     video_id: 'uuid',
//     video_title: 'React Hooks Deep Dive',
//     content: 'React hooks are functions...',
//     start_seconds: 0,
//     end_seconds: 30,
//     similarity: 0.89
//   }
// ]
```

#### Chat Operations
```typescript
import { createChatSession, addChatMessage, getChatMessages } from '@/lib/supabase';

// Create chat session
const session = await createChatSession(
  'student_uuid',
  'creator_uuid',
  'React Hooks Questions'
);

// Add messages
await addChatMessage({
  session_id: session.id,
  role: 'user',
  content: 'How do I use useState?',
  video_references: [],
});

await addChatMessage({
  session_id: session.id,
  role: 'assistant',
  content: 'useState is a React Hook that lets you add state...',
  video_references: [
    {
      video_id: 'video_uuid',
      title: 'React Hooks Deep Dive',
      timestamp: 45,
      relevance_score: 0.89,
    },
  ],
});

// Get chat history
const messages = await getChatMessages(session.id);
```

#### Enrollment Operations
```typescript
import { enrollStudent, isStudentEnrolled, getStudentEnrollments } from '@/lib/supabase';

// Enroll student with creator
const enrollmentId = await enrollStudent('student_uuid', 'creator_uuid');

// Check enrollment
const isEnrolled = await isStudentEnrolled('student_uuid', 'creator_uuid');

// Get all enrollments for student
const enrollments = await getStudentEnrollments('student_uuid');
// [
//   {
//     enrollment_id: 'uuid',
//     creator_id: 'uuid',
//     creator_name: 'Acme Learning',
//     creator_handle: 'acme-learning',
//     enrolled_at: '2025-10-22T12:00:00Z',
//     status: 'active'
//   }
// ]
```

#### CHRONOS Token Operations
```typescript
import { awardTokens, getStudentChronosBalance } from '@/lib/supabase';

// Award tokens for video completion
const newBalance = await awardTokens(
  'student_uuid',
  100,
  'video_completion',
  'creator_uuid',
  { video_id: 'video_uuid', completion_percentage: 100 }
);

// Get student balance
const balance = await getStudentChronosBalance('student_uuid');
console.log(`Student has ${balance} CHRONOS tokens`);
```

## Vector Search Flow

```
User Query: "How do I use useState?"
     ↓
1. Generate embedding (OpenAI ada-002)
   → [0.012, -0.045, 0.023, ...]
     ↓
2. Call match_chunks(embedding, creator_id)
   → SQL: ORDER BY embedding <=> query_embedding
     ↓
3. Get top 5 chunks with similarity > 0.7
   → [
       { chunk_id, video_id, video_title, content, start_seconds, end_seconds, similarity: 0.89 },
       { ..., similarity: 0.85 },
       ...
     ]
     ↓
4. Build context for Claude API
   → "Based on these video excerpts: [chunk1], [chunk2]..."
     ↓
5. Generate AI response with citations
   → "useState is a React Hook... [See React Hooks Deep Dive at 0:45]"
```

## Row-Level Security (RLS)

### Students
- Can view videos/chunks from creators they're enrolled with
- Can view/create their own chat sessions
- Can view their own token wallet and transactions

### Creators
- Can view/modify all their own content (videos, chunks)
- Can view chat sessions and enrollments for their students
- Can manage redemption requests

### Service Role
- Bypasses RLS for backend processing
- Used for video transcription, chunking, embedding generation

## Processing Pipeline

```
1. Video Upload
   ├─ Upload to S3/R2 → storage_path
   ├─ Create video record → processing_status: 'pending'
   └─ Trigger background job

2. Transcription
   ├─ Extract audio → Whisper API
   ├─ Update video.transcript
   └─ processing_status: 'transcribing' → 'chunking'

3. Chunking
   ├─ Split transcript into 500-1000 word segments
   ├─ Calculate timestamps
   └─ processing_status: 'chunking' → 'embedding'

4. Embedding
   ├─ Generate embeddings (OpenAI ada-002)
   ├─ Batch insert chunks with creator_id
   └─ processing_status: 'embedding' → 'completed'

5. Ready for RAG Search ✓
```

## Multi-Tenant Isolation

### Database-Level Isolation
```sql
-- Students can only see content from enrolled creators
CREATE POLICY "Students view enrolled creator videos"
  ON videos FOR SELECT
  USING (
    creator_id IN (
      SELECT creator_id FROM enrollments
      WHERE student_id = auth.uid() AND status = 'active'
    )
  );

-- Creators can only see their own content
CREATE POLICY "Creators view own videos"
  ON videos FOR ALL
  USING (
    creator_id IN (
      SELECT id FROM creators WHERE whop_user_id = auth.uid()
    )
  );
```

### Application-Level Isolation
```typescript
// ALWAYS pass creator_id to search functions
const results = await searchChunks(
  queryEmbedding,
  creatorId, // ← Scopes search to this creator only
  5
);

// RLS ensures students can only query enrolled creators
// Creators can only query their own content
```

## Performance Optimization

### Indexes
```sql
-- Vector search (HNSW for better performance than IVFFlat)
CREATE INDEX idx_chunks_embedding ON video_chunks USING hnsw (embedding vector_cosine_ops);

-- Multi-tenant queries
CREATE INDEX idx_video_chunks_creator ON video_chunks(creator_id);
CREATE INDEX idx_enrollments_student ON enrollments(student_id);
```

### Caching Strategies
- Cache creator stats (refresh every 5 minutes)
- Cache student enrollments (refresh on enrollment change)
- Cache token balances (refresh after transactions)

### Batch Operations
```typescript
// Good: Batch insert chunks
await insertChunks(allChunks);

// Bad: Insert one at a time
for (const chunk of allChunks) {
  await insertChunk(chunk); // ❌ Slow!
}
```

## Error Handling

All helper functions throw descriptive errors:

```typescript
try {
  const video = await createVideo(videoData);
} catch (error) {
  console.error('Failed to create video:', error.message);
  // Error includes: operation, reason, and original DB error
}
```

## Security Checklist

✅ RLS enabled on all tables
✅ Creator isolation via creator_id filtering
✅ Student enrollment validation
✅ Service role key never exposed to client
✅ All mutations require authentication
✅ Token operations use ACID transactions
✅ Webhook signature verification (separate guide)

## Next Steps

1. **Video Processing Service**: Implement transcription → chunking → embedding pipeline
2. **RAG Chat API**: Build `/api/chat` endpoint using `searchChunks()` and Claude API
3. **Student Dashboard**: Display enrolled creators and chat interface
4. **Creator Dashboard**: Show stats, manage videos, view enrollments
5. **Token Rewards**: Trigger `awardTokens()` on video completion, quiz pass, etc.

## Testing

```typescript
// Test creator operations
const creator = await createCreator('comp_test', 'user_test', 'Test Co', 'test-co');
const stats = await getCreatorStats(creator.id);
expect(stats.total_videos).toBe(0);

// Test video operations
const video = await createVideo({ creator_id: creator.id, ... });
await updateVideoStatus(video.id, 'completed');
const videos = await getCreatorVideos(creator.id);
expect(videos).toHaveLength(1);

// Test enrollment
await enrollStudent('student_uuid', creator.id);
const isEnrolled = await isStudentEnrolled('student_uuid', creator.id);
expect(isEnrolled).toBe(true);

// Test search (requires embeddings)
const results = await searchChunks([0.1, 0.2, ...], creator.id, 5);
expect(results[0].similarity).toBeGreaterThan(0.7);
```

## Troubleshooting

### "Wallet not found" error
```typescript
// Create wallet before awarding tokens
await supabaseAdmin.from('token_wallets').insert({
  student_id: 'uuid',
  solana_address: 'generated_address',
  private_key_encrypted: 'encrypted_key',
});
```

### Vector search returns no results
- Check if chunks have embeddings (`embedding IS NOT NULL`)
- Verify creator_id matches
- Lower match_threshold (try 0.5 instead of 0.7)
- Check embedding dimensions (must be 1536 for OpenAI ada-002)

### RLS blocking queries
- Use `supabaseAdmin` (service role) for backend operations
- Verify JWT token in auth.uid() matches student_id
- Check enrollment status is 'active'

## Migration Checklist

- [x] Run migration SQL
- [ ] Verify tables created
- [ ] Test RLS policies
- [ ] Seed test data
- [ ] Run TypeScript compilation
- [ ] Test helper functions
- [ ] Update API routes to use new helpers
- [ ] Deploy to production

## Resources

- [Supabase Vector Embeddings Guide](https://supabase.com/docs/guides/ai/vector-embeddings)
- [OpenAI Embeddings API](https://platform.openai.com/docs/guides/embeddings)
- [pgvector Documentation](https://github.com/pgvector/pgvector)
- [Claude API Reference](https://docs.anthropic.com/claude/reference)

---

**Implementation Status**: ✅ Foundational data layer complete
**Next Agent**: Implement video processing pipeline and RAG chat API
