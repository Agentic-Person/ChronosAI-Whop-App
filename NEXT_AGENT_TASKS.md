# Next Agent Tasks: Video Processing & RAG Chat Implementation

## Current Status

Agent 1 completed the foundational data layer for Chronos AI multi-tenant RAG system.

**Files Created**: 7 files, 2,376 lines of code + documentation

## Your Mission

Implement the video processing pipeline and RAG chat API to make the system fully functional.

## Prerequisites

✅ Database schema (migration file created)
✅ TypeScript types (50+ interfaces/enums)
✅ Database helpers (40+ functions)
✅ Documentation (comprehensive guides)

## Tasks Breakdown

### Phase 1: Database Setup (30 mins)

#### Task 1.1: Run Migration
```bash
# Option A: Using Supabase CLI
cd d:\APS\Projects\whop\AI-Video-Learning-Assistant
supabase db push

# Option B: Manual (Supabase Dashboard)
# 1. Go to SQL Editor
# 2. Paste contents of: supabase/migrations/20251022000001_multitenant_rag_enhancements.sql
# 3. Execute
```

**Verify**:
- Run: `npm run verify-rag` (verification script)
- Check: All tables exist in Supabase dashboard
- Test: RLS policies are enabled

#### Task 1.2: Seed Test Data
Create test creator, student, and enrollment:

```typescript
import { createCreator, enrollStudent } from '@/lib/supabase';

// Create test creator
const creator = await createCreator(
  'comp_test123',
  'user_test123',
  'Test Learning Co',
  'test-learning'
);

// Create test student (manual insert for now)
// Enroll student
await enrollStudent('student_uuid', creator.id);
```

### Phase 2: Video Processing Pipeline (2-3 hours)

#### Task 2.1: Video Upload Handler
**File**: `lib/video/upload-handler.ts` (already exists, needs integration)

**Enhance**:
```typescript
import { createVideo } from '@/lib/supabase';

export async function handleVideoUpload(
  creatorId: string,
  file: File,
  metadata: { title: string; description?: string; category?: string }
) {
  // 1. Upload to S3/R2
  const storagePath = await uploadToStorage(file);

  // 2. Create video record
  const video = await createVideo({
    creator_id: creatorId,
    title: metadata.title,
    description: metadata.description,
    video_url: storagePath, // Public URL
    storage_path: storagePath, // S3 path
    processing_status: 'pending',
    category: metadata.category,
    transcript_processed: false,
  });

  // 3. Trigger background processing
  await triggerProcessingJob(video.id);

  return video;
}
```

#### Task 2.2: Transcription Service
**File**: `lib/video/transcription.ts` (already exists, needs integration)

**Enhance**:
```typescript
import { updateVideoStatus } from '@/lib/supabase';
import { OpenAI } from 'openai';

export async function transcribeVideo(videoId: string, audioUrl: string) {
  await updateVideoStatus(videoId, 'transcribing');

  const openai = new OpenAI();
  const transcription = await openai.audio.transcriptions.create({
    file: await fetch(audioUrl).then(r => r.blob()),
    model: 'whisper-1',
    response_format: 'verbose_json',
    timestamp_granularities: ['segment'],
  });

  await updateVideoStatus(videoId, 'chunking', transcription.text);

  return transcription;
}
```

#### Task 2.3: Chunking Service
**File**: `lib/video/chunker.ts` (new file)

**Create**:
```typescript
import { insertChunks } from '@/lib/supabase';

interface ChunkResult {
  text: string;
  start_seconds: number;
  end_seconds: number;
  topic_tags?: string[];
}

export async function chunkAndStoreTranscript(
  videoId: string,
  creatorId: string,
  transcript: string,
  segments: Array<{ start: number; end: number; text: string }>
) {
  const chunks = await chunkTranscript(segments, 500); // 500 words per chunk

  // Generate embeddings
  const embeddings = await generateEmbeddings(chunks.map(c => c.text));

  // Store chunks
  await insertChunks(
    chunks.map((chunk, i) => ({
      video_id: videoId,
      creator_id: creatorId,
      chunk_text: chunk.text,
      chunk_index: i,
      start_timestamp: chunk.start_seconds,
      end_timestamp: chunk.end_seconds,
      embedding: embeddings[i],
      topic_tags: extractTopicTags(chunk.text),
    }))
  );
}

function chunkTranscript(
  segments: Array<{ start: number; end: number; text: string }>,
  targetWords: number = 500
): ChunkResult[] {
  // Implement chunking logic with overlap
  // Split on sentence boundaries
  // Ensure chunks are ~500 words
}
```

#### Task 2.4: Embedding Service
**File**: `lib/ai/embeddings.ts` (new file)

