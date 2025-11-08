# MCP Server Setup Guide

This guide shows you how to set up MCP servers for any project using the template.

## Quick Setup

1. **Copy the template** to your project root as `.mcp.json`:
   ```bash
   cp .mcp.template.json /path/to/your/project/.mcp.json
   ```

2. **Update Supabase credentials** (if the project uses Supabase):
   - Replace `YOUR_SUPABASE_PROJECT_URL` with your Supabase project URL
   - Replace `YOUR_SUPABASE_SERVICE_ROLE_KEY` with your service role key
   - Or remove the entire `supabase` section if not needed

3. **Restart Claude Code**

## MCP Servers Included

### 1. Supabase MCP (`@supabase/mcp-server-supabase`)

**What it does:** Direct database access, run queries, manage tables, execute functions

**Configuration:**
```json
"supabase": {
  "command": "npx",
  "args": ["-y", "@supabase/mcp-server-supabase@latest"],
  "env": {
    "SUPABASE_ACCESS_TOKEN": "sbp_your_access_token_here"
  }
}
```

**Required:**
- Supabase access token (NOT service role key!)

**Find credentials:**
1. Go to https://supabase.com/dashboard/account/tokens
2. Generate a new access token (or use existing)
3. Copy the token starting with `sbp_`

---

### 2. GitHub MCP (`@modelcontextprotocol/server-github`)

**What it does:** Create repos, manage issues/PRs, search code, create commits

**Configuration:**
```json
"github": {
  "command": "cmd",
  "args": ["/c", "npx", "-y", "@modelcontextprotocol/server-github"],
  "env": {
    "GITHUB_PERSONAL_ACCESS_TOKEN": "${GITHUB_TOKEN}"
  }
}
```

**Required:**
- GitHub Personal Access Token set as `GITHUB_TOKEN` environment variable

**Setup token:**
1. Go to https://github.com/settings/tokens
2. Generate new token (classic)
3. Scopes: `repo`, `read:org`, `workflow`
4. Add to Windows environment variables:
   - Press Win + R, type `sysdm.cpl`, press Enter
   - Advanced → Environment Variables
   - User variables → New
   - Name: `GITHUB_TOKEN`
   - Value: `your_token_here`

---

### 3. Whop MCP (Custom Global Server)

**What it does:** Manage Whop products, memberships, users, validate access

**Configuration:**
```json
"whop": {
  "command": "node",
  "args": ["--import", "tsx/esm", "C:\\Users\\jimmy\\.mcp\\servers\\whop\\index.ts"],
  "env": {
    "WHOP_API_KEY": "0u_46cKC_VSlKurR5yvKTiPBY_vfEkmmxKpS5-ztfkQ"
  }
}
```

