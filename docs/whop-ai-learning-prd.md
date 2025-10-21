# Product Requirements Document: AI Learning Assistant for Whop

**Version:** 1.0  
**Date:** October 20, 2025  
**Status:** Development Phase  
**Owner:** [Your Name]

---

## Executive Summary

Building an AI-powered video learning assistant for Whop creators in the education and coaching space. The app enables students to chat with course content, receive personalized learning schedules, take AI-generated quizzes, and find exact video timestamps for any question.

**Target Market:** Educational creators on Whop (trading education, e-commerce coaching, real estate, fitness, AI training)

**Core Value Proposition:** Save creators 10+ hours/week in student support while increasing course completion rates by 40%+

---

## Problem Statement

### Creator Pain Points
1. **Repetitive Support Questions:** Creators spend 10-15 hours/week answering the same questions students ask repeatedly
2. **Low Completion Rates:** Average course completion is only 15%, leading to refunds and churn
3. **Poor Content Discoverability:** Students can't find specific information in 50+ hours of video content
4. **Manual Quiz Creation:** Creating assessments is time-consuming and inconsistent
5. **No Personalization:** One-size-fits-all course structure doesn't match individual learning pace

### Student Pain Points
1. **Can't Find Answers:** Searching through hours of video to find one piece of information
2. **No Interactive Help:** Stuck on concepts with no immediate assistance
3. **Overwhelmed by Content:** Don't know where to start or how to pace themselves
4. **Passive Learning:** Just watching videos without reinforcement or testing

---

## Product Vision

An AI assistant that transforms passive video courses into interactive, personalized learning experiences where every student gets instant, accurate answers with video references, automatic scheduling, and adaptive assessments.

---

## Target Users

### Primary: Course Creators on Whop
- **Demographics:** 25-45 years old, digital entrepreneurs
- **Top Niches:** Trading education (40%), e-commerce coaching (20%), real estate (15%), fitness (10%), AI/tech (15%)
- **Tech Savvy:** Medium to high, comfortable with SaaS tools
- **Revenue Range:** $5K-$250K/month from courses
- **Student Count:** 50-10,000+ students per creator

### Secondary: Students/Members
- **Demographics:** 18-55 years old, seeking skill development
- **Motivation:** Career advancement, side income, personal growth
- **Learning Style:** Self-paced, practical application-focused
- **Tech Comfort:** Varies, needs intuitive interface

---

## Core Features (MVP)

### Feature 1: AI Chat with Video Search (RAG)

**User Story:** As a student, I want to ask questions about course content and get instant answers with exact video timestamps, so I can learn efficiently without rewatching hours of content.

**Requirements:**
- Natural language chat interface with conversation history
- Semantic search across all video transcripts using vector embeddings
- Responses cite specific videos with clickable timestamps
- Show 3-5 most relevant video segments per query
- Support follow-up questions with context retention
- Thumbs up/down feedback on answer quality
- Response time under 5 seconds for 95% of queries

**Acceptance Criteria:**
- Student can type any question and receive relevant answer
- Answer includes at least one video reference with timestamp
- Clicking timestamp opens video at exact moment
- Chat history persists across sessions
- AI responds "I don't have information on that" when answer not in content

**Priority:** P0 (Must Have)

---

### Feature 2: Automated Video Processing & Indexing

**User Story:** As a creator, I want to bulk upload videos and have them automatically transcribed and indexed, so students can search them immediately without manual work.

**Requirements:**
- Support MP4, MOV, AVI, WebM video formats
- Bulk upload (10+ videos at once)
- Automatic audio extraction and transcription (Whisper API or Deepgram)
- Chunk transcripts into 500-1000 word segments
- Generate vector embeddings for each chunk
- Store embeddings in Supabase pgvector
- Progress indicator showing processing status
- Email notification when processing completes
- Handle videos up to 4 hours in length

**Acceptance Criteria:**
- Creator can drag-and-drop multiple videos
- System processes videos in background
- Dashboard shows "Processing", "Completed", or "Failed" status
- Videos become searchable within 5 minutes per hour of content
- 95% transcription accuracy for clear audio

**Priority:** P0 (Must Have)

---

### Feature 3: AI Quiz Generation

**User Story:** As a creator, I want to automatically generate unique quizzes from my video content, so I can test student comprehension without spending hours writing questions.

**User Story:** As a student, I want to take quizzes that test my understanding and show me what I need to review, so I can verify I've learned the material.

**Requirements:**
- Generate quizzes from selected videos (1-10 videos per quiz)
- Mix question types: multiple choice (4 options), true/false, short answer
- Difficulty levels: Easy, Medium, Hard
- 5-20 questions per quiz
- Each quiz generation is unique (different questions each time)
- Show correct answers and explanations after submission
- Passing score threshold (default 70%)
- Track student attempts and scores
- Display quiz history and performance trends
- Time limits (optional, configurable by creator)

**Acceptance Criteria:**
- Creator selects videos and clicks "Generate Quiz"
- Quiz appears in 30 seconds or less
- Questions are relevant and test key concepts
- Students see score immediately after submission
- Incorrect answers show explanation and video reference
- Creator can see aggregate quiz performance data

