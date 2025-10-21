# Module 8: Backend Infrastructure - Overview

## Executive Summary

The Backend Infrastructure module provides the foundational services that power the entire Mentora platform: database management, caching, background job processing, error tracking, and performance monitoring. **This is the backbone - every other module depends on this.**

**Status**: Full Implementation Required
**Priority**: P0 (CRITICAL - Must be implemented FIRST)
**Dependencies**: None (this is the foundation)

## Problem Statement

### Why Infrastructure Matters

A learning platform handling:
- **1000+ concurrent users**
- **Video processing** (CPU/memory intensive)
- **AI API calls** (variable latency)
- **Real-time progress tracking**
- **Large file uploads** (videos up to 4 hours)

Without proper infrastructure:
- ❌ API calls timeout under load
- ❌ Video processing blocks user requests
- ❌ Database queries slow down over time
- ❌ Errors go unnoticed until users complain
- ❌ No visibility into performance issues
- ❌ Cache misses waste money on AI API calls

### What We're Building

A production-ready infrastructure that:
- ✅ Scales to 10,000+ users without changes
- ✅ Processes videos in background without blocking
- ✅ Caches expensive AI responses
- ✅ Monitors errors in real-time
- ✅ Rate limits API abuse
- ✅ Provides observability into system health
- ✅ Handles failures gracefully

## Success Metrics

| Metric | Target | Why It Matters |
|--------|--------|----------------|
| **API Response Time** | p95 < 500ms | User experience |
| **Video Processing** | < 5 min for 1hr video | Creator satisfaction |
| **Cache Hit Rate** | > 70% | Cost savings |
| **Error Rate** | < 0.5% | Reliability |
| **Job Success Rate** | > 99% | Data integrity |
| **Database Query Time** | p95 < 100ms | Performance |
| **Uptime** | 99.9% | Trust |

## Core Components

### 1. Database Layer (Supabase)

**PostgreSQL + pgvector + Real-time**

```typescript
// Database Architecture
- PostgreSQL 15 (Supabase managed)
- pgvector extension for embeddings
- Row Level Security (RLS) enabled
- Connection pooling (PgBouncer)
- Automated backups (daily + WAL)
- Point-in-time recovery (7 days)
```

**Performance Optimizations**:
- Indexes on all foreign keys
- Composite indexes for common queries
- BRIN indexes for time-series data (analytics_events)
- Partial indexes for filtered queries
- Vector indexes (IVFFlat) for similarity search

**Security**:
- RLS policies on ALL tables
- Service role key stored securely
- Encrypted at rest
- SSL connections required
- IP allowlisting (optional)

### 2. Caching Layer (Redis/Vercel KV)

**What to Cache**:
- Chat session context (10min TTL)
- User membership validation (5min TTL)
- Video metadata (1hr TTL)
- AI embeddings (permanent with LRU eviction)
- API rate limit counters (1min sliding window)
- Creator settings (30min TTL)

**Cache Strategy**:
```typescript
// Cache-aside pattern
async function getCachedData<T>(
  key: string,
  fetchFn: () => Promise<T>,
  ttl: number
): Promise<T> {
  // Try cache first
  const cached = await redis.get(key);
  if (cached) return JSON.parse(cached);

  // Cache miss - fetch and store
  const data = await fetchFn();
  await redis.setex(key, ttl, JSON.stringify(data));
  return data;
}
```

**Cache Invalidation**:
- Time-based (TTL)
- Event-based (webhooks, mutations)
- Manual (admin dashboard)
- Tag-based (invalidate related keys)

### 3. Job Queue (Inngest)

**Background Jobs**:
- Video transcription (10-60min duration)
- Embedding generation (1-5min)
- Quiz generation (2-10min)
- Email sending (immediate)
- Analytics aggregation (nightly)
- Content health checks (weekly)

