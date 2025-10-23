# 🤖 AGENTS INDEX - Complete Documentation Map

**Project:** Mentora Platform (AI-Powered Video Learning Assistant)
**Total Agents:** 15 (Agent 0 - Agent 14)
**Total Files:** 260+ files | 51,000+ lines of code
**Last Updated:** October 22, 2025

---

## 📚 Documentation Organization by Agent

This index maps all project documentation to their respective agent owners for quick reference by developers, junior team members, and stakeholders.

---

## **AGENT 0: Feature Gating System** ⭐ FOUNDATION
**Phase:** 0 (Prerequisites)
**Status:** ✅ Complete
**Dependencies:** None (builds first)

### Purpose
Tier-based monetization system with 3 pricing tiers (BASIC, PRO, ENTERPRISE) and feature access control integrated with Whop.

### Key Features
- 3-tier pricing structure ($29, $79, $199)
- 18 features mapped across tiers
- Middleware-based route protection
- Upgrade prompts and paywall UI
- Whop plan synchronization

### Documentation Files
- 📄 **Primary:** [`AGENT_00_FEATURE_GATING.md`](./AGENT_00_FEATURE_GATING.md)
- 📄 **Integration:** [`INTEGRATION_GUIDE_FOR_AGENTS.md`](./INTEGRATION_GUIDE_FOR_AGENTS.md)

### Code Location
- `lib/features/` - Feature flag service and constants
- `lib/middleware/feature-gate.ts` - Route protection middleware
- `components/features/` - FeatureGate, UpgradePrompt, PlanBadge components

### Agent Owner
- **Lead:** Agent 0 (Feature Gating Specialist)
- **Deliverables:** 20 files, ~5,800 lines

---

## **AGENT 1: Backend Infrastructure** 🏗️ FOUNDATION
**Phase:** 1 (Infrastructure)
**Status:** ✅ Complete
**Dependencies:** None

### Purpose
Core backend services including caching, rate limiting, job queue, monitoring, and health checks.

### Key Features
- Redis caching (Vercel KV) with 5-min TTL
- Rate limiting (100 req/min per user)
- Background job queue (Inngest)
- Error monitoring (Sentry)
- Health check endpoints

### Documentation Files
- 📄 **Primary:** [`AGENT_01_INFRASTRUCTURE.md`](./AGENT_01_INFRASTRUCTURE.md)

### Code Location
- `lib/infrastructure/cache/` - Redis client and caching service
- `lib/infrastructure/rate-limit/` - Rate limiting middleware
- `lib/infrastructure/jobs/` - Inngest job queue
- `lib/infrastructure/monitoring/` - Sentry integration

### Agent Owner
- **Lead:** Agent 1 (Infrastructure Specialist)
- **Deliverables:** 22 files, ~3,486 lines

---

## **AGENT 2: Whop Integration** 🔐 FOUNDATION
**Phase:** 1 (Infrastructure)
**Status:** ✅ Complete
**Dependencies:** Agent 0 (Feature Gating)

### Purpose
Complete Whop OAuth integration, webhook handling, membership validation, and secure token encryption.

### Key Features
- OAuth 2.0 authentication flow
- Webhook signature verification (HMAC-SHA256)
- Membership sync and validation
- Token encryption (AES-256-GCM)
- Session management

### Documentation Files
- 📄 **Primary:** [`AGENT_02_WHOP_INTEGRATION_SUMMARY.md`](./AGENT_02_WHOP_INTEGRATION_SUMMARY.md)
- 📄 **Setup Guide:** [`WHOP_SETUP_GUIDE.md`](./WHOP_SETUP_GUIDE.md)
- 📄 **Quick Reference:** [`WHOP_QUICK_REFERENCE.md`](./WHOP_QUICK_REFERENCE.md)
- 📄 **Complete Guide:** [`total-whop-integration-guide.md`](./total-whop-integration-guide.md)

### Code Location
- `lib/whop/auth.ts` - OAuth and session management
- `lib/whop/webhooks.ts` - Webhook handlers
- `lib/whop/membership.ts` - Membership validation
- `app/api/auth/` - Auth endpoints
- `app/api/webhooks/whop/` - Webhook endpoints

### Agent Owner
- **Lead:** Agent 2 (Authentication & Integration Specialist)
- **Deliverables:** 8 files, ~2,800 lines

---

