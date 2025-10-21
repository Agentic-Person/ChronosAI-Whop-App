# Module 11: Content Intelligence - Overview

## Executive Summary

Content Intelligence uses advanced AI and machine learning to transform a static video library into an adaptive, self-optimizing learning platform. By analyzing student behavior, content effectiveness, and knowledge gaps, the system automatically improves curriculum quality, personalizes learning paths, and helps creators make data-driven decisions about what content to create next.

**Status**: Future Implementation (P3)
**Priority**: P3 (Advanced optimization feature)
**Dependencies**: All other modules (requires data from learning progress, assessments, RAG chat)

## Problem Statement

### Why Content Intelligence Matters for Scale

**Creator Pain Points**:
- ❌ No idea which videos are working vs falling flat
- ❌ Students skip videos or drop off - don't know why
- ❌ Hard to know what content to create next
- ❌ Manual curriculum planning takes hours
- ❌ Can't personalize learning paths at scale
- ❌ Miss content gaps until students complain
- ❌ No systematic way to improve content quality

**Student Pain Points**:
- ❌ Get stuck on videos that are too advanced
- ❌ Waste time on content they already know
- ❌ Don't know the optimal learning path
- ❌ Missing prerequisite knowledge causes confusion
- ❌ Generic curriculum doesn't match their goals

### The Opportunity

**What Data We Have**:
- Video completion rates and drop-off points
- Quiz performance by topic and difficulty
- RAG chat questions (what students are confused about)
- Time spent per video
- Learning pace and patterns
- Student backgrounds and goals
- Content relationships (transcripts, topics)

**What We Can Do With It**:
- Detect knowledge gaps in curriculum
- Predict which students will struggle
- Recommend optimal next video for each student
- Identify prerequisite relationships automatically
- Flag low-quality or confusing content
- Generate personalized learning paths
- Suggest new content topics to create

### What We're Building

An AI-powered content intelligence system that:
- ✅ **Content Gap Detection** - Find missing topics in curriculum
- ✅ **Learning Path Optimization** - Personalize sequence for each student
- ✅ **Video Quality Analysis** - Score videos on clarity, pacing, engagement
- ✅ **Predictive Analytics** - Forecast student success and identify at-risk learners
- ✅ **Automated Tagging** - Extract topics, skills, prerequisites from videos
- ✅ **Knowledge Graph** - Visual map of content relationships
- ✅ **Content Recommendations** - "Create this content next" suggestions
- ✅ **A/B Testing** - Experiment with different learning paths

## Success Metrics

| Metric | Target | Current | Impact |
|--------|--------|---------|--------|
| **Curriculum Coverage** | >95% topics | ~60% | Fill gaps |
| **Personalization Accuracy** | >85% | 0% | Custom paths |
| **Content Quality Score** | >4.2/5.0 | Unknown | Data-driven improvement |
| **Student Success Prediction** | >80% accuracy | N/A | Early intervention |
| **Completion Rate Increase** | +25% | baseline | Better paths |
| **Creator Content Planning Time** | -70% | baseline | AI suggestions |
| **Knowledge Retention** | +30% | baseline | Optimal sequencing |

## Core Features

### 1. Content Gap Detection

**The Problem**:

Creators don't know what topics are missing from their curriculum until students point it out. By then, students are already confused.

**The Solution**:

Analyze transcripts, quiz questions, and chat logs to identify missing topics:

```
Input: All video transcripts + quiz questions
↓
1. Extract all taught concepts using Claude AI
   - Example: "React useState hook", "API calls with fetch"
2. Build topic taxonomy (hierarchy of concepts)
   - React → Hooks → useState, useEffect, useContext
3. Identify referenced but not taught concepts
   - Video mentions "closures" but no closure video exists
4. Analyze student questions from RAG chat
   - Students ask about "deployment" but no deployment videos
5. Generate gap report
↓
Output: "Your curriculum is missing content on:
  - React Context API (mentioned 15x, taught 0x)
  - Deployment to Vercel (asked about 23x)
  - Error handling patterns (prerequisite for 5 advanced videos)"
```