**Job Architecture**:
```typescript
// Inngest function example
export const processVideo = inngest.createFunction(
  { id: "process-video" },
  { event: "video/upload.completed" },
  async ({ event, step }) => {
    // Step 1: Extract audio
    const audio = await step.run("extract-audio", async () => {
      return extractAudio(event.data.videoUrl);
    });

    // Step 2: Transcribe (long-running)
    const transcript = await step.run("transcribe", async () => {
      return whisperAPI.transcribe(audio);
    });

    // Step 3: Generate chunks
    const chunks = await step.run("chunk-text", async () => {
      return intelligentChunker.chunk(transcript);
    });

    // Step 4: Generate embeddings (parallel)
    await step.run("generate-embeddings", async () => {
      await Promise.all(
        chunks.map(chunk => generateAndStoreEmbedding(chunk))
      );
    });

    // Step 5: Mark complete
    await step.run("mark-complete", async () => {
      await supabaseAdmin
        .from('videos')
        .update({ processing_status: 'completed' })
        .eq('id', event.data.videoId);
    });
  }
);
```

**Job Features**:
- Automatic retries (3 attempts with exponential backoff)
- Dead letter queue for failed jobs
- Job progress tracking
- Priority queues
- Rate limiting per job type
- Idempotency keys

### 4. Error Tracking (Sentry)

**What to Track**:
- Unhandled exceptions
- API errors (4xx, 5xx)
- Database query failures
- AI API timeouts
- Webhook signature failures
- Job failures

**Sentry Configuration**:
```typescript
Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0.1, // 10% of transactions
  beforeSend(event) {
    // Don't send errors from bots
    if (event.request?.headers?.['user-agent']?.includes('bot')) {
      return null;
    }
    return event;
  },
  integrations: [
    new Sentry.Integrations.Http({ tracing: true }),
    new Sentry.Integrations.Postgres(),
  ],
});
```

**Error Context**:
- User ID (when available)
- Request ID (trace entire flow)
- Whop membership ID
- Creator ID (for multi-tenancy)
- Request headers (sanitized)
- Stack trace
- Breadcrumbs (recent actions)

### 5. Rate Limiting

**Endpoint Limits**:
```typescript
const RATE_LIMITS = {
  // Chat endpoints
  '/api/chat': { requests: 20, window: '1m' },

  // Video upload
  '/api/videos/upload': { requests: 10, window: '1h' },

  // Quiz generation
  '/api/quizzes/generate': { requests: 5, window: '1h' },

  // Auth endpoints
  '/api/whop/auth': { requests: 5, window: '5m' },

  // General API
  '/api/*': { requests: 100, window: '1m' },
};
```

**Implementation**:
```typescript
// Using Upstash Ratelimit
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: process.env.REDIS_URL!,
  token: process.env.REDIS_TOKEN!,
});

const ratelimit = new Ratelimit({
  redis: redis,
  limiter: Ratelimit.slidingWindow(20, "1 m"),
  analytics: true,
});

export async function checkRateLimit(identifier: string) {
  const { success, limit, reset, remaining } =
    await ratelimit.limit(identifier);

  return {
    allowed: success,
    limit,
    remaining,
    reset: new Date(reset),
  };
}
```

### 6. Monitoring & Observability

**Metrics to Track**:
- Request throughput (req/sec)
- Response times (p50, p95, p99)
- Error rates (by endpoint, by type)
- Database connection pool usage
- Cache hit/miss rates
- Job queue depth
- AI API latency and costs
- Video processing throughput

**Logging Strategy**:
```typescript
// Structured logging with context
import pino from 'pino';

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  formatters: {
    level: (label) => ({ level: label }),
  },
});

logger.info({
  msg: 'Chat message processed',
  userId: user.id,
  sessionId: session.id,
  duration: endTime - startTime,
  tokensUsed: response.usage.total_tokens,
  cached: false,
});
```

**Dashboards**:
- System health (uptime, errors)
- API performance (response times, throughput)
- Database metrics (queries, connections)
- Job queue status (pending, processing, failed)
- Cost tracking (AI API usage, storage)
- User activity (DAU, session length)

## Technical Architecture

### Infrastructure Stack

```
┌─────────────────────────────────────────────────────────┐
│                    Vercel Edge Network                   │
│  (CDN, SSL, DDoS Protection, Geographic Distribution)   │
└────────────────────┬────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────┐
│                 Next.js API Routes                       │
│         (Rate Limiting, Auth, Request Validation)        │
└──┬──────────┬──────────┬──────────┬──────────┬─────────┘
   │          │          │          │          │
   │          │          │          │          │
   ▼          ▼          ▼          ▼          ▼
┌──────┐  ┌──────┐  ┌──────┐  ┌──────┐  ┌──────────┐
│Supabase│ │Redis │ │Inngest│ │Sentry│ │AI APIs   │
│Postgres│ │Cache │ │Jobs  │ │Errors│ │Claude/OAI│
└────────┘ └──────┘ └──────┘ └──────┘ └──────────┘
```