## **AGENT 3: Video Processing Pipeline** 🎥 CORE FEATURE
**Phase:** 2 (Core Features)
**Status:** ✅ Complete
**Dependencies:** Agent 1 (Infrastructure)

### Purpose
Complete video upload, transcription, semantic chunking, embedding generation, and background job processing.

### Key Features
- S3/R2 video storage
- Whisper API transcription
- Semantic chunking (500-1000 words)
- OpenAI embeddings (text-embedding-ada-002)
- Background processing (Inngest jobs)
- Processing status tracking

### Documentation Files
- 📄 **Primary:** [`AGENT_03_VIDEO_PROCESSING.md`](./AGENT_03_VIDEO_PROCESSING.md)

### Code Location
- `lib/video/storage.ts` - S3/R2 upload service
- `lib/video/transcription.ts` - Whisper API integration
- `lib/video/chunking.ts` - Semantic chunking algorithm
- `lib/video/embeddings.ts` - OpenAI embedding generation
- `lib/video/processor.ts` - Main processing orchestrator
- `jobs/video-processing.ts` - Inngest background jobs

### Agent Owner
- **Lead:** Agent 3 (Video Processing Specialist)
- **Deliverables:** 22 files, ~4,200 lines

---

## **AGENT 4: RAG Chat Engine** 💬 CORE FEATURE
**Phase:** 2 (Core Features)
**Status:** ✅ Complete
**Dependencies:** Agent 3 (Video Processing)

### Purpose
Retrieval-Augmented Generation (RAG) chat system with vector search, context building, and video citation.

### Key Features
- pgvector similarity search (cosine)
- Context builder with conversation history
- Claude 3.5 Sonnet integration
- Video timestamp citations
- Confidence scoring
- Chat interface components

### Documentation Files
- 📄 **Primary:** [`AGENT_04_RAG_CHAT_ENGINE.md`](./AGENT_04_RAG_CHAT_ENGINE.md)
- 📄 **Integration:** [`RAG_INTEGRATION_SUMMARY.md`](./RAG_INTEGRATION_SUMMARY.md)

### Code Location
- `lib/rag/rag-engine.ts` - Core RAG logic
- `lib/rag/vector-search.ts` - pgvector similarity search
- `lib/rag/context-builder.ts` - Conversation context
- `lib/rag/citation-parser.ts` - Video citation extraction
- `components/chat/` - ChatInterface, MessageList, MessageInput

### Agent Owner
- **Lead:** Agent 4 (AI & RAG Specialist)
- **Deliverables:** 18 files, ~3,300 lines

---

## **AGENT 5: Learning Calendar** 📅 PRO FEATURE
**Phase:** 3 (Premium Features)
**Status:** ✅ Complete
**Dependencies:** Agent 0 (Feature Gating), Agent 3 (Video Processing)
**Required Tier:** PRO ($79/mo)

### Purpose
AI-generated personalized learning schedules with adaptive rescheduling and calendar UI.

### Key Features
- Claude-powered schedule generation
- Adaptive rescheduling based on progress
- Weekly calendar view
- Onboarding wizard
- Study time preferences
- Google Calendar sync (future)

### Documentation Files
- 📄 **Primary:** [`AGENT_05_LEARNING_CALENDAR.md`](./AGENT_05_LEARNING_CALENDAR.md)
- 📄 **Integration:** [`CALENDAR_INTEGRATION_GUIDE.md`](./CALENDAR_INTEGRATION_GUIDE.md)

### Code Location
- `lib/calendar/schedule-generator.ts` - AI schedule generation
- `lib/calendar/adaptive-scheduler.ts` - Progress-based rescheduling
- `components/calendar/WeeklyCalendarView.tsx` - Calendar UI
- `components/calendar/OnboardingWizard.tsx` - Preference setup
- `components/calendar/UpcomingEvents.tsx` - Event list

### Agent Owner
- **Lead:** Agent 5 (Calendar & Scheduling Specialist)
- **Deliverables:** 21 files, ~4,000 lines

---

## **AGENT 6: Progress Tracking & Gamification** 🎮 PRO FEATURE
**Phase:** 3 (Premium Features)
**Status:** ✅ Complete
**Dependencies:** Agent 0 (Feature Gating), Agent 3 (Video Processing)
**Required Tier:** PRO ($79/mo)

### Purpose
Complete gamification system with XP, achievements, leaderboards, and 60fps celebration animations.