**Gap Detection Algorithm**:

```typescript
interface ContentGap {
  topic: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  evidence: {
    mentionedInVideos: number; // Times topic referenced but not taught
    questionsAsked: number; // RAG chat questions about this
    prerequisiteFor: string[]; // Video IDs that need this
  };
  suggestedContent: {
    title: string;
    description: string;
    estimatedLength: string; // "10-15 minutes"
  };
}
```

**Example Output**:

```json
{
  "gaps": [
    {
      "topic": "React Context API",
      "severity": "critical",
      "evidence": {
        "mentionedInVideos": 15,
        "questionsAsked": 34,
        "prerequisiteFor": ["video-45", "video-67", "video-89"]
      },
      "suggestedContent": {
        "title": "Understanding React Context for State Management",
        "description": "Learn how to use Context API to avoid prop drilling and manage global state in React applications.",
        "estimatedLength": "12-15 minutes"
      }
    }
  ]
}
```

### 2. Personalized Learning Paths

**The Problem**:

One-size-fits-all curriculum doesn't work. Beginners need fundamentals, advanced students can skip basics, career-switchers need portfolio focus.

**The Solution**:

Generate custom learning paths based on:
- Student's current skill level (assessed via quiz)
- Learning goals ("get job", "build portfolio", "master React")
- Available time (5 hours/week vs 20 hours/week)
- Learning pace (slow, moderate, fast)
- Strengths and weaknesses (good at logic, struggles with CSS)

**Path Generation Algorithm**:

```typescript
interface LearningPath {
  studentId: string;
  goal: string; // "Get React job"
  totalDuration: string; // "12 weeks"
  modules: PathModule[];
  milestones: Milestone[];
}

interface PathModule {
  moduleId: number;
  title: string;
  videos: PathVideo[];
  estimatedTime: string; // "8 hours"
  why: string; // "Essential for understanding state management"
}

interface PathVideo {
  videoId: string;
  title: string;
  order: number;
  required: boolean; // false = optional based on skill level
  estimatedTime: number; // minutes
  prerequisites: string[]; // Video IDs
}
```

**Personalization Logic**:

```
Input: Student profile + goal
↓
1. Assess current skill level
   - Take diagnostic quiz
   - Analyze any completed videos
   - Check background (student.bio)
↓
2. Identify skill gaps to reach goal
   - Goal: "React job" → Need: components, hooks, routing, state, API calls
   - Check what student already knows
↓
3. Build prerequisite graph
   - useState requires: JS functions, variables
   - useEffect requires: useState, async/await
↓
4. Optimize path
   - Skip videos on topics already mastered
   - Add extra practice for weak areas
   - Adjust pace based on available time
↓
5. Generate custom sequence
   - Order videos by prerequisites
   - Add milestones (quizzes, projects)
   - Estimate completion timeline
↓
Output: Custom 12-week path to React job
```

**Example: Two Different Paths for Same Goal**

**Student A** (Beginner, 5 hours/week, weak at JS):
```
Week 1-2: JavaScript Fundamentals (20 videos)
Week 3-4: React Basics (15 videos)
Week 5-6: Component Patterns (12 videos)
Week 7-8: State Management (10 videos)
Week 9-10: API Integration (8 videos)
Week 11-12: Portfolio Project (2 videos)
Total: 16 weeks (adjusted for pace)
```

**Student B** (Experienced JS dev, 20 hours/week):
```
Week 1: React Fundamentals (8 videos) - skip JS basics
Week 2: Advanced Hooks (6 videos)
Week 3: State Management (5 videos)
Week 4: Next.js & Deployment (7 videos)
Week 5-6: Portfolio Project (2 videos)
Total: 6 weeks
```

### 3. Video Quality Analysis

