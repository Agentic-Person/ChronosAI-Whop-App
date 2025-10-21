# Whop-Video-Wizard-TDD-ClaudeCode.md

**Project:** AI Video Learning Assistant for Whop  
**Version:** 1.0  
**Date:** October 20, 2025  
**Development Environment:** Claude Code / Cursor  
**Methodology:** Test-Driven Development (TDD)

---

## Executive Summary

This is the complete Technical Design Document (TDD) for building "Video Wizard" - an AI-powered learning assistant that transforms passive video courses into interactive, personalized learning experiences on the Whop platform. This guide integrates product requirements, technical architecture, your existing skillset (Node.js, React, Supabase, Vercel, n8n, Claude AI), and Claude Code development workflows.

**Core Value Proposition:** Save creators 10+ hours/week in student support while increasing course completion rates by 40%+ through AI-powered video search, automated quizzing, and personalized learning paths.

---

## Product Requirements Integration

### Target Market Analysis
- **Primary:** Trading education creators (40% of Whop revenue)
- **Secondary:** E-commerce coaching, real estate wholesaling, fitness, AI training
- **User Base:** 50-10,000+ students per creator, $50K-$250K/month revenue
- **Pain Points:** Repetitive support questions, low completion rates (15%), poor content discoverability

### Core Features (MVP)
1. **AI Chat with Video Search (RAG)** - Semantic search across video transcripts with timestamp responses
2. **Automated Video Processing** - Bulk upload, transcription, vectorization pipeline
3. **AI Quiz Generation** - Dynamic, unique assessments from video content
4. **Learning Calendar** - AI-scheduled personalized study plans
5. **Progress Tracking** - Student completion analytics and recommendations
6. **Creator Dashboard** - Video management, student analytics, performance metrics
7. **Whop Integration** - Native auth, membership sync, payment processing

### Success Metrics
- **Activation:** 80% of creators upload 5+ videos
- **Engagement:** 10+ chat messages per student per week
- **Retention:** 60% course completion rate
- **Quality:** 85%+ thumbs up on AI responses
- **Business:** $10K MRR by Month 6, <5% churn

---

## Technical Architecture

### Tech Stack Alignment with Your Skills

**Frontend & Backend**
- **Next.js 14** (App Router) + TypeScript - Your React expertise
- **Tailwind CSS** + shadcn/ui - Modern, Whop-compatible styling
- **Zustand** - Lightweight state management for chat/calendar
- **Vercel** - Your existing deployment platform

**Database & Vector Storage**
- **Supabase PostgreSQL** - Your familiar database platform
- **pgvector** - Vector embeddings storage (alternative: Pinecone for scale)
- **Supabase Auth** - User session management alongside Whop OAuth

**AI & Processing**
- **Claude 3.5 Sonnet** - Your preferred AI for chat, quiz generation, content analysis
- **OpenAI Whisper** - Video transcription pipeline
- **OpenAI Embeddings** - Text-to-vector conversion for semantic search
- **Langchain** - RAG orchestration framework

**Integrations**
- **Whop SDK** (@whop/api, @whop/react) - Platform integration
- **n8n** - Your automation workflows for onboarding, notifications
- **Vercel Edge Functions** - Serverless API endpoints

**Development Tools**
- **Claude Code/Cursor** - AI-assisted development
- **Sentry** - Error tracking
- **PostHog** - Product analytics

---

## Database Schema Design (TDD Approach)

### Core Tables with Test Scenarios

