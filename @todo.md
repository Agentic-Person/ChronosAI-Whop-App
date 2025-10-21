# Mentora - Development TODO & Session Guide

**Purpose**: Pick up development from any point in any session
**Last Updated**: October 20, 2025 (Session 2)
**Current Phase**: Documentation Phase → 7/11 Modules Fully Documented
**Documentation Progress**: ~70% Complete

---

## 🎯 Quick Session Start

### New to the project?
1. Read `/README.md` - Project overview
2. Read `/CLAUDE.md` - Technical blueprint
3. Read `/tasks/README.md` - Documentation guide
4. Return here to see what's next

### Continuing development?
1. Check "What's Next" section below
2. Review module status
3. Pick a task and go!

---

## ✅ Completed (100%)

### Foundation & Infrastructure
- [x] **Next.js 14 Project Setup** (946 packages installed)
- [x] **TypeScript Configuration** (strict mode enabled)
- [x] **Tailwind CSS + shadcn/ui** (with custom animations)
- [x] **Testing Infrastructure** (Jest, Playwright, React Testing Library)
- [x] **Environment Template** (.env.example created)
- [x] **Git Configuration** (.gitignore properly set up)

### Database & Types
- [x] **Complete Database Schema** (15+ tables)
  - creators, students, videos, video_chunks (with pgvector)
  - chat_sessions, chat_messages
  - quizzes, quiz_attempts, projects, project_submissions
  - calendar_events, video_progress
  - study_groups, study_group_members
  - achievements, student_achievements
  - discord_links, analytics_events
- [x] **Supabase Migrations** (3 migration files)
- [x] **Achievement Seed Data** (20+ pre-defined achievements)
- [x] **TypeScript Type Definitions** (database.ts, api.ts - 30+ interfaces)
- [x] **RLS Policies** (enabled on all tables)
- [x] **Performance Indexes** (including pgvector ivfflat index)

### Utilities & Shared Code
- [x] **Supabase Client** (lib/utils/supabase-client.ts)
- [x] **Helper Functions** (lib/utils/helpers.ts - 50+ functions)
- [x] **Constants** (lib/utils/constants.ts - XP values, rate limits, errors)
- [x] **Test Utilities** (tests/utils/test-helpers.ts)

### Documentation (32 Files Created)
- [x] **README.md** - GitHub-ready project overview
- [x] **CLAUDE.md** - Technical reference guide
- [x] **PROJECT_SUMMARY.md** - Executive summary
- [x] **DEVELOPMENT_STATUS.md** - Progress tracking
- [x] **@todo.md** - This file!
- [x] **7 Modules Fully Documented** (20+ files total in /tasks/)
  - Module 1, 2, 4, 5, 6, 7, 8 with OVERVIEW, ARCHITECTURE, IMPLEMENTATION guides

### Module-Specific Documentation

#### Module 1: RAG Chat Engine ✅ FULLY DOCUMENTED
- [x] `/tasks/01-rag-chat-engine/OVERVIEW.md` (9KB)
- [x] `/tasks/01-rag-chat-engine/ARCHITECTURE.md` (12KB)
- [x] `/tasks/01-rag-chat-engine/IMPLEMENTATION.md` (15KB)
- **Status**: Ready to implement - full working code examples provided

#### Module 2: Video Processing Pipeline ✅ FULLY DOCUMENTED
- [x] `/tasks/02-video-processing-pipeline/OVERVIEW.md` (8KB)
- [x] `/tasks/02-video-processing-pipeline/PROCESSING_FLOW.md` (11KB)
- **Status**: Architecture complete, ready for implementation

#### Module 4: Learning Calendar ✅ FULLY DOCUMENTED
- [x] `/tasks/04-learning-calendar/OVERVIEW.md` (14KB)
- [x] `/tasks/04-learning-calendar/IMPLEMENTATION.md` (18KB)
- **Status**: AI calendar generation + adaptive scheduling ready to build

#### Module 5: Progress & Gamification ✅ FULLY DOCUMENTED
- [x] `/tasks/05-progress-gamification/OVERVIEW.md` (10KB)
- **Status**: Features defined, ready for implementation

#### Module 6: Creator Dashboard ✅ FULLY DOCUMENTED
- [x] `/tasks/06-creator-dashboard/OVERVIEW.md` (15KB)
- [x] `/tasks/06-creator-dashboard/IMPLEMENTATION.md` (16KB)
- **Status**: Complete dashboard with analytics, video upload, student management