**The Problem**:

Creators don't know which videos are high/low quality objectively. Students drop off but we don't know if it's content, pacing, or complexity.

**The Solution**:

AI-powered video analysis scoring each video on:

**Quality Dimensions**:

1. **Content Clarity** (0-100)
   - Measured by: Student questions in RAG chat about this video
   - Low clarity = many "I don't understand X" questions
   - High clarity = few questions, high quiz scores

2. **Pacing** (0-100)
   - Measured by: Drop-off curve analysis
   - Bad pacing = sudden drop-off at specific timestamp
   - Good pacing = gradual completion, low rewind rate

3. **Engagement** (0-100)
   - Measured by: Completion rate, time on video vs length
   - High engagement = >80% completion, minimal skipping
   - Low engagement = <50% completion, lots of skipping

4. **Audio/Visual Quality** (0-100)
   - Measured by: Transcription accuracy, student feedback
   - Poor quality = many transcription errors, complaints
   - Good quality = clean transcription, no complaints

5. **Prerequisite Alignment** (0-100)
   - Measured by: Students who struggle came from wrong prereqs
   - Misaligned = students without prereqs fail quiz
   - Aligned = students with prereqs pass easily

**Quality Report**:

```typescript
interface VideoQualityReport {
  videoId: string;
  overallScore: number; // 0-100
  scores: {
    clarity: number;
    pacing: number;
    engagement: number;
    audioVisual: number;
    prerequisiteAlignment: number;
  };
  issues: VideoIssue[];
  recommendations: string[];
}

interface VideoIssue {
  type: 'drop-off' | 'confusion' | 'too-fast' | 'too-slow' | 'prerequisite-gap';
  severity: 'critical' | 'high' | 'medium' | 'low';
  description: string;
  timestamp?: number; // If issue is at specific time
  evidence: {
    studentCount: number; // How many students affected
    examples: string[]; // Example questions or complaints
  };
}
```

**Example Report**:

```json
{
  "videoId": "video-123",
  "title": "Understanding React useEffect",
  "overallScore": 62,
  "scores": {
    "clarity": 45,
    "pacing": 70,
    "engagement": 68,
    "audioVisual": 85,
    "prerequisiteAlignment": 50
  },
  "issues": [
    {
      "type": "confusion",
      "severity": "high",
      "description": "Students don't understand dependency arrays",
      "timestamp": 420,
      "evidence": {
        "studentCount": 47,
        "examples": [
          "What is the dependency array for?",
          "Why does my effect run infinitely?",
          "When should I add something to dependencies?"
        ]
      }
    },
    {
      "type": "prerequisite-gap",
      "severity": "critical",
      "description": "Students haven't learned closures yet",
      "evidence": {
        "studentCount": 31,
        "examples": [
          "Why can't I access this variable?",
          "What is a stale closure?"
        ]
      }
    }
  ],
  "recommendations": [
    "Add 2-minute explanation of dependency arrays at 7:00",
    "Create prerequisite video on JavaScript closures",
    "Add visual diagram showing effect lifecycle",
    "Break into 2 videos: Basic effects + Advanced patterns"
  ]
}
```

### 4. Predictive Analytics

**The Problem**:

Students drop out or struggle, but by the time we notice, it's too late to help.

**The Solution**:

Predict student outcomes and identify at-risk students early:

**Predictions We Can Make**:

1. **Dropout Risk** (0-100% probability)
   - Input: Login frequency, video completion rate, quiz scores, streak breaks
   - Output: "87% likely to drop out in next 2 weeks"
   - Action: Send intervention (encouragement email, assign study buddy)

2. **Quiz Performance** (predicted score)
   - Input: Videos watched, time spent, previous quiz scores
   - Output: "Likely to score 60% on next quiz"
   - Action: Suggest review videos before taking quiz

3. **Module Completion Time** (days)
   - Input: Current pace, video count remaining, historical pace
   - Output: "Will complete Module 5 in 12 days"
   - Action: Adjust learning path if behind schedule

