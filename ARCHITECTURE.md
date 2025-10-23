# Chronos AI - Architecture Documentation

## Overview

Chronos AI is an AI-powered video learning assistant that uses **Whop MCP (Model Context Protocol)** for per-creator Supabase project provisioning, enabling isolated, scalable multi-tenancy for educational content creators.

## Architecture Highlights

### Multi-Tenant Design

- **One Supabase Project per Creator**: Each content creator gets their own isolated Supabase database project
- **Whop MCP Integration**: Automated provisioning/decommissioning triggered by creator install/uninstall events
- **Row-Level Security (RLS)**: Fine-grained access control within each project
- **Storage Isolation**: Creator-specific folders in Supabase Storage (`{creator_slug}/videos/`, `{creator_slug}/assets/`)

### Key Components

```
┌─────────────────────────────────────────────────────────────────┐
│                         Whop Platform                           │
│  (Creator installs app → triggers MCP webhook)                  │
└─────────────────────┬───────────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────────┐
│                    MCP Webhook Handler                          │
│  Location: app/api/webhooks/whop/route.ts                      │
│  - Verifies webhook signature                                   │
│  - Routes to provisionCreator() or decommissionCreator()       │
└─────────────────────┬───────────────────────────────────────────┘
                      │
        ┌─────────────┴──────────────┐
        ▼                            ▼
┌──────────────────┐      ┌──────────────────────┐
│ bootstrapCreator │      │ decommissionCreator  │
│ (scripts/)       │      │ (scripts/)           │
│                  │      │                      │
│ 1. Create creator│      │ 1. Mark inactive     │
│    record in DB  │      │ 2. Schedule deletion │
│ 2. Setup storage │      │ 3. Clean up files    │
│    buckets       │      │ 4. Archive data      │
│ 3. Apply RLS     │      └──────────────────────┘
│    policies      │
│ 4. Notify Whop   │
└────────┬─────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────┐
│              Creator's Supabase Project                         │
│                                                                  │
│  ┌─────────────┐  ┌──────────────┐  ┌─────────────┐            │
│  │  Postgres   │  │   Storage    │  │   Realtime  │            │
│  │  + pgvector │  │   Buckets    │  │   Sync      │            │
│  └─────────────┘  └──────────────┘  └─────────────┘            │
│                                                                  │
│  Tables: videos, video_chunks, chat_sessions, enrollments, etc. │
│  Buckets: videos/{slug}/, assets/{slug}/, thumbnails/{slug}/    │
└─────────────────────────────────────────────────────────────────┘
```

## Directory Structure

```
d:\APS\Projects\whop\AI-Video-Learning-Assistant\
│
├── app/
│   ├── api/
│   │   └── webhooks/
│   │       └── whop/
│   │           └── route.ts          # Webhook endpoint
│   ├── dashboard/
│   │   └── creator/
│   │       ├── upload/               # Upload UI (future)
│   │       └── videos/
│   └── upload/
│       └── [sessionToken]/           # Mobile QR upload (future)
│
├── mcp/
│   ├── mcpClient.ts                  # Whop MCP connection client
│   └── webhookHandler.ts             # Webhook processing logic
│
├── scripts/
│   ├── bootstrapCreator.ts           # Provision new creator
│   └── decommissionCreator.ts        # Remove/archive creator
│
├── lib/
│   ├── video/
│   │   ├── transcription.ts          # OpenAI Whisper transcription
│   │   ├── chunking.ts               # Intelligent text chunking
│   │   ├── embedding-generator.ts    # OpenAI embeddings
│   │   ├── upload-handler.ts         # S3 upload management
│   │   └── index.ts                  # Public API
│   ├── supabase/
│   │   └── ragHelpers.ts             # Database operations
│   └── utils/
│       └── supabase-client.ts        # Supabase connection
│
├── supabase/
│   └── migrations/
│       ├── 20251020000001_initial_schema.sql
│       ├── 20251022000001_multitenant_rag_enhancements.sql
│       └── 20251022000003_upload_sessions_and_rls.sql
│
├── types/
│   └── rag.ts                        # TypeScript type definitions
│
└── ARCHITECTURE.md                   # This file
```

## Data Flow

### 1. Creator Installation Flow

```
User installs app on Whop
    ↓
Whop sends merchant_installed event to /api/webhooks/whop
    ↓
webhookHandler.ts verifies signature
    ↓
Calls bootstrapCreator({ creatorSlug, whopCreatorId, ... })
    ↓
Creates:
  - Creator record in Supabase
  - Storage folder structure: {slug}/videos/, {slug}/assets/
  - RLS policies for data isolation
    ↓
Notifies Whop of provisioning status (success/failure)
```

### 2. Video Upload & Processing Flow

