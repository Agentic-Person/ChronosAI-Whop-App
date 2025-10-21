# Content Intelligence Module

AI-powered intelligence system for Video Wizard (Mentora) that analyzes learning patterns, detects knowledge gaps, and provides actionable insights.

## Module Overview

**Status**: ✅ Complete
**Agent**: Agent 11 - Content Intelligence Specialist
**Tier**: ENTERPRISE only
**Dependencies**: RAG Chat (Agent 4), Assessments (Agent 7), Creator Dashboard (Agent 8)

## What's Included

### Core Services

1. **gap-detector.ts** - Knowledge gap detection using AI
2. **adaptive-difficulty.ts** - Adaptive difficulty engine
3. **recommendation-engine.ts** - Content recommendation system
4. **engagement-analytics.ts** - Engagement prediction
5. **content-health.ts** - Content quality monitoring
6. **insights-generator.ts** - AI insights for creators
7. **inngest-jobs.ts** - Background automation

### API Routes (All ENTERPRISE Gated)

- GET /api/intelligence/gaps
- POST /api/intelligence/gaps
- GET /api/intelligence/recommendations
- POST /api/intelligence/recommendations/path
- GET /api/intelligence/engagement
- GET /api/intelligence/insights
- GET /api/intelligence/health

### React Components

- KnowledgeGapWidget - Student gap display
- EngagementScore - Gamified engagement display
- InsightsPanel - Creator insights dashboard

## Documentation

See /docs/CONTENT_INTELLIGENCE.md for full documentation.