4. **Concept Mastery** (per topic)
   - Input: Quiz results, RAG questions, video rewatches
   - Output: "70% mastery of React Hooks, 95% mastery of Components"
   - Action: Recommend targeted practice for weak topics

**ML Model Architecture**:

```typescript
interface StudentFeatures {
  // Engagement
  daysActive: number;
  avgSessionLength: number; // minutes
  currentStreak: number;
  longestStreak: number;

  // Learning behavior
  videosCompleted: number;
  avgCompletionRate: number; // % of video watched
  quizzesPassed: number;
  avgQuizScore: number;
  avgTimePerVideo: number;

  // Social
  hasStudyBuddy: boolean;
  inStudyGroup: boolean;
  discordActive: boolean;

  // Profile
  ageGroup: string;
  learningGoal: string;
  weeklyAvailability: number;
}

interface Prediction {
  studentId: string;
  type: 'dropout-risk' | 'quiz-performance' | 'completion-time' | 'mastery';
  prediction: number; // Depends on type
  confidence: number; // 0-1
  factors: PredictionFactor[]; // What influenced this prediction
  interventions: Intervention[]; // Suggested actions
}

interface PredictionFactor {
  feature: string; // "currentStreak"
  importance: number; // 0-1, how much this affected prediction
  value: any; // Actual value
  desiredValue: any; // What it should be
}

interface Intervention {
  type: 'email' | 'notification' | 'study-buddy' | 'content-recommendation';
  priority: 'urgent' | 'high' | 'medium' | 'low';
  message: string;
  action?: string; // Button/link text
}
```

**Example Prediction**:

```json
{
  "studentId": "student-456",
  "type": "dropout-risk",
  "prediction": 0.87,
  "confidence": 0.92,
  "factors": [
    {
      "feature": "currentStreak",
      "importance": 0.35,
      "value": 0,
      "desiredValue": "> 3"
    },
    {
      "feature": "avgCompletionRate",
      "importance": 0.28,
      "value": 0.42,
      "desiredValue": "> 0.70"
    },
    {
      "feature": "hasStudyBuddy",
      "importance": 0.20,
      "value": false,
      "desiredValue": true
    }
  ],
  "interventions": [
    {
      "type": "notification",
      "priority": "urgent",
      "message": "We noticed you haven't logged in for 5 days. Your study buddy Sarah is waiting for you! 💪",
      "action": "Resume Learning"
    },
    {
      "type": "study-buddy",
      "priority": "high",
      "message": "You don't have a study buddy yet. Learning is easier together!",
      "action": "Find Study Buddy"
    }
  ]
}
```

### 5. Automated Content Tagging

**The Problem**:

Manually tagging videos with topics, skills, difficulty, prerequisites takes hours per video.

**The Solution**:

Use Claude AI to automatically extract metadata from videos:

**Auto-Generated Tags**:

```typescript
interface VideoMetadata {
  videoId: string;

  // Topics covered (hierarchical)
  topics: Topic[];

  // Skills taught
  skills: Skill[];

  // Difficulty level
  difficulty: {
    overall: 'beginner' | 'intermediate' | 'advanced';
    byTopic: { [topic: string]: string };
  };

  // Prerequisites
  prerequisites: {
    concepts: string[]; // "JavaScript functions", "HTML basics"
    videoIds: string[]; // Recommended videos to watch first
  };

  // Learning outcomes
  learningOutcomes: string[]; // "Build a todo app", "Understand state"

  // Keywords (for search)
  keywords: string[];

  // Code languages used
  languages: string[]; // ["JavaScript", "CSS"]

  // Frameworks/tools mentioned
  tools: string[]; // ["React", "Next.js", "Tailwind"]
}

interface Topic {
  name: string;
  category: string; // "React", "JavaScript", "CSS"
  coverage: number; // 0-100, how much of video is about this
  depth: 'overview' | 'detailed' | 'deep-dive';
}

interface Skill {
  name: string; // "Create React components"
  level: 'basic' | 'intermediate' | 'advanced';
  type: 'practical' | 'theoretical';
}
```