```sql
-- Creators table (Whop company integration)
CREATE TABLE creators (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    whop_company_id VARCHAR(255) UNIQUE NOT NULL,
    whop_user_id VARCHAR(255) NOT NULL,
    company_name VARCHAR(255) NOT NULL,
    subscription_tier VARCHAR(50) DEFAULT 'starter', -- starter, pro, enterprise
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW()
);

-- Test Case: Verify creator can be created with Whop company ID
-- Test Case: Ensure unique constraint on whop_company_id

-- Students table (Whop membership integration)
CREATE TABLE students (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    whop_user_id VARCHAR(255) UNIQUE NOT NULL,
    whop_membership_id VARCHAR(255) NOT NULL,
    creator_id UUID REFERENCES creators(id) ON DELETE CASCADE,
    learning_preferences JSONB DEFAULT '{}',
    onboarding_completed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW(),
    last_active TIMESTAMP DEFAULT NOW()
);

-- Test Case: Student creation via Whop webhook
-- Test Case: Membership validation and expiration handling

-- Videos table (Content management)
CREATE TABLE videos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    creator_id UUID REFERENCES creators(id) ON DELETE CASCADE,
    title VARCHAR(500) NOT NULL,
    description TEXT,
    video_url TEXT NOT NULL,
    duration_seconds INTEGER,
    transcript TEXT,
    transcript_processed BOOLEAN DEFAULT FALSE,
    category VARCHAR(100),
    order_index INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Test Case: Bulk video upload processing
-- Test Case: Transcript generation completion

-- Video chunks table (RAG vector storage)
CREATE TABLE video_chunks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    video_id UUID REFERENCES videos(id) ON DELETE CASCADE,
    chunk_text TEXT NOT NULL,
    chunk_index INTEGER NOT NULL,
    start_timestamp INTEGER,
    end_timestamp INTEGER,
    embedding vector(1536), -- OpenAI ada-002 dimensions
    created_at TIMESTAMP DEFAULT NOW()
);

-- Create vector similarity search index
CREATE INDEX ON video_chunks USING ivfflat (embedding vector_cosine_ops);

-- Test Case: Vector similarity search performance
-- Test Case: Embedding generation and storage

-- Chat sessions and messages
CREATE TABLE chat_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID REFERENCES students(id) ON DELETE CASCADE,
    creator_id UUID REFERENCES creators(id) ON DELETE CASCADE,
    title VARCHAR(255) DEFAULT 'New Conversation',
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE chat_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID REFERENCES chat_sessions(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL, -- 'user' or 'assistant'
    content TEXT NOT NULL,
    video_references JSONB, -- [{video_id, title, timestamp, relevance_score}]
    feedback VARCHAR(20), -- 'positive', 'negative', null
    created_at TIMESTAMP DEFAULT NOW()
);

-- Test Case: Chat message storage and retrieval
-- Test Case: Video reference accuracy

-- Quizzes and attempts
CREATE TABLE quizzes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    creator_id UUID REFERENCES creators(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    video_ids UUID[],
    difficulty VARCHAR(50) DEFAULT 'medium',
    questions JSONB NOT NULL,
    passing_score INTEGER DEFAULT 70,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE quiz_attempts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    quiz_id UUID REFERENCES quizzes(id) ON DELETE CASCADE,
    student_id UUID REFERENCES students(id) ON DELETE CASCADE,
    answers JSONB NOT NULL,
    score INTEGER NOT NULL,
    passed BOOLEAN NOT NULL,
    completed_at TIMESTAMP DEFAULT NOW()
);

-- Test Case: Quiz generation from video content
-- Test Case: Scoring accuracy and pass/fail logic

-- Calendar events (Learning schedule)
CREATE TABLE calendar_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID REFERENCES students(id) ON DELETE CASCADE,
    event_type VARCHAR(50) NOT NULL, -- 'video', 'quiz', 'milestone'
    video_id UUID REFERENCES videos(id) ON DELETE SET NULL,
    quiz_id UUID REFERENCES quizzes(id) ON DELETE SET NULL,
    title VARCHAR(255) NOT NULL,
    scheduled_date DATE NOT NULL,
    duration_minutes INTEGER,
    status VARCHAR(50) DEFAULT 'pending', -- pending, completed, skipped
    created_at TIMESTAMP DEFAULT NOW()
);

-- Test Case: AI schedule generation
-- Test Case: Calendar event completion tracking
```

---

## Core Implementation Modules (TDD)

### Module 1: Whop Authentication & Integration

**Test Cases:**
- OAuth flow completion
- Webhook signature verification
- Membership validation
- User provisioning

**Implementation Priority:** P0 (Critical Path)

```typescript
// lib/whop-auth.ts
import { WhopAPI } from "@whop/api";

export class WhopAuthService {
  private whopApi: WhopAPI;
  
  constructor() {
    this.whopApi = new WhopAPI({
      apiKey: process.env.WHOP_API_KEY!
    });
  }

  async verifyUser(token: string) {
    // Test Case: Valid token returns user data
    // Test Case: Invalid token throws error
  }

  async validateMembership(membershipId: string) {
    // Test Case: Active membership returns true
    // Test Case: Expired membership returns false
  }
}
```

