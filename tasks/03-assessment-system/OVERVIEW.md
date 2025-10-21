# Module 3: Assessment System - Overview

## Executive Summary

The Assessment System provides automated quiz generation, project management, and intelligent grading to validate student learning while saving creators countless hours. Using AI, we transform video content into comprehensive assessments and provide instant feedback to students.

**Status**: Full Implementation Required
**Priority**: P1 (Important for learning validation)
**Dependencies**: Video Processing (Module 2 - for content), RAG Chat (Module 1 - for question generation)

## Problem Statement

### Why Assessments Matter But Are Painful

**Creator Pain Points**:
- ❌ Creating quizzes takes 2+ hours per video
- ❌ Manual grading projects takes 5-10 min per student
- ❌ Hard to know if students actually learned
- ❌ No standardized rubrics = inconsistent grading
- ❌ Students cheat without proper validation

**Student Pain Points**:
- ❌ Quizzes often don't match video content
- ❌ Wait days for project feedback
- ❌ Unclear grading criteria
- ❌ No practice quizzes to self-assess

### What We're Building

A comprehensive assessment system that:
- ✅ **Auto-generates quizzes** from video transcripts in < 30 seconds
- ✅ **Instant grading** for multiple choice and true/false
- ✅ **Project templates** with clear rubrics
- ✅ **Automated feedback** for common issues
- ✅ **Practice mode** for students to self-assess
- ✅ **Cheat detection** through pattern analysis

## Success Metrics

| Metric | Target | Industry Avg | Impact |
|--------|--------|--------------|--------|
| **Quiz Generation Time** | <30 seconds | 2+ hours | 240x faster |
| **Auto-Grading Accuracy** | >95% | N/A (manual) | Instant feedback |
| **Student Passing Rate** | 70-80% | 50-60% | Better learning |
| **Creator Time Saved** | 5+ hours/week | N/A | 10+ videos/week |
| **Quiz Completion Rate** | >80% | <40% | Higher engagement |
| **Project Submission Rate** | >60% | <30% | 2x improvement |

## Core Features

### 1. AI-Powered Quiz Generation

**Generation Flow**:

```typescript
Input: Video ID
↓
1. Fetch transcript + metadata
2. Send to Claude API with prompt
3. Generate 10 questions (configurable)
4. Parse response into structured format
5. Store in database
6. Return quiz preview
↓
Output: Complete quiz ready to use
```

**Question Types Supported**:

1. **Multiple Choice** (70% of quiz)
   - 4 options (A, B, C, D)
   - Only one correct answer
   - Distractors based on common misconceptions

2. **True/False** (20% of quiz)
   - Binary choice
   - Tests understanding of key concepts

3. **Short Answer** (10% of quiz - optional)
   - Free text response
   - AI-graded using semantic similarity
   - Requires manual review for edge cases

**Difficulty Levels**:
- **Easy**: Direct recall from video
- **Medium**: Application of concepts
- **Hard**: Analysis and synthesis

**Quiz Configuration**:
```typescript
interface QuizConfig {
  videoId: string;
  questionCount: number; // 5, 10, 15, 20
  questionTypes: ('multiple-choice' | 'true-false' | 'short-answer')[];
  difficulty: 'easy' | 'medium' | 'hard' | 'mixed';
  passingScore: number; // 70%, 80%, 90%
  timeLimit?: number; // minutes (optional)
  allowRetakes: boolean;
  showAnswersAfter: 'immediate' | 'all-complete' | 'never';
}
```

### 2. Quiz Taking Experience

**Student Flow**:

```
1. View quiz overview
   ├── Question count
   ├── Time limit
   ├── Passing score
   └── Attempt history

2. Start quiz
   ├── One question per page
   ├── Progress bar (e.g., "3 of 10")
   ├── Timer countdown (if applicable)
   └── Cannot skip questions

3. Submit quiz
   ├── Auto-calculate score
   ├── Store attempt in database
   ├── Award XP if passing
   ├── Show results
   └── Unlock next content

4. Review results
   ├── Correct/incorrect breakdown
   ├── Correct answers shown
   ├── Explanation for each question
   └── Option to retake (if allowed)
```

