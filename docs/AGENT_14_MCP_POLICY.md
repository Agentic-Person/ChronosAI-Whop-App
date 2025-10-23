# Agent 14: MCP-First Policy Quick Reference

## ⚠️ MANDATORY RULES - READ FIRST ⚠️

**Agent 14 MUST follow these rules without exception:**

### Rule #1: MCP Tools ONLY
```
✅ USE: mcp__whop__* tools
❌ NEVER: @whop/api, fetch, axios to Whop endpoints
```

### Rule #2: No Workarounds
```
✅ STOP and ASK user if tool missing
❌ NEVER: Write direct API code as workaround
```

### Rule #3: No Assumptions
```
✅ EXPLICITLY confirm with user before proceeding
❌ NEVER: Guess or assume alternative approaches
```

### Rule #4: MCP Server is Sacred
```
✅ ONLY authorized interface to Whop
❌ NEVER: Bypass or work around it
```

---

## Available MCP Tools (As of Oct 2025)

### Products
- `mcp__whop__list_products` - List all products
- `mcp__whop__get_product` - Get product details
- `mcp__whop__create_product` - Create new product

### Memberships
- `mcp__whop__list_memberships` - List memberships (filterable)
- `mcp__whop__get_membership` - Get membership details
- `mcp__whop__validate_membership` - Validate membership status

### Users
- `mcp__whop__list_users` - List users
- `mcp__whop__get_user` - Get user details

### Company & Plans
- `mcp__whop__get_company_info` - Get company information
- `mcp__whop__list_plans` - List pricing plans

---

## When Tool Doesn't Exist - REQUIRED RESPONSE

**You MUST stop and respond EXACTLY like this:**

```
⚠️ MCP TOOL MISSING

I need to perform: [describe operation]

Current situation:
- Required tool: mcp__whop__[operation_name]
- Status: Does not exist in global MCP server

I cannot proceed without this tool. I will NOT write direct API code as a workaround.

Options:
1. I can add this tool to the global MCP server at ~/.mcp/servers/whop/
2. We can discuss an alternative approach

Which would you prefer?
```

**DO NOT:**
- Suggest using `@whop/api` directly
- Offer to "just this once" bypass MCP
- Write any code that calls Whop API directly
- Proceed without explicit user approval

---

## Code Patterns - Mandatory

### ✅ CORRECT Pattern
```typescript
// All Whop operations go through MCP
import { callWhopMCPTool } from '@/lib/whop/mcp/client';

export async function validateMembership(id: string) {
  const result = await callWhopMCPTool('validate_membership', {
    membershipId: id
  });
  return result;
}
```

### ❌ FORBIDDEN Pattern
```typescript
// NEVER DO THIS - Direct API call
import { Whop } from '@whop/api';

const whop = new Whop({ apiKey: process.env.WHOP_API_KEY });
const membership = await whop.memberships.retrieve(id);
```

---

## Decision Tree

```
Need Whop data?
  │
  ├─ Does MCP tool exist?
  │   │
  │   ├─ YES → Use MCP tool ✅
  │   │
  │   └─ NO → STOP ⚠️
  │          └─ Ask user to add tool to MCP server
  │             └─ Wait for approval
  │                └─ Update MCP server FIRST
  │                   └─ Then use new tool
  │
  └─ Never bypass MCP server ❌
```

---

## Enforcement Checklist

Before submitting ANY code with Whop integration:

- [ ] ✅ All Whop operations use `mcp__whop__*` tools
- [ ] ✅ No `import { Whop } from '@whop/api'` anywhere
- [ ] ✅ No fetch/axios calls to Whop endpoints
- [ ] ✅ MCP server tested and working
- [ ] ✅ User approved any new MCP tools added
- [ ] ✅ Documentation updated if MCP server changed

---

## Emergency Contacts

**If you're unsure:**
1. STOP immediately
2. Ask the user for clarification
3. Reference this document
4. Reference `docs/AGENT_14_WHOP_INTEGRATION.md`

**Never:**
- Assume permission to bypass policy
- Write "temporary" workarounds
- Promise to "fix it later"

---

## This Policy Exists Because:

1. **Consistency** - Same interface across all Whop projects
2. **Maintainability** - Update once, works everywhere
3. **Security** - Centralized credential management
4. **Auditability** - All operations traceable through MCP
5. **Quality** - Prevents scattered, inconsistent API usage

---

**MCP-FIRST IS NON-NEGOTIABLE**

Print this in your mind before every Whop task.
