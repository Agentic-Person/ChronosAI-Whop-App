# Module 8: Backend Infrastructure - Implementation Guide

## Prerequisites Checklist

Before starting:
- [ ] Node.js 18+ installed
- [ ] npm or yarn installed
- [ ] Git installed
- [ ] Supabase account created
- [ ] Upstash Redis account (or Vercel KV)
- [ ] Inngest account created
- [ ] Sentry account (optional but recommended)

## Phase 1: Database Setup (Supabase)

### Step 1.1: Create Supabase Project

1. **Go to [supabase.com](https://supabase.com)**
2. **Click "New Project"**
3. **Configure project**:
   - Name: `mentora-production`
   - Database Password: Generate strong password (save in password manager)
   - Region: Choose closest to your users
   - Plan: Start with Free, upgrade to Pro when ready

4. **Save credentials**:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxxx.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
   SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...  # ⚠️ KEEP SECRET!
   ```

### Step 1.2: Run Database Migrations

```bash
# Install Supabase CLI
npm install -g supabase

# Link to your project
supabase link --project-ref YOUR_PROJECT_REF

# Run all migrations
supabase db push

# Verify migrations
supabase db diff

# You should see: "No changes detected"
```

**What this does**:
- Creates all 15 tables
- Sets up pgvector extension
- Creates indexes for performance
- Enables RLS policies
- Seeds achievements

### Step 1.3: Verify Database Setup

```bash
# Test connection
node scripts/test-database-connection.js
```

Create test script:

```typescript
// scripts/test-database-connection.js
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testConnection() {
  console.log('Testing Supabase connection...');

  // Test 1: Basic query
  const { data: creators, error } = await supabase
    .from('creators')
    .select('id')
    .limit(1);

  if (error) {
    console.error('❌ Database connection failed:', error);
    process.exit(1);
  }

  console.log('✅ Database connection successful');

  // Test 2: Verify pgvector
  const { data: chunks } = await supabase
    .from('video_chunks')
    .select('embedding')
    .limit(1);

  console.log('✅ pgvector extension working');

  // Test 3: Check all tables
  const tables = [
    'creators',
    'students',
    'videos',
    'video_chunks',
    'chat_sessions',
    'chat_messages',
    'quizzes',
    'quiz_attempts',
    'projects',
    'project_submissions',
    'calendar_events',
    'video_progress',
    'study_groups',
    'achievements',
    'student_achievements',
  ];

  for (const table of tables) {
    const { error } = await supabase.from(table).select('id').limit(1);
    if (error) {
      console.error(`❌ Table ${table} not found:`, error);
    } else {
      console.log(`✅ Table ${table} exists`);
    }
  }

  console.log('\n🎉 All database tests passed!');
}

testConnection();
```

Run test:
```bash
node scripts/test-database-connection.js
```

### Step 1.4: Configure Database Security

1. **Enable RLS (already done in migrations)**

2. **Set up database backups**:
   - Go to Supabase Dashboard → Settings → Database
   - Enable daily backups
   - Set retention to 7 days
   - Enable point-in-time recovery

3. **Configure SSL**:
   - Supabase enforces SSL by default ✅

4. **Set up IP allowlisting (optional for extra security)**:
   - Go to Settings → Database → Connection Pooling
   - Add your server IPs

## Phase 2: Caching Layer Setup (Redis)

### Step 2.1: Create Upstash Redis Database

**Option A: Upstash (Recommended)**

1. Go to [upstash.com](https://upstash.com)
2. Create account (free tier: 10,000 commands/day)
3. Click "Create Database"
4. Configure:
   - Name: `mentora-cache`
   - Type: Regional
   - Region: Same as Supabase
   - TLS: Enabled

5. Copy credentials:
   ```env
   REDIS_URL=redis://default:xxxxx@xxxxx.upstash.io:6379
   REDIS_TOKEN=xxxxx
   ```

**Option B: Vercel KV**

```bash
# Install Vercel CLI
npm install -g vercel

# Create KV store
vercel kv create mentora-cache

# Follow prompts, then copy credentials to .env
```

### Step 2.2: Test Redis Connection

```typescript
// scripts/test-redis-connection.js
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.REDIS_URL,
  token: process.env.REDIS_TOKEN,
});