### Key Features
- 14 XP earning actions
- 17 achievements across 6 categories
- 6 celebration animations (GPU-accelerated)
- Leaderboards with materialized views
- Streak tracking
- Level system with exponential XP

### Documentation Files
- 📄 **Primary:** [`AGENT_06_PROGRESS_GAMIFICATION.md`](./AGENT_06_PROGRESS_GAMIFICATION.md)
- 📄 **XP Guide:** [`XP_EARNING_GUIDE.md`](./XP_EARNING_GUIDE.md)
- 📄 **Achievements:** [`ACHIEVEMENT_LIST.md`](./ACHIEVEMENT_LIST.md)
- 📄 **Summary:** [`PROGRESS_IMPLEMENTATION_SUMMARY.md`](./PROGRESS_IMPLEMENTATION_SUMMARY.md)

### Code Location
- `lib/progress/xp-system.ts` - XP calculation and leveling
- `lib/progress/achievement-system.ts` - Achievement unlock logic
- `lib/progress/leaderboard-service.ts` - Leaderboard queries
- `components/progress/animations/` - 6 celebration animations
- `components/progress/` - Progress bars, badges, heatmaps

### Agent Owner
- **Lead:** Agent 6 (Gamification Specialist)
- **Deliverables:** 27 files, ~4,500 lines

---

## **AGENT 7: Assessment & Quiz System** 📝 PRO FEATURE
**Phase:** 3 (Premium Features)
**Status:** ✅ Complete
**Dependencies:** Agent 0 (Feature Gating), Agent 3 (Video Processing)
**Required Tier:** PRO ($79/mo)

### Purpose
AI-powered quiz generation, code review, peer review, and project templates.

### Key Features
- AI quiz generation (Claude 3.5 Sonnet)
- Multiple question types (MCQ, true/false, short answer)
- AI code review with suggestions
- Peer review system with rubrics
- 4 project templates (portfolio, game, tool, creative)
- Automated grading

### Documentation Files
- 📄 **Primary:** [`AGENT_07_ASSESSMENT_SYSTEM.md`](./AGENT_07_ASSESSMENT_SYSTEM.md)
- 📄 **Examples:** [`ASSESSMENT_EXAMPLES.md`](./ASSESSMENT_EXAMPLES.md)

### Code Location
- `lib/assessment/quiz-generator.ts` - AI quiz generation
- `lib/assessment/code-review.ts` - AI code analysis
- `lib/assessment/peer-review.ts` - Peer review workflow
- `lib/assessment/grading.ts` - Automated grading
- `components/assessment/` - Quiz UI, code review interface

### Agent Owner
- **Lead:** Agent 7 (Assessment & Evaluation Specialist)
- **Deliverables:** 15 files, ~4,220 lines

---

## **AGENT 8: Creator Dashboard** 📊 ENTERPRISE FEATURE
**Phase:** 4 (Enterprise Features)
**Status:** ✅ Complete
**Dependencies:** Agent 0 (Feature Gating), All previous agents
**Required Tier:** ENTERPRISE ($199/mo)

### Purpose
Creator-facing analytics dashboard with student management, performance metrics, and export service.

### Key Features
- Student engagement analytics
- Video performance metrics
- Completion rate tracking
- Materialized views for performance
- CSV/JSON/PDF export
- Student management tools

### Documentation Files
- 📄 **Primary:** [`AGENT_08_CREATOR_DASHBOARD.md`](./AGENT_08_CREATOR_DASHBOARD.md)

### Code Location
- `lib/creator/analytics-service.ts` - Analytics queries
- `lib/creator/export-service.ts` - Data export (CSV/JSON/PDF)
- `lib/creator/student-management.ts` - Student admin tools
- `app/dashboard/creator/` - Creator dashboard pages
- `components/creator/` - Analytics widgets

### Agent Owner
- **Lead:** Agent 8 (Analytics & Reporting Specialist)
- **Deliverables:** 6 files, ~1,900 lines

---

## **AGENT 9: AI Study Buddy** 🤝 ENTERPRISE FEATURE
**Phase:** 4 (Enterprise Features)
**Status:** ✅ Complete
**Dependencies:** Agent 0 (Feature Gating), Agent 4 (RAG Chat)
**Required Tier:** ENTERPRISE ($199/mo)

### Purpose
AI-powered study partner matching with compatibility algorithm and group management.

