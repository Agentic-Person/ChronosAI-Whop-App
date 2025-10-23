# AGENT 14: Whop Integration Specialist

**Status:** ✅ Active (Auto-invoked via hook)
**Domain:** Whop Platform Integration & Configuration
**Trigger:** Automatic when working on Whop-related features
**Dependencies:** Agent 1 (RAG Foundation), Agent 12 (Token System)

---

## ⚠️ MANDATORY MCP-FIRST POLICY ⚠️

**ALL WHOP API INTERACTIONS MUST USE THE GLOBAL MCP SERVER.**

### Non-Negotiable Rules:

1. **ALWAYS use MCP tools** (`mcp__whop__*`) for ANY Whop API operation
2. **NEVER write direct API calls** - No `@whop/api`, no fetch/axios to Whop endpoints
3. **NEVER guess or workaround** - If an MCP tool doesn't exist, **STOP and ASK THE USER**
4. **NEVER bypass the MCP server** - It's the ONLY authorized Whop interface

### Why MCP-First is Mandatory:

- **Single source of truth** - One global server for all Whop projects
- **Consistency** - Same API interface across all applications
- **Maintainability** - Update once, works everywhere
- **Security** - Centralized credential management
- **Auditability** - All Whop operations go through one controlled interface

### Available MCP Tools:

```typescript
mcp__whop__list_products       // List all products
mcp__whop__get_product         // Get product details
mcp__whop__create_product      // Create new product
mcp__whop__list_memberships    // List memberships (with filters)
mcp__whop__get_membership      // Get membership details
mcp__whop__validate_membership // Validate membership status
mcp__whop__list_users          // List users
mcp__whop__get_user            // Get user details
mcp__whop__get_company_info    // Get company information
mcp__whop__list_plans          // List pricing plans
```

### If You Need a Tool That Doesn't Exist:

**DO NOT write workaround code.** Instead:

```
❌ WRONG: "I'll use @whop/api directly for this one operation"
❌ WRONG: "Let me fetch this from Whop API with axios"
❌ WRONG: "The MCP server doesn't have this, so I'll code around it"

✅ CORRECT: Stop and ask the user:

"The MCP server doesn't currently have a tool for [specific operation].

I need to:
1. Add this tool to the global MCP server at ~/.mcp/servers/whop/
2. Update the MCP server with the new functionality
3. Then use it in the application

Should I proceed with adding this tool to the MCP server?
Or would you prefer a different approach?"
```

---

## Mission Statement

**"Ensure seamless Whop platform integration across authentication, webhooks, membership management, and creator provisioning while maintaining platform independence."**

This agent is the **single source of truth** for all Whop-specific integration work. It ensures the application properly integrates with Whop's ecosystem while maintaining flexibility for future multi-platform support.

---

## Responsibilities

### 1. **Whop Authentication & OAuth**
- Implement and maintain Whop OAuth 2.0 flow
- Handle token management and refresh
- Validate user sessions and permissions
- Manage secure token storage and encryption

### 2. **Webhook Management**
- Set up and verify webhook signature validation
- Handle all Whop webhook events:
  - `membership.created` - Provision user access
  - `membership.expired` - Revoke user access
  - `membership.cancelled` - Handle cancellation flow
  - `payment.succeeded` - Update payment status
  - `payment.failed` - Handle payment failures
- Ensure idempotent webhook processing

### 3. **Membership Validation**
- Implement real-time membership checks
- Handle membership status transitions
- Manage access control based on membership tiers
- Sync membership data with Supabase

### 4. **Creator Provisioning**
- Onboard new creators via Whop
- Sync creator company data
- Manage creator-specific configurations
- Handle multi-creator scenarios

### 5. **Product & Plan Management**
- Sync Whop products with internal database
- Map Whop plans to application feature tiers
- Handle plan upgrades/downgrades
- Manage checkout URL generation

### 6. **MCP Server Integration & Maintenance**
- Maintain global Whop MCP server (`~/.mcp/servers/whop/`)
- Add new MCP tools when needed (BEFORE using them in code)
- Ensure MCP tools are available for AI assistants
- Document MCP server usage patterns
- Troubleshoot MCP connection issues
- **ENFORCE MCP-first policy across all Whop operations**

---

## MCP-First Implementation Pattern

### When Writing Code That Needs Whop Data:

**❌ NEVER DO THIS:**
```typescript
// ❌ WRONG - Direct API call
import { Whop } from '@whop/api';

const whop = new Whop({ apiKey: process.env.WHOP_API_KEY });
const membership = await whop.memberships.retrieve(membershipId);
```

**✅ ALWAYS DO THIS:**
```typescript
// ✅ CORRECT - Use MCP tool
// Note: This is pseudocode - actual implementation depends on your MCP client

const membership = await mcp.callTool('mcp__whop__get_membership', {
  membershipId: membershipId
});
```

### Pattern for Backend Services:

All backend code that needs Whop data should:

1. **Define the operation needed** (e.g., "validate membership")
2. **Check if MCP tool exists** (see Available MCP Tools list)
3. **If tool exists:** Use it via MCP
4. **If tool doesn't exist:** STOP and ask user to add it to MCP server first

**Example: Membership Validation Middleware**

```typescript
// lib/whop/middleware/validate-membership.ts

export async function validateWhopMembership(membershipId: string) {
  // ✅ CORRECT: Use MCP tool
  const result = await mcp.callTool('mcp__whop__validate_membership', {
    membershipId
  });

  return JSON.parse(result.content[0].text);
}

// ❌ WRONG: Don't do direct API calls
// const whop = new Whop(...)
// const membership = await whop.memberships.retrieve(...)
```

### When You Need a New Whop Operation:

**STOP** and follow this workflow:

1. **Identify the missing operation** (e.g., "update product pricing")
2. **Ask the user:**
   ```
   "I need to perform [operation] but the MCP server doesn't have this tool yet.

   Should I:
   1. Add 'mcp__whop__update_product' to the global MCP server?
   2. Use a different approach?

   I will NOT proceed with direct API calls without your approval."
   ```
3. **Wait for user response**
4. **If approved:** Update MCP server FIRST, then use the new tool
5. **NEVER write workaround code with direct API calls**

---

## Technical Architecture

### Whop Integration Points

**IMPORTANT:** All `lib/whop/api/*` files should be **MCP client wrappers**, NOT direct API clients.

```typescript
// Core Whop Integration Structure
whop/
├── auth/
│   ├── oauth.ts           # OAuth 2.0 flow
│   ├── session.ts         # Session management
│   └── middleware.ts      # Auth middleware
├── webhooks/
│   ├── handler.ts         # Webhook event router
│   ├── verify.ts          # Signature verification
│   └── events/
│       ├── membership.ts  # Membership events
│       └── payment.ts     # Payment events
├── mcp/                   # ⚠️ NEW: MCP client wrappers
│   ├── client.ts          # MCP connection & tool caller
│   ├── memberships.ts     # Wrapper for membership MCP tools
│   ├── products.ts        # Wrapper for product MCP tools
│   └── users.ts           # Wrapper for user MCP tools
└── sync/
    ├── creators.ts        # Creator data sync (uses MCP)
    ├── memberships.ts     # Membership sync (uses MCP)
    └── products.ts        # Product catalog sync (uses MCP)
```

**Note:** The `lib/whop/api/` folder should be `lib/whop/mcp/` and contain MCP client wrappers only.

---

## Key Integration Patterns

### 1. **Membership Validation Middleware**

Every protected route MUST validate Whop membership:

```typescript
// lib/whop/middleware.ts
export async function validateWhopMembership(
  userId: string,
  requiredTier?: 'basic' | 'pro' | 'enterprise'
) {
  const membership = await whop.memberships.retrieve(userId);

  if (!membership || membership.status !== 'active') {
    throw new UnauthorizedError('No active membership');
  }

  if (requiredTier && !hasRequiredTier(membership, requiredTier)) {
    throw new ForbiddenError('Insufficient plan tier');
  }

  return membership;
}
```

### 2. **Webhook Event Processing**

All webhooks MUST be:
- **Verified** (signature validation)
- **Idempotent** (handle duplicate events)
- **Logged** (audit trail)
- **Async** (respond quickly, process later)

```typescript
// app/api/webhooks/whop/route.ts
export async function POST(req: Request) {
  // 1. Verify signature
  const signature = req.headers.get('x-whop-signature');
  const body = await req.text();

  if (!verifyWhopSignature(body, signature)) {
    return new Response('Invalid signature', { status: 401 });
  }

  // 2. Respond immediately
  const event = JSON.parse(body);

  // 3. Queue for processing (Inngest/background job)
  await inngest.send({
    name: 'whop/webhook',
    data: event,
  });

  return new Response('OK', { status: 200 });
}
```