**Features**:
- Auto-save progress every 30 seconds
- Warn before leaving page
- Resume incomplete quizzes
- Track time spent per question
- Prevent back-navigation during quiz

### 3. Project Management System

**Project Template Structure**:

```typescript
interface ProjectTemplate {
  id: string;
  creator_id: string;
  title: string;
  description: string; // Markdown supported

  // Requirements
  requirements: string[]; // ["Build X", "Implement Y"]
  deliverables: string[]; // ["Source code", "Demo video"]
  estimatedHours: number;
  difficulty: 'beginner' | 'intermediate' | 'advanced';

  // Grading
  rubric: RubricCriteria[];
  totalPoints: number;
  passingScore: number; // e.g., 70

  // Scheduling
  assignedWeek?: number; // Which week in learning calendar
  dueDate?: string; // Specific due date
  allowLateSubmission: boolean;
  latePenalty?: number; // Points deducted per day

  // Resources
  starterCode?: string; // GitHub URL or inline code
  exampleProjects?: string[]; // URLs to examples
  resources?: Resource[];
}

interface RubricCriteria {
  id: string;
  category: string; // "Functionality", "Code Quality", "Design"
  description: string;
  maxPoints: number;
  levels: RubricLevel[];
}

interface RubricLevel {
  points: number;
  description: string;
  // E.g., points: 10, description: "Exceptional - All features work perfectly"
  //      points: 7, description: "Proficient - Most features work with minor bugs"
  //      points: 4, description: "Developing - Basic features work"
  //      points: 0, description: "Incomplete - Does not meet requirements"
}
```

**Example Project Template**:

```markdown
# Build a Todo App

## Description
Create a fully functional todo application using React that allows users to:
- Add new tasks
- Mark tasks as complete
- Delete tasks
- Filter tasks (All, Active, Completed)
- Persist data to localStorage

## Requirements
1. Use React hooks (useState, useEffect)
2. Implement all CRUD operations
3. Style with CSS or Tailwind
4. Deploy to Vercel or Netlify

## Deliverables
- GitHub repository with source code
- Live demo URL
- 2-minute demo video

## Rubric (100 points)
### Functionality (40 points)
- All features working: 40 pts
- Most features working: 30 pts
- Some features working: 20 pts
- Basic features only: 10 pts

### Code Quality (30 points)
- Clean, well-organized code: 30 pts
- Mostly clean code: 20 pts
- Needs improvement: 10 pts

### Design (20 points)
- Professional UI/UX: 20 pts
- Functional but basic: 10 pts
- Minimal effort: 5 pts

### Deployment (10 points)
- Successfully deployed: 10 pts
- Not deployed: 0 pts

**Passing Score**: 70 points
```

### 4. Submission Workflow

**Student Submission Process**:

```typescript
interface ProjectSubmission {
  id: string;
  student_id: string;
  project_id: string;

  // Submission content
  githubUrl?: string;
  liveUrl?: string;
  demoVideoUrl?: string;
  description: string; // What they built, challenges faced
  files?: UploadedFile[]; // For file uploads

  // Metadata
  submitted_at: string;
  status: 'pending' | 'under-review' | 'approved' | 'needs-revision' | 'rejected';

  // Grading
  totalScore?: number;
  criteriaScores?: { [criteriaId: string]: number };
  feedback?: string; // Creator's feedback
  gradedBy?: string; // Creator ID
  gradedAt?: string;

  // Revision tracking
  revisionCount: number;
  previousSubmissions?: string[]; // IDs of previous submissions
}
```

**Creator Review Flow**:

```
1. View pending submissions
   ├── Filter by project
   ├── Filter by student
   └── Sort by submit date

2. Open submission
   ├── View project details
   ├── See rubric
   ├── Preview GitHub/live demo
   └── Watch demo video

3. Grade using rubric
   ├── Score each criteria
   ├── Auto-calculate total
   ├── Add text feedback
   └── Suggest improvements

4. Submit grade
   ├── Store in database
   ├── Award XP to student
   ├── Send email notification
   └── Update submission status
```

