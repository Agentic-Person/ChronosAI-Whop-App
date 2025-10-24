# Whop MVP Integration Plan - Phase 1

**Branch:** `whop-mvp-phase1`
**Target:** 4 Core Features (OAuth, Video+RAG, Progress, Creator Dashboard)
**Timeline:** 2-3 weeks
**Agent:** Agent 14 (Whop Integration Specialist)

---

## 🎯 MVP Scope

### Features Included:
1. ✅ **Whop OAuth + Feature Gating** - Foundation
2. ✅ **Video Processing + RAG Chat** - Core value
3. ✅ **Basic Progress Tracking** - Engagement
4. ✅ **Creator Dashboard** - Customer attraction

### Features Excluded (Phase 2+):
- AI Learning Calendar (Phase 2)
- Full Gamification (Phase 2)
- AI Quiz Generation (Phase 2)
- Study Buddy, Discord, Content Intelligence (Phase 3)

---

## 📋 Code Audit Results

### Single-Tenant Assumptions Found:

#### 1. **RAG Engine** (`lib/rag/`)
- ❌ Vector search lacks `creator_id` filtering
- ❌ Chat service doesn't scope by creator
- ❌ No multi-tenant isolation in queries

**Fix Required:**
```typescript
// Add creator_id to all RAG queries
const chunks = await supabase
  .from('video_chunks')
  .select()
  .eq('creator_id', creatorId) // NEW
  .order...
```

#### 2. **Video Processing** (`lib/video/`)
- ❌ Upload handler assumes single creator
- ❌ Chunking/embedding doesn't set `creator_id`
- ❌ No creator context in processing jobs

**Fix Required:**
```typescript
// Pass creator_id through entire pipeline
await processVideo({
  videoId,
  creatorId, // NEW - from Whop company_id
  ...
});
```

#### 3. **Progress System** (`lib/progress/`)
- ⚠️ Partially multi-tenant (has `student_id`)
- ❌ Missing creator_id for cross-creator leaderboards

**Fix Required:**
```typescript
// Scope leaderboards by creator
const leaderboard = await getLeaderboard({
  creatorId, // NEW
  timeframe: '7d'
});
```

#### 4. **Creator Dashboard** (`lib/creator/`)
- ❌ Analytics assume single creator
- ❌ Student management not scoped
- ❌ No Whop company integration

**Fix Required:**
```typescript
// All queries must filter by creator_id
const students = await supabase
  .from('students')
  .select()
  .eq('creator_id', creatorId) // NEW
  ...
```

---

## 🗄️ Database Migrations Needed

### Migration 1: Add Whop Fields to Existing Tables

```sql
-- Add Whop integration to creators table
ALTER TABLE creators
ADD COLUMN whop_company_id TEXT UNIQUE,
ADD COLUMN whop_data JSONB,
ADD COLUMN whop_plan TEXT; -- BASIC, PRO, ENTERPRISE

CREATE INDEX idx_creators_whop_company ON creators(whop_company_id);

-- Add Whop integration to students table
ALTER TABLE students
ADD COLUMN whop_user_id TEXT UNIQUE,
ADD COLUMN whop_membership_id TEXT UNIQUE,
ADD COLUMN membership_status TEXT, -- active, expired, cancelled
ADD COLUMN membership_tier TEXT; -- BASIC, PRO, ENTERPRISE

CREATE INDEX idx_students_whop_user ON students(whop_user_id);
CREATE INDEX idx_students_whop_membership ON students(whop_membership_id);
```

### Migration 2: Create Whop Webhook Logs

```sql
CREATE TABLE whop_webhook_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id TEXT UNIQUE NOT NULL, -- For idempotency
  event_type TEXT NOT NULL, -- membership.created, etc.
  payload JSONB NOT NULL,
  processed BOOLEAN DEFAULT FALSE,
  processed_at TIMESTAMPTZ,
  error TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_webhook_logs_event_id ON whop_webhook_logs(event_id);
CREATE INDEX idx_webhook_logs_event_type ON whop_webhook_logs(event_type);
CREATE INDEX idx_webhook_logs_processed ON whop_webhook_logs(processed);
```

### Migration 3: Add creator_id to Multi-Tenant Tables