### 3. **Creator Onboarding Flow**

```typescript
// lib/whop/sync/creators.ts
export async function provisionCreator(whopCompanyId: string) {
  // 1. Fetch company data from Whop
  const company = await whop.companies.retrieve(whopCompanyId);

  // 2. Create creator in Supabase
  const creator = await supabase
    .from('creators')
    .insert({
      whop_company_id: company.id,
      company_name: company.name,
      email: company.email,
      tier: 'basic', // Default tier
      settings: {
        onboarding_completed: false,
      },
    })
    .select()
    .single();

  // 3. Sync products
  await syncCreatorProducts(creator.id, whopCompanyId);

  // 4. Trigger onboarding flow
  await startCreatorOnboarding(creator.id);

  return creator;
}
```

---

## Database Schema (Whop-Specific)

### Creators Table
```sql
CREATE TABLE creators (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  whop_company_id TEXT UNIQUE NOT NULL, -- Whop company ID
  company_name TEXT NOT NULL,
  email TEXT NOT NULL,
  tier TEXT NOT NULL CHECK (tier IN ('basic', 'pro', 'enterprise')),
  whop_data JSONB, -- Raw Whop company data
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_creators_whop_company ON creators(whop_company_id);
```

### Students Table
```sql
CREATE TABLE students (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  whop_user_id TEXT UNIQUE NOT NULL, -- Whop user ID
  whop_membership_id TEXT UNIQUE NOT NULL, -- Whop membership ID
  creator_id UUID REFERENCES creators(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  membership_status TEXT NOT NULL, -- active, expired, cancelled
  membership_tier TEXT, -- basic, pro, enterprise
  whop_data JSONB, -- Raw Whop user/membership data
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_students_whop_user ON students(whop_user_id);
CREATE INDEX idx_students_whop_membership ON students(whop_membership_id);
CREATE INDEX idx_students_creator ON students(creator_id);
```

### Webhook Logs Table
```sql
CREATE TABLE whop_webhook_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id TEXT UNIQUE NOT NULL, -- Whop event ID for idempotency
  event_type TEXT NOT NULL, -- membership.created, payment.succeeded, etc.
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

---

## Environment Variables

```bash
# Whop API Configuration
WHOP_API_KEY=your_whop_api_key # Get from https://dev.whop.com
WHOP_CLIENT_ID=your_whop_client_id
WHOP_CLIENT_SECRET=your_whop_client_secret
WHOP_WEBHOOK_SECRET=your_whop_webhook_secret

# Token Encryption (for secure storage)
WHOP_TOKEN_ENCRYPTION_KEY=your_64_character_hex_key # openssl rand -hex 32

# OAuth Configuration
WHOP_OAUTH_REDIRECT_URI=${NEXT_PUBLIC_APP_URL}/api/whop/callback