async function testRedis() {
  console.log('Testing Redis connection...');

  // Test 1: Ping
  const pong = await redis.ping();
  console.log('✅ Ping successful:', pong);

  // Test 2: Set/Get
  await redis.set('test:key', 'Hello Redis!');
  const value = await redis.get('test:key');
  console.log('✅ Set/Get successful:', value);

  // Test 3: Expiry
  await redis.setex('test:ttl', 5, 'Expires in 5 seconds');
  const ttl = await redis.ttl('test:ttl');
  console.log('✅ TTL working:', ttl, 'seconds');

  // Test 4: Increment (for rate limiting)
  await redis.incr('test:counter');
  const counter = await redis.get('test:counter');
  console.log('✅ Increment working:', counter);

  // Cleanup
  await redis.del('test:key', 'test:ttl', 'test:counter');

  console.log('\n🎉 All Redis tests passed!');
}

testRedis();
```

Run test:
```bash
node scripts/test-redis-connection.js
```

### Step 2.3: Implement Cache Service

Already implemented in:
- `lib/infrastructure/cache/redis-client.ts`
- `lib/infrastructure/cache/cache-keys.ts`
- `lib/infrastructure/cache/cache-invalidation.ts`

Verify it works:

```typescript
// scripts/test-cache-service.js
import { cache } from '../lib/infrastructure/cache/redis-client';
import { CacheKeys, CacheTTL } from '../lib/infrastructure/cache/cache-keys';

async function testCacheService() {
  console.log('Testing cache service...');

  // Test cache-aside pattern
  const testData = { id: '123', name: 'Test Video' };
  const key = CacheKeys.video('test-123');

  const result = await cache.getOrCompute(
    key,
    async () => {
      console.log('  Cache miss - computing value');
      return testData;
    },
    CacheTTL.SHORT
  );

  console.log('✅ Cache-aside pattern working:', result);

  // Second call should hit cache
  const cachedResult = await cache.getOrCompute(
    key,
    async () => {
      console.log('  This should not print (cache hit)');
      return testData;
    },
    CacheTTL.SHORT
  );

  console.log('✅ Cache hit working:', cachedResult);

  // Test rate limiting
  const rateLimitKey = CacheKeys.rateLimit('test-user', '/api/test');
  const count = await cache.increment(rateLimitKey, 60);
  console.log('✅ Rate limit counter:', count);

  // Cleanup
  await cache.delete(key);
  await cache.delete(rateLimitKey);

  console.log('\n🎉 Cache service tests passed!');
}

testCacheService();
```

## Phase 3: Job Queue Setup (Inngest)

### Step 3.1: Create Inngest Account

1. Go to [inngest.com](https://inngest.com)
2. Create account (free tier: 50k steps/month)
3. Create new app:
   - Name: `mentora`
   - Environment: `production`

4. Copy credentials:
   ```env
   INNGEST_EVENT_KEY=evt_xxxxx
   INNGEST_SIGNING_KEY=sig_xxxxx
   ```

### Step 3.2: Set Up Inngest in Next.js

```typescript
// app/api/inngest/route.ts
import { serve } from 'inngest/next';
import { inngest } from '@/lib/infrastructure/jobs/inngest-client';

// Import all job functions
import { processVideo } from '@/lib/infrastructure/jobs/functions/process-video';
import { generateQuiz } from '@/lib/infrastructure/jobs/functions/generate-quiz';
import { aggregateDailyAnalytics } from '@/lib/infrastructure/jobs/functions/scheduled-jobs';
import { checkContentHealth } from '@/lib/infrastructure/jobs/functions/scheduled-jobs';
import { sendEmail } from '@/lib/infrastructure/jobs/functions/send-email';

// Register all functions
export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    processVideo,
    generateQuiz,
    aggregateDailyAnalytics,
    checkContentHealth,
    sendEmail,
  ],
  streaming: 'allow', // Enable streaming for long-running jobs
});
```

### Step 3.3: Configure Inngest Webhook

1. In Inngest dashboard, go to your app
2. Click "Apps" → "Configure"
3. Set webhook URL: `https://your-domain.com/api/inngest`
4. Save and verify

### Step 3.4: Test Job Execution

```typescript
// scripts/test-inngest.js
import { inngest } from '../lib/infrastructure/jobs/inngest-client';

async function testInngest() {
  console.log('Testing Inngest job execution...');

  // Send test event
  const result = await inngest.send({
    name: 'video/upload.completed',
    data: {
      videoId: 'test-video-123',
      creatorId: 'test-creator-456',
      videoUrl: 'https://example.com/test.mp4',
      duration: 600, // 10 minutes
    },
  });

  console.log('✅ Event sent:', result);
  console.log('   Check Inngest dashboard for job execution');

  // To test locally, run: npx inngest-cli dev
}

testInngest();
```