#### Module 7: Whop Integration ✅ FULLY DOCUMENTED (CRITICAL)
- [x] `/tasks/07-whop-integration/OVERVIEW.md` (12KB)
- **Status**: Security guidelines complete, ready for implementation

#### Module 8: Backend Infrastructure ✅ FULLY DOCUMENTED (CRITICAL)
- [x] `/tasks/08-backend-infrastructure/OVERVIEW.md` (13KB)
- [x] `/tasks/08-backend-infrastructure/ARCHITECTURE.md` (14KB)
- [x] `/tasks/08-backend-infrastructure/IMPLEMENTATION.md` (17KB)
- **Status**: Complete setup guide - database, caching, jobs, monitoring

---

## 🏗️ In Progress (0%)

### Currently Nothing In Progress
All foundation work is complete. Ready to start implementation!

---

## 📋 What's Next - Priority Order

### PHASE 1: Backend Setup (Week 1) - START HERE!

#### Task 1.1: Set Up Development Environment
**Time Estimate**: 2 hours
**Priority**: CRITICAL

- [ ] Clone repository (if not done)
- [ ] Run `npm install --legacy-peer-deps`
- [ ] Copy `.env.example` to `.env`
- [ ] Obtain and fill in API keys:
  - [ ] Whop developer account + API keys
  - [ ] Supabase project + keys
  - [ ] Anthropic API key (Claude)
  - [ ] OpenAI API key
  - [ ] AWS S3 or Cloudflare R2 credentials
- [ ] Run `npm run db:migrate` to set up database
- [ ] Test: `npm run dev` - should start without errors

**Documentation**:
- Environment setup: `/README.md` (Quick Start section)
- API key locations: `/.env.example`

---

#### Task 1.2: Implement Module 8 - Backend Infrastructure
**Time Estimate**: 1 week
**Priority**: P0 - MUST BE FIRST

**Why First?**: All other modules depend on this foundation

**Implementation Tasks**:
- [ ] **Supabase Client Enhancement** (`lib/infrastructure/supabase-client.ts`)
  - [ ] Connection pooling
  - [ ] Query builders
  - [ ] Transaction support

- [ ] **Cache Service** (`lib/infrastructure/cache-service.ts`)
  - [ ] Choose: Redis vs Vercel KV
  - [ ] Implement get/set/delete
  - [ ] Set up TTL and invalidation
  - [ ] Cache embeddings and AI responses

- [ ] **Job Queue** (`lib/infrastructure/job-queue.ts`)
  - [ ] Choose: Inngest vs Trigger.dev
  - [ ] Set up job definitions
  - [ ] Implement retry logic
  - [ ] Create worker functions

- [ ] **Rate Limiter** (`lib/infrastructure/rate-limiter.ts`)
  - [ ] Sliding window algorithm
  - [ ] Per-user and per-endpoint limits
  - [ ] Redis-backed storage

- [ ] **Monitoring** (`lib/infrastructure/monitoring.ts`)
  - [ ] Sentry integration
  - [ ] Custom metrics tracking
  - [ ] Error alerting setup

- [ ] **Health Checks** (`app/api/health/route.ts`)
  - [ ] Database health endpoint
  - [ ] Cache health endpoint
  - [ ] External services check

**Documentation to Read**:
- `/tasks/08-backend-infrastructure/` (create this first!)
- Supabase docs: https://supabase.com/docs
- Inngest docs: https://inngest.com/docs

**Success Criteria**:
- [ ] Database queries working
- [ ] Caching functional
- [ ] Jobs can be queued and processed
- [ ] Health checks return 200 OK
- [ ] Sentry catching errors

---

#### Task 1.3: Implement Module 7 - Whop Integration
**Time Estimate**: 1 week
**Priority**: P0 - REQUIRED FOR AUTH

**Why Second?**: Authentication gates all features

**Implementation Tasks**:
- [ ] **OAuth Service** (`lib/whop/auth.ts`)
  - [ ] Implement `getAuthUrl()`
  - [ ] Implement `exchangeCodeForTokens()`
  - [ ] Implement `refreshToken()`
  - [ ] Token storage in secure cookies

- [ ] **Webhook Handler** (`lib/whop/webhooks.ts`)
  - [ ] Signature verification (CRITICAL!)
  - [ ] Event routing logic
  - [ ] Idempotency checks
  - [ ] Handle membership.created
  - [ ] Handle membership.expired
  - [ ] Handle payment.succeeded

- [ ] **Membership Validator** (`lib/whop/membership.ts`)
  - [ ] Check membership status
  - [ ] Validate tiers
  - [ ] Cache validation results