### Module 2: Video Processing Pipeline

**Test Cases:**
- Video upload handling
- Transcription accuracy
- Chunk generation
- Embedding creation
- Vector storage

**Implementation Priority:** P0 (Critical Path)

```typescript
// lib/video-processor.ts
export class VideoProcessor {
  async processVideo(videoData: VideoMetadata) {
    // Test Case: MP4 file processes successfully
    // Test Case: Transcript generates with timestamps
    // Test Case: Chunks are created with proper overlap
    // Test Case: Embeddings stored in database
  }
  
  async transcribeVideo(audioFile: File) {
    // Test Case: Clear audio transcribes accurately
    // Test Case: Noisy audio handles gracefully
  }
  
  async generateEmbeddings(chunks: TextChunk[]) {
    // Test Case: Embeddings have correct dimensions
    // Test Case: Rate limiting respected
  }
}
```

### Module 3: RAG Engine & Chat

**Test Cases:**
- Semantic search accuracy
- Response relevance
- Timestamp accuracy
- Context preservation

**Implementation Priority:** P0 (Critical Path)

```typescript
// lib/rag-engine.ts
export class RAGEngine {
  async searchVideos(query: string, creatorId: string) {
    // Test Case: Relevant content returned for specific queries
    // Test Case: No results for off-topic queries
    // Test Case: Timestamp accuracy within 5 seconds
  }
  
  async generateResponse(query: string, context: SearchResult[]) {
    // Test Case: Response cites source videos
    // Test Case: Response stays within context bounds
    // Test Case: Response quality maintains >85% satisfaction
  }
}
```

### Module 4: Quiz Generation

**Test Cases:**
- Question relevance
- Difficulty scaling
- Answer accuracy
- Unique generation

**Implementation Priority:** P1 (High Value)

```typescript
// lib/quiz-generator.ts
export class QuizGenerator {
  async generateQuiz(videoIds: string[], difficulty: string) {
    // Test Case: Questions test key concepts from videos
    // Test Case: Difficulty appropriate for level
    // Test Case: Each generation produces unique questions
  }
  
  async gradeAttempt(quiz: Quiz, answers: Answer[]) {
    // Test Case: Scoring logic matches expectations
    // Test Case: Partial credit handled appropriately
  }
}
```

### Module 5: Calendar Scheduler

**Test Cases:**
- Schedule generation
- Pacing appropriateness
- Progress tracking
- Adaptation to delays

**Implementation Priority:** P1 (High Value)

```typescript
// lib/calendar-scheduler.ts
export class CalendarScheduler {
  async generateSchedule(config: ScheduleConfig) {
    // Test Case: Schedule fits within target timeframe
    // Test Case: Workload distributed evenly
    // Test Case: Rest days included appropriately
  }
  
  async updateSchedule(studentId: string, progress: Progress) {
    // Test Case: Behind schedule triggers catch-up plan
    // Test Case: Ahead of schedule offers advanced content
  }
}
```

---

## API Design (RESTful + Real-time)

### Authentication Middleware

```typescript
// middleware/auth.ts
export async function withWhopAuth(handler: NextApiHandler) {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    // Test Case: Valid Whop token allows access
    // Test Case: Invalid token returns 401
    // Test Case: Expired membership returns 403
    
    const token = req.headers.authorization?.replace('Bearer ', '');
    const user = await whopAuth.verifyUser(token);
    const membership = await whopAuth.validateMembership(user.membershipId);
    
    if (!user || !membership) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    req.user = user;
    return handler(req, res);
  };
}
```

### Core API Endpoints

```typescript
// API Structure with Test Coverage

// Student Endpoints
POST /api/student/chat
- Test: Message processing and response generation
- Test: Video reference accuracy
- Test: Response time < 5 seconds

GET /api/student/calendar
- Test: Upcoming events retrieval
- Test: Progress calculation accuracy

POST /api/student/quiz/attempt
- Test: Answer submission and grading
- Test: Progress tracking update

// Creator Endpoints
POST /api/creator/videos/upload
- Test: Bulk upload processing
- Test: Progress reporting
- Test: Error handling

GET /api/creator/analytics
- Test: Student metrics calculation
- Test: Engagement reporting
- Test: Performance insights

POST /api/creator/quiz/generate
- Test: AI quiz creation
- Test: Quality validation
- Test: Customization options

// Webhook Endpoints
POST /api/webhooks/whop
- Test: Signature verification
- Test: Event processing
- Test: Database synchronization
```

