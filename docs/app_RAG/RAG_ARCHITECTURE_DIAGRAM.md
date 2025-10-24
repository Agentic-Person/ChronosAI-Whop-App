# Chronos AI RAG Architecture Diagram

## System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         Chronos AI Platform                      │
│                  Multi-Tenant Video Learning System              │
└─────────────────────────────────────────────────────────────────┘

┌─────────────┐      ┌─────────────┐      ┌─────────────┐
│  Creator A  │      │  Creator B  │      │  Creator C  │
│  (Whop Co)  │      │  (Whop Co)  │      │  (Whop Co)  │
└──────┬──────┘      └──────┬──────┘      └──────┬──────┘
       │                    │                    │
       └────────────────────┴────────────────────┘
                            │
                            ▼
              ┌─────────────────────────┐
              │  Supabase PostgreSQL    │
              │  (Single Database)      │
              │  + pgvector extension   │
              └─────────────────────────┘
                            │
                ┌───────────┴───────────┐
                ▼                       ▼
       ┌─────────────────┐    ┌──────────────────┐
       │  Row-Level      │    │  Vector Search   │
       │  Security (RLS) │    │  (HNSW Index)    │
       └─────────────────┘    └──────────────────┘
```

## Video Processing Pipeline

```
┌──────────────┐
│ Creator      │
│ Uploads      │
│ Video File   │
└──────┬───────┘
       │
       ▼
┌─────────────────────────────────────────────────────────────┐
│                    Upload Handler                            │
│  - Validate file (MP4, MOV, etc.)                           │
│  - Upload to S3/Cloudflare R2                               │
│  - Create video record (status: pending)                    │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                  Transcription Service                       │
│  1. Extract audio from video                                │
│  2. Call OpenAI Whisper API                                 │
│  3. Get transcript with timestamps                          │
│  4. Update video.transcript (status: transcribing)          │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                    Chunking Service                          │
│  1. Split transcript into 500-1000 word chunks              │
│  2. Preserve semantic boundaries (sentences)                │
│  3. Add 50-word overlap between chunks                      │
│  4. Calculate start/end timestamps                          │
│  (status: chunking)                                         │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                  Embedding Service                           │
│  1. Generate embeddings (OpenAI ada-002)                    │
│  2. 1536-dimension vectors per chunk                        │
│  3. Batch process (100 chunks at a time)                    │
│  (status: embedding)                                        │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                  Database Storage                            │
│  1. Insert chunks with embeddings                           │
│  2. Associate with video_id AND creator_id                  │
│  3. Add topic tags (extracted keywords)                     │
│  4. Update video (status: completed)                        │
└─────────────────────────────────────────────────────────────┘
```

## RAG Chat Flow

```
┌──────────────┐
│   Student    │
│   Asks       │
│   Question   │
└──────┬───────┘
       │
       ▼
┌─────────────────────────────────────────────────────────────┐
│                    Chat API Endpoint                         │
│  POST /api/chat                                             │
│  { message, creator_id, student_id, session_id? }           │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│              Query Embedding Generation                      │
│  1. Call OpenAI ada-002                                     │
│  2. Convert question to 1536-dim vector                     │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                 Vector Similarity Search                     │
│  SQL: match_chunks(embedding, creator_id, 5, 0.7)           │
│                                                             │
│  SELECT chunk_text, video_title, start_seconds, ...         │
│  FROM video_chunks                                          │
│  WHERE creator_id = ?                                       │
│  ORDER BY embedding <=> query_embedding                     │
│  LIMIT 5                                                    │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
        ┌──────────────────────────────┐
        │  Top 5 Relevant Chunks       │
        │  [                           │
        │    {                         │
        │      video_title: "React..", │
        │      content: "...",         │
        │      timestamp: 45,          │
        │      similarity: 0.89        │
        │    },                        │
        │    ...                       │
        │  ]                           │
        └──────────┬───────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────────┐
│              Context Builder                                 │
│  Build prompt:                                              │
│  "Based on these video excerpts:                            │
│   [Source 1: React Hooks at 0:45] ...                       │
│   [Source 2: Advanced React at 2:30] ...                    │
│                                                             │
│   Question: How do I use useState?                          │
│                                                             │
│   Provide answer with citations."                           │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│              Claude API (AI Response)                        │
│  Model: claude-3-5-sonnet-20241022                          │
│  Max tokens: 1024                                           │
│                                                             │
│  Response:                                                  │
│  "useState is a React Hook that lets you add state to       │
│   functional components. [See React Hooks at 0:45]         │
│                                                             │
│   Here's how to use it: ..."                                │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│              Save to Database                                │
│  1. Create/get chat session                                 │
│  2. Save user message                                       │
│  3. Save assistant message with video_references            │
│  4. Award 5 CHRONOS tokens for engagement                   │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
        ┌──────────────────────────────┐
        │  Return to Student           │
        │  {                           │
        │    session_id: "...",        │
        │    message: "...",           │
        │    video_references: [       │
        │      {                       │
        │        video_id: "...",      │
        │        title: "...",         │
        │        timestamp: 45,        │
        │      }                       │
        │    ]                         │
        │  }                           │
        └──────────────────────────────┘