**Create**:
```typescript
import { OpenAI } from 'openai';

export async function generateEmbeddings(
  texts: string[]
): Promise<number[][]> {
  const openai = new OpenAI();

  // Batch process (OpenAI supports up to 2048 inputs)
  const batchSize = 100;
  const embeddings: number[][] = [];

  for (let i = 0; i < texts.length; i += batchSize) {
    const batch = texts.slice(i, i + batchSize);

    const response = await openai.embeddings.create({
      model: 'text-embedding-ada-002',
      input: batch,
    });

    embeddings.push(...response.data.map(d => d.embedding));
  }

  return embeddings;
}

export async function generateQueryEmbedding(
  query: string
): Promise<number[]> {
  const openai = new OpenAI();

  const response = await openai.embeddings.create({
    model: 'text-embedding-ada-002',
    input: query,
  });

  return response.data[0].embedding;
}
```

#### Task 2.5: Processing Orchestrator
**File**: `lib/video/processor.ts` (already exists, needs integration)

**Enhance**:
```typescript
import { updateVideoStatus } from '@/lib/supabase';
import { transcribeVideo } from './transcription';
import { chunkAndStoreTranscript } from './chunker';

export async function processVideo(videoId: string, creatorId: string, storagePath: string) {
  try {
    // 1. Transcribe
    const transcription = await transcribeVideo(videoId, storagePath);

    // 2. Chunk and embed
    await updateVideoStatus(videoId, 'embedding');
    await chunkAndStoreTranscript(
      videoId,
      creatorId,
      transcription.text,
      transcription.segments
    );

    // 3. Complete
    await updateVideoStatus(videoId, 'completed');

    // 4. Award tokens to creator (optional)
    // await awardTokens(creatorId, 50, 'video_upload');

    return { success: true };
  } catch (error) {
    await updateVideoStatus(videoId, 'failed');
    throw error;
  }
}
```

### Phase 3: RAG Chat API (2-3 hours)

#### Task 3.1: Chat API Endpoint
**File**: `app/api/chat/route.ts` (new file)

**Create**:
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { searchChunks, createChatSession, addChatMessage } from '@/lib/supabase';
import { generateQueryEmbedding } from '@/lib/ai/embeddings';
import { generateChatResponse } from '@/lib/ai/chat-generator';

export async function POST(req: NextRequest) {
  try {
    const { message, creator_id, student_id, session_id } = await req.json();

    // 1. Get or create session
    let sessionId = session_id;
    if (!sessionId) {
      const session = await createChatSession(student_id, creator_id);
      sessionId = session.id;
    }

    // 2. Generate query embedding
    const embedding = await generateQueryEmbedding(message);

    // 3. Search relevant chunks
    const chunks = await searchChunks(embedding, creator_id, 5, 0.7);

    // 4. Generate AI response
    const response = await generateChatResponse(message, chunks);

    // 5. Save messages
    await addChatMessage({
      session_id: sessionId,
      role: 'user',
      content: message,
    });

    const assistantMessage = await addChatMessage({
      session_id: sessionId,
      role: 'assistant',
      content: response.content,
      video_references: response.videoReferences,
    });

    // 6. Award tokens for chat engagement
    // await awardTokens(student_id, 5, 'chat_message', creator_id);

    return NextResponse.json({
      session_id: sessionId,
      message: assistantMessage,
      chunks_used: chunks,
    });
  } catch (error) {
    console.error('Chat API error:', error);
    return NextResponse.json(
      { error: 'Chat failed' },
      { status: 500 }
    );
  }
}
```

#### Task 3.2: Chat Response Generator
**File**: `lib/ai/chat-generator.ts` (new file)

**Create**:
```typescript
import Anthropic from '@anthropic-ai/sdk';
import { ChunkSearchResult, VideoReference } from '@/types/rag';

interface ChatResponse {
  content: string;
  videoReferences: VideoReference[];
}

export async function generateChatResponse(
  userQuery: string,
  chunks: ChunkSearchResult[]
): Promise<ChatResponse> {
  const anthropic = new Anthropic();

  // Build context from chunks
  const context = chunks.map((c, i) =>
    `[Source ${i + 1}: ${c.video_title} at ${formatTimestamp(c.start_seconds)}]\n${c.content}`
  ).join('\n\n---\n\n');

  // Generate response
  const response = await anthropic.messages.create({
    model: 'claude-3-5-sonnet-20241022',
    max_tokens: 1024,
    messages: [
      {
        role: 'user',
        content: `You are a helpful learning assistant. Answer the student's question using the provided video excerpts. Always cite sources with timestamps.

Context from videos:
${context}

Student question: ${userQuery}

Provide a clear, helpful answer and cite relevant video sources with timestamps.`,
      },
    ],
  });

  // Extract video references
  const videoReferences: VideoReference[] = chunks.map(c => ({
    video_id: c.video_id,
    title: c.video_title,
    timestamp: c.start_seconds,
    relevance_score: c.similarity,
  }));

  return {
    content: response.content[0].text,
    videoReferences,
  };
}

