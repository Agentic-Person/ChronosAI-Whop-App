# RAG Chat Engine - Implementation Guide

## Prerequisites

Before starting implementation, ensure you have:
- [x] Completed Module 8 (Backend Infrastructure) - Database and caching setup
- [x] Completed Module 7 (Whop Integration) - Authentication working
- [x] Completed Module 2 (Video Processing) - Videos processed with embeddings
- [x] Environment variables configured (see below)
- [x] Local development environment running

### Required Environment Variables
```env
ANTHROPIC_API_KEY=sk-ant-xxx
OPENAI_API_KEY=sk-xxx
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxx
SUPABASE_SERVICE_ROLE_KEY=xxx
REDIS_URL=redis://xxx # or VERCEL_KV_URL
```

## Implementation Steps

### Step 1: Vector Search Service (2 hours)

Create `lib/rag/vector-search.ts`:

```typescript
import OpenAI from 'openai';
import { supabaseAdmin } from '@/lib/utils/supabase-client';
import { VideoChunk } from '@/types';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

export class VectorSearchService {
  /**
   * Generate embedding for a text query
   * Uses OpenAI ada-002 model (1536 dimensions)
   */
  async generateEmbedding(text: string): Promise<number[]> {
    try {
      const response = await openai.embeddings.create({
        model: 'text-embedding-ada-002',
        input: text.trim(),
      });

      return response.data[0].embedding;
    } catch (error) {
      console.error('Error generating embedding:', error);
      throw new Error('Failed to generate embedding');
    }
  }

  /**
   * Search for similar video chunks using pgvector
   * Returns top N most relevant chunks
   */
  async search(
    embedding: number[],
    creatorId: string,
    options: {
      limit?: number;
      threshold?: number;
    } = {}
  ): Promise<VideoChunk[]> {
    const { limit = 5, threshold = 0.7 } = options;

    try {
      // Use pgvector cosine distance operator <=>
      const { data, error } = await supabaseAdmin.rpc(
        'search_video_chunks',
        {
          query_embedding: embedding,
          creator_id: creatorId,
          match_threshold: 1 - threshold, // Convert similarity to distance
          match_count: limit,
        }
      );

      if (error) throw error;

      return data || [];
    } catch (error) {
      console.error('Error searching video chunks:', error);
      throw new Error('Failed to search video chunks');
    }
  }
}

export const vectorSearch = new VectorSearchService();
```

**Create the database function** in a new migration file `supabase/migrations/20251020000003_search_function.sql`:

```sql
-- Function for vector similarity search
CREATE OR REPLACE FUNCTION search_video_chunks(
  query_embedding vector(1536),
  creator_id uuid,
  match_threshold float DEFAULT 0.3,
  match_count int DEFAULT 5
)
RETURNS TABLE (
  id uuid,
  video_id uuid,
  chunk_text text,
  chunk_index int,
  start_timestamp int,
  end_timestamp int,
  similarity float,
  video_title text,
  video_url text
)
LANGUAGE sql STABLE
AS $$
  SELECT
    vc.id,
    vc.video_id,
    vc.chunk_text,
    vc.chunk_index,
    vc.start_timestamp,
    vc.end_timestamp,
    1 - (vc.embedding <=> query_embedding) as similarity,
    v.title as video_title,
    v.video_url
  FROM video_chunks vc
  JOIN videos v ON v.id = vc.video_id
  WHERE v.creator_id = creator_id
    AND 1 - (vc.embedding <=> query_embedding) > match_threshold
  ORDER BY vc.embedding <=> query_embedding
  LIMIT match_count;
$$;
```

**Test it**:
```typescript
// tests/unit/rag/vector-search.test.ts
import { vectorSearch } from '@/lib/rag/vector-search';

describe('VectorSearchService', () => {
  it('should generate embeddings', async () => {
    const embedding = await vectorSearch.generateEmbedding('test query');
    expect(embedding).toHaveLength(1536);
    expect(embedding[0]).toBeTypeOf('number');
  });

  it('should search for similar chunks', async () => {
    const embedding = new Array(1536).fill(0.1);
    const results = await vectorSearch.search(
      embedding,
      'test-creator-id',
      { limit: 3, threshold: 0.5 }
    );
    expect(Array.isArray(results)).toBe(true);
  });
});
```

