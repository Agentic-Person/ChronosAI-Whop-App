# Whop Agent 14 - Quick Setup Guide

**Agent 14: Whop Integration Specialist** is now active with automatic detection! 🎉

---

## What Was Set Up

### 1. **Global Whop MCP Server**
- **Location:** `C:\Users\jimmy\.mcp\servers\whop\`
- **Purpose:** Provides AI assistants with Whop API tools
- **Status:** ✅ Installed and ready

**Available MCP Tools:**
- `list_products` - List all your Whop products
- `get_product` - Get product details
- `create_product` - Create new products
- `list_memberships` - List memberships with filters
- `get_membership` - Get membership details
- `validate_membership` - Check membership status
- `list_users` - List Whop users
- `get_user` - Get user details
- `get_company_info` - Get company information
- `list_plans` - List pricing plans

### 2. **Auto-Invocation Hook**
- **Location:** `.claude/hooks/user-prompt-submit.sh`
- **Trigger:** Automatically invokes Agent 14 when:
  - User message contains "whop"
  - Working on files in `lib/whop/` or `app/api/whop/`
  - Modifying webhook handlers

### 3. **Agent Documentation**
- **Spec:** [`docs/AGENT_14_WHOP_INTEGRATION.md`](docs/AGENT_14_WHOP_INTEGRATION.md)
- **Prompt:** `.claude/prompts/whop-integration-agent.md`
- **MCP Docs:** `C:\Users\jimmy\.mcp\servers\whop\README.md`

### 4. **Project Configuration**
- **MCP Config:** `whop.mcp.json` (points to global server)
- **Environment:** `.env.example` (updated with Whop requirements)

---

## Next Steps to Use Agent 14

### Step 1: Get Your Whop API Key

1. Visit https://dev.whop.com
2. Create an app or use existing app
3. Copy your API key

### Step 2: Add to `.env` File

Create a `.env` file (if you don't have one):

```bash
# Copy from .env.example
cp .env.example .env
```

Then add your Whop API key:

```bash
WHOP_API_KEY=your_actual_whop_api_key_here
```

### Step 3: Test the MCP Server

```bash
cd C:\Users\jimmy\.mcp\servers\whop
npm run start
```

You should see:
```
Whop MCP Server running on stdio
```

Press `Ctrl+C` to stop.

### Step 4: Try Agent 14

Just mention "whop" in any message and Agent 14 will automatically activate!

**Example messages:**
- "Show me how to set up Whop authentication"
- "I need to validate a Whop membership"
- "Help me implement Whop webhooks"
- "List my Whop products"

---

## How Auto-Invocation Works

When you mention "whop" or work on Whop-related files, you'll see:

```
🔧 **Whop Integration Detected** - Invoking Agent 14 (Whop Integration Specialist)
⚠️ **MCP-FIRST POLICY ACTIVE** - All Whop API calls MUST use MCP server tools
```

Agent 14 will then:
1. **ENFORCE MCP-first policy** - Read `docs/AGENT_14_MCP_POLICY.md`
2. Read the full specification from `docs/AGENT_14_WHOP_INTEGRATION.md`
3. Check the migration checklist
4. Help with your Whop integration task
5. **ONLY use MCP tools** to interact with Whop API (NEVER direct API calls)
6. Ask you if a needed MCP tool doesn't exist (will NOT write workarounds)
7. Ensure best practices (security, idempotency, etc.)

### ⚠️ CRITICAL: MCP-First Policy

Agent 14 is **STRICTLY FORBIDDEN** from:
- Using `@whop/api` directly in code
- Making fetch/axios calls to Whop endpoints
- Writing workarounds when MCP tools are missing
- Guessing or assuming alternative approaches

If Agent 14 needs a Whop operation that doesn't have an MCP tool, it will:
1. **STOP immediately**
2. **ASK you** if it should add the tool to the MCP server
3. **WAIT for approval** before proceeding
4. **Update MCP server FIRST**, then use the new tool

---

## What Agent 14 Manages

### Authentication & OAuth
- OAuth 2.0 flow implementation
- Session management
- Token encryption/decryption

### Webhooks
- Signature verification (HMAC-SHA256)
- Event processing with idempotency
- Background job queuing

### Membership Management
- Real-time validation
- Access control by tier
- Sync with Supabase

### Creator Provisioning
- Onboarding flow
- Company data sync
- Product catalog management

### Database Schema
- `creators` table (Whop company integration)
- `students` table (Whop user/membership sync)
- `whop_webhook_logs` table (audit trail)

---

## Migration Checklist

Agent 14 tracks this checklist in `docs/AGENT_14_WHOP_INTEGRATION.md`:

### ✅ Completed
- [x] Global Whop MCP Server installed
- [x] MCP configuration in `whop.mcp.json`
- [x] Environment variable documentation
- [x] Auto-invocation hook configured

### 🔄 In Progress (Agent 14 Will Help)
- [ ] Whop OAuth authentication flow
- [ ] Webhook signature verification
- [ ] Membership validation middleware
- [ ] Creator provisioning system
- [ ] Student onboarding with Whop sync

### 📋 Todo (Agent 14 Will Guide)
- [ ] Database migrations for Whop-specific fields
- [ ] Whop API client wrapper
- [ ] Webhook event handlers
- [ ] Creator dashboard Whop integration
- [ ] Student dashboard membership display
- [ ] Checkout flow integration
- [ ] Plan tier mapping
- [ ] Background job processing
- [ ] Testing suite

---

## File Structure

```
Your Project/
├── .claude/
│   ├── hooks/
│   │   └── user-prompt-submit.sh     # Auto-invocation hook
│   └── prompts/
│       └── whop-integration-agent.md # Agent 14 prompt
├── docs/
│   └── AGENT_14_WHOP_INTEGRATION.md  # Full specification
├── lib/whop/                          # Whop integration (to be built)
│   ├── auth/
│   ├── webhooks/
│   ├── api/
│   └── sync/
├── app/api/whop/                      # Whop API endpoints (to be built)
├── whop.mcp.json                      # MCP server config
└── .env                               # API keys (YOU CREATE THIS)

Global MCP Server/
C:\Users\jimmy\.mcp\servers\whop/
├── index.ts          # MCP server implementation
├── package.json      # Dependencies
├── README.md         # MCP server docs
└── node_modules/     # Installed packages
```

---

## Troubleshooting

### "WHOP_API_KEY environment variable is required"
**Solution:** Add `WHOP_API_KEY` to your `.env` file

### "Cannot connect to MCP server"
**Solution:**
1. Check `whop.mcp.json` path is correct
2. Run `npm install` in `C:\Users\jimmy\.mcp\servers\whop`
3. Test manually: `cd C:\Users\jimmy\.mcp\servers\whop && npm run start`

### "Agent 14 not auto-invoking"
**Solution:**
1. Check hook is executable: `.claude/hooks/user-prompt-submit.sh`
2. Mention "whop" explicitly in your message
3. Verify hook file exists

---

## Resources

- **Whop API Docs:** https://docs.whop.com
- **Whop Developer Portal:** https://dev.whop.com
- **Agent 14 Spec:** [`docs/AGENT_14_WHOP_INTEGRATION.md`](docs/AGENT_14_WHOP_INTEGRATION.md)
- **MCP Server Docs:** `C:\Users\jimmy\.mcp\servers\whop\README.md`

---

## Quick Test

Try this in your next message:

```
"Hey, can you list my Whop products using the MCP server?"
```

You should see Agent 14 activate automatically! 🚀

---

**Setup Complete!** Agent 14 is now monitoring for Whop-related work and ready to help.
