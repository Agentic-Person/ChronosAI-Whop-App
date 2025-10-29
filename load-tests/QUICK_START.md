# Load Testing Quick Start Guide

Get up and running with load tests in 5 minutes.

## Prerequisites

- ✅ Node.js 18+ installed
- ✅ Environment variables configured (`.env.local`)
- ✅ Supabase instance accessible
- ✅ Target application running (local or deployed)

## Step 1: Generate Test Data (2 minutes)

```bash
npm run load-test:generate-data
```

This creates:
- 10 test creators (across Basic, Pro, Enterprise tiers)
- 200 test students
- 100 test videos with transcripts
- Vector embeddings for RAG search

**Expected output**:
```
🚀 Starting test data generation...
🎭 Generating 10 test creators...
✅ Created 10 creators
👥 Generating students (20 per creator)...
✅ Created 200 students with enrollments
🎥 Generating videos (10 per creator)...
✅ Created 100 videos
📝 Generating video chunks with embeddings...
✅ Created 1500 video chunks
✨ Test data generation complete!
```

## Step 2: Run Your First Load Test (3 minutes)

### Option A: Chat System Test

```bash
npm run load-test:chat
```

Tests the RAG chat system with 100 concurrent users.

### Option B: Quick Smoke Test

```bash
npm run load-test:quick
```

Quick 30-second test with 10 users (good for verifying setup).

### Option C: Specific Scenario

```bash
# Video upload pipeline
npm run load-test:video

# Authentication flow
npm run load-test:auth

# Database connection pool
npm run load-test:database

# Rate limit validation
npm run load-test:rate-limits
```

## Step 3: View Results

After the test completes:

1. **HTML Report** opens automatically in your browser
2. **JSON Results** saved to `load-tests/results/`

### Key Metrics to Check

✅ **Response Times**
- P50 (median)
- P95 (95th percentile)
- P99 (99th percentile)

✅ **Error Rate**
- Should be <1% for normal load
- Check error types in report

✅ **Request Rate**
- Requests per second
- Successful vs failed requests

✅ **Custom Metrics**
- Chat response quality
- Video processing status
- Rate limit hits

## Common Issues & Solutions

### Issue: "Connection Refused"

```
Error: connect ECONNREFUSED 127.0.0.1:3000
```

**Solution**: Make sure your app is running
```bash
# Start dev server in another terminal
npm run dev
```

### Issue: "Database Connection Error"

```
Error: remaining connection slots reserved
```

**Solution**: Your Supabase connection pool is full
1. Upgrade Supabase tier (recommended)
2. Or reduce concurrent users in test scenario

### Issue: "Rate Limit Exceeded"

```
429 Too Many Requests
```

**Solution**: This may be expected behavior for rate limit tests
- Check if running `load-test:rate-limits` (expects 429s)
- Otherwise, increase rate limits in `lib/infrastructure/rate-limiting/rate-limiter.ts`

### Issue: "Out of Memory"

```
JavaScript heap out of memory
```

**Solution**: Increase Node.js memory
```bash
NODE_OPTIONS="--max-old-space-size=4096" npm run load-test:chat
```

## Real-Time Monitoring (Optional)

Open a second terminal and run:

```bash
npm run load-test:monitor
```

This displays live metrics during load tests:
- Database connection count
- API response times
- Cache hit rates
- Processing queue depth
- Error rates

Press Ctrl+C to stop and save metrics.

## Next Steps

### 1. Baseline Your Performance

Run tests and save results for comparison:

```bash
# Run all tests
npm run load-test:all

# Results saved to load-tests/results/
```

### 2. Identify Bottlenecks

Check the [Load Testing Report](../docs/LOAD_TESTING_REPORT.md) for:
- Performance targets
- Known bottlenecks
- Optimization recommendations

### 3. Optimize & Re-test

After making optimizations:

```bash
# Clean old test data
npm run load-test:cleanup

# Generate fresh data
npm run load-test:generate-data

# Re-run tests
npm run load-test:chat
```

Compare results to baseline to validate improvements.

## Understanding Test Phases

Most tests follow this pattern:

### 1. Warm-up Phase (1-2 minutes)
- Gradual ramp-up of users
- Allows connection pools to fill
- Stabilizes caches
- **Purpose**: Avoid false positives from cold starts

### 2. Normal Load Phase (5-10 minutes)
- Steady concurrent users
- Represents typical usage
- **Target**: All metrics within acceptable range

### 3. Peak Load Phase (10-15 minutes)
- Higher concurrent users
- Simulates busy periods (e.g., class start time)
- **Target**: Graceful degradation if any

### 4. Stress Test Phase (optional)
- Maximum concurrent users
- Identifies breaking point
- **Target**: Understand failure modes

### 5. Cool Down Phase (1 minute)
- Gradual decrease in load
- Validates system recovery
- **Target**: Return to normal quickly

## Test Scenario Matrix

| Scenario | Users | Duration | Purpose |
|----------|-------|----------|---------|
| Quick | 10 | 30s | Smoke test |
| Chat (Normal) | 100 | 5min | Typical chat load |
| Chat (Peak) | 500 | 10min | Busy period |
| Chat (Stress) | 1000 | 10min | Breaking point |
| Video Upload | 20-100 | 30min | Upload pipeline |
| Auth Burst | 100/sec | 2min | Login storm |
| Database | 200 | 10min | Query performance |
| Rate Limits | Varies | 5min | Limit enforcement |

## Performance Targets Reference

Quick reference for interpreting results:

### Response Times
- ✅ **Excellent**: P95 < 2s
- ⚠️ **Acceptable**: P95 2-5s
- ❌ **Poor**: P95 > 5s

### Error Rates
- ✅ **Excellent**: <0.5%
- ⚠️ **Acceptable**: 0.5-1%
- ❌ **Poor**: >1%

### Throughput
- ✅ **Excellent**: 100+ req/sec
- ⚠️ **Acceptable**: 50-100 req/sec
- ❌ **Poor**: <50 req/sec

## Cleanup

After testing:

```bash
# Remove test data
npm run load-test:cleanup

# Remove test results (optional)
rm -rf load-tests/results/*
```

## Getting Help

1. Check [Full README](./README.md) for detailed documentation
2. Review [Troubleshooting section](./README.md#troubleshooting)
3. Examine Artillery logs for error details
4. Check Supabase logs for database issues

## Cheat Sheet

```bash
# Setup
npm run load-test:generate-data      # Create test data
npm run load-test:verify              # Validate configuration

# Run tests
npm run load-test:quick               # Quick smoke test
npm run load-test:chat                # Chat load test
npm run load-test:video               # Video upload test
npm run load-test:auth                # Auth flow test
npm run load-test:database            # Database test
npm run load-test:rate-limits         # Rate limit test
npm run load-test:all                 # All tests (sequential)

# Monitor & analyze
npm run load-test:monitor             # Real-time metrics
# View results in load-tests/results/

# Cleanup
npm run load-test:cleanup             # Remove test data
```

---

**Time to First Test**: ~5 minutes
**Time to Full Suite**: ~30 minutes
**Recommended Frequency**: Before every major release