- [ ] **API Routes**
  - [ ] `app/api/whop/auth/route.ts` - Start OAuth
  - [ ] `app/api/whop/callback/route.ts` - Handle callback
  - [ ] `app/api/whop/webhooks/route.ts` - Receive webhooks
  - [ ] `app/api/whop/verify/route.ts` - Verify session

- [ ] **Middleware** (`middleware.ts`)
  - [ ] Protect all /dashboard routes
  - [ ] Protect all /api routes
  - [ ] Inject user data into requests

**Documentation to Read**:
- `/tasks/07-whop-integration/OVERVIEW.md` ✅ Already complete
- Create: `/tasks/07-whop-integration/IMPLEMENTATION.md`
- Whop API docs: https://docs.whop.com

**Testing**:
- [ ] OAuth flow works end-to-end
- [ ] Webhook signature validation works
- [ ] Invalid memberships blocked
- [ ] Token refresh works automatically

**Success Criteria**:
- [ ] Can sign in with Whop
- [ ] Webhooks processed correctly
- [ ] Protected routes require auth
- [ ] All tests passing

---

### PHASE 2: Core Features (Weeks 2-3)

#### Task 2.1: Implement Module 2 - Video Processing Pipeline
**Time Estimate**: 1 week
**Priority**: P0

**Why Third?**: Creates searchable content for RAG

**Implementation Tasks**:
- [ ] **Upload Handler** (`lib/video/upload-handler.ts`)
  - [ ] S3/R2 signed URL generation
  - [ ] File validation
  - [ ] Progress tracking
  - [ ] Database record creation

- [ ] **Transcription Service** (`lib/video/transcription.ts`)
  - [ ] Whisper API integration
  - [ ] Audio extraction with ffmpeg
  - [ ] Long video splitting (>25MB)
  - [ ] Timestamp preservation

- [ ] **Chunking Algorithm** (`lib/video/chunking.ts`)
  - [ ] 500-1000 word segments
  - [ ] 100-word overlap
  - [ ] Natural sentence breaks
  - [ ] Timestamp mapping

- [ ] **Embedding Generator** (`lib/video/embedding-generator.ts`)
  - [ ] OpenAI embeddings API
  - [ ] Batch processing
  - [ ] Rate limiting
  - [ ] Cost tracking

- [ ] **Background Jobs** (using Module 8 job queue)
  - [ ] `jobs/process-video.ts`
  - [ ] `jobs/generate-embeddings.ts`

- [ ] **API Routes**
  - [ ] `app/api/video/upload-url/route.ts`
  - [ ] `app/api/video/create/route.ts`
  - [ ] `app/api/video/status/[id]/route.ts`

- [ ] **React Components**
  - [ ] `components/video/VideoUploader.tsx`
  - [ ] `components/video/ProcessingStatus.tsx`
  - [ ] `components/video/VideoList.tsx`

**Documentation to Read**:
- `/tasks/02-video-processing-pipeline/OVERVIEW.md` ✅
- `/tasks/02-video-processing-pipeline/PROCESSING_FLOW.md` ✅
- Create: `/tasks/02-video-processing-pipeline/IMPLEMENTATION.md`

**Success Criteria**:
- [ ] Videos upload successfully
- [ ] Transcription completes in <5 min/hour
- [ ] Embeddings stored in pgvector
- [ ] Status updates in real-time

---

#### Task 2.2: Implement Module 1 - RAG Chat Engine
**Time Estimate**: 1 week
**Priority**: P0

**Why Fourth?**: Core student-facing feature

**Implementation Tasks**:
- [ ] **Vector Search Service** (`lib/rag/vector-search.ts`)
  - ✅ Code already provided in IMPLEMENTATION.md
  - [ ] Copy and adapt code
  - [ ] Test with real data

- [ ] **Context Builder** (`lib/rag/context-builder.ts`)
  - ✅ Code already provided
  - [ ] Copy and adapt

- [ ] **Chat Service** (`lib/rag/chat-service.ts`)
  - ✅ Code already provided
  - [ ] Copy and adapt

- [ ] **RAG Engine** (`lib/rag/rag-engine.ts`)
  - ✅ Code already provided
  - [ ] Copy and adapt
  - [ ] Integrate with Claude API

- [ ] **API Routes** (code provided in docs)
  - [ ] `app/api/chat/route.ts`
  - [ ] `app/api/chat/history/route.ts`
  - [ ] `app/api/chat/feedback/route.ts`