---

## Frontend Component Architecture (React + TypeScript)

### Component Test Strategy

```typescript
// components/ChatInterface.tsx
interface ChatInterfaceProps {
  userId: string;
  creatorId: string;
}

export const ChatInterface: React.FC<ChatInterfaceProps> = ({ userId, creatorId }) => {
  // Test Case: Messages render correctly
  // Test Case: Video references are clickable
  // Test Case: Loading states display appropriately
  // Test Case: Error messages handle gracefully
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  
  const sendMessage = async (content: string) => {
    // Test Case: Message sends successfully
    // Test Case: Response updates UI
    // Test Case: Error handling for failed requests
  };
  
  return (
    <div className="chat-container">
      {/* Chat implementation with test coverage */}
    </div>
  );
};
```

### State Management (Zustand)

```typescript
// store/app-store.ts
interface AppState {
  user: WhopUser | null;
  currentChat: ChatSession | null;
  calendar: CalendarEvent[];
  videos: Video[];
}

export const useAppStore = create<AppState>((set, get) => ({
  // Test Case: State updates correctly
  // Test Case: Persistence works across sessions
  // Test Case: Concurrent updates handled safely
}));
```

---

## Integration Testing Strategy

### Whop Platform Integration

```typescript
// tests/integration/whop-integration.test.ts
describe('Whop Integration', () => {
  test('OAuth flow completes successfully', async () => {
    // Test OAuth redirect and token exchange
  });
  
  test('Webhook events process correctly', async () => {
    // Test membership valid/invalid events
    // Test payment success events
  });
  
  test('API authentication works', async () => {
    // Test protected routes with valid tokens
    // Test rejection of invalid tokens
  });
});
```

### AI Pipeline Integration

```typescript
// tests/integration/ai-pipeline.test.ts
describe('AI Pipeline', () => {
  test('Video processing completes end-to-end', async () => {
    // Upload video → transcription → chunking → embedding → searchable
  });
  
  test('Chat responses are accurate and relevant', async () => {
    // Query → search → context → AI response → validation
  });
  
  test('Quiz generation produces quality questions', async () => {
    // Video content → question extraction → validation → storage
  });
});
```

### Performance Testing

```typescript
// tests/performance/load.test.ts
describe('Performance Tests', () => {
  test('Chat response time < 5 seconds', async () => {
    // Load test chat endpoint
  });
  
  test('Video processing scales with volume', async () => {
    // Test multiple concurrent uploads
  });
  
  test('Database queries perform within limits', async () => {
    // Test vector search performance
  });
});
```

---

## Deployment Strategy (Vercel + Supabase)

### Environment Configuration

```bash
# .env.production
WHOP_API_KEY=prod_key
WHOP_WEBHOOK_SECRET=prod_secret
DATABASE_URL=postgres://prod_db_url
ANTHROPIC_API_KEY=prod_claude_key
SUPABASE_URL=https://prod.supabase.co
```

### Build & Deploy Process

```json
// vercel.json
{
  "functions": {
    "app/api/chat/route.ts": {
      "maxDuration": 30
    },
    "app/api/webhooks/whop/route.ts": {
      "maxDuration": 10
    }
  },
  "crons": [
    {
      "path": "/api/cron/cleanup",
      "schedule": "0 2 * * *"
    }
  ]
}
```

### Monitoring & Alerts

```typescript
// lib/monitoring.ts
export class MonitoringService {
  static trackEvent(event: string, data: any) {
    // Test Case: Events tracked correctly
    // Test Case: Critical errors trigger alerts
  }
  
  static trackPerformance(operation: string, duration: number) {
    // Test Case: Performance metrics recorded
    // Test Case: Slow operations flagged
  }
}
```

---

## Quality Assurance Checklist

### Code Quality
- [ ] All functions have type definitions
- [ ] Error handling implemented for all external API calls
- [ ] Input validation on all user-facing endpoints
- [ ] SQL injection protection (parameterized queries)
- [ ] Rate limiting implemented
- [ ] Logging for all critical operations

### Security
- [ ] Whop webhook signature verification
- [ ] Environment variables secured
- [ ] API endpoints require authentication
- [ ] User data isolation (multi-tenancy)
- [ ] HTTPS enforced everywhere
- [ ] CORS properly configured

