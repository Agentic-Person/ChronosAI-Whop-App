# Usage Tracking & Cost Monitoring Documentation

## Overview

The Usage Tracking & Cost Monitoring system is a critical infrastructure feature that provides real-time API cost tracking, budget limits, and usage analytics across all ChronosAI features. It enables creators and students to monitor their API consumption and stay within their tier limits.

## Integration Status

### ✅ Fully Integrated (Phase 1 - Core MVP)
- **Chat API** ([app/api/chat/route.ts](../../app/api/chat/route.ts)) - Budget checks and cost tracking for Claude API calls
- **Video Transcription** ([lib/video/transcription.ts](../../lib/video/transcription.ts)) - OpenAI Whisper API cost tracking
- **Embedding Generation** ([lib/video/embedding-generator.ts](../../lib/video/embedding-generator.ts)) - OpenAI embeddings cost tracking
- **Usage Dashboard** ([app/dashboard/usage/page.tsx](../../app/dashboard/usage/page.tsx)) - Full UI with real-time metrics
- **API Endpoints** ([app/api/usage/*](../../app/api/usage)) - Stats, breakdown, and export endpoints

### ⚠️ Pending Integration (Phase 2 - Assessment Features)
- **Quiz Generation** ([lib/assessments/quiz-generator.ts](../../lib/assessments/quiz-generator.ts)) - Claude API
- **Code Review** ([lib/assessments/code-reviewer.ts](../../lib/assessments/code-reviewer.ts)) - Claude API
- **Project Assessment** ([app/api/assessments/*](../../app/api/assessments)) - Claude API

### ⚠️ Pending Integration (Phase 3 - Intelligence Features)
- **Gap Detection** ([lib/intelligence/gap-detector.ts](../../lib/intelligence/gap-detector.ts)) - Claude API
- **Calendar Generation** ([lib/calendar/calendar-generator.ts](../../lib/calendar/calendar-generator.ts)) - Claude API
- **Study Buddy Matching** ([lib/study-buddy/matching-algorithm.ts](../../lib/study-buddy/matching-algorithm.ts)) - Claude API (if applicable)

### 📊 Dashboard Features
- ✅ Real-time cost meters (daily/monthly)
- ✅ 7-day spending trend chart
- ✅ Cost breakdown by service
- ✅ Tier badge display
- ✅ Export functionality (JSON/CSV)
- ⚠️ Cost optimization suggestions (backend ready, UI pending)

## Features

### 1. Real-Time Cost Tracking

Track every API call with detailed cost attribution across all services.

#### Tracked Services
- **OpenAI**: Embeddings (ada-002), Whisper transcription
- **Anthropic**: Claude Sonnet 3.5, Claude Haiku 3
- **AWS**: S3 storage, CloudFront bandwidth
- **Supabase**: Database operations, storage

#### Capabilities
- Per-request cost calculation
- Real-time aggregation (daily, monthly)
- Cost breakdown by service and provider
- Error tracking and rate limiting
- Budget alerts and notifications

#### Usage

```typescript
import { costTracker } from '@/lib/usage';

// Track a single API call
await costTracker.trackUsage({
  user_id: userId,
  creator_id: creatorId,
  endpoint: '/api/student/chat',
  method: 'POST',
  provider: 'anthropic',
  service: 'chat',
  cost_usd: 0.003,
  metadata: {
    model: 'claude-3-5-sonnet-20241022',
    input_tokens: 1000,
    output_tokens: 500,
  },
  status_code: 200,
});

// Check if user can make an API call
const check = await costTracker.checkCostLimit(userId, creatorId, 0.01);
if (!check.allowed) {
  throw new Error(check.reason);
}
```

#### API Endpoint

```bash
GET /api/usage/stats
```

**Query Parameters:**
- `user_id` (optional): Filter by user ID
- `creator_id` (optional): Filter by creator ID
- `period` (optional): 'daily' | 'monthly' (default: 'daily')

**Response:**
```json
{
  "success": true,
  "data": {
    "daily_spent": 0.15,
    "daily_limit": 1.0,
    "monthly_spent": 2.45,
    "monthly_limit": 25.0,
    "total_api_calls": 156,
    "error_rate": 2.5,
    "cost_by_provider": {
      "openai": 0.08,
      "anthropic": 0.05,
      "aws": 0.02
    },
    "cost_by_service": {
      "chat": 0.10,
      "embeddings": 0.03,
      "transcription": 0.02
    }
  }
}
```

**Rate Limits:**
- 60 requests per minute per user

**Feature Gate:**
- Available to all tiers (FREE, BASIC, PRO, ENTERPRISE)

### 2. Cost Breakdown Analytics

Get detailed cost breakdowns by time period, service, or provider.

#### Usage

```typescript
import { costTracker } from '@/lib/usage';

// Get cost breakdown by service
const breakdown = await costTracker.getCostBreakdown(
  userId,
  creatorId,
  new Date('2025-01-01'),
  new Date('2025-01-31')
);

// Get daily usage over time
const dailyUsage = await costTracker.getDailyUsage(userId, creatorId);
```

#### API Endpoint

```bash
GET /api/usage/breakdown
```

**Query Parameters:**
- `user_id` (optional): Filter by user ID
- `creator_id` (optional): Filter by creator ID
- `start_date` (optional): ISO date string
- `end_date` (optional): ISO date string
- `group_by`: 'service' | 'provider' | 'day'

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "service": "chat",
      "cost": 1.25,
      "calls": 450,
      "percentage": 51.0
    },
    {
      "service": "embeddings",
      "cost": 0.80,
      "calls": 200,
      "percentage": 32.7
    },
    {
      "service": "transcription",
      "cost": 0.40,
      "calls": 10,
      "percentage": 16.3
    }
  ]
}
```

### 3. Usage Export

Export usage data for external analysis or accounting.

#### Usage

```typescript
import { exportUsageData } from '@/lib/usage';

// Export as JSON
const jsonData = await exportUsageData(
  userId,
  creatorId,
  new Date('2025-01-01'),
  new Date('2025-01-31'),
  'json'
);

// Export as CSV
const csvData = await exportUsageData(
  userId,
  creatorId,
  new Date('2025-01-01'),
  new Date('2025-01-31'),
  'csv'
);
```

#### API Endpoint

```bash
POST /api/usage/export
```

**Request Body:**
```json
{
  "user_id": "uuid",
  "creator_id": "uuid",
  "start_date": "2025-01-01",
  "end_date": "2025-01-31",
  "format": "csv"
}
```

**Response (CSV):**
```csv
Date,Cost (USD),API Calls,Service
2025-01-01,0.45,50,All Services
2025-01-02,0.52,65,All Services
Total,1.25,450,chat
Total,0.80,200,embeddings
```

**Response (JSON):**
```json
{
  "success": true,
  "data": {
    "period": {
      "start": "2025-01-01T00:00:00Z",
      "end": "2025-01-31T23:59:59Z"
    },
    "summary": {
      "total_cost": 2.45,
      "total_calls": 715,
      "error_rate": 2.5
    },
    "breakdown_by_day": [...],
    "breakdown_by_service": [...]
  }
}
```

**Rate Limits:**
- 10 exports per hour per user

### 4. Budget Limits & Alerts

Set custom budget limits and receive alerts when approaching limits.

#### Usage

```typescript
import { costTracker } from '@/lib/usage';

// Set custom budget limit
await costTracker.setCustomLimit(
  userId,
  creatorId,
  5.0, // daily limit in USD
  150.0 // monthly limit in USD
);

// Get budget status
const stats = await costTracker.getUsageStats(userId, creatorId);
const budgetStatus = getBudgetStatus(stats.daily_spent, stats.daily_limit);
// Returns: { percentage: 75, status: 'warning', remaining: 0.25 }
```

#### Alert Thresholds
- **50%**: Warning notification
- **80%**: Critical warning
- **90%**: Final warning
- **100%**: Usage blocked

## Tier Limits

### FREE Tier
- **Daily Limit**: $0.10 (≈3 chat messages)
- **Monthly Limit**: $1.00
- **Chat Sessions**: 3 per day
- **Videos**: 10 total, 5GB storage
- **Quiz Generations**: 0

### BASIC Tier ($9/month)
- **Daily Limit**: $1.00
- **Monthly Limit**: $25.00
- **Chat Sessions**: Unlimited
- **Videos**: 50 total, 25GB storage
- **Quiz Generations**: 5 per hour

### PRO Tier ($29/month)
- **Daily Limit**: $5.00
- **Monthly Limit**: $100.00
- **Chat Sessions**: Unlimited
- **Videos**: 200 total, 100GB storage
- **Quiz Generations**: 20 per hour

### ENTERPRISE Tier ($99/month)
- **Daily Limit**: $20.00
- **Monthly Limit**: $500.00
- **Chat Sessions**: Unlimited
- **Videos**: Unlimited, 500GB storage
- **Quiz Generations**: Unlimited

## Dashboard Components

### UsageDashboard Component

Main dashboard component that displays all usage metrics.

#### Props
```typescript
interface UsageDashboardProps {
  userId?: string;
  creatorId?: string;
  className?: string;
}
```

#### Usage
```tsx
import { UsageDashboard } from '@/components/usage/UsageDashboard';

<UsageDashboard userId={user.id} creatorId={creator.id} />
```

#### Features Displayed
- Current tier badge
- Daily/monthly spend meters with progress bars
- Cost breakdown pie chart (by service)
- 7-day spending trend line chart
- Cost optimization suggestions
- Export data button

### CostMeter Component

Visual gauge component showing spend vs limit.

#### Props
```typescript
interface CostMeterProps {
  label: string;
  current: number;
  limit: number;
  period: 'daily' | 'monthly';
  status: 'good' | 'warning' | 'critical' | 'exceeded';
  className?: string;
}
```

#### Usage
```tsx
import { CostMeter } from '@/components/usage/CostMeter';

<CostMeter
  label="Daily Spend"
  current={0.75}
  limit={1.00}
  period="daily"
  status="warning"
/>
```

### UsageChart Component

7-day trend chart showing daily costs over time.

#### Props
```typescript
interface UsageChartProps {
  data: Array<{
    date: string;
    cost: number;
    calls: number;
  }>;
  className?: string;
}
```

#### Usage
```tsx
import { UsageChart } from '@/components/usage/UsageChart';

<UsageChart data={dailyUsage} />
```

## Integration Examples

### Chat API Integration

```typescript
// app/api/student/chat/route.ts
import { costTracker } from '@/lib/usage';
import { calculateAnthropicCost } from '@/lib/usage';

export async function POST(req: Request) {
  const { userId, creatorId, message } = await req.json();

  // Check cost limit before making API call
  const check = await costTracker.checkCostLimit(userId, creatorId, 0.01);
  if (!check.allowed) {
    return Response.json({ error: check.reason }, { status: 429 });
  }

  // Make API call to Claude
  const response = await anthropic.messages.create({
    model: 'claude-3-5-sonnet-20241022',
    messages: [{ role: 'user', content: message }],
  });

  // Calculate actual cost
  const cost = calculateAnthropicCost(
    'claude-3-5-sonnet-20241022',
    response.usage.input_tokens,
    response.usage.output_tokens
  );

  // Track usage
  await costTracker.trackUsage({
    user_id: userId,
    creator_id: creatorId,
    endpoint: '/api/student/chat',
    method: 'POST',
    provider: 'anthropic',
    service: 'chat',
    cost_usd: cost,
    metadata: {
      model: 'claude-3-5-sonnet-20241022',
      input_tokens: response.usage.input_tokens,
      output_tokens: response.usage.output_tokens,
    },
    status_code: 200,
  });

  return Response.json({ response: response.content[0].text });
}
```

### Video Processing Integration

```typescript
// lib/video/processor.ts
import { costTracker } from '@/lib/usage';
import { calculateTranscriptionCost, calculateEmbeddingCost } from '@/lib/usage';

export async function processVideo(videoId: string, userId: string, creatorId: string) {
  // Transcribe audio
  const transcription = await openai.audio.transcriptions.create({
    file: audioFile,
    model: 'whisper-1',
  });

  const transcriptionCost = calculateTranscriptionCost(audioDurationMinutes);

  await costTracker.trackUsage({
    user_id: userId,
    creator_id: creatorId,
    endpoint: '/api/videos/process',
    method: 'POST',
    provider: 'openai',
    service: 'transcription',
    cost_usd: transcriptionCost,
    metadata: { video_id: videoId, duration_minutes: audioDurationMinutes },
    status_code: 200,
  });

  // Generate embeddings
  const chunks = chunkTranscript(transcription.text);
  const embeddings = await openai.embeddings.create({
    model: 'text-embedding-ada-002',
    input: chunks,
  });

  const embeddingCost = calculateEmbeddingCost(embeddings.usage.total_tokens);

  await costTracker.trackUsage({
    user_id: userId,
    creator_id: creatorId,
    endpoint: '/api/videos/process',
    method: 'POST',
    provider: 'openai',
    service: 'embeddings',
    cost_usd: embeddingCost,
    metadata: { video_id: videoId, chunks: chunks.length, tokens: embeddings.usage.total_tokens },
    status_code: 200,
  });
}
```

## Cost Optimization

The system automatically suggests optimizations based on usage patterns:

### Model Switching
- If chat costs > 50% of total: Suggest switching to Claude Haiku for simple queries (90% cheaper)

### Caching
- If embedding costs > 20% of total: Suggest caching frequently used embeddings

### Error Reduction
- If error rate > 5%: Suggest fixing errors to reduce wasted API calls

### Batch Processing
- If API calls > 1000/day: Suggest batch processing to reduce overhead

## Database Schema

### api_usage_logs Table
```sql
CREATE TABLE api_usage_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id),
  creator_id UUID REFERENCES creators(id),
  student_id UUID REFERENCES students(id),
  endpoint TEXT NOT NULL,
  method TEXT NOT NULL,
  provider TEXT NOT NULL, -- 'openai', 'anthropic', 'aws', 'supabase'
  service TEXT NOT NULL,  -- 'chat', 'embeddings', 'transcription', 'storage'
  cost_usd DECIMAL(10,6) NOT NULL,
  metadata JSONB,
  status_code INTEGER,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### usage_summaries Table
```sql
CREATE TABLE usage_summaries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id),
  creator_id UUID REFERENCES creators(id),
  period_type TEXT NOT NULL, -- 'daily', 'monthly'
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,
  total_cost_usd DECIMAL(10,4) NOT NULL,
  total_api_calls INTEGER NOT NULL,
  cost_by_provider JSONB NOT NULL,
  cost_by_service JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### cost_limits Table
```sql
CREATE TABLE cost_limits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id),
  creator_id UUID REFERENCES creators(id),
  daily_limit_usd DECIMAL(10,4) NOT NULL,
  monthly_limit_usd DECIMAL(10,4) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### cost_alerts Table
```sql
CREATE TABLE cost_alerts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id),
  creator_id UUID REFERENCES creators(id),
  alert_type TEXT NOT NULL, -- 'warning', 'critical', 'exceeded'
  threshold_percentage INTEGER NOT NULL,
  cost_usd DECIMAL(10,4) NOT NULL,
  limit_usd DECIMAL(10,4) NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

## Security Considerations

- All usage data is scoped to user/creator level with RLS policies
- Cost limits are enforced before making expensive API calls
- Budget exceeded errors return 429 status codes
- Service role key required for admin usage queries
- All cost calculations use server-side pricing constants

## Error Handling

```typescript
import { CostLimitExceededError, UsageTrackingError } from '@/lib/usage';

try {
  await costTracker.trackUsage({...});
} catch (error) {
  if (error instanceof CostLimitExceededError) {
    // User exceeded their budget
    return Response.json({ error: 'Budget limit exceeded' }, { status: 429 });
  } else if (error instanceof UsageTrackingError) {
    // Tracking failed but don't block user
    console.error('Usage tracking failed:', error);
    // Continue with API call
  }
}
```

## Testing

```typescript
import { costTracker, PLAN_LIMITS } from '@/lib/usage';

// Mock cost tracking in tests
jest.mock('@/lib/usage', () => ({
  costTracker: {
    trackUsage: jest.fn(),
    checkCostLimit: jest.fn().mockResolvedValue({ allowed: true }),
  },
}));

// Test budget limit enforcement
test('blocks API call when budget exceeded', async () => {
  const mockCheck = jest.fn().mockResolvedValue({
    allowed: false,
    reason: 'Daily budget limit exceeded',
  });

  costTracker.checkCostLimit = mockCheck;

  const response = await POST(mockRequest);
  expect(response.status).toBe(429);
});
```

## Performance

- Usage tracking is async and non-blocking
- Aggregations are pre-calculated in usage_summaries table
- Database indexes on user_id, creator_id, created_at
- Cost calculations use in-memory pricing constants
- Dashboard queries use pagination for large datasets

## Related Documentation

- [Agent 15 Full Specification](../agents/AGENT_15_USAGE_TRACKING.md) - Complete technical implementation
- [Pricing Configuration](../../lib/usage/pricing-config.ts) - Tier limits and pricing constants
- [Cost Tracker Service](../../lib/usage/cost-tracker.ts) - Core tracking service