**Priority:** P0 (Must Have)

---

### Feature 4: AI Learning Schedule (Calendar)

**User Story:** As a student, I want an AI-generated learning plan that spreads videos over my available time, so I stay on track without feeling overwhelmed.

**Requirements:**
- Input: Target completion date, daily study time available, learning pace preference
- AI generates day-by-day schedule with specific videos assigned
- Schedule includes:
  - Video watching assignments
  - Quiz days (after topic blocks)
  - Rest/review days (every 7 days)
  - Milestone markers
- Calendar view (week/month)
- To-do list view with checkboxes
- Mark videos as completed (auto-sync with watch progress)
- Reschedule remaining items if student falls behind
- Email/push reminders for daily tasks

**Acceptance Criteria:**
- Student completes onboarding form (completion date, pace)
- AI generates complete schedule within 10 seconds
- Calendar shows all assignments spread across available days
- Checking off video updates progress tracker
- Student can request schedule regeneration if pace changes

**Priority:** P1 (Should Have)

---

### Feature 5: Video Progress Tracking

**User Story:** As a student, I want my video progress saved automatically, so I can pick up where I left off and track my completion.

**Requirements:**
- Track last watched position for each video
- Auto-resume from last position
- Mark video as "completed" when watched 90%+
- Progress bar showing % watched
- Dashboard showing overall course completion %
- Filter videos: All, In Progress, Completed, Not Started
- Integration with calendar (completed videos check off schedule)

**Acceptance Criteria:**
- Pausing and returning resumes at exact timestamp
- Completing video marks calendar event as done
- Dashboard accurately reflects completion percentage
- Creator can view student progress in admin panel

**Priority:** P0 (Must Have)

---

### Feature 6: Creator Dashboard

**User Story:** As a creator, I want to see how students are using my course and where they struggle, so I can improve content and support.

**Requirements:**
- Analytics showing:
  - Total students, active students (last 7 days)
  - Video completion rates per video
  - Most asked questions in chat
  - Quiz performance by topic
  - Average time to course completion
  - Drop-off points (where students stop)
- Video management:
  - Upload new videos
  - Edit titles, descriptions, categories
  - Reorder videos
  - Delete videos (with warning)
- Student management:
  - View individual student progress
  - See chat history by student
  - Export student data (CSV)

**Acceptance Criteria:**
- Dashboard loads in under 3 seconds
- All metrics update daily
- Creator can identify struggling students
- Video management actions take effect immediately

**Priority:** P0 (Must Have)

---

### Feature 7: Whop Integration & Authentication

**User Story:** As a creator or student, I want to sign in with my Whop account, so I don't need separate credentials and my membership is verified automatically.

**Requirements:**
- OAuth integration with Whop
- Verify membership status via Whop API
- Sync user info (name, email, membership ID)
- Webhook handlers for:
  - Membership created → provision student access
  - Membership expired → revoke access
  - Payment succeeded → log for analytics
- Support multiple membership tiers (if creator offers)
- Embedded app view (iFrame) or external link from Whop

**Acceptance Criteria:**
- User clicks "Open App" in Whop → auto-authenticated
- Invalid memberships denied access with clear message
- Membership changes reflect within 60 seconds
- App loads within Whop interface seamlessly

**Priority:** P0 (Must Have)

---

## Non-Functional Requirements

### Performance
- Chat response time: < 5 seconds (95th percentile)
- Video processing: < 5 minutes per hour of video
- Dashboard load time: < 3 seconds
- Search results: < 2 seconds
- Support 1000+ concurrent users

### Scalability
- Handle 500 creators initially, plan for 5000
- Support up to 10,000 students per creator
- Store up to 500 videos per creator (250 hours)
- Process 100 videos per day across all creators

### Security
- Encrypt data at rest and in transit (TLS 1.3)
- Store API keys in environment variables only
- Validate Whop webhook signatures
- Rate limiting: 100 requests/minute per user
- SQL injection prevention (parameterized queries)
- GDPR/CCPA compliant (data export, deletion)

### Reliability
- 99.5% uptime target
- Automated backups daily (retain 30 days)
- Error tracking and alerting (Sentry)
- Graceful degradation (if AI API down, show cached responses)

### Usability
- Mobile-responsive design
- Accessible (WCAG 2.1 AA)
- Support modern browsers (Chrome, Firefox, Safari, Edge - last 2 versions)
- Intuitive UI requiring no training
- In-app help tooltips and documentation links

---

## User Flows

### Creator Onboarding Flow
1. Creator installs app from Whop App Store
2. OAuth authentication with Whop
3. Welcome screen: "Upload your first videos"
4. Drag-and-drop video upload interface
5. Processing screen with progress bar
6. "Videos ready! Your students can now chat with your content"
7. Tour of creator dashboard features

