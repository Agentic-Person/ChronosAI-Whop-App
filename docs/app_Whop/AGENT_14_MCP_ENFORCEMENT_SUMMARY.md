# Agent 14: MCP-First Policy Enforcement Summary

**Date:** October 22, 2025
**Agent:** Agent 14 - Whop Integration Specialist
**Policy:** MCP-First (Mandatory)

---

## What Was Implemented

### 1. **Mandatory MCP-First Policy** ⚠️

Agent 14 is now **strictly required** to use the global Whop MCP server for ALL Whop API operations.

**Enforcement Mechanisms:**

✅ **Agent Prompt** - Primary policy defined in `.claude/prompts/whop-integration-agent.md`
✅ **Hook Reminder** - Auto-invocation hook displays MCP-first warning
✅ **Documentation** - 3 levels of policy documentation:
   - Quick reference: `docs/AGENT_14_MCP_POLICY.md`
   - Full spec: `docs/AGENT_14_WHOP_INTEGRATION.md`
   - Setup guide: `WHOP_AGENT_SETUP.md`

### 2. **Strict Behavioral Rules**

Agent 14 MUST:
- ✅ Use `mcp__whop__*` tools for ALL Whop API operations
- ✅ STOP and ASK user if needed tool doesn't exist
- ✅ Update MCP server FIRST before using new tools
- ✅ Never bypass or work around the MCP server

Agent 14 MUST NOT:
- ❌ Use `@whop/api` directly in any code
- ❌ Make fetch/axios calls to Whop endpoints
- ❌ Write workaround code when tools are missing
- ❌ Guess or assume alternative approaches

### 3. **Required Response Template**

When Agent 14 encounters a missing MCP tool, it MUST respond:

```
⚠️ MCP TOOL MISSING

I need to perform: [operation]

Current situation:
- Required tool: mcp__whop__[tool_name]
- Status: Does not exist

I cannot proceed without this tool. I will NOT write direct API code.

Options:
1. Add this tool to the global MCP server
2. Discuss alternative approach

Which would you prefer?
```

---

## Policy Documentation Hierarchy

### Level 1: Quick Reference (Read First)
**File:** `docs/AGENT_14_MCP_POLICY.md`
- Mandatory rules
- Available MCP tools list
- Decision tree
- Code patterns (correct vs forbidden)
- Enforcement checklist

### Level 2: Full Specification (Read Second)
**File:** `docs/AGENT_14_WHOP_INTEGRATION.md`
- Complete MCP-first policy section
- Implementation patterns
- Technical architecture
- Migration checklist
- All responsibilities

### Level 3: Setup Guide (Reference)
**File:** `WHOP_AGENT_SETUP.md`
- User-facing setup instructions
- MCP-first policy explanation
- Testing procedures

---

## Enforcement Points

### Point 1: Agent Prompt (Primary)
**Location:** `.claude/prompts/whop-integration-agent.md`

Shows MCP-first policy at the TOP with:
- Warning emoji (⚠️)
- 4 strict rules
- Available tools list
- Required response template

### Point 2: Auto-Invocation Hook
**Location:** `.claude/hooks/user-prompt-submit.sh`

Displays on every Whop-related task:
```
⚠️ **MCP-FIRST POLICY ACTIVE**
**REMINDER:** Use mcp__whop__* tools ONLY
```

### Point 3: Testing Checklist
Added to all testing checklists:
- [ ] **MCP tools used for ALL Whop API calls** ⚠️ MANDATORY
- [ ] No direct @whop/api or fetch calls in code

---

## Available MCP Tools (Current)

**Products:**
- `mcp__whop__list_products`
- `mcp__whop__get_product`
- `mcp__whop__create_product`

**Memberships:**
- `mcp__whop__list_memberships`
- `mcp__whop__get_membership`
- `mcp__whop__validate_membership`

**Users:**
- `mcp__whop__list_users`
- `mcp__whop__get_user`

**Company:**
- `mcp__whop__get_company_info`
- `mcp__whop__list_plans`

**Total:** 10 tools (expandable as needed)

---

## Expected Behavior Examples

### Example 1: Tool Exists ✅

**User:** "Validate this Whop membership: mem_123"

**Agent 14:**
```typescript
// Uses MCP tool
const result = await mcp.callTool('mcp__whop__validate_membership', {
  membershipId: 'mem_123'
});
```

### Example 2: Tool Missing ⚠️

**User:** "Update the product price to $49.99"

**Agent 14:**
```
⚠️ MCP TOOL MISSING

I need to perform: Update product pricing

Current situation:
- Required tool: mcp__whop__update_product
- Status: Does not exist in global MCP server

I cannot proceed without this tool. I will NOT write direct API code.

Options:
1. I can add 'update_product' tool to ~/.mcp/servers/whop/
2. We can discuss an alternative approach

Which would you prefer?
```

### Example 3: FORBIDDEN Behavior ❌

**User:** "Get product details for prod_123"

