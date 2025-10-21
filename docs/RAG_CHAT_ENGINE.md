# RAG Chat Engine Documentation

## Overview

The RAG (Retrieval-Augmented Generation) Chat Engine is the core AI-powered feature that enables students to ask questions about course content and receive instant, accurate answers with video timestamp citations.

## Architecture

### Components

1. **Vector Search Service** (`lib/rag/vector-search.ts`)
   - Generates embeddings using OpenAI `text-embedding-3-small`
   - Performs vector similarity search using PostgreSQL pgvector
   - Returns top-K most relevant video chunks

2. **Context Builder** (`lib/rag/context-builder.ts`)
   - Builds optimized context for Claude API
   - Formats video chunks and conversation history
   - Manages token limits (8K context window)
   - Generates system prompts for different contexts

3. **Chat Service** (`lib/rag/chat-service.ts`)
   - Database operations for sessions and messages
   - Conversation history management
   - Feedback tracking
   - Analytics aggregation

4. **RAG Engine** (`lib/rag/rag-engine.ts`)
   - Orchestrates the complete RAG pipeline
   - Integrates vector search, context building, and Claude API
   - Session management and message storage
   - Confidence scoring

### Data Flow

```
User Question
    ↓
1. Generate Query Embedding (OpenAI)
    ↓
2. Vector Search (pgvector)
    ↓
3. Build Context (chunks + history)
    ↓
4. Query Claude API
    ↓
5. Store Messages
    ↓
AI Response + Video Citations
```

## API Endpoints

### POST /api/chat

Send a message and get AI response.

**Request:**
```json
{
  "message": "How do I implement authentication?",
  "session_id": "uuid-optional",
  "context_type": "general" // or "project-specific", "quiz-help"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "message_id": "uuid",
    "content": "To implement authentication...",
    "video_references": [
      {
        "video_id": "uuid",
        "title": "React Authentication Tutorial",
        "timestamp": 320,
        "relevance_score": 0.92
      }
    ],
    "session_id": "uuid"
  }
}
```

**Rate Limits:**
- 20 requests per minute per user

### GET /api/chat/history

Get conversation history for a session.

**Query Parameters:**
- `session_id` (required): Session UUID
- `limit` (optional): Max messages to return (1-100, default: 50)

**Response:**
```json
{
  "success": true,
  "data": {
    "session_id": "uuid",
    "messages": [...],
    "total": 15
  }
}
```

### POST /api/chat/feedback

Submit feedback on AI response.

**Request:**
```json
{
  "message_id": "uuid",
  "feedback": "positive", // or "negative"
  "comment": "Very helpful explanation!" // optional
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "message": "Feedback recorded successfully"
  }
}
```

## Usage Examples

### Basic Chat Integration

```typescript
import { ChatInterface } from '@/components/chat/ChatInterface';

export function StudentDashboard() {
  return (
    <div className="h-screen">
      <ChatInterface
        contextType="general"
        onVideoClick={(videoId, timestamp) => {
          // Navigate to video player at timestamp
          router.push(`/videos/${videoId}?t=${timestamp}`);
        }}
      />
    </div>
  );
}
```

### Floating Chat Widget

```typescript
import { ChatInterface } from '@/components/chat/ChatInterface';

export function Layout({ children }) {
  return (
    <>
      {children}
      <ChatInterface isFloating={true} />
    </>
  );
}
```

### Direct API Usage

```typescript
const response = await fetch('/api/chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    message: 'How do I use React hooks?',
    context_type: 'general',
  }),
});

const data = await response.json();
console.log(data.data.content); // AI response
console.log(data.data.video_references); // Video citations
```

## Configuration

### Environment Variables

```env
# Required
ANTHROPIC_API_KEY=sk-ant-xxx
OPENAI_API_KEY=sk-xxx
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxx
SUPABASE_SERVICE_ROLE_KEY=xxx
```

### Constants

Located in `lib/rag/rag-engine.ts`:

```typescript
const MODEL = 'claude-3-5-sonnet-20241022';
const MAX_TOKENS = 4096;
const TEMPERATURE = 0.7;
const TOP_K_CHUNKS = 5;
```

### Context Builder Settings

Located in `lib/rag/context-builder.ts`:

```typescript
const MAX_CONTEXT_TOKENS = 8000;
const AVERAGE_CHARS_PER_TOKEN = 4;
const MAX_CONTEXT_LENGTH = MAX_CONTEXT_TOKENS * AVERAGE_CHARS_PER_TOKEN;
```

## Performance Optimization

### Caching Strategy

**Query Embedding Cache** (1 hour TTL):
```typescript
const cachedEmbedding = await cache.get(`embedding:${queryHash}`);
```

**Response Cache** (24 hour TTL):
```typescript
const cachedResponse = await cache.get(`chat:${creatorId}:${queryHash}`);
```

### Vector Search Optimization

1. **pgvector Index**: Uses IVFFlat algorithm for fast similarity search
2. **Similarity Threshold**: Default 0.7, can be lowered to 0.5 for broader results
3. **Top-K Limiting**: Default 5 chunks to balance relevance and context size

### Token Management

- Context limited to 8000 tokens (32,000 characters)
- Chunks truncated if exceeding limit
- History limited to last 5 messages

## Monitoring & Analytics

### Metrics Tracked

1. **Response Time**: Average chat response duration
2. **Feedback Rate**: % of messages with feedback
3. **Satisfaction**: Thumbs up vs thumbs down ratio
4. **Token Usage**: Input/output tokens per query
5. **Cache Hit Rate**: % of cached responses