```
Creator uploads video (drag-drop or QR mobile upload)
    ↓
POST /api/video/upload → Upload to Supabase Storage
    ↓
Create video record (status: 'pending')
    ↓
Trigger processing pipeline:
  1. Transcription (OpenAI Whisper)
      - Extract audio from video
      - Call Whisper API
      - Store transcript with timestamps
      ↓
  2. Chunking (Intelligent semantic chunking)
      - Split transcript into ~750-word chunks
      - Preserve sentence boundaries
      - Include 100-word overlap
      - Store chunks with timestamps
      ↓
  3. Embedding (OpenAI text-embedding-ada-002)
      - Generate 1536-dim vectors for each chunk
      - Batch processing for efficiency
      - Store in pgvector column
      ↓
Video status: 'completed' (ready for RAG search)
```

### 3. RAG Chat Flow

```
Student sends message in chat
    ↓
Generate embedding for query (OpenAI)
    ↓
Search video_chunks using pgvector similarity
    ↓
Retrieve top 3-5 relevant chunks with timestamps
    ↓
Build context for Claude API
    ↓
Generate response citing video references
    ↓
Return response with clickable timestamps
```

## Database Schema

### Core Tables

#### `creators`
```sql
id                UUID PRIMARY KEY
whop_company_id   VARCHAR(255) UNIQUE NOT NULL
whop_user_id      VARCHAR(255) NOT NULL
company_name      VARCHAR(255) NOT NULL
handle            VARCHAR(100) UNIQUE (creator slug)
subscription_tier VARCHAR(50) DEFAULT 'starter'
settings          JSONB DEFAULT '{}'
created_at        TIMESTAMPTZ DEFAULT NOW()
updated_at        TIMESTAMPTZ DEFAULT NOW()
```

#### `videos`
```sql
id                    UUID PRIMARY KEY
creator_id            UUID REFERENCES creators(id)
title                 VARCHAR(500) NOT NULL
description           TEXT
video_url             TEXT NOT NULL
storage_path          TEXT (Supabase Storage path)
thumbnail_url         TEXT
duration_seconds      INTEGER
transcript            TEXT
transcript_processed  BOOLEAN DEFAULT FALSE
processing_status     VARCHAR(50) (pending|transcribing|chunking|embedding|completed|failed)
category              VARCHAR(100)
tags                  TEXT[]
difficulty_level      VARCHAR(50)
order_index           INTEGER DEFAULT 0
created_at            TIMESTAMPTZ DEFAULT NOW()
updated_at            TIMESTAMPTZ DEFAULT NOW()
```

#### `video_chunks`
```sql
id              UUID PRIMARY KEY
video_id        UUID REFERENCES videos(id) ON DELETE CASCADE
creator_id      UUID REFERENCES creators(id) (for RLS filtering)
chunk_text      TEXT NOT NULL
chunk_index     INTEGER NOT NULL
start_timestamp INTEGER (seconds)
end_timestamp   INTEGER (seconds)
embedding       vector(1536) (OpenAI ada-002)
topic_tags      TEXT[]
created_at      TIMESTAMPTZ DEFAULT NOW()
```

#### `upload_sessions` (for QR code mobile uploads)
```sql
id             UUID PRIMARY KEY
creator_id     UUID REFERENCES creators(id)
session_token  TEXT UNIQUE NOT NULL
expires_at     TIMESTAMPTZ NOT NULL (15 min expiry)
is_active      BOOLEAN DEFAULT TRUE
uploaded_count INTEGER DEFAULT 0
metadata       JSONB DEFAULT '{}'
created_at     TIMESTAMPTZ DEFAULT NOW()
```

### Row-Level Security (RLS) Policies

All tables have RLS enabled with policies:

- **Creators**: Can view/update their own data
- **Videos**: Creators can CRUD their own videos; Students can view enrolled creators' videos
- **Video Chunks**: Same as videos
- **Chat Sessions**: Students can view/create their own; Creators can view their students' sessions
- **Service Role**: Full access for backend operations (bypasses RLS)

## Storage Structure

```
Supabase Storage:
  ├── videos/
  │   └── {creator_slug}/
  │       ├── {video_id}.mp4
  │       ├── {video_id}.mp4
  │       └── ...
  ├── assets/
  │   └── {creator_slug}/
  │       └── ...
  └── thumbnails/
      └── {creator_slug}/
          └── {video_id}.jpg
```

## Environment Variables

### Required

```bash
# Whop Integration
WHOP_API_KEY=whop_...
WHOP_MCP_URL=https://mcp.pipedream.net/v2
WHOP_WEBHOOK_SECRET=whsec_...

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...

# OpenAI
OPENAI_API_KEY=sk-proj-...

# AWS S3 (for Supabase Storage if using S3 backend)
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=...
AWS_REGION=us-east-1
AWS_S3_BUCKET=chronos-videos
```