### Key Features
- AI compatibility matching (learning style, goals, availability)
- Study group creation and management
- Connection requests and invitations
- Group chat integration
- Shared learning resources

### Documentation Files
- 📄 **Primary:** [`AGENT_09_AI_STUDY_BUDDY.md`](./AGENT_09_AI_STUDY_BUDDY.md)

### Code Location
- `lib/study-buddy/matching-algorithm.ts` - AI compatibility scoring
- `lib/study-buddy/group-service.ts` - Study group management
- `lib/study-buddy/connection-service.ts` - Connection requests
- `components/study-buddy/` - Matching UI, group cards

### Agent Owner
- **Lead:** Agent 9 (Social Learning Specialist)
- **Deliverables:** 8 files, ~2,000 lines

---

## **AGENT 10: Discord Integration** 💬 ENTERPRISE FEATURE
**Phase:** 4 (Enterprise Features)
**Status:** ✅ Complete
**Dependencies:** Agent 0 (Feature Gating)
**Required Tier:** ENTERPRISE ($199/mo)

### Purpose
Complete Discord bot integration with slash commands, auto-channel creation, and notifications.

### Key Features
- Discord bot with 12 slash commands
- Auto channel creation for teams
- Progress notifications
- Leaderboard sync
- Content moderation
- Study reminder DMs

### Documentation Files
- 📄 **Primary:** [`AGENT_10_DISCORD_INTEGRATION.md`](./AGENT_10_DISCORD_INTEGRATION.md)

### Code Location
- `lib/discord/bot.ts` - Discord.js bot setup
- `lib/discord/commands/` - 12 slash command handlers
- `lib/discord/notifications.ts` - Notification service
- `lib/discord/channel-manager.ts` - Auto channel creation
- `lib/discord/moderation.ts` - Content moderation

### Agent Owner
- **Lead:** Agent 10 (Discord & Community Specialist)
- **Deliverables:** 20 files, ~3,000 lines

---

## **AGENT 11: Content Intelligence** 🧠 ENTERPRISE FEATURE
**Phase:** 4 (Enterprise Features)
**Status:** ✅ Complete
**Dependencies:** Agent 0 (Feature Gating), Agent 3 (Video Processing), Agent 4 (RAG Chat)
**Required Tier:** ENTERPRISE ($199/mo)

### Purpose
AI-powered content health monitoring, knowledge gap detection, and engagement analytics.

### Key Features
- Knowledge gap detection (struggle point identification)
- Engagement analytics with heatmaps
- Content health monitoring (availability checks)
- AI insights generation (Claude 3.5 Sonnet)
- Recommendation engine
- Weekly digest reports

### Documentation Files
- 📄 **Primary:** [`AGENT_11_CONTENT_INTELLIGENCE.md`](./AGENT_11_CONTENT_INTELLIGENCE.md)

### Code Location
- `lib/intelligence/gap-detector.ts` - Knowledge gap analysis
- `lib/intelligence/engagement-analyzer.ts` - Engagement metrics
- `lib/intelligence/health-monitor.ts` - Content availability checks
- `lib/intelligence/insights-generator.ts` - AI insights (Claude)
- `components/intelligence/` - Insight panels, analytics widgets

### Agent Owner
- **Lead:** Agent 11 (AI Insights & Analytics Specialist)
- **Deliverables:** 21 files, ~3,500 lines

---

## **AGENT 12: CHRONOS Token Reward System** 💎 NEW FEATURE
**Phase:** 5 (Additional Features)
**Status:** 🔄 In Development
**Dependencies:** Agent 0 (Feature Gating), Agent 3 (Video Processing), Agent 6 (Progress & Gamification)

### Purpose
Solana blockchain-based token reward system with dual XP/CHRONOS tracking and real-world redemption.

### Key Features
- Solana SPL token integration
- Dual reward system (XP + CHRONOS)
- Video completion milestone rewards
- Quiz and achievement rewards
- Real-world redemption (PayPal, gift cards)
- In-platform purchases
- Token leaderboard

### Documentation Files
- 📄 **Primary:** [`AGENT_12_CHRONOS_TOKEN_SYSTEM.md`](./AGENT_12_CHRONOS_TOKEN_SYSTEM.md)