### Data Flow Example (Chat Request)

```
1. User sends chat message → Edge Function (rate limit check)
2. Check Redis cache for session context → Cache hit/miss
3. If miss: Query Supabase for chat history
4. Generate embedding → Cache in Redis (permanent)
5. Vector search Supabase → Get relevant chunks
6. Build context + Call Claude API
7. Store response in Supabase
8. Update cache with new context
9. Return response to user
10. Log analytics event (background)

Total time budget: <5 seconds
```

### Multi-Tenancy Isolation

**Creator Isolation**:
- All tables have `creator_id` foreign key
- RLS policies enforce creator boundaries
- Indexes include `creator_id` for performance
- API routes validate creator access
- Cache keys include creator namespace

```typescript
// Example RLS policy
CREATE POLICY "Videos are viewable by creator and students"
ON videos FOR SELECT
USING (
  creator_id = auth.uid()
  OR
  EXISTS (
    SELECT 1 FROM students
    WHERE students.creator_id = videos.creator_id
    AND students.whop_user_id = auth.uid()
  )
);
```

## Environment Variables

```env
# Database (REQUIRED)
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxx...
SUPABASE_SERVICE_ROLE_KEY=eyJxxx...  # Server-side only!

# Redis Cache (REQUIRED for production)
REDIS_URL=redis://default:xxx@xxx.upstash.io:6379
REDIS_TOKEN=xxx  # For Upstash

# Job Queue (REQUIRED)
INNGEST_EVENT_KEY=xxx
INNGEST_SIGNING_KEY=xxx

# Error Tracking (RECOMMENDED)
SENTRY_DSN=https://xxx@xxx.ingest.sentry.io/xxx
SENTRY_AUTH_TOKEN=xxx

# Monitoring (OPTIONAL)
NEXT_PUBLIC_POSTHOG_KEY=phc_xxx
POSTHOG_PROJECT_ID=xxx

# Performance (OPTIONAL)
VERCEL_ANALYTICS_ID=xxx
```

## Cost Breakdown (Monthly)

| Service | Tier | Usage | Cost |
|---------|------|-------|------|
| **Supabase** | Pro | 8GB DB, 100GB bandwidth | $25 |
| **Vercel** | Pro | Hosting, serverless | $20 |
| **Upstash Redis** | Pay-as-go | 1M commands | $10 |
| **Inngest** | Standard | 100k steps | Free-$20 |
| **Sentry** | Team | 50k events/mo | $26 |
| **Total Infrastructure** | | | **~$81-101/mo** |

**Per Creator**: $0.81-$1.01/month (at 100 creators)

## Performance Optimization Strategies

### Database Optimization

1. **Connection Pooling**
   - Use Supabase's built-in PgBouncer
   - Max connections: 15 (Vercel serverless limit)
   - Keep connections warm with periodic queries

2. **Query Optimization**
   - Use `.select()` with specific columns (not `*`)
   - Leverage indexes for all WHERE clauses
   - Use `.limit()` on all paginated queries
   - Batch inserts with `.insert([...])`

3. **Caching Strategy**
   - Cache read-heavy data (video metadata, user profiles)
   - Invalidate on writes
   - Use edge caching for public data

### API Optimization

1. **Response Compression**
   - Enable gzip/brotli on Vercel
   - Minify JSON responses

2. **Request Batching**
   - Batch AI API calls when possible
   - Use DataLoader pattern for N+1 queries

3. **Edge Functions**
   - Use Edge Runtime for simple operations
   - Keep cold start times <50ms

### Job Queue Optimization

1. **Parallelization**
   - Process video chunks in parallel (10 concurrent)
   - Use Promise.all() for independent operations

2. **Incremental Processing**
   - Update progress in real-time
   - Allow partial results (show first chunks while processing)

3. **Resource Management**
   - Limit concurrent heavy jobs (video processing: 5 max)
   - Queue overflow handling

## Security Considerations

### API Security

