# MCP Server Verification Guide

## Configuration Status

✅ `.mcp.json` is configured with 6 servers
✅ Security issues fixed (no hardcoded secrets)
✅ Environment variables properly mapped

## Configured MCP Servers

### 1. **Supabase**
- **Purpose**: Direct database operations
- **Env vars needed**:
  - `NEXT_PUBLIC_SUPABASE_URL` ✅ (set in .env.local)
  - `SUPABASE_SERVICE_ROLE_KEY` ✅ (set in .env.local)
- **Available tools**: Database queries, table operations, RPC calls

### 2. **GitHub**
- **Purpose**: Git/GitHub operations (repos, PRs, issues, commits)
- **Env vars needed**:
  - `GITHUB_TOKEN` ✅ (set in environment)
- **Available tools**: `mcp__github__*` functions

### 3. **Whop**
- **Purpose**: Whop API integration (custom server)
- **Env vars needed**:
  - `WHOP_API_KEY` ✅ (set in .env.local)
- **Server path**: `C:\Users\jimmy\.mcp\servers\whop\index.ts`
- **Available tools**: Whop-specific operations

### 4. **Pipedream**
- **Purpose**: Workflow automation and integrations
- **Type**: Remote server (URL-based)
- **Endpoint**: `https://mcp.pipedream.net/v2`
- **No env vars required**

### 5. **Desktop Commander**
- **Purpose**: Desktop/system operations
- **Package**: `@wonderwhy-er/desktop-commander`
- **No env vars required**

### 6. **n8n-mcp**
- **Purpose**: n8n workflow integration
- **Server path**: `C:\Users\jimmy\n8n-mcp\dist\mcp\index.js`
- **Env vars**: Production mode configured
- **Available tools**: n8n workflow operations

## How to Load MCP Config

### Option 1: Restart Claude Code with MCP flag
```bash
claude --mcp-config .mcp.json
```

### Option 2: Set as default in global config
Add to `~/.claude/config.json`:
```json
{
  "mcpConfigPath": "D:\\APS\\Projects\\whop\\AI-Video-Learning-Assistant\\.mcp.json"
}
```

### Option 3: Project-specific (auto-detected)
Claude Code should automatically detect `.mcp.json` in project root when starting.

## Verification Commands

Once loaded, you should see MCP tools prefixed with `mcp__`:
- `mcp__github__*` - GitHub operations
- `mcp__supabase__*` - Supabase database operations
- etc.

## Next Steps

1. **Restart Claude Code** with the updated `.mcp.json`
2. **Verify tools are loaded**: Type `/mcp` to check status
3. **Test each server**: Try a simple operation with each tool

## Environment Variables Checklist

Required variables in `.env.local`:
- [x] `NEXT_PUBLIC_SUPABASE_URL`
- [x] `SUPABASE_SERVICE_ROLE_KEY`
- [x] `WHOP_API_KEY`
- [x] `GITHUB_TOKEN` (system environment)

## Troubleshooting

If servers don't load:
1. Check that Node.js and npx are in PATH
2. Verify environment variables are exported
3. Check server paths exist (for local servers)
4. Review Claude Code logs for errors
5. Try running servers individually: `npx @modelcontextprotocol/server-supabase`