function formatTimestamp(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}
```

### Phase 4: API Routes (1-2 hours)

#### Task 4.1: Video Upload API
**File**: `app/api/videos/upload/route.ts` (enhance existing)

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { handleVideoUpload } from '@/lib/video/upload-handler';
import { processVideo } from '@/lib/video/processor';

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const file = formData.get('file') as File;
  const creator_id = formData.get('creator_id') as string;
  const title = formData.get('title') as string;
  const description = formData.get('description') as string;

  // Upload and create video record
  const video = await handleVideoUpload(creator_id, file, {
    title,
    description,
  });

  // Trigger async processing
  processVideo(video.id, creator_id, video.storage_path).catch(console.error);

  return NextResponse.json({ video });
}
```

#### Task 4.2: Enrollment API
**File**: `app/api/enrollment/route.ts` (new file)

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { enrollStudent, getStudentEnrollments } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  const { student_id, creator_id } = await req.json();

  const enrollmentId = await enrollStudent(student_id, creator_id);

  return NextResponse.json({ enrollment_id: enrollmentId });
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const student_id = searchParams.get('student_id');

  if (!student_id) {
    return NextResponse.json({ error: 'Missing student_id' }, { status: 400 });
  }

  const enrollments = await getStudentEnrollments(student_id);

  return NextResponse.json({ enrollments });
}
```

### Phase 5: Testing (1-2 hours)

#### Task 5.1: Create Test Suite
**File**: `tests/integration/rag-pipeline.test.ts` (new file)

```typescript
import { describe, it, expect } from '@jest/globals';
import {
  createCreator,
  createVideo,
  updateVideoStatus,
  insertChunks,
  searchChunks,
  enrollStudent,
} from '@/lib/supabase';

describe('RAG Pipeline', () => {
  it('should create creator and video', async () => {
    const creator = await createCreator(
      'test_whop_123',
      'test_user_123',
      'Test Co',
      'test-co'
    );
    expect(creator.id).toBeDefined();

    const video = await createVideo({
      creator_id: creator.id,
      title: 'Test Video',
      video_url: 'https://example.com/video.mp4',
      storage_path: 's3://bucket/video.mp4',
      processing_status: 'pending',
    });
    expect(video.id).toBeDefined();
  });

  it('should search chunks', async () => {
    // Requires test data with embeddings
    const mockEmbedding = new Array(1536).fill(0.1);
    const results = await searchChunks(mockEmbedding, 'creator_id', 5);
    expect(Array.isArray(results)).toBe(true);
  });
});
```

#### Task 5.2: End-to-End Test
**File**: `tests/e2e/chat-flow.test.ts` (new file)

Test complete flow:
1. Upload video
2. Wait for processing
3. Search chunks
4. Generate chat response
5. Verify message saved

### Phase 6: Documentation Updates (30 mins)

Update:
- `README.md` with new API endpoints
- `docs/API_REFERENCE.md` with chat and upload endpoints
- `docs/DEPLOYMENT.md` with environment variables

## Environment Variables Required

Add to `.env.local`:

```bash
# OpenAI (for embeddings and Whisper)
OPENAI_API_KEY=sk-...

# Anthropic (for chat)
ANTHROPIC_API_KEY=sk-ant-...

# S3/R2 (for video storage)
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
AWS_REGION=us-east-1
AWS_S3_BUCKET=chronos-videos

# Existing Supabase vars
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
```

## Success Criteria

✅ Migration runs successfully
✅ Test creator/student/enrollment created
✅ Video upload works (file → S3 → DB record)
✅ Transcription completes (Whisper API)
✅ Chunking generates proper segments
✅ Embeddings generated (1536 dimensions)
✅ Chunks stored with creator_id
✅ Vector search returns relevant results
✅ Chat API generates responses with citations
✅ Messages saved to database
✅ Token rewards triggered
✅ End-to-end test passes

## Estimated Time

- Phase 1 (Setup): 30 mins
- Phase 2 (Processing): 2-3 hours
- Phase 3 (Chat API): 2-3 hours
- Phase 4 (API Routes): 1-2 hours
- Phase 5 (Testing): 1-2 hours
- Phase 6 (Docs): 30 mins

**Total**: 7-11 hours (1-2 days)

## Support Resources

- RAG System Guide: `docs/RAG_SYSTEM_GUIDE.md`
- Quick Reference: `docs/RAG_QUICK_REFERENCE.md`
- Database Helpers: `lib/supabase/ragHelpers.ts`
- Type Definitions: `types/rag.ts`
- Verification Script: `scripts/verify-rag-foundation.ts`

## Questions?

Refer to the comprehensive documentation in `docs/` directory. All helper functions have detailed JSDoc comments.

**Good luck building the video processing pipeline and RAG chat!** 🚀