### 5. Automated Grading (AI-Assisted)

**What Can Be Auto-Graded**:
- ✅ Multiple choice quizzes (100% automated)
- ✅ True/false questions (100% automated)
- ✅ Code syntax validation (automated)
- ✅ Unit test pass/fail (automated)
- ⚠️ Short answer questions (AI + manual review)
- ⚠️ Code quality (AI suggestions + manual)
- ❌ Design/creativity (manual only)

**AI-Assisted Project Grading**:

```typescript
// lib/assessments/ai-grader.ts

async function getAIGradingSuggestions(
  submission: ProjectSubmission,
  rubric: RubricCriteria[]
): Promise<GradingSuggestion[]> {
  const prompt = `
    Review this student project submission and provide grading suggestions.

    Project: ${submission.project_title}
    Student Description: ${submission.description}
    GitHub: ${submission.githubUrl}

    Rubric:
    ${JSON.stringify(rubric, null, 2)}

    Analyze and suggest scores for each criteria with reasoning.
  `;

  const response = await claude.messages.create({
    model: 'claude-3-5-sonnet-20241022',
    max_tokens: 2048,
    messages: [{ role: 'user', content: prompt }],
  });

  // Parse AI response into structured suggestions
  return parseSuggestions(response.content[0].text);
}
```

**Note**: AI provides suggestions, creator makes final decision.

### 6. Quiz Analytics

**Per-Quiz Metrics**:
- Total attempts
- Average score
- Pass rate
- Time to complete (average)
- Question difficulty (% answering correctly)
- Most failed questions

**Per-Question Analytics**:
```typescript
interface QuestionAnalytics {
  questionId: string;
  timesAnswered: number;
  correctCount: number;
  incorrectCount: number;
  accuracy: number; // correctCount / timesAnswered
  avgTimeSpent: number; // seconds
  mostCommonWrongAnswer?: string;
}
```

**Insights for Creators**:
- "Question 5 has 30% accuracy → video may need clarification"
- "Students spend 2x longer on Question 8 → too complex?"
- "90% of students fail Quiz 3 → prerequisite missing?"

### 7. Gamification Integration

**XP Rewards**:
```typescript
const ASSESSMENT_XP = {
  QUIZ_PASSED: 100,
  QUIZ_PERFECT: 200, // 100% score
  QUIZ_FIRST_TRY: 50, // Bonus for passing on first attempt
  PROJECT_SUBMITTED: 250,
  PROJECT_COMPLETED: 500, // After grading
  PROJECT_EXCELLENCE: 750, // Score >90%
  PEER_REVIEW: 75, // Reviewing another student's project
};
```

**Achievements**:
- 🎓 **Quiz Master** - Pass 10 quizzes (200 XP)
- ⭐ **Perfect Score** - Get 100% on a quiz (300 XP)
- 🏆 **Quiz Champion** - Pass 50 quizzes (1000 XP, Legendary!)
- 🚀 **First Build** - Submit first project (250 XP)
- 💻 **Project Pro** - Complete 10 projects (1500 XP, Legendary!)
- 👀 **Code Reviewer** - Review 5 peer projects (300 XP)

## Technical Implementation

### Database Schema