- ✅ All routes protected with Whop auth middleware
- ✅ Input validation with Zod schemas
- ✅ SQL injection prevention (use parameterized queries)
- ✅ Rate limiting on all endpoints
- ✅ CORS configured properly
- ✅ CSRF protection enabled
- ✅ No sensitive data in logs

### Database Security

- ✅ RLS enabled on ALL tables
- ✅ Service role key never exposed to client
- ✅ Prepared statements for all queries
- ✅ Encrypted at rest (Supabase default)
- ✅ SSL/TLS for all connections
- ✅ Regular security patches (managed by Supabase)

### Secrets Management

- ✅ Environment variables for all secrets
- ✅ No secrets in git (use .env.local)
- ✅ Rotate keys quarterly
- ✅ Separate keys for dev/staging/production
- ✅ Use Vercel Environment Variables UI

## Disaster Recovery

### Backup Strategy

**Database Backups** (Supabase):
- Daily full backups (retained 7 days)
- Point-in-time recovery (7 days)
- Manual snapshots before major changes

**Redis Backups**:
- Optional (cache is ephemeral)
- Export embeddings cache weekly (expensive to regenerate)

**File Storage Backups** (S3/R2):
- S3 versioning enabled
- Cross-region replication (optional)
- Lifecycle policies (archive old videos)

### Incident Response

**Levels**:
1. **P0 - Critical** (Platform down): <15min response
2. **P1 - Major** (Feature broken): <1hr response
3. **P2 - Minor** (Degraded): <4hr response
4. **P3 - Low** (Cosmetic): Next business day

**Runbook**:
1. Check status page (Vercel, Supabase, Upstash)
2. Review Sentry for recent errors
3. Check job queue for failures
4. Inspect database connections
5. Review recent deployments
6. Rollback if needed

## Testing Strategy

### Infrastructure Tests

1. **Database Connection**
   ```typescript
   test('Supabase connection works', async () => {
     const { data, error } = await supabase
       .from('creators')
       .select('id')
       .limit(1);
     expect(error).toBeNull();
   });
   ```

2. **Cache Operations**
   ```typescript
   test('Redis set/get works', async () => {
     await redis.set('test:key', 'value', 'EX', 60);
     const value = await redis.get('test:key');
     expect(value).toBe('value');
   });
   ```

3. **Rate Limiting**
   ```typescript
   test('Rate limit blocks excess requests', async () => {
     const requests = Array(25).fill(null);
     const results = await Promise.all(
       requests.map(() => checkRateLimit('test-user'))
     );
     const blocked = results.filter(r => !r.allowed);
     expect(blocked.length).toBeGreaterThan(0);
   });
   ```

4. **Job Processing**
   ```typescript
   test('Video processing job succeeds', async () => {
     const job = await inngest.send({
       name: 'video/upload.completed',
       data: { videoId: 'test-123' },
     });
     await waitForJob(job.id);
     expect(job.status).toBe('completed');
   });
   ```

## Common Issues & Solutions

### Issue: Database Connection Timeout
**Cause**: Too many connections, pool exhausted
**Solution**:
- Enable PgBouncer in Supabase
- Reuse Supabase client (don't create new instances)
- Close idle connections

### Issue: Cache Stampede
**Cause**: Multiple requests hit DB when cache expires
**Solution**:
```typescript
// Use locking to prevent stampede
const lock = await redis.set(`lock:${key}`, '1', 'NX', 'EX', 10);
if (lock) {
  const data = await fetchExpensiveData();
  await redis.setex(key, ttl, JSON.stringify(data));
}
```

### Issue: Job Queue Backup
**Cause**: Jobs slower than arrival rate
**Solution**:
- Increase job concurrency
- Optimize job code
- Add more workers
- Implement priority queue

### Issue: Memory Leaks in Serverless
**Cause**: Global variables, unclosed connections
**Solution**:
- Use connection pooling
- Clean up event listeners
- Monitor memory usage in logs

## Next Steps

1. Read `ARCHITECTURE.md` - Detailed technical design
2. Read `IMPLEMENTATION.md` - Step-by-step setup guide
3. Read `SUPABASE_SETUP.md` - Database configuration
4. Read `CACHING_STRATEGY.md` - Redis patterns
5. Read `JOB_QUEUE.md` - Inngest workflows
6. Read `MONITORING.md` - Observability setup

---

**This is the FOUNDATION - get it right and everything else works smoothly!**
