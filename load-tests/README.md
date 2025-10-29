# Load Testing Suite

Comprehensive load testing infrastructure for the AI Video Learning Assistant platform using Artillery.

## Table of Contents

- [Overview](#overview)
- [Quick Start](#quick-start)
- [Test Scenarios](#test-scenarios)
- [Performance Targets](#performance-targets)
- [Running Tests](#running-tests)
- [Interpreting Results](#interpreting-results)
- [Troubleshooting](#troubleshooting)

## Overview

This load testing suite validates that the platform can handle production traffic levels across all critical user flows:

- **Expected Load**: 1000+ concurrent users
- **Video Processing**: 100+ concurrent uploads
- **Chat Interactions**: High-frequency API calls with RAG/vector search
- **Multi-tenant Architecture**: Proper isolation under load
- **Database**: Connection pool management and query performance

### Architecture

```
load-tests/
├── artillery/
│   ├── artillery.config.yml          # Main Artillery configuration
│   ├── scenarios/                    # Test scenario definitions
│   │   ├── chat-load.yml             # RAG chat system load test
│   │   ├── video-upload-load.yml     # Video upload pipeline test
│   │   ├── auth-load.yml             # Authentication flow test
│   │   ├── database-load.yml         # Database connection pool test
│   │   └── api-rate-limit-test.yml   # Rate limit validation
│   └── processors/                   # Custom JavaScript processors
│       ├── test-data-processor.js    # Generic test data generation
│       ├── chat-processor.js         # Chat-specific logic
│       └── video-processor.js        # Video upload logic
├── data/                             # Test data storage
├── scripts/                          # Execution and utility scripts
│   ├── run-load-test.sh             # Bash execution script
│   ├── run-load-test.ps1            # PowerShell execution script
│   ├── generate-test-data.ts        # Generate realistic test data
│   └── monitor-metrics.ts           # Real-time metrics monitoring
├── results/                          # Test results and reports
└── README.md                         # This file
```

## Quick Start

### Prerequisites

1. **Node.js 18+** and npm installed
2. **Environment variables** configured (see `.env.example`)
3. **Supabase** instance running (local or cloud)
4. **Test data** generated (or use production-like data)

### Installation

```bash
# Install dependencies (already done if npm install ran in root)
npm install

# Generate test data
npm run load-test:generate-data

# Verify setup
npm run load-test:verify
```

### Run Your First Test

```bash
# Run chat load test (Linux/Mac)
./load-tests/scripts/run-load-test.sh chat-load

# Or PowerShell (Windows)
.\load-tests\scripts\run-load-test.ps1 chat-load

# Or using npm scripts
npm run load-test:chat
```

## Test Scenarios

### 1. Chat Load Test (`chat-load.yml`)

**Purpose**: Test the RAG chat system with vector search under concurrent load

**Scenarios**:
- Complete conversation flow (70% of traffic)
- Quick single questions (30% of traffic)

**Load Profile**:
- Warm-up: 5-10 users/sec for 60s
- Normal: 20 users/sec, max 100 concurrent
- Peak: 50 users/sec, max 500 concurrent
- Stress: 100 users/sec, max 1000 concurrent

**Key Metrics**:
- Response time (p95 < 5s, p99 < 10s)
- Chat session management
- Vector search performance
- CHRONOS token rewards
- Rate limit enforcement

**Run**:
```bash
npm run load-test:chat
```

### 2. Video Upload Load Test (`video-upload-load.yml`)

**Purpose**: Test the video upload pipeline with concurrent uploads

**Scenarios**:
- Complete upload flow (80% of traffic)
- Bulk uploads (20% of traffic)

**Load Profile**:
- Warm-up: 1-5 uploads/min for 2 minutes
- Normal: 5 concurrent uploads for 10 minutes
- Peak: 10 concurrent uploads for 15 minutes
- Stress: 20 concurrent uploads for 30 minutes

**Key Metrics**:
- Upload URL generation time
- Storage limit enforcement
- Processing queue depth
- Processing completion rate
- File size handling (5-25MB)

**Run**:
```bash
npm run load-test:video
```

### 3. Authentication Load Test (`auth-load.yml`)

**Purpose**: Test authentication flow under burst and sustained load

**Scenarios**:
- Complete OAuth flow (60%)
- Session refresh (30%)
- Logout flow (10%)

**Load Profile**:
- Login burst: 50-100 logins/sec for 60s
- Sustained: 30 logins/sec for 5 minutes
- Spike: 200 logins/sec for 2 minutes

**Key Metrics**:
- Auth response time (p95 < 2s)
- Session creation/validation
- Token refresh handling
- Concurrent session management

**Run**:
```bash
npm run load-test:auth
```

### 4. Database Load Test (`database-load.yml`)

**Purpose**: Test Supabase connection pool and query performance

**Scenarios**:
- Heavy read operations (50%)
- Vector search load (30%)
- Mixed read/write (20%)

**Load Profile**:
- Pool fill: 10-30 connections over 2 minutes
- High load: 50 req/sec, 200 concurrent
- Stress: 100 req/sec, 500 concurrent

**Key Metrics**:
- Connection pool usage
- Query performance degradation
- Vector search latency
- Connection recovery

**Run**:
```bash
npm run load-test:database
```

### 5. Rate Limit Test (`api-rate-limit-test.yml`)

**Purpose**: Validate rate limit enforcement across all tiers

**Scenarios**:
- Basic tier (10 req/min)
- Pro tier (50 req/min)
- Enterprise tier (unlimited)

**Expected Behavior**:
- Basic users hit 429 after 10 requests
- Pro users hit 429 after 50 requests
- Enterprise users never hit limits

**Run**:
```bash
npm run load-test:rate-limits
```

## Performance Targets

### Response Times

| Endpoint | p50 | p95 | p99 | Notes |
|----------|-----|-----|-----|-------|
| Chat API | <2s | <5s | <10s | Includes vector search + AI generation |
| Video Upload URL | <500ms | <1s | <2s | Presigned URL generation only |
| Auth Flow | <1s | <2s | <5s | OAuth callback |
| Dashboard Load | <1s | <3s | <5s | Multiple queries |
| Vector Search | <500ms | <2s | <5s | 10k+ vectors |

### Error Rates

- **Normal Load**: <0.5% errors
- **Peak Load**: <1% errors
- **Stress Test**: <2% errors

### Database

- **Connection Pool**: Never exceed 80% capacity
- **Slow Queries**: <1% of queries >1s
- **Deadlocks**: 0 occurrences

### Processing

- **Video Processing**: <5min per hour of video
- **Queue Depth**: <50 videos during peak
- **Failure Rate**: <2% processing failures

## Running Tests

### Environment Setup

Create a `.env.test` file or export variables:

```bash
# Target environment
TARGET_URL=https://your-app.vercel.app

# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_key
SUPABASE_SERVICE_ROLE_KEY=your_service_key

# Optional: AI API keys for realistic tests
ANTHROPIC_API_KEY=your_key
OPENAI_API_KEY=your_key
```

### Generate Test Data

Before running tests, generate realistic test data:

```bash
# Generate 10 creators, 200 students, 100 videos
npm run load-test:generate-data

# Or using the script directly
npx tsx load-tests/scripts/generate-test-data.ts
```

### Run Individual Tests

```bash
# Chat load test
npm run load-test:chat

# Video upload test
npm run load-test:video

# Authentication test
npm run load-test:auth

# Database test
npm run load-test:database

# Rate limit test
npm run load-test:rate-limits
```

### Run All Tests (Sequential)

```bash
npm run load-test:all
```

### Custom Test Configuration

You can override configuration via environment variables:

```bash
# Change target URL
TARGET_URL=https://staging.example.com npm run load-test:chat

# Adjust load levels
DURATION=600 ARRIVAL_RATE=50 npm run load-test:chat

# Skip report opening
OPEN_REPORT=false npm run load-test:chat
```

### Monitor Metrics in Real-Time

Run the metrics monitor in a separate terminal:

```bash
npm run load-test:monitor
```

This displays live metrics including:
- Database connection count
- API response times
- Cache hit rates
- Processing queue depth

## Interpreting Results

### HTML Report

After each test, an HTML report is generated in `load-tests/results/`.

**Key Sections**:
1. **Summary**: Overall pass/fail, request counts, error rates
2. **Response Times**: Histogram and percentile distribution
3. **Request Rate**: Requests per second over time
4. **Errors**: Error breakdown by type and status code
5. **Custom Metrics**: Application-specific metrics

### JSON Results

Raw data is saved as JSON for programmatic analysis:

```json
{
  "aggregate": {
    "requestsCompleted": 10000,
    "latency": {
      "min": 150,
      "max": 12500,
      "median": 2100,
      "p95": 4800,
      "p99": 9200
    },
    "codes": {
      "200": 9850,
      "429": 100,
      "500": 50
    }
  }
}
```

### Performance Analysis

#### Good Performance Indicators

✅ Response times within targets
✅ Error rate < 1%
✅ No connection pool exhaustion
✅ Stable memory usage
✅ Processing queue stays manageable

#### Warning Signs

⚠️ P95 response time trending upward
⚠️ Error rate 1-5%
⚠️ Connection pool >80% utilized
⚠️ Cache hit rate declining
⚠️ Processing queue growing

#### Critical Issues

❌ P95 response time >2x target
❌ Error rate >5%
❌ Connection pool exhausted
❌ Out of memory errors
❌ Processing queue unbounded growth

### Bottleneck Identification

1. **High Response Times + Low CPU**: Database bottleneck
2. **High Response Times + High CPU**: AI API or compute bottleneck
3. **Increasing Error Rate**: Rate limits or resource exhaustion
4. **Growing Queue Depth**: Processing capacity insufficient
5. **Connection Errors**: Database connection limit reached

## Troubleshooting

### Common Issues

#### 1. Connection Refused

```
Error: connect ECONNREFUSED
```

**Solution**: Ensure target URL is correct and server is running

```bash
curl -I http://localhost:3000
```

#### 2. Rate Limit Errors

```
429 Too Many Requests
```

**Solution**: This may be expected behavior. Check if:
- Test is designed to test rate limits
- Rate limit config matches your tier
- Redis/KV is properly configured

#### 3. Database Connection Errors

```
Error: remaining connection slots reserved
```

**Solution**: Increase Supabase connection pool or reduce concurrent users

#### 4. Out of Memory

```
JavaScript heap out of memory
```

**Solution**: Increase Node.js memory:

```bash
NODE_OPTIONS="--max-old-space-size=4096" npm run load-test:chat
```

#### 5. Slow Test Execution

**Causes**:
- AI API rate limits (OpenAI, Anthropic)
- Network latency to target
- Insufficient local resources

**Solutions**:
- Use local/staging environment for tests
- Reduce concurrent user counts
- Use mock AI responses

### Debug Mode

Run tests with verbose logging:

```bash
DEBUG=artillery:* npm run load-test:chat
```

### Verify Test Setup

```bash
# Check Artillery installation
npx artillery --version

# Validate scenario file
npx artillery validate load-tests/artillery/scenarios/chat-load.yml

# Quick smoke test (10 users for 30s)
npx artillery quick --count 10 --num 30 http://localhost:3000/api/health
```

## Best Practices

### 1. Start Small

Run tests with reduced load first:
- 10% of target load
- Shorter duration (2-5 minutes)
- Verify metrics are being collected

### 2. Gradual Ramp-Up

Always include warm-up phases:
- Allows connection pools to fill
- Stabilizes caches
- Prevents false positives

### 3. Isolated Testing

Test one scenario at a time:
- Easier to identify bottlenecks
- Cleaner metrics
- More reproducible results

### 4. Baseline Metrics

Establish baseline before optimizations:
- Document current performance
- Use as comparison point
- Track improvements over time

### 5. Production-Like Environment

Test in environments that match production:
- Same database tier
- Same connection limits
- Similar network latency

### 6. Clean State

Reset test data between runs:
- Consistent starting conditions
- Reproducible results
- Prevents data accumulation issues

```bash
npm run load-test:cleanup
npm run load-test:generate-data
```

## Continuous Integration

### GitHub Actions Example

```yaml
name: Load Tests

on:
  schedule:
    - cron: '0 2 * * *'  # Daily at 2 AM
  workflow_dispatch:

jobs:
  load-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'

      - run: npm install
      - run: npm run load-test:generate-data
      - run: npm run load-test:all

      - name: Upload Results
        uses: actions/upload-artifact@v3
        with:
          name: load-test-results
          path: load-tests/results/
```

## Additional Resources

- [Artillery Documentation](https://www.artillery.io/docs)
- [Performance Testing Best Practices](https://www.artillery.io/docs/guides/guides/best-practices)
- [Supabase Performance Tips](https://supabase.com/docs/guides/database/performance)
- [Next.js Performance](https://nextjs.org/docs/app/building-your-application/optimizing)

## Support

For issues or questions:
1. Check [Troubleshooting](#troubleshooting) section
2. Review Artillery logs
3. Open an issue with:
   - Test scenario used
   - Error messages
   - System specs
   - Load test results JSON

---

**Last Updated**: 2025-10-27
**Artillery Version**: Latest
**Node Version**: 18+