```sql
-- Ensure all content is scoped to creators
ALTER TABLE videos
ADD COLUMN IF NOT EXISTS creator_id UUID REFERENCES creators(id) ON DELETE CASCADE;

ALTER TABLE video_chunks
ADD COLUMN IF NOT EXISTS creator_id UUID REFERENCES creators(id) ON DELETE CASCADE;

ALTER TABLE chat_sessions
ADD COLUMN IF NOT EXISTS creator_id UUID REFERENCES creators(id) ON DELETE CASCADE;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_videos_creator ON videos(creator_id);
CREATE INDEX IF NOT EXISTS idx_video_chunks_creator ON video_chunks(creator_id);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_creator ON chat_sessions(creator_id);
```

---

## 🔧 Implementation Tasks

### Task 1: Whop MCP Client Wrapper ⚠️ MCP-FIRST
**File:** `lib/whop/mcp/client.ts`

**CRITICAL:** All Whop API calls MUST go through MCP server.

```typescript
// ✅ CORRECT - MCP client wrapper
export async function callWhopMCP(
  tool: string,
  params: any
): Promise<any> {
  // Connect to global MCP server
  // Call tool: mcp__whop__${tool}
  // Return result
}

// ❌ FORBIDDEN - Direct API usage
// import { Whop } from '@whop/api'; // NEVER DO THIS
```

**Available MCP Tools:**
- `get_company_info`
- `validate_membership`
- `list_memberships`
- `get_user`
- `list_products`

**If a tool is missing:** STOP and ask user to add it to MCP server first.

---

### Task 2: Whop OAuth Implementation
**Files:**
- `app/api/whop/auth/login/route.ts`
- `app/api/whop/auth/callback/route.ts`
- `app/api/whop/auth/logout/route.ts`
- `lib/whop/auth.ts`

**Flow:**
1. User clicks "Login with Whop"
2. Redirect to Whop OAuth (`https://whop.com/oauth`)
3. Whop redirects back to `/api/whop/auth/callback?code=xxx`
4. Exchange code for tokens (using MCP if possible, or OAuth library)
5. Fetch user + membership via MCP: `get_user`, `validate_membership`
6. Create/update `creators` or `students` record
7. Set session cookie
8. Redirect to dashboard

**MCP Usage:**
```typescript
// After OAuth, use MCP to get company info
const company = await callWhopMCP('get_company_info', {});

// Validate membership
const membership = await callWhopMCP('validate_membership', {
  membershipId: whopMembershipId
});
```

---

### Task 3: Membership Validation Middleware
**File:** `lib/whop/middleware/validate-membership.ts`

```typescript
export async function validateWhopMembership(
  req: Request
): Promise<{ valid: boolean; tier: string; creatorId: string }> {
  // 1. Get session from cookie
  // 2. Fetch user's membership_id from DB
  // 3. Call MCP: validate_membership
  // 4. Return validation result + tier
}

// Use in all protected routes
export function withWhopAuth(handler: NextApiHandler) {
  return async (req, res) => {
    const validation = await validateWhopMembership(req);
    if (!validation.valid) {
      return res.status(401).json({ error: 'Invalid membership' });
    }
    req.user = { ...validation };
    return handler(req, res);
  };
}
```

---

### Task 4: Webhook Handlers (Idempotent)
**File:** `app/api/webhooks/whop/route.ts`

```typescript
export async function POST(req: Request) {
  // 1. Verify signature (WHOP_WEBHOOK_SECRET)
  const signature = req.headers.get('x-whop-signature');
  if (!verifySignature(body, signature)) {
    return new Response('Invalid signature', { status: 401 });
  }

  // 2. Parse event
  const event = await req.json();

  // 3. Check for duplicate (idempotency)
  const exists = await supabase
    .from('whop_webhook_logs')
    .select('id')
    .eq('event_id', event.id)
    .single();

  if (exists.data) {
    return new Response('Already processed', { status: 200 });
  }

  // 4. Log event
  await supabase.from('whop_webhook_logs').insert({
    event_id: event.id,
    event_type: event.type,
    payload: event,
  });

  // 5. Process event
  switch (event.type) {
    case 'membership.created':
      await provisionUser(event.data);
      break;
    case 'membership.expired':
      await revokeAccess(event.data);
      break;
  }

  // 6. Mark as processed
  await supabase
    .from('whop_webhook_logs')
    .update({ processed: true, processed_at: new Date() })
    .eq('event_id', event.id);

  return new Response('OK', { status: 200 });
}
```

---