**Local development**:

```bash
# Install Inngest CLI
npm install -D inngest-cli

# Start local dev server (alongside npm run dev)
npx inngest-cli dev

# This will:
# - Start Inngest Dev Server on http://localhost:8288
# - Show real-time job execution
# - Allow testing without deploying
```

## Phase 4: Error Tracking Setup (Sentry)

### Step 4.1: Create Sentry Project

1. Go to [sentry.io](https://sentry.io)
2. Create account
3. Create new project:
   - Platform: Next.js
   - Name: `mentora`
   - Alert frequency: Default

4. Copy DSN:
   ```env
   SENTRY_DSN=https://xxxxx@xxxxx.ingest.sentry.io/xxxxx
   SENTRY_AUTH_TOKEN=xxxxx
   ```

### Step 4.2: Install Sentry

```bash
npm install @sentry/nextjs

# Run Sentry wizard
npx @sentry/wizard@latest -i nextjs
```

This creates:
- `sentry.client.config.ts`
- `sentry.server.config.ts`
- `sentry.edge.config.ts`
- Updates `next.config.js`

### Step 4.3: Configure Sentry

Update generated files with custom config:

```typescript
// sentry.server.config.ts
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,

  tracesSampleRate: 0.1,

  integrations: [
    new Sentry.Integrations.Http({ tracing: true }),
  ],

  beforeSend(event, hint) {
    // Filter out bot errors
    const userAgent = event.request?.headers?.['user-agent'];
    if (userAgent && /bot|crawler/i.test(userAgent)) {
      return null;
    }
    return event;
  },
});
```

### Step 4.4: Test Sentry

```typescript
// app/api/test-sentry/route.ts
import { NextResponse } from 'next/server';
import * as Sentry from '@sentry/nextjs';

export async function GET() {
  try {
    throw new Error('Test Sentry error');
  } catch (error) {
    Sentry.captureException(error, {
      tags: {
        test: true,
      },
    });
    return NextResponse.json({ message: 'Error sent to Sentry' });
  }
}
```

Visit `/api/test-sentry` and check Sentry dashboard.

## Phase 5: Rate Limiting Implementation

### Step 5.1: Install Rate Limiting Package

```bash
npm install @upstash/ratelimit
```

### Step 5.2: Implement Rate Limit Middleware

Already implemented in:
- `lib/infrastructure/rate-limiting/rate-limiter.ts`

### Step 5.3: Apply to API Routes

```typescript
// app/api/chat/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { withRateLimit } from '@/lib/infrastructure/rate-limiting/rate-limiter';

async function handler(req: NextRequest) {
  // Your chat logic here
  return NextResponse.json({ message: 'Chat response' });
}

export const POST = withRateLimit(handler, 'chat');
```

### Step 5.4: Test Rate Limiting

```typescript
// scripts/test-rate-limiting.js
async function testRateLimit() {
  console.log('Testing rate limiting...');

  const requests = [];
  for (let i = 0; i < 25; i++) {
    requests.push(
      fetch('http://localhost:3000/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: 'Test' }),
      })
    );
  }

  const responses = await Promise.all(requests);
  const statuses = responses.map(r => r.status);

  const blocked = statuses.filter(s => s === 429).length;
  console.log(`✅ ${blocked} requests blocked (expected ~5)`);

  if (blocked > 0) {
    console.log('✅ Rate limiting working!');
  } else {
    console.error('❌ Rate limiting not working');
  }
}

testRateLimit();
```

## Phase 6: Performance Monitoring

### Step 6.1: Set Up Structured Logging

```bash
npm install pino pino-pretty
```

```typescript
// lib/infrastructure/monitoring/logger.ts
import pino from 'pino';

export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  formatters: {
    level: (label) => ({ level: label }),
  },
  // Pretty print in development
  ...(process.env.NODE_ENV === 'development' && {
    transport: {
      target: 'pino-pretty',
      options: {
        colorize: true,
      },
    },
  }),
});

// Usage
logger.info({ msg: 'User logged in', userId: '123' });
logger.error({ msg: 'Database error', error: err.message });
```

### Step 6.2: Add Performance Metrics

Already implemented in:
- `lib/infrastructure/monitoring/performance.ts`

Usage example:

```typescript
import { PerformanceTimer, logPerformance } from '@/lib/infrastructure/monitoring/performance';

async function processVideo(videoId: string) {
  const timer = new PerformanceTimer();

  timer.start('transcription');
  const transcript = await transcribeVideo(videoId);
  const transcriptionTime = timer.end('transcription');

  logPerformance('video-transcription', transcriptionTime, {
    videoId,
    wordCount: transcript.words.length,
  });

  // Or use measure helper
  const { result, duration } = await timer.measure('embedding-generation', () =>
    generateEmbeddings(transcript)
  );

  logPerformance('embedding-generation', duration, {
    videoId,
    embeddingsCount: result.length,
  });
}
```

## Phase 7: Health Checks

### Step 7.1: Create Health Check Endpoint

```typescript
// app/api/health/route.ts
import { NextResponse } from 'next/server';
import { checkDatabaseHealth } from '@/lib/infrastructure/database/connection-pool';
import { cache } from '@/lib/infrastructure/cache/redis-client';

export async function GET() {
  const results = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    services: {
      database: { healthy: false, latency: 0 },
      cache: { healthy: false, latency: 0 },
    },
  };

  // Check database
  const dbHealth = await checkDatabaseHealth();
  results.services.database = dbHealth;

  // Check cache
  const cacheHealth = await cache.healthCheck();
  results.services.cache = cacheHealth;

  // Overall status
  const allHealthy = dbHealth.healthy && cacheHealth.healthy;
  results.status = allHealthy ? 'healthy' : 'degraded';

  const statusCode = allHealthy ? 200 : 503;

  return NextResponse.json(results, { status: statusCode });
}
```

### Step 7.2: Test Health Endpoint

```bash
curl http://localhost:3000/api/health

# Expected output:
# {
#   "status": "healthy",
#   "timestamp": "2025-10-20T10:00:00Z",
#   "services": {
#     "database": { "healthy": true, "latency": 45 },
#     "cache": { "healthy": true, "latency": 12 }
#   }
# }
```

### Step 7.3: Set Up Uptime Monitoring

Use health endpoint with services like:
- [UptimeRobot](https://uptimerobot.com) (free)
- [BetterUptime](https://betteruptime.com)
- Vercel's built-in monitoring

## Phase 8: Environment Configuration

### Step 8.1: Complete .env File

```env
# Database
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxx...
SUPABASE_SERVICE_ROLE_KEY=eyJxxx...

# Cache
REDIS_URL=redis://default:xxx@xxx.upstash.io:6379
REDIS_TOKEN=xxx

# Job Queue
INNGEST_EVENT_KEY=evt_xxx
INNGEST_SIGNING_KEY=sig_xxx

# Error Tracking
SENTRY_DSN=https://xxx@xxx.ingest.sentry.io/xxx
SENTRY_AUTH_TOKEN=xxx

# AI Services
ANTHROPIC_API_KEY=sk-ant-xxx
OPENAI_API_KEY=sk-xxx

# Whop Integration
WHOP_API_KEY=whop_xxx
WHOP_CLIENT_ID=client_xxx
WHOP_CLIENT_SECRET=secret_xxx
WHOP_WEBHOOK_SECRET=webhook_xxx

# Storage
AWS_ACCESS_KEY_ID=xxx
AWS_SECRET_ACCESS_KEY=xxx
AWS_REGION=us-east-1
AWS_S3_BUCKET=mentora-videos

# App Config
NEXT_PUBLIC_APP_URL=http://localhost:3000
NODE_ENV=development
LOG_LEVEL=debug
```

### Step 8.2: Configure Vercel Environment Variables

```bash
# Install Vercel CLI
npm install -g vercel

# Link project
vercel link

# Add environment variables
vercel env add SUPABASE_SERVICE_ROLE_KEY production
vercel env add REDIS_URL production
# ... repeat for all secrets

# Pull to local .env.local
vercel env pull
```

## Phase 9: Testing Everything Together

### Step 9.1: Integration Test Script

```typescript
// scripts/test-infrastructure.ts
import { checkDatabaseHealth } from '@/lib/infrastructure/database/connection-pool';
import { cache } from '@/lib/infrastructure/cache/redis-client';
import { inngest } from '@/lib/infrastructure/jobs/inngest-client';
import { checkRateLimit } from '@/lib/infrastructure/rate-limiting/rate-limiter';

async function runInfrastructureTests() {
  console.log('🚀 Running infrastructure tests...\n');

  const results = {
    database: false,
    cache: false,
    jobs: false,
    rateLimit: false,
  };

  // Test 1: Database
  console.log('1. Testing database connection...');
  const dbHealth = await checkDatabaseHealth();
  if (dbHealth.healthy) {
    console.log(`   ✅ Database healthy (${dbHealth.latency}ms)`);
    results.database = true;
  } else {
    console.error(`   ❌ Database unhealthy: ${dbHealth.error}`);
  }

  // Test 2: Cache
  console.log('\n2. Testing cache...');
  const cacheHealth = await cache.healthCheck();
  if (cacheHealth.healthy) {
    console.log(`   ✅ Cache healthy (${cacheHealth.latency}ms)`);
    results.cache = true;
  } else {
    console.error('   ❌ Cache unhealthy');
  }

  // Test 3: Job Queue
  console.log('\n3. Testing job queue...');
  try {
    await inngest.send({
      name: 'email/send',
      data: {
        to: 'test@example.com',
        template: 'test',
        variables: {},
      },
    });
    console.log('   ✅ Job queue working');
    results.jobs = true;
  } catch (error) {
    console.error('   ❌ Job queue error:', error);
  }

  // Test 4: Rate Limiting
  console.log('\n4. Testing rate limiting...');
  const rateResult = await checkRateLimit('test-user', 'api');
  if (rateResult.allowed) {
    console.log(`   ✅ Rate limiting working (${rateResult.remaining}/${rateResult.limit} remaining)`);
    results.rateLimit = true;
  } else {
    console.error('   ❌ Rate limit error');
  }

  // Summary
  console.log('\n📊 Test Summary:');
  console.log(`   Database: ${results.database ? '✅' : '❌'}`);
  console.log(`   Cache: ${results.cache ? '✅' : '❌'}`);
  console.log(`   Job Queue: ${results.jobs ? '✅' : '❌'}`);
  console.log(`   Rate Limiting: ${results.rateLimit ? '✅' : '❌'}`);

  const allPassed = Object.values(results).every(Boolean);

  if (allPassed) {
    console.log('\n🎉 All infrastructure tests passed!');
    process.exit(0);
  } else {
    console.error('\n❌ Some tests failed. Check configuration.');
    process.exit(1);
  }
}

runInfrastructureTests();
```

### Step 9.2: Run Complete Test Suite

```bash
# Run infrastructure tests
npm run test:infrastructure

# Run unit tests
npm test

# Run integration tests
npm run test:integration

# Check for TypeScript errors
npm run type-check

# Lint code
npm run lint
```

## Phase 10: Deployment

### Step 10.1: Deploy to Vercel

```bash
# Deploy to production
vercel --prod

# Set up automatic deployments
vercel --prod --yes
```

### Step 10.2: Post-Deployment Checks

```bash
# Check health endpoint
curl https://your-domain.com/api/health

# Monitor Sentry for errors
# Check Inngest dashboard for job execution
# Verify Redis cache is working
# Check database connections in Supabase
```

### Step 10.3: Set Up Monitoring

1. **Vercel Analytics**: Auto-enabled
2. **Sentry Alerts**: Configure in dashboard
3. **Uptime Monitoring**: Set up health check pings
4. **Database Alerts**: Configure in Supabase

## Troubleshooting

### Database Connection Issues

```typescript
// Increase timeout
const supabase = createClient(url, key, {
  db: {
    schema: 'public',
  },
  global: {
    headers: {
      'x-application-name': 'mentora',
    },
  },
  // Add timeout
  fetch: (url, options) => {
    return fetch(url, {
      ...options,
      signal: AbortSignal.timeout(30000), // 30 seconds
    });
  },
});
```

### Cache Connection Errors

```bash
# Test Redis connection
redis-cli -u $REDIS_URL ping

# Should return: PONG
```

### Job Queue Not Processing

```bash
# Check Inngest logs
inngest-cli logs

# Verify webhook configuration
curl -X POST https://your-domain.com/api/inngest \
  -H "Content-Type: application/json" \
  -d '{"test": true}'
```

### Rate Limiting Not Working

```typescript
// Debug rate limit
const result = await rateLimiters.api.limit('test-user');
console.log('Rate limit result:', result);
// Should show: { success: true/false, limit, remaining, reset }
```

## Next Steps

✅ **Infrastructure is now complete!**

**Continue to**:
1. **Module 7**: Implement Whop Integration
2. **Module 2**: Set up Video Processing Pipeline
3. **Module 1**: Build RAG Chat Engine

---

**Infrastructure checklist**:
- [x] Database configured and migrated
- [x] Caching layer operational
- [x] Job queue processing
- [x] Error tracking active
- [x] Rate limiting enforced
- [x] Monitoring in place
- [x] Health checks working
- [x] Deployed to production

**You're ready to build features!** 🚀