### Code Location
- `lib/tokens/solana-service.ts` - Blockchain operations
- `lib/tokens/reward-engine.ts` - Token award logic
- `lib/tokens/redemption-service.ts` - Redemption handling
- `lib/tokens/wallet-service.ts` - Wallet management
- `app/api/tokens/` - Token API endpoints
- `components/tokens/` - Wallet UI, transaction history

### Agent Owner
- **Lead:** Agent 12 (Blockchain & Token Economy Specialist)
- **Deliverables:** 15-20 files, ~3,000 lines (estimated)

---

## **AGENT 13: UI Design System & Frontend** 🎨
**Phase:** 5 (Additional Features)
**Status:** 🚧 55% Complete (5 of 9 pages built)
**Dependencies:** Agent 0, 3, 6, 12 (integrates with all agents)

---

## **AGENT 14: Whop Integration Specialist** 🔐 AUTO-INVOKED
**Phase:** Cross-cutting (Auto-invoked via hook)
**Status:** ✅ Active with Auto-Detection
**Dependencies:** All agents (provides Whop integration layer)

### Purpose
Dedicated specialist for all Whop platform integration tasks including OAuth, webhooks, membership validation, creator provisioning, and MCP server management. **Automatically invoked** when working on Whop-related features.

### Key Features
- **Auto-Detection Hook** - Automatically invoked when user mentions "whop" or works on Whop files
- Whop OAuth 2.0 implementation
- Webhook signature verification and event processing
- Membership validation middleware
- Creator onboarding and provisioning
- Global Whop MCP server (`~/.mcp/servers/whop/`)
- Multi-platform architecture (Whop + future platforms)

### Documentation Files
- 📄 **Primary:** [`AGENT_14_WHOP_INTEGRATION.md`](./AGENT_14_WHOP_INTEGRATION.md)
- 📄 **MCP Server:** `~/.mcp/servers/whop/README.md`
- 📄 **Agent Prompt:** `.claude/prompts/whop-integration-agent.md`
- 📄 **Hook Config:** `.claude/hooks/user-prompt-submit.sh`

### Code Location
- `lib/whop/` - Whop integration library
  - `auth/` - OAuth and session management
  - `webhooks/` - Webhook handlers
  - `api/` - Whop API client
  - `sync/` - Data synchronization
- `app/api/whop/` - Whop API endpoints
- `~/.mcp/servers/whop/` - Global MCP server

### Auto-Invocation Triggers
- User message contains "whop" (case-insensitive)
- Working on files in `lib/whop/` or `app/api/whop/`
- Modifying webhook handlers
- MCP server issues

### Agent Owner
- **Lead:** Agent 14 (Whop Integration Specialist)
- **Deliverables:** MCP server + integration layer (TBD files)
- **Hook:** `.claude/hooks/user-prompt-submit.sh`

---

## **AGENT 13 (Continued): UI Design System & Frontend** 🎨

### Purpose (Continued)
Complete frontend UI implementation matching Chronos AI design system with dark theme, sidebar navigation, module/week/day structure, and responsive layouts.

### Key Features Implemented ✅
- ✅ Dark blue/navy color scheme (Chronos AI match)
- ✅ Sidebar with module navigation (280px)
- ✅ Header with stats (XP, CHRONOS, profile)
- ✅ Landing page with updated pricing ($19/$39/$99)
- ✅ Dashboard with stats and module cards
- ✅ Module detail view (collapsible weeks/days)
- ✅ Video player with AI chat integration
- ✅ Creator video management (drag-drop, QR, YouTube)
- ✅ 11 reusable UI components
- ✅ 60fps animations with Framer Motion
- ✅ Responsive design (mobile, tablet, desktop)

### Features Pending ⏳
- ⏳ Calendar page (AI study schedule)
- ⏳ Achievements page (badges, milestones)
- ⏳ Token wallet page (transactions, redemption)
- ⏳ Leaderboard page (rankings, filters)
- ⏳ Backend API integration (replace mock data)

### Documentation Files
- 📄 **Primary:** [`AGENT_13_UI_DESIGN_SYSTEM.md`](./AGENT_13_UI_DESIGN_SYSTEM.md)

### Code Location
- `app/page.tsx` - Landing page (255 lines)
- `app/dashboard/page.tsx` - Dashboard (318 lines)
- `app/dashboard/layout.tsx` - Dashboard layout (28 lines)
- `app/dashboard/modules/[moduleId]/page.tsx` - Module detail (467 lines)
- `app/dashboard/watch/[videoId]/page.tsx` - Video player (535 lines)
- `app/dashboard/creator/videos/page.tsx` - Video management (548 lines)
- `components/layout/` - Sidebar, Header, Footer (pre-existing)
- `components/ui/` - Button, Input, Modal, Card, etc. (11 components)
- `lib/styles/` - globals.css, components.css, animations.css