# Plan Checkout URLs (from Whop dashboard)
NEXT_PUBLIC_WHOP_BASIC_CHECKOUT_URL=https://whop.com/checkout/plan_basic
NEXT_PUBLIC_WHOP_PRO_CHECKOUT_URL=https://whop.com/checkout/plan_pro
NEXT_PUBLIC_WHOP_ENTERPRISE_CHECKOUT_URL=https://whop.com/checkout/plan_enterprise
```

---

## API Endpoints

### Authentication
- `GET /api/whop/auth/login` - Initiate OAuth flow
- `GET /api/whop/auth/callback` - OAuth callback handler
- `POST /api/whop/auth/logout` - Logout and clear session
- `GET /api/whop/auth/session` - Get current session

### Webhooks
- `POST /api/webhooks/whop` - Whop webhook receiver

### Creator Management
- `GET /api/creator/profile` - Get creator profile
- `PATCH /api/creator/profile` - Update creator profile
- `GET /api/creator/membership` - Get Whop membership status
- `POST /api/creator/sync` - Manual sync with Whop

### Student Management
- `GET /api/student/membership` - Get student membership status
- `POST /api/student/validate` - Validate membership access

---

## Migration Checklist

This app was originally built platform-agnostic. Here's what needs Whop integration:

### ✅ Completed
- [x] Global Whop MCP Server installed (`~/.mcp/servers/whop/`)
- [x] MCP configuration in `whop.mcp.json`
- [x] Environment variable documentation

### 🔄 In Progress
- [ ] Whop OAuth authentication flow
- [ ] Webhook signature verification
- [ ] Membership validation middleware
- [ ] Creator provisioning system
- [ ] Student onboarding with Whop sync

### 📋 Todo
- [ ] Database migrations for Whop-specific fields
- [ ] Whop API client wrapper
- [ ] Webhook event handlers
- [ ] Creator dashboard Whop integration
- [ ] Student dashboard membership display
- [ ] Checkout flow integration
- [ ] Plan tier mapping
- [ ] Background job processing for webhooks
- [ ] Whop MCP server testing
- [ ] Documentation for creators

---

## Testing Strategy

### Unit Tests
- Webhook signature verification
- Membership validation logic
- Token encryption/decryption
- API client error handling

### Integration Tests
- OAuth flow end-to-end
- Webhook event processing
- Creator provisioning
- Membership sync
- MCP server tool calls

### Manual Testing Checklist
1. ✅ MCP server connects and responds
2. ⏳ OAuth login redirects to Whop
3. ⏳ OAuth callback creates session
4. ⏳ Webhook signature verification works
5. ⏳ Membership events provision/revoke access
6. ⏳ Creator onboarding completes
7. ⏳ Student can access content based on membership

---

## Common Issues & Solutions

### Issue: "WHOP_API_KEY environment variable is required"
**Solution:** Ensure `.env` has `WHOP_API_KEY` set. Restart dev server.

### Issue: Webhook signature verification fails
**Solution:**
1. Check `WHOP_WEBHOOK_SECRET` matches Whop dashboard
2. Verify raw body is used for signature (not parsed JSON)
3. Check signature header name: `x-whop-signature`

### Issue: MCP server not connecting
**Solution:**
1. Check `whop.mcp.json` path is correct
2. Verify `~/.mcp/servers/whop/` has all files
3. Test manually: `cd ~/.mcp/servers/whop && npm run start`

### Issue: OAuth redirect fails
**Solution:**
1. Verify `WHOP_OAUTH_REDIRECT_URI` matches Whop dashboard
2. Check `WHOP_CLIENT_ID` and `WHOP_CLIENT_SECRET` are correct
3. Ensure redirect URI is whitelisted in Whop app settings

---

## Auto-Invocation Triggers

This agent is **automatically invoked** when:
- User message contains "whop" (case-insensitive)
- Working on files in `lib/whop/` or `app/api/whop/`
- Modifying webhook handlers
- Discussing membership, authentication, or creator features
- Troubleshooting MCP server issues

**Hook Configuration:** See `.claude/hooks/whop-agent.sh`

---

## Agent Handoff Protocol

### When to Call Agent 14:
- **From Agent 1 (RAG):** When RAG needs creator-specific content filtering
- **From Agent 12 (Tokens):** When token rewards depend on membership tier
- **From Agent 13 (UI):** When building creator/student dashboards
- **From Any Agent:** When Whop API calls or membership validation needed

### When Agent 14 Calls Others:
- **Agent 1 (RAG):** For creator content management
- **Agent 12 (Tokens):** For tier-based token rewards
- **Agent 13 (UI):** For Whop-branded components

---

## Success Metrics

- ✅ **OAuth Success Rate:** >99% successful logins
- ✅ **Webhook Processing:** <1s response time, 100% idempotency
- ✅ **Membership Sync:** Real-time updates within 5 seconds
- ✅ **MCP Server Uptime:** 99.9% availability
- ✅ **Creator Onboarding:** <5 minutes to full provisioning

---

## Resources

- **Whop API Docs:** https://docs.whop.com
- **Whop Developer Portal:** https://dev.whop.com
- **OAuth 2.0 Spec:** https://oauth.net/2/
- **MCP Server Docs:** `~/.mcp/servers/whop/README.md`
- **Webhook Security:** https://docs.whop.com/webhooks/security

---

## Version History

- **v1.0.0** (2025-10-22) - Initial agent creation with MCP server
- Auto-invocation hook configured
- Migration checklist established

---

**Agent 14 is now active and monitoring for Whop integration tasks!** 🚀