**Tagging Process**:

```
Video uploaded
↓
1. Extract transcript (already done in Module 2)
↓
2. Send to Claude AI with prompt:
   "Analyze this video transcript and extract:
    - Main topics covered
    - Skills taught
    - Difficulty level
    - Required prerequisites
    - Learning outcomes
    - Keywords for search"
↓
3. Parse Claude's response into structured metadata
↓
4. Store in database
↓
5. Use for:
   - Search and discovery
   - Prerequisites graph
   - Personalized recommendations
   - Content gap detection
```

### 6. Knowledge Graph

**The Problem**:

Content relationships are invisible. Don't know which videos build on each other or what order students should watch them.

**The Solution**:

Build a visual graph of content relationships:

**Graph Structure**:

```typescript
interface KnowledgeNode {
  id: string; // Video ID or concept ID
  type: 'video' | 'concept' | 'skill';
  title: string;
  metadata: VideoMetadata; // From auto-tagging
}

interface KnowledgeEdge {
  from: string; // Source node ID
  to: string; // Target node ID
  type: 'prerequisite' | 'related' | 'builds-on' | 'alternative';
  strength: number; // 0-1, how strong the relationship
  reason?: string; // Why this relationship exists
}

interface KnowledgeGraph {
  nodes: KnowledgeNode[];
  edges: KnowledgeEdge[];
}
```

**Graph Visualization**:

```
[JavaScript Basics] ──prerequisite──> [React Fundamentals]
         │                                    │
         │                                    │
    builds-on                            builds-on
         │                                    │
         ↓                                    ↓
[ES6 Features]                        [React Hooks]
         │                                    │
         │                                    ├─prerequisite─> [useState]
         │                                    │
         │                                    ├─prerequisite─> [useEffect]
         │                                    │
         │                                    └─prerequisite─> [useContext]
         │
         └──prerequisite──> [Async/Await] ──prerequisite──> [API Calls]
```

**Graph Analytics**:

- **Critical Path**: Videos that are prerequisites for many others
- **Orphan Videos**: No prerequisites or dependents (might not fit curriculum)
- **Bottlenecks**: Videos that many students get stuck on
- **Gaps**: Missing links in the graph (content gaps)

### 7. Content Recommendations for Creators

**The Problem**:

Creators don't know what content to create next. Guessing leads to low-impact videos.

**The Solution**:

AI recommends exactly what content to create based on data:

**Recommendation Types**:

1. **Fill Content Gaps**
   - "Create: React Context API Tutorial"
   - Evidence: Mentioned 15x, asked about 34x, missing

2. **Improve Low-Quality Videos**
   - "Remake: useEffect Tutorial (quality score 62/100)"
   - Evidence: 47 students confused, 31 missing prerequisites

3. **Trending Topics**
   - "Create: Next.js 14 Server Actions"
   - Evidence: 12 students asked about this in last week

4. **Skill Completeness**
   - "Create: Error Boundary Pattern"
   - Evidence: React curriculum 85% complete, missing advanced patterns

5. **Student Goals**
   - "Create: Portfolio Project Series"
   - Evidence: 67% of students goal is "build portfolio"

**Recommendation Score**:

```typescript
interface ContentRecommendation {
  title: string;
  description: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  score: number; // 0-100, how impactful this would be
  reasoning: {
    contentGap: number; // 0-100
    studentDemand: number; // 0-100
    prerequisiteValue: number; // 0-100
    goalAlignment: number; // 0-100
  };
  estimatedImpact: {
    studentsHelped: number;
    completionRateIncrease: string; // "+15%"
    curriculumCoverage: string; // "85% → 92%"
  };
  suggestedOutline: string[]; // Bullet points
}
```