### Agent Owner
- **Lead:** Agent 13 (UI/UX & Design System Specialist)
- **Deliverables:** 27 files built, ~2,123 lines (5 pages complete, 4 pending)

---

## 📦 General Documentation (No Specific Agent)

### Product & Planning Documents
- 📄 [`whop-ai-learning-prd.md`](./whop-ai-learning-prd.md) - Original Product Requirements Document
- 📄 [`whop-video-wizard-tdd-claudecode.md`](./whop-video-wizard-tdd-claudecode.md) - Test-Driven Development guide
- 📄 [`target-creators-list.md`](./target-creators-list.md) - Target audience analysis

### Integration Guides
- 📄 [`INTEGRATION_GUIDE_FOR_AGENTS.md`](./INTEGRATION_GUIDE_FOR_AGENTS.md) - How agents should integrate together

---

## 🗂️ Agent Dependency Graph

```
AGENT 0 (Feature Gating)
   ↓
   ├─→ AGENT 1 (Infrastructure) ─→ AGENT 3 (Video Processing)
   │                                    ↓
   ├─→ AGENT 2 (Whop Integration)      ├─→ AGENT 4 (RAG Chat)
   │                                    │
   └─→ AGENT 5 (Calendar) ←────────────┤
       AGENT 6 (Gamification) ←─────────┤
       AGENT 7 (Assessment) ←───────────┤
                ↓                       ↓
       AGENT 8 (Creator Dashboard) ←────┤
       AGENT 9 (Study Buddy) ←──────────┤
       AGENT 10 (Discord) ←─────────────┤
       AGENT 11 (Intelligence) ←────────┤
       AGENT 12 (Tokens) ←──────────────┤
                                        ↓
       AGENT 13 (UI Design) ←───────────┘ (integrates with all)
```

---

## 📊 Summary Statistics

| Category | Count |
|----------|-------|
| **Total Agents** | 15 (Agent 0-14) |
| **Foundation Agents** | 3 (Agent 0, 1, 2) |
| **Core Feature Agents** | 2 (Agent 3, 4) |
| **PRO Feature Agents** | 3 (Agent 5, 6, 7) |
| **Enterprise Feature Agents** | 4 (Agent 8, 9, 10, 11) |
| **Additional Feature Agents** | 2 (Agent 12, 13) |
| **Cross-Cutting Agents** | 1 (Agent 14 - Auto-invoked) |
| **Total Documentation Files** | 32 MD files |
| **Total Code Files** | 267+ files |
| **Total Lines of Code** | 51,000+ lines |
| **Agent 13 Completion** | 55% (5 of 9 pages, 27 files, 2,123 lines) |
| **Agent 14 Status** | ✅ Active (MCP server + hooks configured) |

**Recent Updates (October 22, 2025):**
- ✅ **NEW:** Agent 14 - Whop Integration Specialist with auto-invocation hook
- ✅ Global Whop MCP server installed at `~/.mcp/servers/whop/`
- ✅ Auto-detection hook configured for Whop-related work
- ✅ Built 5 core dashboard pages (Landing, Dashboard, Module Detail, Video Player, Creator Videos)
- ✅ Fixed Sidebar and Header default props
- ✅ Implemented CHRONOS reward notifications in video player
- ✅ Added AI chat integration UI
- ✅ Created triple upload method (file/YouTube/QR)

---

## 🔍 Quick Lookup Table