- [ ] **React Components**
  - [ ] `components/chat/ChatInterface.tsx`
  - [ ] `components/chat/MessageList.tsx`
  - [ ] `components/chat/MessageInput.tsx`
  - [ ] `components/chat/VideoReferenceCard.tsx`
  - [ ] `components/chat/FeedbackButtons.tsx`

**Documentation to Read**:
- `/tasks/01-rag-chat-engine/OVERVIEW.md` ✅
- `/tasks/01-rag-chat-engine/ARCHITECTURE.md` ✅
- `/tasks/01-rag-chat-engine/IMPLEMENTATION.md` ✅ (Has all code!)

**Success Criteria**:
- [ ] Students can ask questions
- [ ] Responses cite videos with timestamps
- [ ] Response time <5 seconds
- [ ] Conversation history persists
- [ ] Feedback mechanism works

---

### PHASE 3: Student Experience (Week 4)

#### Task 3.1: Implement Module 4 - Learning Calendar
**Time Estimate**: 4-5 days
**Priority**: P0

- [ ] Create documentation first
- [ ] Implement AI schedule generator
- [ ] Build calendar UI (React Big Calendar)
- [ ] Add onboarding flow
- [ ] Rescheduling logic

**Documentation Needed**:
- [ ] Create `/tasks/04-learning-calendar/OVERVIEW.md`
- [ ] Create `/tasks/04-learning-calendar/IMPLEMENTATION.md`

---

#### Task 3.2: Implement Module 5 - Progress & Gamification
**Time Estimate**: 1 week
**Priority**: P0

**Implementation Tasks**:
- [ ] **XP & Leveling** (`lib/progress/gamification-engine.ts`)
  - [ ] XP calculation
  - [ ] Level-up detection
  - [ ] Exponential progression

- [ ] **Achievement System** (`lib/progress/achievement-system.ts`)
  - [ ] Check unlock criteria
  - [ ] Award achievements
  - [ ] Track unlocks

- [ ] **Animations** (components/progress/animations/)
  - [ ] `StarsExplosion.tsx` - Video completion
  - [ ] `TrophyAnimation.tsx` - Quiz pass
  - [ ] `RocketLaunch.tsx` - Project submit
  - [ ] `FireworksDisplay.tsx` - Weekly goals
  - [ ] `LevelUpModal.tsx` - Level up
  - [ ] `ConfettiCelebration.tsx` - General wins

- [ ] **Progress Components**
  - [ ] `CircularProgress.tsx` - Course completion
  - [ ] `LevelBadge.tsx` - Current level
  - [ ] `StreakCounter.tsx` - Daily streak
  - [ ] `HeatMap.tsx` - Activity calendar
  - [ ] `ProgressChart.tsx` - Charts

**Documentation to Read**:
- `/tasks/05-progress-gamification/OVERVIEW.md` ✅
- Create: `/tasks/05-progress-gamification/ANIMATIONS.md`
- Create: `/tasks/05-progress-gamification/IMPLEMENTATION.md`

**Success Criteria**:
- [ ] XP awarded correctly
- [ ] Level-ups trigger animations
- [ ] Achievements unlock properly
- [ ] All 5 celebration types work
- [ ] 60fps animations

---

### PHASE 4: Creator Tools (Week 5)

#### Task 4.1: Implement Module 6 - Creator Dashboard
**Time Estimate**: 1 week
**Priority**: P0

- [ ] Create documentation
- [ ] Build analytics views
- [ ] Implement video management
- [ ] Add export functionality
- [ ] Create project management UI

**Documentation Needed**:
- [ ] Create `/tasks/06-creator-dashboard/OVERVIEW.md`
- [ ] Create `/tasks/06-creator-dashboard/IMPLEMENTATION.md`

---

### PHASE 5: Enhanced Features (Weeks 6+)

#### Task 5.1: Implement Module 3 - Assessment System
**Time Estimate**: 1.5 weeks
**Priority**: P1

From scaffold to full implementation:
- [ ] AI quiz generation
- [ ] Project templates
- [ ] Code review system
- [ ] Peer review

---

#### Task 5.2: Implement Module 9 - AI Study Buddy
**Time Estimate**: 1 week
**Priority**: P2

From scaffold to full implementation:
- [ ] Matching algorithm
- [ ] Study group formation
- [ ] Collaboration features

---

#### Task 5.3: Implement Module 10 - Discord Integration
**Time Estimate**: 1 week
**Priority**: P2

From scaffold to full implementation:
- [ ] Discord bot setup
- [ ] Slash commands
- [ ] Channel management

---

