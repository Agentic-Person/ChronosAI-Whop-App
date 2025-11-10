# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Chronos** - An AI-powered video learning assistant for Whop creators in education and coaching. The app transforms passive video courses into interactive, personalized learning experiences with AI chat, automated transcription, and comprehensive analytics.

**Core Value:** Save creators 10+ hours/week in student support while increasing course completion rates from 15% to 60%+

**Target Market:** Educational creators on Whop (trading education 40%, e-commerce coaching 20%, real estate 15%, fitness 10%, AI training 15%)

**Note:** This is the original project directory. The clean rebuild is in the `chronos/` directory.

## Tech Stack

- **Frontend/Backend:** Next.js 14 (App Router), React, TypeScript
- **UI Framework:** Frosted UI (Whop's design system) + Tailwind CSS
- **Charts/Analytics:** Recharts for data visualization
- **Database:** Supabase PostgreSQL with pgvector for vector embeddings
- **AI/ML:** Claude 3.5 Sonnet (RAG chat), OpenAI (Whisper for transcription, embeddings)
- **Video Storage:** Supabase Storage
- **Authentication:** Whop OAuth
- **Background Jobs:** Inngest for video processing
- **Caching:** Vercel KV (Redis)
- **Rate Limiting:** Upstash
- **Deployment:** Vercel
- **Monitoring:** Sentry (errors)

## Core Features (MVP)

1. **AI Chat with Video Search (RAG)** - Semantic search across video transcripts with timestamp citations
2. **Automated Video Processing** - Bulk upload → transcription → chunking → vector embeddings
3. **Course Builder** - Drag-drop course organization with modules
4. **Creator Analytics Dashboard** - Video performance, student engagement, usage metrics with interactive charts
5. **Usage Limits** - Tier-based rate limiting and quotas
6. **Whop Integration** - Native OAuth, membership sync, webhook handlers

**Removed from Original Scope:**
- ❌ AI Quiz Generation (future phase)
- ❌ Learning Calendar (future phase)
- ❌ Blockchain/Tokens (removed entirely)
- ❌ Discord Integration (removed entirely)
- ❌ Study Buddy Matching (removed entirely)

## Development Commands

Since this is a greenfield project, these commands will be relevant once setup is complete:

```bash
# Initial project setup
npx create-next-app@latest . --typescript --tailwind --app --no-src-dir --import-alias "@/*"

# Install core dependencies
npm install @supabase/supabase-js @supabase/auth-helpers-nextjs
npm install @supabase/auth-ui-react @supabase/auth-ui-shared
npm install framer-motion react-hot-toast zustand
npm install lucide-react

# Whop integration
npm install @whop/api @whop/react

# Development server
npm run dev

# Production build
npm run build
npm run start

# Testing (once configured)
npm test                    # Run all tests
npm run test:watch         # Watch mode
npm run test:integration   # Integration tests
npm run test:e2e          # End-to-end tests
```

## Database Schema (Supabase PostgreSQL)

### Key Tables

- **creators** - Whop company integration with subscription tiers
- **students** - Whop user/membership integration with learning preferences
- **videos** - Video metadata, URLs, transcripts, processing status
- **video_chunks** - Text chunks with vector embeddings (1536 dimensions for OpenAI ada-002)
- **chat_sessions** / **chat_messages** - Conversation history with video references
- **quizzes** / **quiz_attempts** - AI-generated assessments and student scores
- **calendar_events** - Scheduled learning tasks (video, quiz, milestone)

### Vector Search Setup

```sql
-- Enable pgvector extension
CREATE EXTENSION vector;

-- Vector similarity search index
CREATE INDEX ON video_chunks USING ivfflat (embedding vector_cosine_ops);
```

## Architecture & Code Organization

### Expected Structure (greenfield)

```
app/
├── (auth)/              # Authentication pages
├── (dashboard)/         # Protected creator/student dashboards
├── api/
│   ├── chat/           # RAG chat endpoint
│   ├── creator/        # Creator-specific APIs
│   ├── student/        # Student-specific APIs
│   └── webhooks/       # Whop webhook handlers
└── page.tsx            # Landing page

components/
├── auth/               # Auth components
├── chat/               # Chat interface
├── learning/           # Video player, progress
├── teams/              # Team features (future)
└── ui/                 # shadcn/ui components

lib/
├── whop/              # Whop SDK integration
│   ├── auth.ts        # OAuth and session management
│   └── webhooks.ts    # Webhook signature verification
├── video/
│   ├── processor.ts   # Video upload and transcription
│   └── embeddings.ts  # Vector embedding generation
├── ai/
│   ├── rag-engine.ts  # Semantic search and chat
│   └── quiz-gen.ts    # Quiz generation
├── supabase/          # Database client and queries
└── utils/             # Helper functions

store/                  # Zustand state stores
types/                  # TypeScript definitions
supabase/              # Database migrations
```

## Key Implementation Patterns

### Whop Authentication Middleware

All API routes must validate Whop OAuth tokens and membership status:

```typescript
// middleware/auth.ts
export async function withWhopAuth(handler: NextApiHandler) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  const user = await whopAuth.verifyUser(token);
  const membership = await whopAuth.validateMembership(user.membershipId);

  if (!user || !membership) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  req.user = user;
  return handler(req, res);
}
```

### Video Processing Pipeline

1. Upload video to storage (S3/R2)
2. Extract audio and transcribe (Whisper API or Deepgram)
3. Chunk transcript into 500-1000 word segments with overlap
4. Generate embeddings via OpenAI API
5. Store in `video_chunks` table with pgvector
6. Update video status to "processed"

### RAG Chat Flow

1. User query → generate embedding
2. Vector similarity search in `video_chunks`
3. Retrieve top 3-5 relevant chunks with video metadata
4. Build context for Claude API
5. Generate response citing video timestamps
6. Return response with clickable video references

### Quiz Generation

1. Select videos for quiz scope
2. Extract key concepts via Claude API
3. Generate questions (multiple choice, true/false, short answer)
4. Validate question quality and relevance
5. Store in `quizzes` table with correct answers
6. Each generation produces unique questions

## API Endpoints (RESTful)

### Student APIs
- `POST /api/student/chat` - Send message, get AI response with video references
- `GET /api/student/calendar` - Retrieve personalized learning schedule
- `POST /api/student/quiz/attempt` - Submit quiz answers for grading
- `PATCH /api/student/progress` - Update video completion status

### Creator APIs
- `POST /api/creator/videos/upload` - Bulk video upload with processing
- `GET /api/creator/analytics` - Student metrics and engagement data
- `POST /api/creator/quiz/generate` - AI quiz creation from videos
- `GET /api/creator/students` - List students with progress data

### Webhook APIs
- `POST /api/webhooks/whop` - Handle membership created/expired/payment events

## Whop Integration Requirements

### Environment Variables
```bash
WHOP_API_KEY=           # From Whop developer dashboard
WHOP_CLIENT_ID=         # OAuth client ID
WHOP_WEBHOOK_SECRET=    # For webhook signature verification
```

### Webhook Events to Handle
- `membership.created` → Provision student access
- `membership.expired` → Revoke student access
- `payment.succeeded` → Log for analytics

### Security Checklist
- Verify Whop webhook signatures on all webhook endpoints
- Validate membership status before serving content
- Rate limiting: 100 requests/minute per user
- SQL injection prevention (use parameterized queries)
- Store all secrets in environment variables only

## Performance Requirements

- Chat response time: < 5 seconds (95th percentile)
- Video processing: < 5 minutes per hour of video
- Dashboard load time: < 3 seconds
- Search results: < 2 seconds
- Support 1000+ concurrent users

## Testing Strategy

### Test Coverage Areas
- Whop OAuth flow and token validation
- Webhook signature verification and event processing
- Video processing pipeline (upload → transcript → embeddings)
- RAG search accuracy and response quality
- Quiz generation relevance and scoring logic
- Calendar scheduling algorithm
- Student progress tracking

### Integration Tests
- End-to-end video processing pipeline
- Chat with real vector search queries
- Whop API authentication flow
- Database query performance (especially vector search)

## Development Workflow: Parallel Agent Execution

**PRIMARY DEVELOPMENT PATTERN**: Use Claude Code's Task tool with multiple agents running in parallel whenever features are independent.

### Agent Orchestration Strategy

Claude Code acts as the orchestrator. When you request work:
1. I send **1 message with multiple Task tool calls**
2. Each Task launches a specialized agent
3. All agents work simultaneously
4. I review all results and summarize progress

### When to Use Parallel Agents

Use parallel agents for:
- Setting up project infrastructure (dependencies, configs, database schemas)
- Building independent UI components
- Creating separate API endpoints
- Implementing different pipeline stages (upload, transcription, chunking, embedding)
- Building analytics dashboard widgets
- Any tasks without direct dependencies

### Example: Phase 1 Setup

Instead of sequential:
1. Clone template
2. Then install UI framework
3. Then set up database
4. Then configure Whop

Do parallel:
**Launch 4 agents in 1 message:**
- Agent 1: Project scaffolding
- Agent 2: UI framework setup
- Agent 3: Database architecture
- Agent 4: Whop integration

### Benefits

- **3-5x faster development** - Parallel execution vs sequential
- **Better code isolation** - Each agent focuses on one concern
- **Independent testing** - Test components separately
- **Clearer separation** - Natural module boundaries

### Development Workflow (TDD)

This project follows Test-Driven Development principles:

1. **Write tests first** for new features based on requirements
2. **Implement** to pass tests (using parallel agents when possible)
3. **Refactor** while maintaining test coverage
4. **Validate** against success metrics

## Monitoring & Error Handling

- Use Sentry for error tracking on all API routes
- Log all critical operations (video processing, AI calls, payments)
- Track performance metrics (response times, processing duration)
- Alert on failures (transcription errors, AI API errors, webhook failures)
- Graceful degradation if AI API down (show cached responses)

## Cost Optimization

- Cache AI embeddings to avoid reprocessing
- Implement rate limiting to prevent abuse
- Use efficient prompting for Claude API calls
- Batch embedding generation when possible
- Monitor AI API usage and set alerts

## Launch Strategy

### Phase 1: Private Beta (Week 5-6)
- 10 hand-picked creators with direct support
- Goal: Validate features, identify critical bugs

### Phase 2: Public Launch (Week 7)
- Whop App Store listing
- Goal: 50 trial signups, 40% conversion

### Phase 3: Growth (Month 2-6)
- Feature iteration based on feedback
- Goal: 100 paying creators, $10K MRR

## Success Metrics (KPIs)

- **Activation:** 80% of creators upload 5+ videos
- **Engagement:** 10+ chat messages per student/week
- **Retention:** 60% of students complete 50%+ of course
- **Quality:** 85%+ thumbs up on AI responses
- **Business:** $10K MRR by Month 6, <5% churn

## References

- Whop Developer Docs: https://docs.whop.com
- Claude API: https://docs.anthropic.com
- OpenAI Embeddings: https://platform.openai.com/docs/guides/embeddings
- Supabase Vector Guide: https://supabase.com/docs/guides/ai/vector-embeddings
- Next.js App Router: https://nextjs.org/docs/app

## Common Gotchas

- Whop webhook signatures must be verified on every request
- Vector embeddings are 1536 dimensions for OpenAI ada-002
- Chunk size affects search quality (500-1000 words optimal)
- Always use parameterized queries for SQL (pgvector included)
- Rate limit AI API calls to prevent cost overruns
- Test membership validation edge cases (expired, invalid, etc.)