### 8. A/B Testing for Learning Paths

**The Problem**:

Don't know if reordering videos or changing curriculum structure actually improves outcomes.

**The Solution**:

Systematically test different approaches:

**Experiments**:

1. **Video Order**
   - Control: Current sequence
   - Variant: Hooks before class components
   - Metric: Quiz scores, completion rate

2. **Prerequisite Requirements**
   - Control: Strict prerequisites (must complete A before B)
   - Variant: Flexible (can skip if quiz shows knowledge)
   - Metric: Time to completion, mastery scores

3. **Content Difficulty Curve**
   - Control: Linear difficulty increase
   - Variant: Easy → Hard → Medium (end on confidence boost)
   - Metric: Dropout rate, satisfaction

4. **Personalization Level**
   - Control: Same path for everyone
   - Variant: AI-personalized paths
   - Metric: Completion rate, time to goal

**Experiment Framework**:

```typescript
interface Experiment {
  id: string;
  name: string;
  hypothesis: string; // "Students learn hooks better if taught before classes"
  startDate: string;
  endDate?: string;
  status: 'draft' | 'running' | 'completed' | 'paused';

  // Variants
  variants: ExperimentVariant[];

  // Assignment
  assignmentStrategy: 'random' | 'balanced' | 'by-level';
  studentAssignments: { [studentId: string]: string }; // variant ID

  // Results
  results?: ExperimentResults;
}

interface ExperimentVariant {
  id: string;
  name: string; // "Hooks First", "Classes First"
  description: string;
  config: any; // What's different (video order, etc.)
  studentCount: number;
}

interface ExperimentResults {
  winningVariant: string;
  confidence: number; // 0-1, statistical significance
  metrics: {
    [variantId: string]: {
      completionRate: number;
      avgQuizScore: number;
      avgTimeToComplete: number;
      dropoutRate: number;
      satisfactionScore: number;
    };
  };
  conclusion: string;
  recommendation: string;
}
```

## Technical Implementation

### Database Schema

