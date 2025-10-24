# RAG Chat System Documentation

## Overview

The AI Chat Interface with RAG (Retrieval-Augmented Generation) allows students to ask questions about course videos and receive AI-generated answers with specific video references and timestamps.

## Architecture

### Core Components

```
Student Chat Flow:
1. Student asks question → ChatInterface
2. Question + session context → /api/chat
3. RAG Engine processes:
   - Generate query embedding (OpenAI)
   - Vector similarity search (Supabase pgvector)
   - Build context from top chunks
   - Query Claude API with context
   - Extract video references
4. Save message + response to database
5. Award 10 CHRONOS tokens
6. Return response with video references
```

### Technology Stack

- **Frontend**: React, TypeScript, TailwindCSS
- **AI Models**:
  - Claude 3.5 Sonnet (chat responses)
  - OpenAI text-embedding-ada-002 (embeddings)
- **Database**: Supabase PostgreSQL with pgvector
- **State Management**: React hooks + optimistic updates

## File Structure

```
app/
├── dashboard/
│   └── student/
│       └── chat/
│           └── page.tsx              # Main chat page
├── api/
│   └── chat/
│       ├── route.ts                  # POST /api/chat (send message)
│       ├── feedback/
│       │   └── route.ts              # POST /api/chat/feedback
│       ├── history/
│       │   └── route.ts              # GET /api/chat/history
│       └── session/
│           └── [sessionId]/
│               └── route.ts          # DELETE, PATCH session

components/
├── chat/
│   ├── ChatInterface.tsx             # Main chat container
│   ├── MessageList.tsx               # Message display
│   ├── MessageInput.tsx              # Input field
│   ├── SessionSidebar.tsx            # Chat history sidebar
│   ├── CreatorSelector.tsx           # Multi-tenant selector
│   └── VideoReferenceCard.tsx        # Clickable video refs

lib/
├── rag/
│   ├── rag-engine.ts                 # Core RAG logic
│   ├── chat-service.ts               # Database operations
│   ├── context-builder.ts            # Context formatting
│   └── vector-search.ts              # Vector similarity search
└── ai/
    ├── claude.ts                     # Claude API integration
    └── embeddings.ts                 # OpenAI embeddings
```

## Database Schema

### Tables

**chat_sessions**
```sql
- id (uuid)
- student_id (uuid, FK)
- creator_id (uuid, FK)
- title (text)
- context_type (enum: general, project-specific, quiz-help)
- created_at, updated_at
```

**chat_messages**
```sql
- id (uuid)
- session_id (uuid, FK → chat_sessions)
- role (enum: user, assistant, system)
- content (text)
- video_references (jsonb[])
- feedback (enum: positive, negative, null)
- created_at
```

**chunks** (from Agent 1)
```sql
- id (uuid)
- video_id (uuid)
- creator_id (uuid)
- chunk_text (text)
- chunk_index (int)
- start_timestamp (int)
- end_timestamp (int)
- embedding (vector(1536))  -- OpenAI ada-002 dimensions
- topic_tags (text[])
```

### Key Functions

**match_chunks(query_embedding, creator_id, match_count, match_threshold)**
- Performs cosine similarity search on chunk embeddings
- Filters by creator_id (multi-tenant isolation)
- Returns top N most relevant chunks with similarity scores

## API Endpoints

### POST /api/chat
Send a chat message and get AI response.

**Request:**
```json
{
  "message": "How do I use useState with arrays?",
  "session_id": "optional-session-uuid",
  "context_type": "general"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "message_id": "msg-uuid",
    "content": "To use useState with arrays...",
    "video_references": [
      {
        "video_id": "vid-uuid",
        "title": "React Hooks Basics",
        "timestamp": 754,
        "relevance_score": 0.89
      }
    ],
    "session_id": "session-uuid"
  }
}
```

### GET /api/chat
Get all chat sessions for the current user.

**Response:**
```json
{
  "success": true,
  "data": {
    "sessions": [
      {
        "id": "session-uuid",
        "title": "First question text...",
        "updated_at": "2025-10-22T10:30:00Z"
      }
    ]
  }
}
```

### GET /api/chat/history?session_id=xxx&limit=50
Get message history for a session.

**Response:**
```json
{
  "success": true,
  "data": {
    "messages": [
      {
        "id": "msg-uuid",
        "role": "user",
        "content": "Question text",
        "created_at": "2025-10-22T10:30:00Z"
      },
      {
        "id": "msg-uuid-2",
        "role": "assistant",
        "content": "Answer text",
        "video_references": [...],
        "created_at": "2025-10-22T10:30:05Z"
      }
    ]
  }
}
```

### POST /api/chat/feedback
Submit thumbs up/down feedback on AI response.

**Request:**
```json
{
  "message_id": "msg-uuid",
  "feedback": "positive"
}
```

### DELETE /api/chat/session/:sessionId
Delete a chat session and all its messages.

## RAG Flow Details

### 1. Query Embedding Generation
```typescript
// Uses OpenAI text-embedding-ada-002
const embedding = await generateQueryEmbedding(question);
// Returns: number[] (1536 dimensions)
```