### Student Learning Flow
1. Student accesses app from Whop community
2. Auto-authenticated via Whop membership
3. Welcome screen: "Let's create your learning plan"
4. Onboarding form: completion date, daily time available, pace
5. AI generates personalized schedule
6. Dashboard shows: Today's tasks, chat interface, progress
7. Student asks question → AI responds with video link
8. Student watches recommended video
9. Video marked complete → calendar updates
10. Weekly quiz appears → student takes and passes
11. Repeat until course completion

### Chat Interaction Flow
1. Student types question in chat box
2. Loading indicator: "Searching videos..."
3. AI response appears with:
   - Text answer
   - 2-3 video references with timestamps
   - "Was this helpful?" thumbs up/down
4. Student clicks video link → opens in new panel at timestamp
5. Student can ask follow-up questions

---

## Success Metrics (KPIs)

### Product Metrics
- **Activation:** % of creators who upload at least 5 videos (Target: 80%)
- **Engagement:** Average chat messages per student per week (Target: 10+)
- **Retention:** % of students who complete 50%+ of course (Target: 60%)
- **Quality:** Thumbs up rate on AI responses (Target: 85%+)
- **Efficiency:** Average creator support time saved per week (Target: 10 hours)

### Business Metrics
- **Adoption:** Number of paying creators (Target: 10 in Month 1, 100 by Month 6)
- **Revenue:** Monthly Recurring Revenue (Target: $10K by Month 6)
- **Churn:** Monthly creator churn rate (Target: < 5%)
- **NPS:** Net Promoter Score from creators (Target: 50+)
- **Conversion:** Trial to paid conversion rate (Target: 40%)

### Technical Metrics
- **Uptime:** 99.5%+
- **API Response Time:** p95 < 5 seconds
- **Error Rate:** < 0.5% of requests
- **Video Processing Success Rate:** > 98%

---

## Pricing Strategy

### Tiered Pricing Model

**Starter:** $49/month
- Up to 50 videos
- Up to 100 students
- All core features
- Email support

**Professional:** $99/month  
- Up to 200 videos
- Up to 500 students
- Priority AI processing
- Advanced analytics
- Priority support

**Enterprise:** $249/month
- Unlimited videos
- Unlimited students
- White-label options
- API access
- Dedicated support
- Custom AI training

### Alternative: Revenue Share
- 10% of creator's monthly revenue
- Better for new creators with lower upfront costs
- Aligns incentives

---

## Launch Strategy

### Phase 1: Private Beta (Weeks 5-6)
- 10 hand-picked creators
- Direct onboarding support
- Daily feedback calls
- Goal: Validate core features, identify bugs

### Phase 2: Public Launch (Week 7)
- Whop App Store listing goes live
- Marketing: Outreach to 100 creators/day
- Content: Demo video, blog post, tweets
- Goal: 50 trial signups

### Phase 3: Growth (Months 2-6)
- Feature iteration based on feedback
- Paid advertising ($500-1000/month)
- Partnership with Whop for featured placement
- Goal: 100 paying creators, $10K MRR

---

## Risks & Mitigation

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| AI costs exceed revenue | High | Medium | Implement caching, rate limits, pass-through pricing |
| Low creator adoption | High | Medium | Offer done-for-you setup, money-back guarantee |
| Transcription accuracy issues | Medium | Low | Human review for flagged content, allow manual editing |
| Whop API changes break integration | Medium | Low | Stay active in dev community, abstract Whop logic |
| Competitor launches similar tool | Medium | Medium | Move fast, build switching costs, focus on Whop niche |

---

## Future Features (Post-MVP)

### Phase 2 (Months 4-6)
- Live session integration and recording
- Student discussion forums
- Advanced quiz types (video-based questions)
- Spaced repetition quiz scheduling
- Mobile app (React Native)

### Phase 3 (Months 7-12)
- Social learning features (study groups, leaderboards)
- Content repurposing (videos → blog posts, social clips)
- Creator marketplace (sell course templates)
- White-label course platform
- Multi-language support

---

## Technical Stack Summary

**Frontend:** Next.js 14, React, TypeScript, Tailwind CSS, shadcn/ui  
**Backend:** Next.js API routes, Node.js  
**Database:** Neon PostgreSQL with pgvector  
**AI/ML:** Claude 3.5 Sonnet, OpenAI (embeddings, Whisper)  
**Video Storage:** S3/Cloudflare R2  
**Hosting:** Vercel  
**Authentication:** Whop OAuth  
**Monitoring:** Sentry, PostHog  
**Background Jobs:** Inngest/Trigger.dev

---

## Appendix

### Glossary
- **RAG (Retrieval Augmented Generation):** AI technique that searches documents before generating responses
- **Vector Embeddings:** Numerical representations of text that enable semantic search
- **pgvector:** PostgreSQL extension for storing and searching vector embeddings
- **Whop:** Social commerce platform for digital products and communities

### References
- Whop Developer Documentation: https://docs.whop.com
- Whop App Store: https://whop.com/discover/app-store
- Claude API Documentation: https://docs.anthropic.com
- OpenAI Embeddings Guide: https://platform.openai.com/docs/guides/embeddings

---

**Document Control**

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | Oct 20, 2025 | [Your Name] | Initial PRD creation |

---

*This PRD is a living document and will be updated as requirements evolve during development.*