**Quizzes Table**:
```sql
CREATE TABLE quizzes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  creator_id UUID REFERENCES creators(id),
  video_id UUID REFERENCES videos(id),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  question_count INTEGER NOT NULL,
  passing_score INTEGER DEFAULT 70, -- percentage
  time_limit INTEGER, -- minutes, null = no limit
  allow_retakes BOOLEAN DEFAULT TRUE,
  show_answers_when VARCHAR(20) DEFAULT 'immediate', -- 'immediate', 'all-complete', 'never'
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE quiz_questions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  quiz_id UUID REFERENCES quizzes(id) ON DELETE CASCADE,
  question_type VARCHAR(20) NOT NULL, -- 'multiple-choice', 'true-false', 'short-answer'
  question_text TEXT NOT NULL,
  question_order INTEGER NOT NULL,
  difficulty VARCHAR(20), -- 'easy', 'medium', 'hard'

  -- For multiple choice/true-false
  options JSONB, -- [{ "id": "A", "text": "...", "correct": true }]

  -- For short answer
  correct_answer TEXT, -- Reference answer for AI grading

  -- Explanation
  explanation TEXT, -- Shown after answering

  -- Metadata
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE quiz_attempts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  quiz_id UUID REFERENCES quizzes(id),
  student_id UUID REFERENCES students(id),

  -- Attempt data
  score INTEGER NOT NULL, -- 0-100
  passed BOOLEAN NOT NULL,
  answers JSONB NOT NULL, -- Student's answers

  -- Timing
  started_at TIMESTAMP NOT NULL,
  completed_at TIMESTAMP NOT NULL,
  time_spent INTEGER, -- seconds

  -- Metadata
  attempt_number INTEGER NOT NULL, -- 1st, 2nd, 3rd attempt
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_quiz_attempts_student ON quiz_attempts(student_id, created_at DESC);
CREATE INDEX idx_quiz_attempts_quiz ON quiz_attempts(quiz_id);
```

**Projects Table**:
```sql
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  creator_id UUID REFERENCES creators(id),
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  requirements JSONB NOT NULL, -- Array of requirement strings
  deliverables JSONB NOT NULL, -- Array of deliverable strings
  estimated_hours INTEGER,
  difficulty VARCHAR(20),
  rubric JSONB NOT NULL, -- RubricCriteria[]
  total_points INTEGER NOT NULL,
  passing_score INTEGER NOT NULL,
  assigned_week INTEGER,
  due_date TIMESTAMP,
  allow_late_submission BOOLEAN DEFAULT FALSE,
  late_penalty INTEGER, -- Points per day
  starter_code TEXT,
  example_projects JSONB, -- Array of URLs
  resources JSONB, -- Array of Resource objects
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE project_submissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID REFERENCES projects(id),
  student_id UUID REFERENCES students(id),

  -- Submission content
  github_url TEXT,
  live_url TEXT,
  demo_video_url TEXT,
  description TEXT NOT NULL,
  files JSONB, -- Array of uploaded files

  -- Status
  status VARCHAR(20) NOT NULL DEFAULT 'pending', -- 'pending', 'under-review', 'approved', 'needs-revision', 'rejected'
  submitted_at TIMESTAMP NOT NULL DEFAULT NOW(),

  -- Grading
  total_score INTEGER,
  criteria_scores JSONB, -- { criteriaId: score }
  feedback TEXT,
  graded_by UUID REFERENCES creators(id),
  graded_at TIMESTAMP,

  -- Revisions
  revision_count INTEGER DEFAULT 0,
  previous_submission_id UUID REFERENCES project_submissions(id),

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_project_submissions_student ON project_submissions(student_id, submitted_at DESC);
CREATE INDEX idx_project_submissions_project ON project_submissions(project_id, status);
```

## Cost Estimate

| Component | Usage | Cost/Month |
|-----------|-------|------------|
| **Claude API** (quiz generation) | 500 quizzes × 2K tokens | $10 |
| **Claude API** (AI grading) | 200 projects × 3K tokens | $15 |
| **Database Storage** | Included in Supabase | $0 |
| **File Storage** (submissions) | 50GB S3 | $1.15 |
| **Total** | | **~$26/month** |

**Per Creator**: $0.26/month (at 100 creators)

## Next Steps

1. Read `IMPLEMENTATION.md` - Step-by-step build guide
2. Review `RUBRIC_TEMPLATES.md` - Pre-built project rubrics
3. Check `AI_GRADING.md` - AI-assisted grading patterns
4. See `QUIZ_GENERATION.md` - Question generation strategies

---

**This is the VALIDATION module - prove students are learning!** 📝