```

## Multi-Tenant Data Isolation

```
┌─────────────────────────────────────────────────────────────┐
│                    Supabase Database                         │
└─────────────────────────────────────────────────────────────┘

┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│  Creator A   │  │  Creator B   │  │  Creator C   │
│  id: uuid-A  │  │  id: uuid-B  │  │  id: uuid-C  │
└──────┬───────┘  └──────┬───────┘  └──────┬───────┘
       │                 │                 │
       ▼                 ▼                 ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│  Videos      │  │  Videos      │  │  Videos      │
│  (uuid-A)    │  │  (uuid-B)    │  │  (uuid-C)    │
│  ├─ Video 1  │  │  ├─ Video 1  │  │  ├─ Video 1  │
│  ├─ Video 2  │  │  ├─ Video 2  │  │  ├─ Video 2  │
│  └─ Video 3  │  │  └─ Video 3  │  │  └─ Video 3  │
└──────┬───────┘  └──────┬───────┘  └──────┬───────┘
       │                 │                 │
       ▼                 ▼                 ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│ Chunks       │  │ Chunks       │  │ Chunks       │
│ (uuid-A)     │  │ (uuid-B)     │  │ (uuid-C)     │
│ WITH creator │  │ WITH creator │  │ WITH creator │
│ ISOLATION    │  │ ISOLATION    │  │ ISOLATION    │
└──────────────┘  └──────────────┘  └──────────────┘

RLS Policy on video_chunks:
  WHERE creator_id = (
    SELECT id FROM creators
    WHERE whop_user_id = auth.uid()
  )

Vector Search:
  match_chunks(embedding, filter_creator_id=uuid-A)
  → Returns ONLY Creator A's chunks
  → No cross-creator data leakage
```

## Student Enrollment Model

```
┌────────────┐
│  Student   │
│  (Whop)    │
└─────┬──────┘
      │
      │ Can enroll with multiple creators
      │
      ├─────────────────────┬─────────────────────┐
      │                     │                     │
      ▼                     ▼                     ▼
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│ Enrollment   │    │ Enrollment   │    │ Enrollment   │
│ Creator A    │    │ Creator B    │    │ Creator C    │
│ (active)     │    │ (active)     │    │ (inactive)   │
└──────────────┘    └──────────────┘    └──────────────┘
      │                     │                     │
      ▼                     ▼                     ▼
  Can access          Can access          Cannot access
  Creator A's         Creator B's         Creator C's
  videos/chat         videos/chat         content
```

## CHRONOS Token Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    Student Actions                           │
└─────────────────────────────────────────────────────────────┘
      │
      ├── Watch video (100%) ────────────► +100 CHRONOS
      ├── Complete quiz (85%+) ──────────► +50 CHRONOS
      ├── Send chat message ─────────────► +5 CHRONOS
      ├── Daily streak (7 days) ─────────► +25 CHRONOS
      └── Project submission ────────────► +200 CHRONOS
      │
      ▼
┌─────────────────────────────────────────────────────────────┐
│                   Token Wallet                               │
│   Student ID: uuid                                          │
│   Solana Address: abc123...                                 │
│   Balance: 500 CHRONOS                                      │
│   Total Earned: 1000 CHRONOS                                │
│   Total Spent: 300 CHRONOS                                  │
│   Total Redeemed: 200 CHRONOS                               │
└─────────────────────────────────────────────────────────────┘
      │
      ├── Spend on premium features ─────► -X CHRONOS
      ├── Redeem via PayPal ─────────────► -Y CHRONOS
      └── Gift cards / Platform credit ──► -Z CHRONOS
```

## Database Schema (Simplified)

```
creators
├── id (PK)
├── whop_company_id (UNIQUE)
├── handle (UNIQUE) ← NEW
└── company_name

students
├── id (PK)
├── whop_user_id (UNIQUE)
└── whop_membership_id

enrollments ← NEW TABLE
├── id (PK)
├── student_id (FK → students)
├── creator_id (FK → creators)
├── status (active/inactive)
└── enrolled_at

videos
├── id (PK)
├── creator_id (FK → creators)
├── title
├── storage_path ← NEW
├── processing_status ← NEW
└── transcript

video_chunks
├── id (PK)
├── video_id (FK → videos)
├── creator_id (FK → creators) ← NEW
├── chunk_text
├── chunk_index
├── start_timestamp
├── end_timestamp
├── embedding vector(1536)
└── topic_tags

chat_sessions
├── id (PK)
├── student_id (FK → students)
├── creator_id (FK → creators)
└── title

chat_messages
├── id (PK)
├── session_id (FK → chat_sessions)
├── role (user/assistant)
├── content
└── video_references JSONB

token_wallets
├── id (PK)
├── student_id (FK → students)
├── solana_address
├── balance
├── total_earned
├── total_spent
└── total_redeemed

token_transactions
├── id (PK)
├── wallet_id (FK → token_wallets)
├── student_id (FK → students)
├── amount
├── type (earn/spend/redeem)
├── source (video_completion, etc.)
└── metadata JSONB
```