### 2. Vector Similarity Search
```typescript
const chunks = await searchRelevantChunks(question, {
  creator_id: creatorId,
  match_count: 5,
  match_threshold: 0.7
});
```

Returns:
```typescript
interface ChunkSearchResult {
  chunk_id: string;
  video_id: string;
  video_title: string;
  content: string;
  start_seconds: number;
  end_seconds: number;
  similarity: number;  // 0.0 - 1.0
}
```

### 3. Context Building
```typescript
const context = contextBuilder.build(searchResults, conversationHistory);
```

Formats as:
```
# Video Content Context

## Source 1: "React Hooks Basics" at 12:34
Content: [chunk text with 500-1000 words]
Similarity: 89%

## Source 2: "State Management" at 5:20
Content: [chunk text]
Similarity: 82%

# Conversation History (last 5 messages)
[formatted history]

# Student Question
[current question]
```

### 4. Claude API Call
```typescript
const response = await anthropic.messages.create({
  model: 'claude-3-5-sonnet-20241022',
  max_tokens: 4096,
  temperature: 0.7,
  system: SYSTEM_PROMPT,
  messages: [{ role: 'user', content: context }]
});
```

**System Prompt:**
```
You are an AI learning assistant helping students understand video course content.

Your role is to:
1. Answer questions based on the provided video content
2. Reference specific videos and timestamps when relevant
3. Explain concepts clearly and concisely
4. Suggest related topics the student might find helpful
5. Encourage hands-on practice and experimentation

Guidelines:
- Always cite the video sources when answering
- If the content doesn't contain the answer, say so honestly
- Break down complex topics into digestible parts
- Use examples and analogies to clarify concepts
- Be encouraging and supportive of the learning journey
```

### 5. Response Processing
```typescript
// Extract video references from search results
const videoReferences = contextBuilder.extractVideoReferences(searchResults);

// Calculate confidence score
const confidence = calculateConfidence(searchResults);

return {
  answer: response.content,
  video_references: videoReferences,
  confidence: 0.85
};
```

## Frontend Components

### ChatInterface
Main container managing chat state and API calls.

**Props:**
```typescript
interface ChatInterfaceProps {
  sessionId?: string;
  contextType?: 'general' | 'project-specific' | 'quiz-help';
  onVideoClick?: (videoId: string, timestamp: number) => void;
  className?: string;
  isFloating?: boolean;  // Floating widget mode
}
```

**Features:**
- Optimistic UI updates (instant user message display)
- Auto-scroll to latest message
- Typing indicator while AI responds
- Error handling with toast notifications
- Support for both embedded and floating modes

### SessionSidebar
Displays chat history with search and grouping.

**Features:**
- Search conversations by title
- Group by date (Today, Yesterday, This Week, etc.)
- Delete confirmation (2-click to prevent accidents)
- Loading skeleton states
- Empty state with helpful prompts

### VideoReferenceCard
Clickable video reference chip.

**Features:**
- Video title + formatted timestamp
- Relevance score indicator (progress bar)
- Hover effects
- Click → navigate to video player with timestamp

**Display Format:**
```
[Play Icon] React Hooks Basics
            12:34 • 89% relevant
[Progress bar showing relevance]
```

## Video Player Integration

### Timestamp Navigation
When a video reference is clicked:

```typescript
// Navigate to video with timestamp query param
router.push(`/dashboard/watch/${videoId}?t=${timestamp}`);

// Video player reads URL param and seeks to timestamp
const searchParams = new URLSearchParams(window.location.search);
const timestamp = parseInt(searchParams.get('t') || '0');

// For YouTube embeds
<iframe src={`https://youtube.com/embed/${id}?start=${timestamp}`} />

// For platform videos
useEffect(() => {
  if (videoRef.current && timestamp > 0) {
    videoRef.current.currentTime = timestamp;
  }
}, [timestamp]);
```

## Multi-Tenant Support

### Creator Isolation
All queries filter by `creator_id`:

```typescript
// Vector search automatically filters
const chunks = await searchRelevantChunks(query, {
  creator_id: creatorId,  // Only search this creator's videos
  match_count: 5
});

// Database queries also filter
const sessions = await chatService.getStudentSessions(studentId);
// Only returns sessions for enrolled creators
```

### CreatorSelector Component
Allows students enrolled with multiple creators to switch context:

```typescript
<CreatorSelector
  selectedCreatorId={creatorId}
  onCreatorChange={(newCreatorId) => {
    setCreatorId(newCreatorId);
    setCurrentSessionId(undefined); // Reset session
  }}
/>
```

## Token Rewards

Students earn 10 CHRONOS tokens per chat message sent:

```typescript
// In chatWithSession() function
await awardChronos(studentId, 10, 'chat_message', {
  session_id: sessionId,
  question_preview: question.substring(0, 100)
});
```

## Performance Optimizations

### 1. Optimistic Updates
User messages appear instantly before API call completes:

```typescript
const tempMessage = {
  id: `temp-${Date.now()}`,
  role: 'user',
  content: message
};
setMessages(prev => [...prev, tempMessage]);

// API call happens in background
const response = await fetch('/api/chat', {...});