### Step 2: Context Builder (1 hour)

Create `lib/rag/context-builder.ts`:

```typescript
import { ChatMessage, VideoChunk } from '@/types';
import { formatTimestamp } from '@/lib/utils/helpers';

export class ContextBuilder {
  /**
   * Build context for Claude from chunks and conversation history
   */
  build(chunks: VideoChunk[], history: ChatMessage[]): string {
    const conversationContext = this.buildConversationHistory(history);
    const knowledgeBase = this.buildKnowledgeBase(chunks);

    return `
${knowledgeBase}

${conversationContext}

# Instructions
You are an AI teaching assistant for an online course. Your role:
- Answer the student's question using ONLY the knowledge base above
- ALWAYS cite specific videos with timestamps using this format: "📹 [Video Title] at [MM:SS]"
- Be encouraging and supportive
- If the answer isn't in the knowledge base, say: "I don't have information about that in the course content. Try asking about topics covered in the videos."
- Keep responses concise but helpful

IMPORTANT: Only answer based on the provided video content. Never make up information.
    `.trim();
  }

  private buildConversationHistory(history: ChatMessage[]): string {
    if (history.length === 0) return '';

    const recentHistory = history.slice(-5); // Last 5 messages
    const formatted = recentHistory
      .map((msg) => `${msg.role === 'user' ? 'Student' : 'Assistant'}: ${msg.content}`)
      .join('\n\n');

    return `# Recent Conversation\n${formatted}`;
  }

  private buildKnowledgeBase(chunks: VideoChunk[]): string {
    if (chunks.length === 0) {
      return '# Knowledge Base\nNo relevant content found.';
    }

    const formatted = chunks
      .map((chunk, idx) => {
        const timestamp = formatTimestamp(chunk.start_timestamp || 0);
        return `
## Source ${idx + 1}
**Video**: ${chunk.video_title}
**Timestamp**: ${timestamp}
**Content**:
${chunk.chunk_text}
        `.trim();
      })
      .join('\n\n');

    return `# Knowledge Base\n${formatted}`;
  }

  /**
   * Extract video references from chunks for response
   */
  extractVideoReferences(chunks: VideoChunk[]): Array<{
    video_id: string;
    title: string;
    timestamp: number;
    relevance_score: number;
  }> {
    return chunks.map((chunk) => ({
      video_id: chunk.video_id,
      title: chunk.video_title,
      timestamp: chunk.start_timestamp || 0,
      relevance_score: chunk.similarity || 0.5,
    }));
  }
}

export const contextBuilder = new ContextBuilder();
```

### Step 3: Chat Service (1.5 hours)

Create `lib/rag/chat-service.ts`:

```typescript
import { supabaseAdmin } from '@/lib/utils/supabase-client';
import { ChatSession, ChatMessage, VideoReference } from '@/types';

