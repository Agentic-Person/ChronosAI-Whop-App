#!/bin/bash

echo "==================================================="
echo "  RAG Chat System Integration Verification"
echo "==================================================="
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

check_file() {
    if [ -f "$1" ]; then
        echo -e "${GREEN}✓${NC} $1"
        return 0
    else
        echo -e "${RED}✗${NC} $1 (MISSING)"
        return 1
    fi
}

echo "Checking Frontend Components..."
check_file "app/dashboard/student/chat/page.tsx"
check_file "components/chat/ChatInterface.tsx"
check_file "components/chat/MessageList.tsx"
check_file "components/chat/MessageInput.tsx"
check_file "components/chat/SessionSidebar.tsx"
check_file "components/chat/CreatorSelector.tsx"
check_file "components/chat/VideoReferenceCard.tsx"
echo ""

echo "Checking API Routes..."
check_file "app/api/chat/route.ts"
check_file "app/api/chat/history/route.ts"
check_file "app/api/chat/feedback/route.ts"
check_file "app/api/chat/session/[sessionId]/route.ts"
echo ""

echo "Checking RAG Engine..."
check_file "lib/rag/rag-engine.ts"
check_file "lib/rag/chat-service.ts"
check_file "lib/rag/context-builder.ts"
check_file "lib/rag/vector-search.ts"
echo ""

echo "Checking Types..."
check_file "types/rag.ts"
check_file "types/api.ts"
echo ""

echo "Checking Video Integration..."
check_file "components/video/VideoPlayer.tsx"
check_file "app/dashboard/watch/[videoId]/page.tsx"
echo ""

echo "Checking Documentation..."
check_file "docs/RAG_CHAT_SYSTEM.md"
check_file "AGENT3_SUMMARY.md"
echo ""

echo "==================================================="
echo "  Environment Variables Check"
echo "==================================================="

if [ -f ".env.local" ]; then
    echo -e "${GREEN}✓${NC} .env.local exists"
    
    required_vars=("ANTHROPIC_API_KEY" "OPENAI_API_KEY" "NEXT_PUBLIC_SUPABASE_URL" "SUPABASE_SERVICE_ROLE_KEY")
    
    for var in "${required_vars[@]}"; do
        if grep -q "$var" .env.local; then
            echo -e "${GREEN}✓${NC} $var"
        else
            echo -e "${YELLOW}⚠${NC} $var (not found, may need to be added)"
        fi
    done
else
    echo -e "${YELLOW}⚠${NC} .env.local not found (copy from .env.example)"
fi

echo ""
echo "==================================================="
echo "  Verification Complete"
echo "==================================================="
echo ""
echo "Next Steps:"
echo "1. Ensure environment variables are set in .env.local"
echo "2. Run: npm run dev"
echo "3. Navigate to: http://localhost:3000/dashboard/student/chat"
echo "4. Test the chat interface by asking a question"
echo ""
