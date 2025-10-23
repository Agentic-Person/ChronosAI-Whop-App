# Whop Integration Testing Guide

## Overview

This guide provides comprehensive testing procedures for the Whop MVP integration Phase 1. It covers OAuth flows, webhook handling, multi-tenant RAG isolation, and MCP server connectivity.

**Testing Branch:** `whop-mvp-phase1`

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Test Environment Setup](#test-environment-setup)
3. [OAuth Flow Testing](#oauth-flow-testing)
4. [Webhook Testing](#webhook-testing)
5. [Multi-Tenant RAG Isolation Testing](#multi-tenant-rag-isolation-testing)
6. [MCP Server Connectivity Testing](#mcp-server-connectivity-testing)
7. [Creator Dashboard Testing](#creator-dashboard-testing)
8. [Security Testing](#security-testing)
9. [Performance Testing](#performance-testing)
10. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Required Accounts
- Whop developer account with test environment access
- Access to Whop dashboard at https://dash.whop.com
- Supabase project with all migrations applied
- Test Whop products and plans configured

### Environment Variables Required
```bash
# Whop Configuration
WHOP_API_KEY=your_api_key_here
WHOP_CLIENT_ID=your_client_id_here
WHOP_CLIENT_SECRET=your_client_secret_here
WHOP_WEBHOOK_SECRET=your_webhook_secret_here

# Token Encryption (32 bytes hex)
WHOP_TOKEN_ENCRYPTION_KEY=generate_with_openssl_rand_hex_32

# Plan Mapping (optional)
WHOP_BASIC_PLAN_IDS=plan_xxx,plan_yyy
WHOP_PRO_PLAN_IDS=plan_zzz
WHOP_ENTERPRISE_PLAN_IDS=plan_aaa

# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### Generate Encryption Key
```bash
# Generate a secure 32-byte encryption key
openssl rand -hex 32
```

---

## Test Environment Setup

### 1. Install Dependencies
```bash
npm install
npm install --save-dev @types/jest jest-mock
```

### 2. Apply Database Migrations
```bash
npm run db:migrate
```

### 3. Configure Whop MCP Server

**Location:** `~/.mcp/servers/whop/`

Create or verify the MCP server configuration:

```bash
# Check if MCP server exists
ls ~/.mcp/servers/whop/

# Expected files:
# - index.ts (MCP server implementation)
# - package.json
```

### 4. Start Development Server
```bash
npm run dev
```

Server should start on `http://localhost:3000`

### 5. Verify Database Connection
```bash
# Check Supabase connection
curl http://localhost:3000/api/health
```

Expected response:
```json
{
  "status": "healthy",
  "database": "connected",
  "timestamp": "2025-10-23T..."
}
```

---

## OAuth Flow Testing

### Test 1: Authorization URL Generation

**Objective:** Verify OAuth authorization URL is correctly formatted

**Steps:**
1. Navigate to login page: `http://localhost:3000/auth/login`
2. Click "Sign in with Whop" button
3. Verify redirect to Whop OAuth page

**Expected Result:**
- URL should be: `https://whop.com/oauth?client_id=xxx&redirect_uri=xxx&response_type=code&scope=openid+profile+email+memberships&state=xxx`
- State parameter should be present (64 hex characters)

**Verification:**
```bash
# Check state parameter format
node -e "console.log('Valid state:', /^[a-f0-9]{64}$/.test('your_state_here'))"
```

### Test 2: OAuth Callback Handling

**Objective:** Verify OAuth callback correctly exchanges code for tokens

**Steps:**
1. Complete OAuth flow through Whop
2. After authorization, verify redirect to callback URL
3. Check browser developer console for errors
4. Verify user is redirected to dashboard

**Expected Result:**
- Successful redirect to `/dashboard/creator` or `/dashboard/student`
- No console errors
- Session cookie is set

**Verification:**
```bash
# Check for session in Supabase
# In Supabase SQL editor:
SELECT whop_user_id, email, membership_valid, current_plan
FROM creators
ORDER BY created_at DESC
LIMIT 5;
```

### Test 3: Token Storage and Encryption

**Objective:** Verify tokens are encrypted in database

**Steps:**
1. Complete OAuth flow
2. Query database for stored tokens

**Verification:**
```sql
-- Check that tokens are encrypted (should look like hex:hex:hex format)
SELECT
  whop_user_id,
  substring(access_token, 1, 50) as token_preview,
  LENGTH(access_token) as token_length
FROM creators
WHERE access_token IS NOT NULL
LIMIT 1;
```

**Expected Result:**
- Token should NOT be readable plaintext
- Format should be: `<32_hex>:<32_hex>:<encrypted_data>`
- Length should be > 100 characters

### Test 4: CSRF Protection

**Objective:** Verify state parameter prevents CSRF attacks

**Steps:**
1. Start OAuth flow and capture state parameter
2. Attempt to complete callback with wrong state parameter:
   ```
   http://localhost:3000/api/auth/whop/callback?code=xxx&state=invalid_state
   ```

**Expected Result:**
- Error response: `Invalid state parameter`
- Status code: 400
- User is NOT authenticated

### Test 5: Token Refresh

**Objective:** Verify expired tokens are automatically refreshed

**Steps:**
1. Login and complete OAuth flow
2. Manually expire token in database:
   ```sql
   UPDATE creators
   SET expires_at = NOW() - INTERVAL '1 hour'
   WHERE whop_user_id = 'your_user_id';
   ```
3. Make authenticated API request: `GET /api/creator/videos`
4. Check that request succeeds

**Expected Result:**
- Request succeeds
- New token is stored in database
- `expires_at` is updated to future timestamp

**Verification:**
```sql
SELECT whop_user_id, expires_at > NOW() as is_valid
FROM creators
WHERE whop_user_id = 'your_user_id';
```

### Test 6: Session Validation

**Objective:** Verify invalid sessions are rejected

**Steps:**
1. Clear session cookies in browser
2. Attempt to access protected route: `/api/creator/videos`

**Expected Result:**
- Status code: 401
- Error message: "Unauthorized: Invalid or missing membership"

---

## Webhook Testing

### Test 1: Webhook Signature Verification

**Objective:** Verify webhook signatures are validated correctly

**Setup:**
1. Get webhook secret from environment: `WHOP_WEBHOOK_SECRET`
2. Use Whop dashboard to configure webhook URL: `https://your-domain.com/api/webhooks/whop`

**Test with Valid Signature:**
```bash
# Create test payload
PAYLOAD='{"id":"evt_test_123","type":"membership.created","data":{"id":"mem_123","user_id":"user_123","plan_id":"plan_basic"}}'
TIMESTAMP=$(date +%s)
SECRET="your_webhook_secret"

# Generate signature
SIGNATURE=$(echo -n "${TIMESTAMP}.${PAYLOAD}" | openssl dgst -sha256 -hmac "$SECRET" | awk '{print $2}')

# Send webhook
curl -X POST http://localhost:3000/api/webhooks/whop \
  -H "Content-Type: application/json" \
  -H "X-Whop-Signature: $SIGNATURE" \
  -H "X-Whop-Timestamp: $TIMESTAMP" \
  -d "$PAYLOAD"
```

**Expected Result:**
```json
{
  "success": true,
  "message": "Webhook processed successfully"
}
```

**Test with Invalid Signature:**
```bash
curl -X POST http://localhost:3000/api/webhooks/whop \
  -H "Content-Type: application/json" \
  -H "X-Whop-Signature: invalid_signature" \
  -H "X-Whop-Timestamp: $(date +%s)" \
  -d "$PAYLOAD"
```

**Expected Result:**
- Status code: 401
- Error message: "Invalid webhook signature"

### Test 2: Webhook Idempotency

**Objective:** Verify duplicate webhooks are not processed twice

**Steps:**
1. Send webhook event with ID: `evt_test_duplicate_123`
2. Verify event is processed successfully
3. Send same webhook event again (same ID)
4. Verify event is not processed again

**Verification:**
```sql
-- Check that only one event is recorded
SELECT COUNT(*) as event_count
FROM analytics_events
WHERE event_type = 'whop_webhook'
AND event_data->>'webhook_type' = 'membership.created'
AND id = 'evt_test_duplicate_123';
```

**Expected Result:**
- First request: `{ "success": true, "processed": true }`
- Second request: `{ "success": true, "processed": false, "message": "Event already processed" }`
- Count in database: 1

### Test 3: Membership Created Event

**Objective:** Verify membership creation provisions access correctly

**Test Payload:**
```json
{
  "id": "evt_membership_created_test",
  "type": "membership.created",
  "data": {
    "id": "mem_test_123",
    "user_id": "user_test_456",
    "plan_id": "plan_pro",
    "status": "active",
    "product": {
      "company_id": "company_test_789",
      "name": "Test Course Platform"
    }
  }
}
```

**Send Event:**
```bash
# Generate proper signature and timestamp
# ... (use script from Test 1)

curl -X POST http://localhost:3000/api/webhooks/whop \
  -H "Content-Type: application/json" \
  -H "X-Whop-Signature: $SIGNATURE" \
  -H "X-Whop-Timestamp: $TIMESTAMP" \
  -d '<payload>'
```

**Verification:**
```sql
-- Check creator was provisioned
SELECT
  whop_user_id,
  subscription_tier,
  membership_valid,
  company_name
FROM creators
WHERE whop_user_id = 'user_test_456';

-- Check analytics event
SELECT event_type, event_data
FROM analytics_events
WHERE event_type = 'membership_activated'
ORDER BY created_at DESC
LIMIT 1;
```

**Expected Result:**
- Creator record created with correct tier
- `membership_valid` = true
- Analytics event logged

### Test 4: Membership Expired Event

**Objective:** Verify membership expiration revokes access

**Test Payload:**
```json
{
  "id": "evt_membership_expired_test",
  "type": "membership.deleted",
  "data": {
    "id": "mem_test_123",
    "user_id": "user_test_456"
  }
}
```

**Verification:**
```sql
-- Check membership was revoked
SELECT membership_valid
FROM creators
WHERE whop_user_id = 'user_test_456';
```

**Expected Result:**
- `membership_valid` = false
- User cannot access protected resources

### Test 5: Timestamp Validation

**Objective:** Verify old webhooks are rejected (replay attack prevention)

**Steps:**
1. Create webhook with old timestamp (> 5 minutes ago)
2. Send webhook with valid signature but old timestamp

```bash
# 10 minutes ago
OLD_TIMESTAMP=$(($(date +%s) - 600))

# Generate signature with old timestamp
SIGNATURE=$(echo -n "${OLD_TIMESTAMP}.${PAYLOAD}" | openssl dgst -sha256 -hmac "$SECRET" | awk '{print $2}')

curl -X POST http://localhost:3000/api/webhooks/whop \
  -H "X-Whop-Signature: $SIGNATURE" \
  -H "X-Whop-Timestamp: $OLD_TIMESTAMP" \
  -d "$PAYLOAD"
```

**Expected Result:**
- Status code: 401
- Error message: "Webhook timestamp is too old"

### Test 6: Using Whop Dashboard Test Events

**Objective:** Test webhooks using real Whop dashboard

**Steps:**
1. Login to Whop dashboard: https://dash.whop.com
2. Navigate to **Settings > Developers > Webhooks**
3. Add webhook endpoint: `https://your-domain.vercel.app/api/webhooks/whop`
4. Click "Send test event"
5. Select event type: `membership.created`
6. Click "Send"

**Verification:**
- Check webhook logs in Whop dashboard (should show 200 status)
- Check application logs
- Verify database records were created

---

## Multi-Tenant RAG Isolation Testing

### Test 1: Creator Isolation - Video Upload

**Objective:** Verify creators can only access their own videos

**Setup:**
1. Create two test creator accounts:
   - Creator A (whop_user_id: `creator_a_test`)
   - Creator B (whop_user_id: `creator_b_test`)

**Steps:**
1. Login as Creator A
2. Upload a video: `POST /api/creator/videos/upload`
3. Note the video ID returned
4. Logout and login as Creator B
5. Attempt to access Creator A's video: `GET /api/creator/videos/{video_id}`

**Expected Result:**
- Creator B receives 403 Forbidden
- Error message: "You do not have permission to access this video"

**Verification:**
```sql
-- Check RLS policies are working
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims.sub = 'creator_b_test';

SELECT * FROM videos WHERE creator_id = 'creator_a_test';
-- Should return empty result
```

### Test 2: RAG Search Isolation

**Objective:** Verify chat search only returns results from creator's content

**Setup:**
1. Creator A uploads video: "Introduction to Python"
2. Creator B uploads video: "Introduction to JavaScript"

**Test as Creator A's Student:**
```bash
curl -X POST http://localhost:3000/api/student/chat \
  -H "Authorization: Bearer <creator_a_student_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "What is the introduction about?",
    "sessionId": "test_session_a"
  }'
```

**Expected Result:**
- Response references "Python" content
- NO references to "JavaScript" content

**Test as Creator B's Student:**
```bash
curl -X POST http://localhost:3000/api/student/chat \
  -H "Authorization: Bearer <creator_b_student_token>" \
  -d '{
    "message": "What is the introduction about?",
    "sessionId": "test_session_b"
  }'
```

**Expected Result:**
- Response references "JavaScript" content
- NO references to "Python" content

### Test 3: Vector Search Isolation

**Objective:** Verify pgvector searches respect creator boundaries

**Verification:**
```sql
-- Test vector search for Creator A
SELECT
  vc.id,
  vc.content,
  v.title,
  v.creator_id,
  1 - (vc.embedding <=> '[0.1, 0.2, ...]'::vector) as similarity
FROM video_chunks vc
JOIN videos v ON v.id = vc.video_id
WHERE v.creator_id = 'creator_a_test'
ORDER BY similarity DESC
LIMIT 5;

-- Should only return Creator A's content
```

### Test 4: Student Data Isolation

**Objective:** Verify students can only see their own progress

**Setup:**
1. Student A (belongs to Creator A) completes video: `video_a_1`
2. Student B (belongs to Creator A) completes video: `video_a_2`

**Steps:**
1. Login as Student A
2. Request progress: `GET /api/student/progress`
3. Verify only Student A's progress is returned

**Expected Result:**
```json
{
  "completed_videos": ["video_a_1"],
  "total_watch_time": 300,
  "quiz_scores": [...]
}
```

Should NOT include Student B's data.

### Test 5: Cross-Tenant API Access

**Objective:** Verify API endpoints reject cross-tenant access

**Test Matrix:**

| Endpoint | Creator A Token | Creator B Token | Expected |
|----------|----------------|----------------|----------|
| GET /api/creator/videos | Creator A videos | 401 | Pass |
| GET /api/creator/students | Creator A students | 401 | Pass |
| POST /api/student/chat | Creator A context | 401 | Pass |

**Example Test:**
```bash
# Get Creator A's auth token
TOKEN_A="creator_a_token_here"

# Attempt to access with Creator B's user ID in request
curl -X GET http://localhost:3000/api/creator/videos \
  -H "Authorization: Bearer $TOKEN_A" \
  -H "X-Creator-ID: creator_b_test"
```

**Expected Result:**
- Status code: 401 or 403
- Error message indicates unauthorized access

---

## MCP Server Connectivity Testing

### Test 1: MCP Server Health Check

**Objective:** Verify MCP server is running and accessible

**Steps:**
```bash
# Check MCP server process
ps aux | grep mcp

# Test MCP connection
node -e "
const { MCPClient } = require('@modelcontextprotocol/sdk/client/index.js');
const client = new MCPClient({ name: 'test', version: '1.0.0' });
console.log('MCP client initialized');
"
```

**Expected Result:**
- MCP server process is running
- No connection errors

### Test 2: MCP Tool Discovery

**Objective:** Verify all required Whop tools are available

**Test Script:** `scripts/test-mcp-tools.ts`
```typescript
import { connectToMCPServer, listAvailableTools } from '@/lib/whop/mcp/client';

async function testMCPTools() {
  const tools = await listAvailableTools();

  const requiredTools = [
    'mcp__whop__get_company_info',
    'mcp__whop__get_product',
    'mcp__whop__list_products',
    'mcp__whop__get_membership',
    'mcp__whop__validate_membership',
    'mcp__whop__get_user',
  ];

  const missing = requiredTools.filter(tool => !tools.includes(tool));

  if (missing.length > 0) {
    console.error('Missing tools:', missing);
    process.exit(1);
  }

  console.log('All required MCP tools available');
}

testMCPTools();
```

**Run Test:**
```bash
tsx scripts/test-mcp-tools.ts
```

**Expected Result:**
```
All required MCP tools available
```

### Test 3: MCP API Call - Get Company Info

**Objective:** Verify MCP can call Whop API successfully

**Test:**
```bash
# In Node REPL or test script
curl -X POST http://localhost:3000/api/test/mcp \
  -H "Content-Type: application/json" \
  -d '{"tool": "get_company_info"}'
```

**Expected Result:**
```json
{
  "success": true,
  "data": {
    "id": "company_xxx",
    "name": "Your Company",
    "email": "contact@company.com"
  }
}
```

### Test 4: MCP Error Handling

**Objective:** Verify graceful error handling when MCP server is down

**Steps:**
1. Stop MCP server process
2. Attempt API call that uses MCP
3. Verify error response

**Expected Result:**
- Status code: 503 (Service Unavailable)
- Error message: "MCP service unavailable"
- Application does not crash

### Test 5: MCP Connection Pool

**Objective:** Verify MCP client reuses connections efficiently

**Test Script:**
```typescript
import { getCompanyInfo } from '@/lib/whop/mcp/client';

async function testConnectionReuse() {
  const start = Date.now();

  // Make multiple calls
  await Promise.all([
    getCompanyInfo(),
    getCompanyInfo(),
    getCompanyInfo(),
  ]);

  const duration = Date.now() - start;
  console.log(`3 calls completed in ${duration}ms`);

  // Should be fast (< 1000ms) if connection is reused
  if (duration > 1000) {
    console.warn('Connection reuse may not be working');
  }
}
```

**Expected Result:**
- Duration < 1000ms
- No connection errors

---

## Creator Dashboard Testing

### Test 1: Video Management

**Checklist:**
- [ ] Can upload video (UI and API)
- [ ] Video appears in video list
- [ ] Can edit video metadata
- [ ] Can delete video (soft delete)
- [ ] Deleted videos don't appear in search
- [ ] Video player loads correctly

**Steps:**
1. Login as creator
2. Navigate to `/dashboard/creator/videos`
3. Click "Upload Video"
4. Select test video file
5. Fill in metadata (title, description)
6. Click "Upload"

**Expected Result:**
- Progress bar shows upload progress
- Video appears in list after processing
- Thumbnail is generated
- Transcript is available

### Test 2: Student Management

**Checklist:**
- [ ] Can view list of students
- [ ] Can see student progress
- [ ] Can filter students by progress
- [ ] Can export student data
- [ ] Student search works correctly

**Steps:**
1. Navigate to `/dashboard/creator/students`
2. Verify student list loads
3. Click on a student to view details
4. Check progress chart displays correctly

### Test 3: Analytics Dashboard

**Checklist:**
- [ ] Total views displayed correctly
- [ ] Watch time chart renders
- [ ] Completion rate calculated correctly
- [ ] Top videos shown
- [ ] Date range filter works

**Test Data Verification:**
```sql
-- Verify analytics data matches dashboard
SELECT
  COUNT(DISTINCT student_id) as total_students,
  SUM(watch_time_seconds) as total_watch_time,
  AVG(completion_percentage) as avg_completion
FROM learning_progress
WHERE creator_id = 'your_creator_id';
```

### Test 4: Quiz Management

**Checklist:**
- [ ] Can generate quiz from video
- [ ] Quiz questions are relevant
- [ ] Can edit quiz questions
- [ ] Can assign quiz to students
- [ ] Quiz results are recorded

### Test 5: Settings Page

**Checklist:**
- [ ] Can update company name
- [ ] Can update branding (logo, colors)
- [ ] Can manage notification preferences
- [ ] Changes persist after page reload
- [ ] Invalid inputs show validation errors

---

## Security Testing

### Test 1: SQL Injection Prevention

**Objective:** Verify parameterized queries prevent SQL injection

**Test Inputs:**
```bash
# Test video search with SQL injection
curl -X GET "http://localhost:3000/api/creator/videos?search=' OR '1'='1"

# Test student filter
curl -X GET "http://localhost:3000/api/creator/students?email=' OR email LIKE '%"
```

**Expected Result:**
- No SQL errors in logs
- No unauthorized data returned
- Query treats input as literal string

### Test 2: XSS Prevention

**Objective:** Verify user inputs are sanitized

**Test:**
1. Create video with title: `<script>alert('XSS')</script>`
2. View video list page
3. Verify script does not execute

**Expected Result:**
- Script tag rendered as text
- No alert popup

### Test 3: CSRF Protection

**Objective:** Verify state-changing requests require valid tokens

**Test:**
```bash
# Attempt state-changing operation without CSRF token
curl -X POST http://localhost:3000/api/creator/videos/delete \
  -H "Content-Type: application/json" \
  -d '{"videoId": "video_123"}'
```

**Expected Result:**
- Status code: 403
- Error: "Invalid CSRF token"

### Test 4: Rate Limiting

**Objective:** Verify rate limits prevent abuse

**Test:**
```bash
# Send 1000 requests rapidly
for i in {1..1000}; do
  curl -X GET http://localhost:3000/api/creator/videos &
done
wait
```

**Expected Result:**
- After ~100 requests: Status 429 (Too Many Requests)
- Error message: "Rate limit exceeded"
- Normal requests resume after cooldown period

### Test 5: Token Expiration

**Objective:** Verify expired tokens are rejected

**Steps:**
1. Get valid auth token
2. Manually expire token in database
3. Attempt API call with expired token

**Expected Result:**
- Status code: 401
- Error: "Token expired"
- User is redirected to login

---

## Performance Testing

### Test 1: Video Processing Speed

**Objective:** Measure video processing pipeline performance

**Test:**
1. Upload 1-hour video
2. Measure time for each stage:
   - Upload complete
   - Transcription complete
   - Embedding generation complete
   - Video ready for search

**Target Performance:**
- Processing time: < 5 minutes per hour of video
- Transcription: < 2 minutes per hour
- Embeddings: < 3 minutes per hour

**Verification:**
```sql
SELECT
  id,
  title,
  duration_seconds,
  processing_status,
  created_at,
  updated_at,
  EXTRACT(EPOCH FROM (updated_at - created_at)) as processing_duration
FROM videos
WHERE processing_status = 'completed'
ORDER BY created_at DESC
LIMIT 10;
```

### Test 2: RAG Search Performance

**Objective:** Measure chat response time

**Test:**
```bash
# Measure time for RAG search query
time curl -X POST http://localhost:3000/api/student/chat \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "message": "Explain the concept discussed in the video",
    "sessionId": "perf_test_session"
  }'
```

**Target Performance:**
- Response time: < 5 seconds (95th percentile)
- Vector search: < 1 second
- LLM generation: < 3 seconds

### Test 3: Dashboard Load Time

**Objective:** Measure dashboard page load performance

**Test:**
1. Open browser DevTools (Network tab)
2. Navigate to `/dashboard/creator`
3. Measure Time to Interactive (TTI)

**Target Performance:**
- Initial load: < 3 seconds
- Time to Interactive: < 4 seconds
- First Contentful Paint: < 1 second

### Test 4: Concurrent Users

**Objective:** Test system under load

**Setup:**
Use Apache Bench or similar tool:

```bash
# 100 concurrent users, 1000 requests
ab -n 1000 -c 100 -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/api/creator/videos
```

**Target Performance:**
- Support 1000+ concurrent users
- Error rate < 1%
- Average response time < 500ms

---

## Troubleshooting

### Issue: OAuth Callback Fails

**Symptoms:**
- Error: "Invalid state parameter"
- Redirect fails after Whop authorization

**Solutions:**
1. Check that redirect URI matches exactly in Whop dashboard
2. Verify state parameter is stored in session/cookie
3. Check for strict cookie settings (SameSite, Secure)
4. Clear browser cookies and try again

### Issue: Webhook Signature Verification Fails

**Symptoms:**
- All webhooks return 401
- Error: "Invalid webhook signature"

**Solutions:**
1. Verify `WHOP_WEBHOOK_SECRET` is correct
2. Check timestamp format (should be Unix seconds, not milliseconds)
3. Ensure payload is sent as raw JSON (not stringified)
4. Test signature generation with provided script

**Debug Script:**
```bash
# Test signature generation
PAYLOAD='{"test":"data"}'
TIMESTAMP=$(date +%s)
SECRET="your_secret"

echo "Payload: $PAYLOAD"
echo "Timestamp: $TIMESTAMP"
echo "Secret: $SECRET"

SIGNATURE=$(echo -n "${TIMESTAMP}.${PAYLOAD}" | openssl dgst -sha256 -hmac "$SECRET" | awk '{print $2}')
echo "Signature: $SIGNATURE"
```

### Issue: MCP Server Not Connecting

**Symptoms:**
- Error: "Failed to connect to Whop MCP server"
- MCP tool calls timeout

**Solutions:**
1. Check MCP server is running: `ps aux | grep mcp`
2. Verify MCP server path in environment
3. Check MCP server logs: `~/.mcp/servers/whop/logs/`
4. Restart MCP server: `pkill -f mcp && npm run mcp:start`

### Issue: Multi-Tenant Data Leakage

**Symptoms:**
- User sees videos from another creator
- RAG search returns wrong content

**Solutions:**
1. Verify RLS policies are enabled: `SELECT * FROM pg_policies;`
2. Check JWT claims are set correctly
3. Test isolation with SQL script:
   ```sql
   SET LOCAL ROLE authenticated;
   SET LOCAL request.jwt.claims.sub = 'test_user_id';
   SELECT * FROM videos;
   ```
4. Review API middleware for tenant filtering

### Issue: Token Decryption Fails

**Symptoms:**
- Error: "Failed to decrypt tokens"
- Users logged out unexpectedly

**Solutions:**
1. Verify `WHOP_TOKEN_ENCRYPTION_KEY` is exactly 32 bytes (64 hex chars)
2. Check encryption key hasn't changed between deployments
3. Re-generate tokens by forcing re-authentication
4. Check database token format matches expected pattern

### Issue: Slow RAG Search

**Symptoms:**
- Chat responses take > 10 seconds
- Vector search times out

**Solutions:**
1. Check vector index exists: `\d video_chunks` in psql
2. Analyze query performance:
   ```sql
   EXPLAIN ANALYZE
   SELECT * FROM video_chunks
   WHERE embedding <=> '[...]'::vector
   ORDER BY embedding <=> '[...]'::vector
   LIMIT 5;
   ```
3. Consider increasing index lists parameter
4. Check database CPU/memory usage

---

## Test Results Template

### OAuth Flow Test Results
- [ ] Authorization URL Generation: PASS / FAIL
- [ ] Callback Handling: PASS / FAIL
- [ ] Token Storage: PASS / FAIL
- [ ] CSRF Protection: PASS / FAIL
- [ ] Token Refresh: PASS / FAIL
- [ ] Session Validation: PASS / FAIL

### Webhook Test Results
- [ ] Signature Verification: PASS / FAIL
- [ ] Idempotency: PASS / FAIL
- [ ] Membership Created: PASS / FAIL
- [ ] Membership Expired: PASS / FAIL
- [ ] Timestamp Validation: PASS / FAIL
- [ ] Dashboard Test Events: PASS / FAIL

### Multi-Tenant Isolation Test Results
- [ ] Creator Isolation: PASS / FAIL
- [ ] RAG Search Isolation: PASS / FAIL
- [ ] Vector Search Isolation: PASS / FAIL
- [ ] Student Data Isolation: PASS / FAIL
- [ ] Cross-Tenant Access: PASS / FAIL

### MCP Server Test Results
- [ ] Health Check: PASS / FAIL
- [ ] Tool Discovery: PASS / FAIL
- [ ] API Call Success: PASS / FAIL
- [ ] Error Handling: PASS / FAIL
- [ ] Connection Reuse: PASS / FAIL

### Security Test Results
- [ ] SQL Injection Prevention: PASS / FAIL
- [ ] XSS Prevention: PASS / FAIL
- [ ] CSRF Protection: PASS / FAIL
- [ ] Rate Limiting: PASS / FAIL
- [ ] Token Expiration: PASS / FAIL

### Performance Test Results
- Video Processing: _____ minutes per hour
- RAG Search: _____ seconds
- Dashboard Load: _____ seconds
- Concurrent Users: _____ users supported

---

## Automated Testing Commands

```bash
# Run all unit tests
npm test

# Run integration tests
npm run test:integration

# Run specific test suite
npm test -- lib/whop/mcp/__tests__/client.test.ts

# Run tests in watch mode
npm run test:watch

# Generate coverage report
npm test -- --coverage

# Run E2E tests
npm run test:e2e
```

---

## Notes

- Always test in a non-production environment first
- Use test Whop accounts and products
- Document any unexpected behavior
- Report security issues immediately
- Keep test data separate from production data

---

## Support

For issues or questions:
1. Check troubleshooting section
2. Review Whop documentation: https://docs.whop.com
3. Check application logs
4. Contact development team

Last Updated: 2025-10-23