```sql
-- Content metadata (auto-generated tags)
CREATE TABLE video_metadata (
  video_id UUID PRIMARY KEY REFERENCES videos(id) ON DELETE CASCADE,

  topics JSONB NOT NULL, -- Topic[]
  skills JSONB NOT NULL, -- Skill[]
  difficulty JSONB NOT NULL, -- difficulty object
  prerequisites JSONB NOT NULL, -- prerequisites object
  learning_outcomes JSONB NOT NULL, -- string[]
  keywords JSONB NOT NULL, -- string[]
  languages JSONB, -- string[]
  tools JSONB, -- string[]

  quality_score INTEGER, -- 0-100
  quality_report JSONB, -- VideoQualityReport

  auto_generated BOOLEAN DEFAULT TRUE,
  reviewed_by UUID REFERENCES creators(id),
  reviewed_at TIMESTAMP,

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Knowledge graph
CREATE TABLE knowledge_nodes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  node_type VARCHAR(20) NOT NULL, -- 'video', 'concept', 'skill'
  title VARCHAR(255) NOT NULL,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE knowledge_edges (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  from_node_id UUID REFERENCES knowledge_nodes(id) ON DELETE CASCADE,
  to_node_id UUID REFERENCES knowledge_nodes(id) ON DELETE CASCADE,
  edge_type VARCHAR(20) NOT NULL, -- 'prerequisite', 'related', etc.
  strength DECIMAL(3,2) CHECK (strength BETWEEN 0 AND 1),
  reason TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Content gaps
CREATE TABLE content_gaps (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  topic VARCHAR(255) NOT NULL,
  severity VARCHAR(20) NOT NULL,
  evidence JSONB NOT NULL,
  suggested_content JSONB NOT NULL,

  status VARCHAR(20) DEFAULT 'open', -- 'open', 'planned', 'created', 'dismissed'
  created_video_id UUID REFERENCES videos(id),

  created_at TIMESTAMP DEFAULT NOW(),
  resolved_at TIMESTAMP
);

-- Student predictions
CREATE TABLE student_predictions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID REFERENCES students(id) ON DELETE CASCADE,

  prediction_type VARCHAR(30) NOT NULL,
  prediction_value DECIMAL(5,2) NOT NULL,
  confidence DECIMAL(3,2) NOT NULL,

  factors JSONB, -- PredictionFactor[]
  interventions JSONB, -- Intervention[]

  created_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP -- Predictions expire after 7 days
);

-- Personalized learning paths
CREATE TABLE learning_paths (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID REFERENCES students(id) ON DELETE CASCADE,

  goal VARCHAR(100) NOT NULL,
  total_duration VARCHAR(50),

  path_structure JSONB NOT NULL, -- PathModule[]
  milestones JSONB, -- Milestone[]

  status VARCHAR(20) DEFAULT 'active', -- 'active', 'completed', 'abandoned'

  created_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP
);

-- A/B experiments
CREATE TABLE experiments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  hypothesis TEXT NOT NULL,

  variants JSONB NOT NULL, -- ExperimentVariant[]
  assignment_strategy VARCHAR(20) NOT NULL,

  status VARCHAR(20) DEFAULT 'draft',
  start_date DATE,
  end_date DATE,

  results JSONB, -- ExperimentResults

  created_by UUID REFERENCES creators(id),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE experiment_assignments (
  experiment_id UUID REFERENCES experiments(id) ON DELETE CASCADE,
  student_id UUID REFERENCES students(id) ON DELETE CASCADE,
  variant_id VARCHAR(50) NOT NULL,
  assigned_at TIMESTAMP DEFAULT NOW(),

  PRIMARY KEY (experiment_id, student_id)
);

-- Indexes
CREATE INDEX idx_video_metadata_topics ON video_metadata USING GIN (topics);
CREATE INDEX idx_video_metadata_keywords ON video_metadata USING GIN (keywords);
CREATE INDEX idx_knowledge_edges_from ON knowledge_edges(from_node_id);
CREATE INDEX idx_knowledge_edges_to ON knowledge_edges(to_node_id);
CREATE INDEX idx_content_gaps_status ON content_gaps(status);
CREATE INDEX idx_student_predictions_student ON student_predictions(student_id, expires_at);
CREATE INDEX idx_learning_paths_student ON learning_paths(student_id, status);
```

## ML/AI Stack

### Tools and Services

| Component | Tool | Cost |
|-----------|------|------|
| **Video Tagging** | Claude 3.5 Sonnet | ~$20/month |
| **Content Gap Detection** | Claude 3.5 Sonnet | ~$15/month |
| **Predictive Models** | Scikit-learn (self-hosted) | $0 |
| **Knowledge Graph** | Neo4j (optional) or PostgreSQL | $0-50/month |
| **A/B Testing** | Custom + PostHog (analytics) | $0-20/month |
| **Total** | | **~$55-105/month** |

## Cost Estimate (Full Module)

| Component | Usage | Cost/Month |
|-----------|-------|------------|
| **Claude API** (tagging, gaps) | 200 videos × 3K tokens | $35 |
| **ML Compute** | Self-hosted Python | $0 |
| **Extra DB Storage** | Knowledge graph | $5 |
| **Analytics Tools** | PostHog | $0 (free tier) |
| **Total** | | **~$40/month** |

**Per Creator**: $0.40/month (at 100 creators)

## Next Steps

1. Read `IMPLEMENTATION.md` - Step-by-step build guide
2. Review `ML_MODELS.md` - Predictive model architecture
3. Check `KNOWLEDGE_GRAPH.md` - Graph building algorithms
4. See `AB_TESTING.md` - Experiment framework

---

**This is the INTELLIGENCE module - learn from data, optimize everything!** 🧠