### Performance
- [ ] Database queries optimized with indexes
- [ ] Vector search performance validated
- [ ] API response times < 5 seconds
- [ ] Image/video assets optimized
- [ ] Error states don't crash application
- [ ] Loading states provide feedback

### User Experience
- [ ] Mobile responsive design
- [ ] Accessibility standards met (WCAG 2.1)
- [ ] Error messages are user-friendly
- [ ] Loading states are informative
- [ ] Navigation is intuitive
- [ ] Feature discovery is clear

---

## Launch Strategy & Success Metrics

### Beta Testing Phase (Week 1-2)
- **Target:** 5 friendly creators
- **Metrics:** Feature completion, bug reports, user feedback
- **Success:** 80% feature satisfaction, <5 critical bugs

### Public Launch (Week 3-4)
- **Target:** 20 trial signups
- **Metrics:** Conversion rate, engagement, retention
- **Success:** 40% trial-to-paid conversion

### Growth Phase (Month 2-6)
- **Target:** 100 paying creators
- **Metrics:** MRR growth, churn rate, NPS
- **Success:** $10K MRR, <5% monthly churn

---

## Risk Mitigation

### Technical Risks
1. **AI Costs Exceed Revenue**
   - Mitigation: Caching, rate limiting, efficient prompting
   - Test: Cost monitoring and alerting

2. **Video Processing Bottlenecks**
   - Mitigation: Queue system, parallel processing
   - Test: Load testing with multiple uploads

3. **Vector Search Performance**
   - Mitigation: Index optimization, hardware scaling
   - Test: Performance benchmarks

### Business Risks
1. **Low Creator Adoption**
   - Mitigation: Strong onboarding, free setup
   - Test: User journey optimization

2. **Whop Platform Changes**
   - Mitigation: Abstract API layer, community engagement
   - Test: Integration test suite

---

## Development Workflow (Claude Code)

### Daily Development Process
1. **Morning:** Review TDD requirements, plan features
2. **Development:** Use Claude Code for pair programming
3. **Testing:** Run test suite, validate against requirements
4. **Evening:** Deploy to staging, review metrics

### Claude Code Prompts
- "Implement the video processing pipeline according to TDD spec"
- "Generate tests for the RAG engine module"
- "Optimize database queries for vector search"
- "Create API documentation from TypeScript interfaces"

### Version Control Strategy
```bash
# Feature branches with TDD
git checkout -b feature/chat-interface
# Implement with tests first
git add tests/ && git commit -m "Add chat interface tests"
# Then implementation
git add src/ && git commit -m "Implement chat interface"
```

---

## Next Steps (Immediate Actions)

### Week 1: Foundation
- [ ] Set up Whop developer account and app
- [ ] Initialize Next.js project with dependencies
- [ ] Configure Supabase database with schema
- [ ] Implement basic authentication flow

### Week 2: Core Features
- [ ] Build video upload and processing pipeline
- [ ] Implement RAG engine and chat interface
- [ ] Create quiz generation system
- [ ] Set up webhook handlers

### Week 3: Polish & Testing
- [ ] Complete frontend components
- [ ] Run integration test suite
- [ ] Deploy to production environment
- [ ] Begin beta creator outreach

### Week 4: Launch
- [ ] Onboard first 5 creators
- [ ] Monitor metrics and performance
- [ ] Iterate based on feedback
- [ ] Plan feature expansion

---

## Appendix: Resources & Documentation

### Technical References
- [Whop API Documentation](https://docs.whop.com)
- [Claude API Guide](https://docs.anthropic.com)
- [Supabase Vector Documentation](https://supabase.com/docs/guides/ai/vector-embeddings)
- [Vercel Deployment Guide](https://vercel.com/docs)
- [Next.js App Router](https://nextjs.org/docs/app)

### Testing Frameworks
- Jest for unit testing
- Playwright for E2E testing
- Supertest for API testing
- React Testing Library for component testing

### Monitoring Tools
- Sentry for error tracking
- PostHog for product analytics
- Vercel Analytics for performance
- Supabase Dashboard for database monitoring

---

**This TDD document serves as your complete development blueprint. Reference it during Claude Code sessions for consistent, test-driven development that meets all product requirements while leveraging your existing technical expertise.**