export class ChatService {
  /**
   * Create a new chat session
   */
  async createSession(
    studentId: string,
    creatorId: string,
    contextType: 'general' | 'project-specific' | 'quiz-help' = 'general'
  ): Promise<ChatSession> {
    const { data, error } = await supabaseAdmin
      .from('chat_sessions')
      .insert({
        student_id: studentId,
        creator_id: creatorId,
        title: 'New Conversation',
        context_type: contextType,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Get or create session for a student
   */
  async getOrCreateSession(
    studentId: string,
    creatorId: string
  ): Promise<ChatSession> {
    // Try to get most recent session
    const { data: sessions } = await supabaseAdmin
      .from('chat_sessions')
      .select('*')
      .eq('student_id', studentId)
      .eq('creator_id', creatorId)
      .order('created_at', { ascending: false })
      .limit(1);

    if (sessions && sessions.length > 0) {
      return sessions[0];
    }

    // Create new session if none exists
    return this.createSession(studentId, creatorId);
  }

  /**
   * Save a message to the database
   */
  async saveMessage(
    sessionId: string,
    role: 'user' | 'assistant',
    content: string,
    videoReferences?: VideoReference[]
  ): Promise<ChatMessage> {
    const { data, error } = await supabaseAdmin
      .from('chat_messages')
      .insert({
        session_id: sessionId,
        role,
        content,
        video_references: videoReferences || null,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Get conversation history
   */
  async getHistory(
    sessionId: string,
    limit: number = 10
  ): Promise<ChatMessage[]> {
    const { data, error } = await supabaseAdmin
      .from('chat_messages')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true })
      .limit(limit);

    if (error) throw error;
    return data || [];
  }

  /**
   * Update message feedback
   */
  async updateFeedback(
    messageId: string,
    feedback: 'positive' | 'negative'
  ): Promise<void> {
    const { error } = await supabaseAdmin
      .from('chat_messages')
      .update({ feedback })
      .eq('id', messageId);

    if (error) throw error;
  }

  /**
   * Get all sessions for a student
   */
  async getStudentSessions(studentId: string): Promise<ChatSession[]> {
    const { data, error } = await supabaseAdmin
      .from('chat_sessions')
      .select('*')
      .eq('student_id', studentId)
      .order('updated_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }
}

export const chatService = new ChatService();
```

### Step 4: RAG Engine (2 hours)

Create `lib/rag/rag-engine.ts`:

```typescript
import Anthropic from '@anthropic-ai/sdk';
import { vectorSearch } from './vector-search';
import { contextBuilder } from './context-builder';
import { chatService } from './chat-service';
import { ChatResponse } from '@/types/api';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

export class RAGEngine {
  /**
   * Main chat method - orchestrates the entire RAG pipeline
   */
  async chat(
    query: string,
    studentId: string,
    creatorId: string,
    sessionId?: string
  ): Promise<ChatResponse> {
    try {
      // 1. Get or create session
      const session = sessionId
        ? await chatService.getHistory(sessionId, 5).then(() => ({ id: sessionId }))
        : await chatService.getOrCreateSession(studentId, creatorId);

      // 2. Save user message
      await chatService.saveMessage(session.id, 'user', query);

      // 3. Load conversation history
      const history = await chatService.getHistory(session.id, 5);

      // 4. Generate query embedding
      const embedding = await vectorSearch.generateEmbedding(query);

      // 5. Search for relevant chunks
      const chunks = await vectorSearch.search(embedding, creatorId, {
        limit: 5,
        threshold: 0.7,
      });

      // 6. Build context
      const context = contextBuilder.build(chunks, history);

      // 7. Generate AI response
      const aiResponse = await this.generateResponse(query, context);

      // 8. Extract video references
      const videoReferences = contextBuilder.extractVideoReferences(chunks);

      // 9. Save assistant message
      const message = await chatService.saveMessage(
        session.id,
        'assistant',
        aiResponse,
        videoReferences
      );

      return {
        message_id: message.id,
        content: aiResponse,
        video_references: videoReferences,
        session_id: session.id,
      };
    } catch (error) {
      console.error('RAG Engine error:', error);
      throw new Error('Failed to process chat request');
    }
  }

  /**
   * Generate AI response using Claude
   */
  private async generateResponse(
    query: string,
    context: string
  ): Promise<string> {
    try {
      const response = await anthropic.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 1024,
        messages: [
          {
            role: 'user',
            content: `${context}\n\n# Student Question\n${query}`,
          },
        ],
      });

      const textContent = response.content.find((c) => c.type === 'text');
      return textContent?.type === 'text' ? textContent.text : 'Unable to generate response';
    } catch (error) {
      console.error('Claude API error:', error);
      throw new Error('Failed to generate AI response');
    }
  }
}

export const ragEngine = new RAGEngine();
```

### Step 5: API Routes (1.5 hours)

Create `app/api/chat/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { ragEngine } from '@/lib/rag/rag-engine';
import { getUser } from '@/lib/utils/supabase-client';
import { rateLimiter } from '@/lib/infrastructure/rate-limiter';
import { ChatRequest, APIResponse, ChatResponse } from '@/types/api';

export async function POST(request: NextRequest) {
  try {
    // 1. Authenticate user
    const user = await getUser();
    if (!user) {
      return NextResponse.json<APIResponse>(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } },
        { status: 401 }
      );
    }

    // 2. Rate limiting
    const rateLimitResult = await rateLimiter.check(user.id, 'chat', 20); // 20 per minute
    if (!rateLimitResult.allowed) {
      return NextResponse.json<APIResponse>(
        {
          success: false,
          error: {
            code: 'RATE_LIMIT',
            message: 'Too many requests. Please wait a moment.',
          },
        },
        { status: 429 }
      );
    }

    // 3. Parse request
    const body: ChatRequest = await request.json();
    const { message, session_id, context_type } = body;

    // 4. Validate input
    if (!message || message.trim().length === 0) {
      return NextResponse.json<APIResponse>(
        {
          success: false,
          error: { code: 'INVALID_INPUT', message: 'Message is required' },
        },
        { status: 400 }
      );
    }

    if (message.length > 500) {
      return NextResponse.json<APIResponse>(
        {
          success: false,
          error: { code: 'INVALID_INPUT', message: 'Message too long (max 500 characters)' },
        },
        { status: 400 }
      );
    }

    // 5. Get student and creator info
    // TODO: Get student record from database
    const studentId = user.id; // Simplified - should get from students table
    const creatorId = 'creator-id'; // TODO: Get from student record

    // 6. Process chat
    const response = await ragEngine.chat(message, studentId, creatorId, session_id);

    // 7. Return response
    return NextResponse.json<APIResponse<ChatResponse>>({
      success: true,
      data: response,
    });
  } catch (error) {
    console.error('Chat API error:', error);
    return NextResponse.json<APIResponse>(
      {
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to process request' },
      },
      { status: 500 }
    );
  }
}
```

Create `app/api/chat/history/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { chatService } from '@/lib/rag/chat-service';
import { getUser } from '@/lib/utils/supabase-client';
import { APIResponse } from '@/types/api';

export async function GET(request: NextRequest) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json<APIResponse>(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('session_id');

    if (!sessionId) {
      return NextResponse.json<APIResponse>(
        { success: false, error: { code: 'INVALID_INPUT', message: 'session_id required' } },
        { status: 400 }
      );
    }

    const messages = await chatService.getHistory(sessionId);

    return NextResponse.json<APIResponse>({
      success: true,
      data: messages,
    });
  } catch (error) {
    console.error('Chat history API error:', error);
    return NextResponse.json<APIResponse>(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch history' } },
      { status: 500 }
    );
  }
}
```

Create `app/api/chat/feedback/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { chatService } from '@/lib/rag/chat-service';
import { getUser } from '@/lib/utils/supabase-client';
import { APIResponse } from '@/types/api';

export async function POST(request: NextRequest) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json<APIResponse>(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { message_id, feedback } = body;

    if (!message_id || !['positive', 'negative'].includes(feedback)) {
      return NextResponse.json<APIResponse>(
        { success: false, error: { code: 'INVALID_INPUT', message: 'Invalid input' } },
        { status: 400 }
      );
    }

    await chatService.updateFeedback(message_id, feedback);

    return NextResponse.json<APIResponse>({
      success: true,
      data: { message: 'Feedback recorded' },
    });
  } catch (error) {
    console.error('Feedback API error:', error);
    return NextResponse.json<APIResponse>(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to record feedback' } },
      { status: 500 }
    );
  }
}
```

## Testing

Run unit tests:
```bash
npm test tests/unit/rag/
```

Run integration tests:
```bash
npm run test:integration
```

Test the API manually:
```bash
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"message": "How do I implement authentication?"}'
```

## Common Issues & Solutions

### Issue 1: Slow vector search
**Solution**: Add index on embedding column (already in migrations)

### Issue 2: Claude API timeout
**Solution**: Increase max_tokens or implement retry logic

### Issue 3: Low quality responses
**Solution**: Adjust similarity threshold (currently 0.7), tune prompt

### Issue 4: Out of context errors
**Solution**: Reduce chunk size or number of chunks included

## Next Steps

1. Implement React components (see COMPONENTS.md)
2. Add caching for common questions
3. Integrate with Progress Tracking module
4. Set up monitoring and alerts