// Replace temp message with real one
setMessages(prev => prev.filter(m => m.id !== tempMessage.id));
```

### 2. Context Window Management
Only last 5 messages included in RAG context to:
- Reduce token costs
- Improve response relevance
- Stay within Claude's context limits

### 3. Vector Search Caching
- Embeddings cached in database (never regenerated)
- Match results could be cached for identical queries (future enhancement)

### 4. Rate Limiting
```typescript
// 20 chat messages per minute per user
const rateLimitResult = await checkRateLimit(userId, 'chat:message', {
  max: 20,
  window: 60
});
```

## Error Handling

### Client-Side
```typescript
try {
  const response = await fetch('/api/chat', {...});
  const data = await response.json();

  if (!data.success) {
    throw new Error(data.error?.message || 'Failed to send message');
  }
} catch (error) {
  toast.error(error.message);
  // Remove optimistic message
  setMessages(prev => prev.filter(m => m.id !== tempMessage.id));
}
```

### Server-Side
All API routes use standardized error handling:

```typescript
try {
  // API logic
} catch (error) {
  logError('Chat request failed', { error });

  const apiResponse = errorToAPIResponse(error);
  const statusCode = getErrorStatusCode(error);

  return NextResponse.json(apiResponse, { status: statusCode });
}
```

Error types:
- `ValidationError` (400)
- `AuthenticationError` (401)
- `RateLimitError` (429)
- `DatabaseError` (500)
- `AIAPIError` (500)

## Testing

### Manual Testing Checklist

1. **Basic Chat Flow**
   - [ ] Send a question
   - [ ] Receive AI response
   - [ ] Video references appear
   - [ ] Click video reference → navigates to correct timestamp

2. **Session Management**
   - [ ] New chat creates new session
   - [ ] Select previous session loads history
   - [ ] Delete session works (with confirmation)
   - [ ] Search sessions works

3. **Multi-Tenant**
   - [ ] Only see videos from enrolled creators
   - [ ] Creator selector works (if multiple creators)
   - [ ] Sessions isolated by creator

4. **Error Cases**
   - [ ] Rate limit works (send 21+ messages)
   - [ ] No results found (nonsensical question)
   - [ ] Network error handling
   - [ ] Empty message validation

5. **UI/UX**
   - [ ] Auto-scroll to new messages
   - [ ] Typing indicator appears
   - [ ] Feedback buttons work
   - [ ] Mobile responsive
   - [ ] Floating chat widget works

### Integration Test Example

```typescript
describe('RAG Chat Flow', () => {
  it('should return relevant video references for a question', async () => {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: 'How do I use useState?',
        creator_id: 'test-creator-id'
      })
    });

    const data = await response.json();

    expect(data.success).toBe(true);
    expect(data.data.content).toBeTruthy();
    expect(data.data.video_references.length).toBeGreaterThan(0);
    expect(data.data.video_references[0]).toHaveProperty('video_id');
    expect(data.data.video_references[0]).toHaveProperty('timestamp');
  });
});
```

## Environment Variables

Required:
```bash
ANTHROPIC_API_KEY=sk-ant-...       # Claude API
OPENAI_API_KEY=sk-...              # Embeddings
NEXT_PUBLIC_SUPABASE_URL=...       # Database
SUPABASE_SERVICE_ROLE_KEY=...      # Admin access
```

## Monitoring & Analytics

### Logged Metrics
- Chat message count
- Average response time
- Confidence scores
- Feedback ratio (thumbs up/down)
- Most common questions
- Video reference click-through rate

### Performance Targets
- Chat response time: < 5 seconds (95th percentile)
- Vector search: < 500ms
- Claude API call: < 3 seconds
- Database queries: < 100ms

## Future Enhancements

### Phase 1 (Current)
- [x] Basic RAG chat
- [x] Video references
- [x] Session management
- [x] Feedback system

### Phase 2
- [ ] Streaming responses (real-time typing)
- [ ] Suggested follow-up questions
- [ ] Image/code snippet support in responses
- [ ] Voice input/output

### Phase 3
- [ ] Multi-language support
- [ ] Custom fine-tuned models
- [ ] Advanced analytics dashboard
- [ ] A/B testing different prompts

## Troubleshooting

### Common Issues

**1. No video references returned**
- Check if videos have been processed (transcribed + embedded)
- Verify vector search threshold (lower if too strict)
- Check creator_id filtering

**2. Low quality responses**
- Review system prompt
- Check if enough context chunks provided
- Verify chunk quality and size

**3. Slow responses**
- Check Claude API latency
- Review vector search performance
- Consider caching strategies

**4. Rate limit errors**
- Adjust rate limit settings
- Implement user-visible countdown
- Add queueing system

## Support

For issues or questions:
- Check logs in Sentry/console
- Review Supabase query performance
- Test with sample data in development
- Verify environment variables are set

## Related Documentation

- [Database Schema](./DATABASE_SCHEMA.md)
- [API Reference](./API_REFERENCE.md)
- [Video Processing Pipeline](./VIDEO_PROCESSING.md)
- [Token Rewards System](./TOKEN_REWARDS.md)