#### Task 5.4: Implement Module 11 - Content Intelligence
**Time Estimate**: 1 week
**Priority**: P3

From scaffold to full implementation:
- [ ] Knowledge gap detection
- [ ] Adaptive difficulty
- [ ] Analytics pipeline

---

## 🔧 Technical Decisions Needed

### Before Implementation
- [ ] **Storage**: AWS S3 vs Cloudflare R2? (R2 recommended - cheaper)
- [ ] **Caching**: Redis vs Vercel KV? (Vercel KV easier for MVP)
- [ ] **Job Queue**: Inngest vs Trigger.dev? (Inngest recommended)
- [ ] **Transcription**: Whisper API vs Deepgram? (Whisper cheaper)

### During Implementation
- [ ] Max video length? (Recommend 4 hours)
- [ ] Video retention policy?
- [ ] XP decay over time?
- [ ] Global vs cohort leaderboards?
- [ ] Sound effects on/off by default?

---

## 📊 Progress Tracking

### Completion Metrics
- Foundation: **100%** ✅
- Documentation: **40%** (4/11 modules fully documented)
- Implementation: **0%** (ready to start!)

### Module Status
| Module | Docs | Code | Tests | Status |
|--------|------|------|-------|--------|
| 1. RAG Chat | ✅ | ⏳ | ⏳ | Ready to code |
| 2. Video Processing | ✅ | ⏳ | ⏳ | Ready to code |
| 3. Assessments | ⏳ | ⏳ | ⏳ | Need docs |
| 4. Calendar | ⏳ | ⏳ | ⏳ | Need docs |
| 5. Progress/Gamification | ✅ | ⏳ | ⏳ | Ready to code |
| 6. Dashboard | ⏳ | ⏳ | ⏳ | Need docs |
| 7. Whop | ✅ | ⏳ | ⏳ | Ready to code |
| 8. Infrastructure | ⏳ | ⏳ | ⏳ | Need docs |
| 9. Study Buddy | ⏳ | ⏳ | ⏳ | Scaffold only |
| 10. Discord | ⏳ | ⏳ | ⏳ | Scaffold only |
| 11. Intelligence | ⏳ | ⏳ | ⏳ | Scaffold only |

---

## 🎯 Quick Commands Reference

```bash
# Development
npm run dev              # Start dev server
npm run build            # Build for production
npm run start            # Run production build

# Testing
npm test                 # Unit tests
npm run test:watch       # Watch mode
npm run test:integration # Integration tests
npm run test:e2e         # E2E tests

# Database
npm run db:migrate       # Run migrations
npm run db:reset         # Reset database

# Code Quality
npm run lint             # ESLint
npm run type-check       # TypeScript
```

---

## 📚 Documentation Quick Links

- **Project Overview**: `/README.md`
- **Technical Guide**: `/CLAUDE.md`
- **Current Status**: `/DEVELOPMENT_STATUS.md`
- **Executive Summary**: `/PROJECT_SUMMARY.md`
- **Module Index**: `/tasks/README.md`

### Module Documentation
- Module 1 (RAG): `/tasks/01-rag-chat-engine/`
- Module 2 (Video): `/tasks/02-video-processing-pipeline/`
- Module 5 (Progress): `/tasks/05-progress-gamification/`
- Module 7 (Whop): `/tasks/07-whop-integration/`

---

## 🚨 Critical Reminders

1. **ALWAYS verify Whop webhook signatures** - security critical!
2. **NEVER expose secrets to frontend** - use server-side only
3. **Test with real Whop sandbox** before production
4. **Monitor AI API costs** - can get expensive quickly
5. **Rate limit everything** - prevent abuse
6. **Write tests first** - TDD approach
7. **Update documentation** as you code

---

## ✅ Session End Checklist

Before ending a coding session:
- [ ] Commit your changes with descriptive message
- [ ] Update this @todo.md with progress
- [ ] Document any blockers or decisions needed
- [ ] Push to remote repository
- [ ] Update DEVELOPMENT_STATUS.md if milestone reached

---

## 💡 Tips for Success

- **Start Small**: Implement one feature completely before moving on
- **Follow the Docs**: Each module has step-by-step guides
- **Test Early**: Write tests as you go, not after
- **Ask Questions**: Add questions to module docs when stuck
- **Celebrate Wins**: Mark tasks complete and feel the progress!

---

**Last Session**: Project foundation completed
**Next Session**: Start with Task 1.1 (Environment Setup) or Task 1.2 (Backend Infrastructure)

**Ready to build? Pick a task and go! 🚀**