**Agent 14 MUST NOT do:**
```typescript
// ❌ FORBIDDEN - This should NEVER happen
import { Whop } from '@whop/api';
const whop = new Whop({ apiKey: process.env.WHOP_API_KEY });
const product = await whop.products.retrieve('prod_123');
```

**Agent 14 MUST do:**
```typescript
// ✅ CORRECT
const result = await mcp.callTool('mcp__whop__get_product', {
  productId: 'prod_123'
});
```

---

## Code Review Checklist

When reviewing Agent 14's code, verify:

1. **No Direct Imports**
   - [ ] No `import { Whop } from '@whop/api'`
   - [ ] No `import axios` or `import fetch` for Whop calls

2. **MCP Tool Usage**
   - [ ] All Whop operations use `mcp.callTool('mcp__whop__*', ...)`
   - [ ] Tool names match available tools list

3. **Proper Error Handling**
   - [ ] MCP connection errors handled gracefully
   - [ ] Missing tools trigger proper user notification

4. **No Workarounds**
   - [ ] No commented "TODO: use MCP later"
   - [ ] No temporary direct API calls

---

## Why This Policy Exists

### Technical Reasons:
1. **Single Source of Truth** - One global MCP server for all Whop projects
2. **Consistency** - Same API interface across applications
3. **Maintainability** - Update MCP server once, affects all projects
4. **Security** - Centralized API key management
5. **Auditability** - All Whop operations traceable through MCP logs

### Practical Reasons:
1. **Prevents Scattered Code** - No duplicate Whop API logic across projects
2. **Easier Testing** - Mock MCP tools instead of Whop API
3. **Better Debugging** - Single point to add logging/monitoring
4. **Cleaner Architecture** - Clear separation of concerns

---

## Monitoring & Compliance

### How to Verify Agent 14 Compliance:

1. **Code Review:**
   - Search codebase for `@whop/api` imports (should be ZERO)
   - Search for `fetch.*whop.com` (should be ZERO)
   - Search for `mcp__whop__` (should be MANY)

2. **Agent Behavior:**
   - Agent STOPS when tool missing (not proceeds)
   - Agent ASKS before adding tools
   - Agent NEVER suggests direct API calls

3. **MCP Server Health:**
   - Test: `cd ~/.mcp/servers/whop && npm run start`
   - Verify: All tools respond correctly
   - Check: Logs for any errors

---

## Future Enhancements

As Whop integration grows, we may need:

### New MCP Tools to Add:
- [ ] `mcp__whop__update_product` - Update product details
- [ ] `mcp__whop__delete_product` - Delete product
- [ ] `mcp__whop__create_plan` - Create pricing plan
- [ ] `mcp__whop__update_membership` - Modify membership
- [ ] `mcp__whop__cancel_membership` - Cancel membership
- [ ] `mcp__whop__get_analytics` - Fetch analytics data

**Process:** User requests → Agent 14 asks → User approves → Update MCP server → Use tool

---

## Success Metrics

Policy is successful when:

- ✅ **Zero** direct `@whop/api` usage in application code
- ✅ **100%** of Whop operations go through MCP server
- ✅ Agent 14 **always stops** when tool missing (never bypasses)
- ✅ MCP server **uptime** is 99.9%+
- ✅ New tools **added to MCP** before being used in code

---

## Troubleshooting

### "Agent 14 suggested using @whop/api directly"

**This should NEVER happen.** If it does:

1. Check agent prompt is loading: `.claude/prompts/whop-integration-agent.md`
2. Check hook is executing: `.claude/hooks/user-prompt-submit.sh`
3. Verify policy docs exist: `docs/AGENT_14_MCP_POLICY.md`
4. Restart conversation to reload agent context

### "MCP server not responding"

1. Test server: `cd ~/.mcp/servers/whop && npm run start`
2. Check `WHOP_API_KEY` is set in `.env`
3. Verify `whop.mcp.json` path is correct
4. Check server logs for errors

### "Agent 14 bypassed MCP policy"

**Immediate actions:**
1. STOP implementation
2. Review code for policy violations
3. Remove any direct API calls
4. Add missing tool to MCP server
5. Restart with proper MCP tool usage

---

## Summary

**MCP-First Policy is MANDATORY and NON-NEGOTIABLE.**

Agent 14 will:
- ✅ ALWAYS use MCP tools
- ✅ STOP when tool missing
- ✅ ASK before proceeding
- ✅ UPDATE MCP server first

Agent 14 will NEVER:
- ❌ Use direct API calls
- ❌ Write workarounds
- ❌ Guess or assume
- ❌ Bypass the policy

**This policy ensures quality, consistency, and maintainability across ALL Whop integration work.**

---

**Policy Enforced By:** Claude Code user-prompt-submit hook
**Documented In:** 4 files (agent prompt, 3 docs)
**Status:** ✅ Active and Enforced
**Last Updated:** October 22, 2025