| Looking For... | See Agent | Documentation |
|----------------|-----------|---------------|
| Feature access control | Agent 0 | AGENT_00_FEATURE_GATING.md |
| Caching and rate limiting | Agent 1 | AGENT_01_INFRASTRUCTURE.md |
| Whop OAuth login | Agent 2 | AGENT_02_WHOP_INTEGRATION_SUMMARY.md |
| Video upload and processing | Agent 3 | AGENT_03_VIDEO_PROCESSING.md |
| AI chat with video citations | Agent 4 | AGENT_04_RAG_CHAT_ENGINE.md |
| Learning schedule generation | Agent 5 | AGENT_05_LEARNING_CALENDAR.md |
| XP and achievements | Agent 6 | AGENT_06_PROGRESS_GAMIFICATION.md |
| AI quiz generation | Agent 7 | AGENT_07_ASSESSMENT_SYSTEM.md |
| Creator analytics | Agent 8 | AGENT_08_CREATOR_DASHBOARD.md |
| Study partner matching | Agent 9 | AGENT_09_AI_STUDY_BUDDY.md |
| Discord bot commands | Agent 10 | AGENT_10_DISCORD_INTEGRATION.md |
| Knowledge gap detection | Agent 11 | AGENT_11_CONTENT_INTELLIGENCE.md |
| Token rewards and redemption | Agent 12 | AGENT_12_CHRONOS_TOKEN_SYSTEM.md |
| UI design and frontend pages | Agent 13 | AGENT_13_UI_DESIGN_SYSTEM.md |
| Whop integration and MCP server | Agent 14 | AGENT_14_WHOP_INTEGRATION.md |

---

## 🎯 For Junior Developers: How to Use This Index

### Scenario 1: "I need to work on the video upload feature"
1. Look up "Video upload" in Quick Lookup → **Agent 3**
2. Read [`AGENT_03_VIDEO_PROCESSING.md`](./AGENT_03_VIDEO_PROCESSING.md)
3. Code location: `lib/video/` and `jobs/video-processing.ts`

### Scenario 2: "I need to add feature gating to a new API route"
1. Look up "Feature access" in Quick Lookup → **Agent 0**
2. Read [`AGENT_00_FEATURE_GATING.md`](./AGENT_00_FEATURE_GATING.md)
3. Use `withFeatureGate()` middleware from `lib/middleware/feature-gate.ts`

### Scenario 3: "I need to understand how token rewards work"
1. Look up "Token rewards" in Quick Lookup → **Agent 12**
2. Read [`AGENT_12_CHRONOS_TOKEN_SYSTEM.md`](./AGENT_12_CHRONOS_TOKEN_SYSTEM.md)
3. Code location: `lib/tokens/` and `app/api/tokens/`

### Scenario 4: "I need to integrate with Whop webhooks"
1. Look up "Whop" in Quick Lookup → **Agent 2**
2. Read [`AGENT_02_WHOP_INTEGRATION_SUMMARY.md`](./AGENT_02_WHOP_INTEGRATION_SUMMARY.md)
3. Follow [`WHOP_SETUP_GUIDE.md`](./WHOP_SETUP_GUIDE.md) for configuration

---

## 🚀 Agent Build Order (Historical)

This is the order agents were built during the project:

1. **Phase 0:** Agent 0 (Feature Gating) - Foundation
2. **Phase 1:** Agent 1 (Infrastructure), Agent 2 (Whop) - Parallel
3. **Phase 2:** Agent 3 (Video), Agent 4 (RAG Chat) - Parallel
4. **Phase 3:** Agent 5 (Calendar), Agent 6 (Gamification), Agent 7 (Assessment) - Parallel
5. **Phase 4:** Agent 8 (Creator), Agent 9 (Study Buddy), Agent 10 (Discord), Agent 11 (Intelligence) - Parallel
6. **Phase 5:** Agent 12 (Tokens), Agent 13 (UI Design) - New additions

**Total Development Time:** ~55-60 hours (with parallel agent execution)

---

## 📞 Support Contacts by Agent Domain

| Domain | Contact | Agents Covered |
|--------|---------|----------------|
| Authentication & Security | auth-team@mentora.com | Agent 0, 2 |
| Infrastructure & DevOps | devops@mentora.com | Agent 1 |
| AI & Machine Learning | ai-team@mentora.com | Agent 4, 7, 9, 11 |
| Video Processing | video-team@mentora.com | Agent 3 |
| Gamification & UX | ux-team@mentora.com | Agent 5, 6 |
| Analytics & Reporting | analytics@mentora.com | Agent 8, 11 |
| Community & Social | community@mentora.com | Agent 9, 10 |
| Blockchain & Payments | blockchain@mentora.com | Agent 12 |
| UI/UX & Frontend | frontend@mentora.com | Agent 13 |

---

**Index Maintained By:** Development Team
**Last Audit:** October 21, 2025
**Next Scheduled Update:** Monthly (21st of each month)

---

*For questions about this index or to suggest improvements, contact: docs@mentora.com*