## API Endpoints

```
┌─────────────────────────────────────────────────────────────┐
│                    Creator APIs                              │
└─────────────────────────────────────────────────────────────┘

POST   /api/videos/upload
       → Upload video, trigger processing
GET    /api/creator/videos
       → List all videos with processing status
GET    /api/creator/stats
       → Total students, videos, chunks, sessions
GET    /api/creator/students
       → List enrolled students

┌─────────────────────────────────────────────────────────────┐
│                    Student APIs                              │
└─────────────────────────────────────────────────────────────┘

POST   /api/chat
       → Send message, get AI response
GET    /api/chat/sessions
       → List all chat sessions
GET    /api/chat/history/:session_id
       → Get message history
POST   /api/enrollment
       → Enroll with creator
GET    /api/enrollment
       → List all enrollments
GET    /api/tokens/balance
       → Get CHRONOS balance
GET    /api/tokens/transactions
       → Get transaction history

┌─────────────────────────────────────────────────────────────┐
│                    Webhooks                                  │
└─────────────────────────────────────────────────────────────┘

POST   /api/webhooks/whop
       → Handle membership events (created/expired)
POST   /api/webhooks/video-processed
       → Internal webhook after processing complete
```

## Security Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                 Authentication Flow                          │
└─────────────────────────────────────────────────────────────┘

User (Creator/Student)
  │
  ▼
Whop OAuth
  │
  ▼
Supabase Auth
  │
  ├─ JWT Token (contains whop_user_id)
  │
  ▼
RLS Policies (check auth.uid())
  │
  ├─ Is creator? → Can manage own content
  ├─ Is student? → Can view enrolled content
  └─ Service role? → Bypass RLS (backend only)

┌─────────────────────────────────────────────────────────────┐
│               Row-Level Security Rules                       │
└─────────────────────────────────────────────────────────────┘

videos:
  SELECT → creator_id = my_creator_id OR enrolled_student
  INSERT → creator_id = my_creator_id
  UPDATE → creator_id = my_creator_id
  DELETE → creator_id = my_creator_id

video_chunks:
  SELECT → creator_id = my_creator_id OR enrolled_student

chat_sessions:
  SELECT → student_id = my_id OR creator_id = my_creator_id

token_wallets:
  SELECT → student_id = my_id

enrollments:
  SELECT → student_id = my_id OR creator_id = my_creator_id
```

## Performance Optimization

```
┌─────────────────────────────────────────────────────────────┐
│                    Database Indexes                          │
└─────────────────────────────────────────────────────────────┘

video_chunks:
  ✅ idx_chunks_embedding (HNSW vector_cosine_ops)
     → Ultra-fast vector similarity search
  ✅ idx_chunks_creator (creator_id)
     → Fast multi-tenant filtering
  ✅ idx_chunks_video (video_id)
     → Fast chunk lookup per video

videos:
  ✅ idx_videos_creator (creator_id)
  ✅ idx_videos_processing_status (processing_status)

enrollments:
  ✅ idx_enrollments_student (student_id)
  ✅ idx_enrollments_creator (creator_id)
  ✅ idx_enrollments_status (status)

┌─────────────────────────────────────────────────────────────┐
│                    Caching Strategy                          │
└─────────────────────────────────────────────────────────────┘

Creator Stats → Cache 5 minutes (rarely changes)
Student Enrollments → Cache until enrollment change
Token Balances → Cache until transaction
Video Metadata → Cache until update
Embeddings → Never cache (query-dependent)
```

## Deployment Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         Vercel                               │
│  Next.js 14 (App Router)                                    │
│  ├─ API Routes (/api/*)                                     │
│  ├─ Edge Functions (fast response)                          │
│  └─ Background Jobs (video processing)                      │
└─────────────────────────────────────────────────────────────┘
                       │
        ┌──────────────┼──────────────┐
        ▼              ▼              ▼
┌─────────────┐ ┌─────────────┐ ┌─────────────┐
│  Supabase   │ │  OpenAI     │ │  Anthropic  │
│  (Database) │ │  (Whisper,  │ │  (Claude)   │
│  + pgvector │ │  Embeddings)│ │             │
└─────────────┘ └─────────────┘ └─────────────┘
        │
        ▼
┌─────────────┐
│  S3/R2      │
│  (Videos)   │
└─────────────┘
```

## Key Differentiators

1. **Multi-Tenant by Design**: Single database, strict isolation
2. **Universal Token System**: CHRONOS works across all creators
3. **Smart Chunking**: Semantic boundaries + overlap
4. **Creator-Scoped Search**: No cross-creator data leakage
5. **Citation-Based Responses**: Always cite video sources
6. **Real-Time Processing**: Background jobs for async processing

---

**This architecture supports unlimited creators and students with linear scaling.**