### Task 5: Multi-Tenant RAG Engine
**Files:**
- `lib/rag/vector-search.ts`
- `lib/rag/chat-service.ts`
- `lib/rag/rag-engine.ts`

**Changes:**
```typescript
// Add creator_id to all queries
export async function vectorSearch(params: {
  query: string;
  creatorId: string; // NEW
  limit?: number;
}) {
  const { creatorId, query, limit = 5 } = params;

  // Generate embedding
  const embedding = await generateEmbedding(query);

  // Search with creator filter
  const { data } = await supabase.rpc('match_documents', {
    query_embedding: embedding,
    match_count: limit,
    filter: { creator_id: creatorId } // NEW - Multi-tenant isolation
  });

  return data;
}
```

---

### Task 6: Creator Dashboard Whop Integration
**Files:**
- `app/dashboard/creator/page.tsx`
- `lib/creator/analytics-service.ts`
- `lib/creator/student-management.ts`

**Changes:**
```typescript
// Fetch creator's Whop company data
const creatorId = session.user.creatorId;

// Use MCP to get company info
const company = await callWhopMCP('get_company_info', {});

// All analytics scoped by creator_id
const analytics = await getCreatorAnalytics(creatorId);

// Students filtered by creator
const students = await supabase
  .from('students')
  .select('*')
  .eq('creator_id', creatorId);
```

---

### Task 7: Feature Gating
**Files:**
- `lib/features/feature-flags.ts`
- `lib/middleware/feature-gate.ts`

**Map Whop Plans to Tiers:**
```typescript
const WHOP_PLAN_MAP = {
  'plan_basic_xxx': 'BASIC',
  'plan_pro_yyy': 'PRO',
  'plan_enterprise_zzz': 'ENTERPRISE',
};

export async function getUserTier(userId: string): Promise<string> {
  // Fetch user's Whop membership
  const student = await supabase
    .from('students')
    .select('membership_tier')
    .eq('id', userId)
    .single();

  return student.data.membership_tier || 'BASIC';
}
```

---

## ✅ Testing Checklist

### Manual Testing:
- [ ] Whop OAuth login works
- [ ] Callback creates user in DB
- [ ] Membership validation middleware blocks invalid users
- [ ] Webhook signature verification works
- [ ] `membership.created` provisions user
- [ ] `membership.expired` revokes access
- [ ] Multiple creators can't see each other's content
- [ ] RAG search only returns creator's videos
- [ ] Creator dashboard shows correct students
- [ ] Feature gating enforces tiers

### Integration Testing:
- [ ] Complete OAuth flow with real Whop account
- [ ] Send test webhooks from Whop dashboard
- [ ] Upload video as Creator A, verify Creator B can't see it
- [ ] Chat as Student A, verify can't access Creator B's content

---

## 🚨 MCP-First Reminders

**BEFORE writing ANY Whop API code:**

1. ✅ Check if MCP tool exists (see available tools list)
2. ✅ If exists: Use `callWhopMCP(tool, params)`
3. ❌ If missing: **STOP** and ask user:

```
⚠️ MCP TOOL MISSING

I need to perform: [operation]
Required tool: mcp__whop__[tool_name]
Status: Does not exist

I will NOT write direct API code. Should I:
1. Add this tool to the global MCP server?
2. Use a different approach?
```

4. ✅ Wait for approval
5. ✅ Update MCP server FIRST
6. ✅ Then use the new tool

**NEVER bypass the MCP server.** This is non-negotiable.

---

## 📊 Success Criteria

### Technical:
- ✅ All Whop API calls use MCP tools (ZERO direct API usage)
- ✅ OAuth success rate >99%
- ✅ Membership validation <100ms
- ✅ Webhook processing <1s (idempotent)
- ✅ Content isolation 100% (no cross-creator leaks)
- ✅ Dashboard load <2s

### Business:
- ✅ 2-3 test creators onboarded
- ✅ 10+ test students using platform
- ✅ At least 1 creator in each tier
- ✅ All MVP features working with Whop

---

## 📝 Next Steps

1. ✅ Create database migrations
2. ✅ Implement MCP client wrapper
3. ✅ Build Whop OAuth flow
4. ✅ Add membership validation middleware
5. ✅ Implement webhook handlers
6. ✅ Add multi-tenant filtering to RAG
7. ✅ Integrate Creator Dashboard
8. ✅ Test with real Whop accounts

---

**Ready to begin implementation!** 🚀
