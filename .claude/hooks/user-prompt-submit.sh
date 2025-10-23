#!/usr/bin/env bash
# User Prompt Submit Hook
# Auto-invokes specialized agents based on user input

USER_MESSAGE="$1"
CURRENT_FILE="$2"

# Convert to lowercase for case-insensitive matching
USER_MESSAGE_LOWER=$(echo "$USER_MESSAGE" | tr '[:upper:]' '[:lower:]')
CURRENT_FILE_LOWER=$(echo "$CURRENT_FILE" | tr '[:upper:]' '[:lower:]')

# Agent 14: Whop Integration Specialist
# Trigger: mentions "whop" OR working in whop-related files
if echo "$USER_MESSAGE_LOWER" | grep -qi "whop" || \
   echo "$CURRENT_FILE_LOWER" | grep -qi "whop" || \
   echo "$CURRENT_FILE_LOWER" | grep -qi "lib/whop" || \
   echo "$CURRENT_FILE_LOWER" | grep -qi "api/whop" || \
   echo "$CURRENT_FILE_LOWER" | grep -qi "webhook"; then

    echo "<user-prompt-submit-hook>"
    echo "🔧 **Whop Integration Detected** - Invoking Agent 14 (Whop Integration Specialist)"
    echo ""
    echo "⚠️ **MCP-FIRST POLICY ACTIVE** - All Whop API calls MUST use MCP server tools"
    echo ""
    cat ".claude/prompts/whop-integration-agent.md"
    echo ""
    echo "---"
    echo "**REMINDER:** Use mcp__whop__* tools ONLY. Ask user if a needed tool doesn't exist."
    echo "</user-prompt-submit-hook>"
    exit 0
fi

# Default: No agent invocation needed
exit 0
