# Agent 14: MCP-Preferred Policy Quick Reference

## ⚠️ DEFAULT RULES - READ FIRST ⚠️

**Agent 14 SHOULD follow these rules; SDK fallback is allowed under strict conditions:**

### Rule #1: Prefer MCP Tools
```
✅ PREFER: mcp__whop__* tools
✅ ALLOWED (fallback): @whop/api on server-side only with secure credentials
❌ FORBID: Client-side SDK usage or leaking secrets; ad-hoc fetch/axios to Whop endpoints
```

### Rule #2: No Unjustified Workarounds
```
✅ If tool missing: propose adding MCP tool OR a temporary server-side SDK fallback (justify)
❌ Do NOT add direct API code without rationale and safeguards
```

### Rule #3: No Assumptions
```
✅ EXPLICITLY confirm with user before proceeding
❌ NEVER: Guess or assume alternative approaches
```

### Rule #4: MCP Server is Primary Interface
```
✅ Use MCP when available; keep it the single source of truth
❌ Do NOT bypass MCP when a suitable tool exists without clear reason
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

## When Tool Doesn't Exist - Recommended Response

**Respond with options and rationale:**

```
⚠️ MCP TOOL MISSING

I need to perform: [describe operation]

Current situation:
- Desired tool: mcp__whop__[operation_name]
- Status: Not available in global MCP server

Proposal (pick one):
1) Add the MCP tool (preferred, consistent, auditable)
2) Use Whop SDK server-side as a temporary fallback (no secrets client-side; secure handling) and backfill MCP tool later

Which option should I proceed with?
```

**DO NOT:**
- Use SDK on the client or expose secrets
- Bypass an existing MCP tool without justification
- Proceed with fallback without informing the user

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

### ⚠️ Fallback Pattern (Server-side only, justified)
```typescript
// Allowed only as a temporary server-side fallback with justification
import { Whop } from '@whop/api';

const whop = new Whop({ apiKey: process.env.WHOP_API_KEY! });
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
  │   └─ NO → Choose path ⚠️
  │          ├─ Propose adding MCP tool (preferred)
  │          └─ OR use server-side SDK fallback (with safeguards) and plan MCP backfill
  │
  └─ Avoid bypassing MCP when suitable tool exists ❌
```

---

## Enforcement Checklist

Before submitting ANY code with Whop integration:

- [ ] ✅ Whop operations use MCP tools when available
- [ ] ✅ Any SDK usage is server-side only, justified, and temporary
- [ ] ✅ No client-side secrets or direct Whop calls
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

**MCP-PREFERRED IS THE DEFAULT**

Favor MCP for consistency and auditability; use SDK fallback judiciously with safeguards.