### Logging

All operations logged via infrastructure logger:

```typescript
logInfo('Chat request completed', {
  userId,
  sessionId,
  duration,
  confidence,
});
```

### Analytics Queries

Get feedback statistics:
```typescript
const stats = await chatService.getFeedbackStats(creatorId);
// {
//   total_messages: 1250,
//   positive_feedback: 1050,
//   negative_feedback: 50,
//   feedback_rate: 88.0
// }
```

## Error Handling

### Common Errors

**RateLimitError (429)**:
```json
{
  "success": false,
  "error": {
    "code": "RATE_LIMIT",
    "message": "Too many requests. Try again in 45 seconds."
  }
}
```

**ValidationError (400)**:
```json
{
  "success": false,
  "error": {
    "code": "INVALID_INPUT",
    "message": "Message too long (max 500 characters)"
  }
}
```

**AIAPIError (500)**:
```json
{
  "success": false,
  "error": {
    "code": "AI_ERROR",
    "message": "AI service temporarily unavailable"
  }
}
```

## Testing

### Run Tests

```bash
# All tests
npm test

# RAG module tests only
npm test lib/rag/__tests__

# Watch mode
npm test -- --watch lib/rag
```

### Integration Testing

See `lib/rag/__tests__/` for examples.

Key test scenarios:
- ✅ Vector search returns relevant chunks
- ✅ Context builder stays under token limit
- ✅ Claude API integration works
- ✅ Video references extracted correctly
- ✅ Feedback submission works
- ✅ Rate limiting enforced

## Troubleshooting

### Low Quality Responses

**Symptoms**: Irrelevant answers, low confidence scores

**Solutions**:
1. Check vector embeddings are generated correctly
2. Lower similarity threshold (0.7 → 0.5)
3. Increase top-K chunks (5 → 7)
4. Review prompt engineering in context builder

### Slow Response Times

**Symptoms**: >5 second response times

**Solutions**:
1. Enable response caching
2. Optimize vector search index
3. Reduce context size (fewer chunks/history)
4. Check Claude API latency

### Token Limit Exceeded

**Symptoms**: Context truncation warnings

**Solutions**:
1. Reduce max chunks (5 → 3)
2. Shorten conversation history (5 → 3 messages)
3. Truncate individual chunks if very long

### No Relevant Results

**Symptoms**: Empty video references, low confidence

**Solutions**:
1. Verify videos have been processed and embedded
2. Check creator_id filtering is correct
3. Lower similarity threshold
4. Rephrase query for better semantic match

## Best Practices

### Prompt Engineering

1. **Clear Instructions**: Be specific about desired output format
2. **Citation Requirements**: Always require video references
3. **Boundary Setting**: Define when to say "I don't know"
4. **Context Types**: Use appropriate system prompts for different scenarios

### Context Management

1. **Token Limits**: Always stay under 8K context tokens
2. **Relevance Filtering**: Only include high-similarity chunks (>0.7)
3. **History Management**: Keep last 5 messages maximum
4. **Chunk Quality**: Ensure chunks are coherent and complete

### User Experience

1. **Loading States**: Show typing indicator while processing
2. **Error Messages**: Provide clear, actionable error messages
3. **Feedback Loop**: Make it easy to submit feedback
4. **Video Navigation**: Enable one-click jump to referenced videos

## Future Enhancements

### Planned Features

1. **Streaming Responses**: Real-time token-by-token display
2. **Multi-language Support**: i18n for non-English courses
3. **Image Generation**: Diagrams and visual explanations
4. **Code Execution**: Interactive code examples
5. **Voice Input**: Speech-to-text for questions
6. **Suggested Questions**: AI-generated follow-ups
7. **Project Context**: Reference user's project code
8. **External Sources**: Integration with documentation sites

### Performance Improvements

1. **Embedding Model**: Upgrade to faster embedding models
2. **Hybrid Search**: Combine vector + keyword search
3. **Re-ranking**: ML-based relevance re-ranking
4. **Batch Processing**: Parallel chunk processing
5. **Edge Caching**: CDN-level response caching

## Cost Optimization

### Current Costs (per 1000 queries)

- **Claude API**: ~$15 (assuming 2K input, 1K output tokens)
- **OpenAI Embeddings**: ~$0.50 (query embeddings only)
- **Database**: Negligible (pgvector queries)
- **Total**: ~$15.50 per 1000 queries

### Optimization Strategies

1. **Caching**: 40% cache hit rate saves ~$6/1000 queries
2. **Shorter Contexts**: Reduce input tokens by 20%
3. **Batch Embeddings**: Minor savings on embedding costs
4. **Rate Limiting**: Prevent abuse and cost spikes

## Support

For issues or questions:
- Check troubleshooting section above
- Review error logs in monitoring dashboard
- Test with sample queries in development
- Contact development team for infrastructure issues

## Changelog

### v1.0.0 (Current)
- ✅ Vector search with pgvector
- ✅ Claude 3.5 Sonnet integration
- ✅ Session management
- ✅ Feedback system
- ✅ React UI components
- ✅ Rate limiting
- ✅ Error handling
- ✅ Monitoring and logging

### Future Versions
- v1.1.0: Streaming responses, suggested questions
- v1.2.0: Project-specific context, code analysis
- v2.0.0: Multi-language, voice input, external sources