### Optional

```bash
# Redis (for caching embeddings)
REDIS_URL=redis://localhost:6379

# Monitoring
SENTRY_DSN=https://...
SENTRY_AUTH_TOKEN=...

# Feature Flags
ENABLE_QR_UPLOAD=true
ENABLE_MOBILE_UPLOAD=true
```

## API Endpoints

### Whop Webhooks

```
POST /api/webhooks/whop
GET  /api/webhooks/whop (health check)
```

### Video Operations (Future)

```
POST   /api/video/upload          # Upload video to storage
POST   /api/video/process         # Trigger processing pipeline
GET    /api/video/{id}            # Get video details
DELETE /api/video/{id}            # Delete video
PATCH  /api/video/{id}            # Update video metadata
```

### QR Upload (Future)

```
POST   /api/upload/generate-qr    # Create QR upload session
POST   /api/upload/mobile/{token} # Mobile upload endpoint
GET    /api/upload/session/{token} # Check session status
```

## Processing Pipeline

### Cost Tracking

All AI operations are tracked for cost analytics:

```typescript
// Transcription: $0.006 per minute (Whisper)
const transcriptionCost = calculateTranscriptionCost(durationSeconds);

// Embedding: $0.0001 per 1K tokens (ada-002)
const embeddingCost = estimateCost(chunks);

// Total cost logged to `video_processing_costs` table
```

### Status Updates

Video processing status is updated in real-time:

```
pending → transcribing → chunking → embedding → completed
                   ↓
                failed (with error details)
```

## Security Considerations

1. **Webhook Signature Verification**: All Whop webhooks verify HMAC signature
2. **RLS Policies**: Database-level isolation between creators
3. **Service Role**: Backend operations use Supabase service role key
4. **Storage Policies**: Creator-specific folder access via RLS
5. **Rate Limiting**: OpenAI API calls rate-limited to prevent abuse
6. **Input Validation**: All file uploads validated (type, size, content)

## Deployment

### Vercel Deployment

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod

# Set environment variables in Vercel dashboard
# Project Settings → Environment Variables
```

### Supabase Setup

```bash
# Install Supabase CLI
npm i -g supabase

# Link to project
supabase link --project-ref your-project-ref

# Run migrations
supabase db push
```

### Webhook Registration

Register webhook URL in Whop dashboard:
```
URL: https://your-app.vercel.app/api/webhooks/whop
Events: merchant_installed, merchant_uninstalled, creator_purchase, creator_cancellation
```

## Testing

### Manual Testing

1. **Creator Provisioning**:
   ```bash
   curl -X POST http://localhost:3000/api/webhooks/whop \
     -H "Content-Type: application/json" \
     -H "x-whop-signature: test-signature" \
     -d '{"action":"merchant_installed","data":{"creator_id":"test-123","creator_slug":"test-creator","company_name":"Test Company"}}'
   ```

2. **Video Upload** (once UI is built):
   - Drag-drop video in `/dashboard/creator/upload`
   - Verify processing status updates
   - Check database for chunks and embeddings

### Automated Tests

```bash
# Run unit tests
npm test

# Run integration tests
npm run test:integration

# Run E2E tests
npm run test:e2e
```

## Monitoring

### Logs

- **Pino Logger**: Structured JSON logs in production
- **Sentry**: Error tracking and alerting
- **Supabase Logs**: Database query performance

### Metrics

- Video processing time (transcription, chunking, embedding)
- AI API costs per video
- Storage usage per creator
- RAG search latency

## Future Enhancements

1. **QR Code Upload**: Mobile video upload via QR code scanning
2. **Bulk Upload**: Process multiple videos in parallel
3. **Live Streaming**: Transcribe live streams in real-time
4. **Multi-Language**: Support for non-English videos
5. **Custom Models**: Fine-tuned embeddings for specific domains
6. **Analytics Dashboard**: Creator insights and student engagement metrics

## Troubleshooting

### Common Issues

**1. Webhook not receiving events**
- Verify webhook URL is publicly accessible
- Check Whop dashboard for delivery logs
- Ensure webhook secret matches environment variable

**2. Video processing stuck**
- Check Supabase function logs
- Verify OpenAI API key is valid
- Check file size limits (Whisper: 25MB max)

**3. RLS policy blocking access**
- Verify user authentication (Whop OAuth)
- Check `auth.uid()` matches `whop_user_id`
- Use service role for backend operations

**4. Embedding search returns no results**
- Verify embeddings are stored (check `embedding` column not null)
- Check vector similarity threshold (default: 0.7)
- Ensure query uses same embedding model (ada-002)

## Support

For questions or issues:
- GitHub Issues: [your-repo/issues]
- Email: support@chronosai.com
- Discord: [invite-link]

## License

Proprietary - All rights reserved