**Required:**
- Whop API key (already configured)
- Server installed at `C:\Users\jimmy\.mcp\servers\whop\`

**No changes needed** - this is a global server serving all projects!

---

### 4. Desktop Commander MCP

**What it does:** File operations, process management, terminal commands, search

**Configuration:**
```json
"desktop-commander": {
  "command": "cmd",
  "args": ["/c", "npx", "@wonderwhy-er/desktop-commander@latest"]
}
```

**Required:** Nothing! Works out of the box.

**No changes needed** - this is essential for file operations.

---

### 5. n8n MCP (Custom Global Server)

**What it does:** Access n8n workflows, nodes, templates, validate configurations

**Configuration:**
```json
"n8n-mcp": {
  "command": "node",
  "args": ["C:\\Users\\jimmy\\n8n-mcp\\dist\\mcp\\index.js"],
  "env": {
    "NODE_ENV": "production",
    "LOG_LEVEL": "error",
    "MCP_MODE": "stdio",
    "DISABLE_CONSOLE_OUTPUT": "true"
  }
}
```

**Required:**
- n8n MCP server installed at `C:\Users\jimmy\n8n-mcp\`

**No changes needed** - this is a global server.

---

## Customizing for Different Projects

### Scenario 1: Non-Supabase Project

Remove the Supabase section entirely:

```json
{
  "mcpServers": {
    "github": { ... },
    "whop": { ... },
    "desktop-commander": { ... },
    "n8n-mcp": { ... }
  }
}
```

### Scenario 2: Different Supabase Project

**IMPORTANT:** The Supabase MCP uses your ACCOUNT access token, not per-project credentials.
The same `SUPABASE_ACCESS_TOKEN` works across ALL your Supabase projects!

```json
"supabase": {
  "command": "npx",
  "args": ["-y", "@supabase/mcp-server-supabase@latest"],
  "env": {
    "SUPABASE_ACCESS_TOKEN": "sbp_same_token_for_all_projects"
  }
}
```

### Scenario 3: Non-Whop Project

Remove the Whop section:

```json
{
  "mcpServers": {
    "supabase": { ... },
    "github": { ... },
    "desktop-commander": { ... },
    "n8n-mcp": { ... }
  }
}
```

---

## Troubleshooting

### MCP Server Won't Connect

1. **Check package name is correct**
   - Supabase: `@supabase/mcp-server-supabase` ✅
   - GitHub: `@modelcontextprotocol/server-github` ✅

2. **Verify credentials**
   - Test Supabase URL in browser (should load)
   - Test GitHub token: `gh auth status`

3. **Check paths for global servers**
   - Whop: `C:\Users\jimmy\.mcp\servers\whop\index.ts` must exist
   - n8n: `C:\Users\jimmy\n8n-mcp\dist\mcp\index.js` must exist

4. **Restart Claude Code** after any `.mcp.json` changes

### Environment Variable Issues

**Windows:**
- Environment variables set in System Properties require **terminal restart**
- Claude Code must be restarted after setting new env vars

**Test if env var is set:**
```powershell
echo $env:GITHUB_TOKEN
```

---

## Adding New MCP Servers

### Find MCP Servers

Search at:
- https://github.com/modelcontextprotocol/servers
- https://www.npmjs.com/search?q=mcp-server
- https://smithery.ai/servers

### Add to Config

```json
"server-name": {
  "command": "cmd",
  "args": ["/c", "npx", "-y", "@scope/package-name"],
  "env": {
    "REQUIRED_ENV_VAR": "value"
  }
}
```

---

## Best Practices

1. **Never commit `.mcp.json` with secrets** - use environment variables
2. **Keep global servers updated** - check Whop and n8n MCP repos
3. **Test individually** - if one fails, remove it temporarily
4. **Use `${VAR_NAME}`** for env vars when possible
5. **Restart Claude Code** after any config changes

---

## Common Errors Fixed

| Error | Fix |
|-------|-----|
| `@modelcontextprotocol/server-supabase not found` | Change to `@supabase/mcp-server-supabase@latest` |
| `@github/mcp-server not found` | Change to `@modelcontextprotocol/server-github` |
| `GitHub MCP won't connect` | Change `"GitHub"` to `"github"` (lowercase!) |
| `import named 'Whop'` | Change to `WhopServerSdk` in whop server |
| `pipedream requires CLIENT_ID` | Remove pipedream, it's deprecated |
| Supabase wants URL + service role key | Use `SUPABASE_ACCESS_TOKEN` instead (account token) |

---

## File Locations

```
Your Project/
├── .mcp.json              # Active config (NEVER COMMIT SECRETS!)
├── .mcp.template.json     # Template for new projects
└── MCP_SETUP_GUIDE.md     # This file

Global MCP Servers/
├── C:\Users\jimmy\.mcp\servers\whop\          # Whop MCP
└── C:\Users\jimmy\n8n-mcp\                    # n8n MCP
```

---

## Template Usage

**For new project:**

```bash
# 1. Navigate to new project
cd /path/to/new-project

# 2. Copy template from this project
cp /path/to/AI-Video-Learning-Assistant/.mcp.template.json ./.mcp.json

# 3. Update Supabase credentials (if needed)
# Edit .mcp.json and replace placeholders

# 4. Restart Claude Code
```

---

**Generated:** 2025-10-31  
**Tested on:** Windows 11, Claude Code, Node.js v22.17.0
