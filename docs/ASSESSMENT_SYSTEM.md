# Assessment System Documentation

## Overview

The Assessment System is a comprehensive PRO-tier feature that provides AI-powered quizzes, project templates, code review, and peer review functionality. It enables creators to assess student learning and provide automated feedback at scale.

## Features

### 1. AI Quiz Generation

Generate quizzes automatically from video content using Claude AI.

#### Capabilities
- Multiple choice questions (4 options)
- True/False questions
- Short answer questions
- Code challenge questions
- Difficulty levels: beginner, intermediate, advanced
- Automatic grading with detailed feedback
- XP rewards for completion

#### Usage

```typescript
import { generateQuiz } from '@/lib/assessments';

const quiz = await generateQuiz(
  ['video-id-1', 'video-id-2'], // Video IDs to generate from
  {
    questionCount: 10,
    difficulty: 'intermediate',
    questionTypes: ['multiple_choice', 'short_answer'],
    focusTopics: ['React Hooks', 'State Management'], // Optional
    passingScore: 70,
    timeLimitMinutes: 30,
  },
  creatorId
);
```

#### API Endpoint

```bash
POST /api/assessments/quiz/generate
```

**Request Body:**
```json
{
  "videoIds": ["uuid-1", "uuid-2"],
  "options": {
    "questionCount": 10,
    "difficulty": "intermediate",
    "questionTypes": ["multiple_choice", "true_false"],
    "passingScore": 70
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "quiz": {
      "id": "quiz-uuid",
      "title": "Quiz: intermediate - 1/20/2025",
      "questions": [...],
      "passing_score": 70
    },
    "remaining_generations": 4
  }
}
```

**Rate Limits:**
- 5 quiz generations per hour

**Feature Gate:**
- Requires PRO or ENTERPRISE tier

### 2. Quiz Submission & Grading

Students submit answers and receive immediate AI-powered feedback.

#### Usage

```typescript
import { submitQuizAttempt } from '@/lib/assessments';

const result = await submitQuizAttempt(
  quizId,
  studentId,
  {
    q_1: 'React',
    q_2: 'True',
    q_3: 'State manages dynamic data in components',
  },
  timeSpentSeconds
);

console.log(result.score); // 85
console.log(result.passed); // true
console.log(result.feedback); // Array of per-question feedback
```

#### API Endpoint

```bash
POST /api/assessments/quiz/submit
```

**Request Body:**
```json
{
  "quizId": "quiz-uuid",
  "answers": {
    "q_1": "React",
    "q_2": "True",
    "q_3": "State is an object..."
  },
  "timeSpentSeconds": 450
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "attempt_id": "attempt-uuid",
    "score": 85,
    "passed": true,
    "percentage": 85,
    "feedback": [
      {
        "question_id": "q_1",
        "is_correct": true,
        "points_earned": 10,
        "explanation": "..."
      }
    ],
    "xp_awarded": 150
  }
}
```

**XP Rewards:**
- First pass: 100 XP (easy), 150 XP (medium), 200 XP (hard)
- Retakes: 0 XP

### 3. Project Templates

Pre-built project scaffolds with starter code, acceptance criteria, and rubrics.

#### Built-in Templates

1. **Build a Todo App** (Beginner, Web)
   - Technologies: HTML, CSS, JavaScript, LocalStorage
   - Estimated time: 8 hours
   - Rubric: 100 points total

2. **REST API with Node.js** (Intermediate, Web)
   - Technologies: Node.js, Express, PostgreSQL, JWT
   - Estimated time: 15 hours
   - Rubric: 100 points total

3. **Data Analysis with Python** (Beginner, Data)
   - Technologies: Python, pandas, matplotlib, Jupyter
   - Estimated time: 10 hours
   - Rubric: 100 points total

4. **Landing Page Design** (Beginner, Web)
   - Technologies: HTML, CSS, Flexbox/Grid
   - Estimated time: 6 hours
   - Rubric: 100 points total

#### Usage

```typescript
import { getProjectTemplates, createProjectFromTemplate } from '@/lib/assessments';

// Get all templates
const templates = await getProjectTemplates();

// Get by category
const webTemplates = await getProjectTemplates('web');

// Get by difficulty
const beginnerTemplates = await getProjectTemplates(undefined, 'beginner');

// Create project from template
const project = await createProjectFromTemplate({
  templateId: 'template-uuid',
  studentId: 'student-uuid',
  dueDate: '2025-02-01T00:00:00Z',
});
```

#### API Endpoints

**Get Templates:**
```bash
GET /api/assessments/templates?category=web&difficulty=beginner
```

**Create Project:**
```bash
POST /api/assessments/projects
```

**Request Body:**
```json
{
  "templateId": "template-uuid",
  "title": "My Todo App",
  "description": "Building my first web app",
  "dueDate": "2025-02-01T00:00:00Z"
}
```

### 4. AI Code Review

Automated code review using Claude AI to analyze submissions.

#### Review Criteria
- Code quality and organization
- Best practices for the language
- Potential bugs and logic errors
- Security concerns
- Performance considerations
- Rubric-based scoring

#### Usage

```typescript
import { reviewCode, reviewProjectSubmission } from '@/lib/assessments';

// Direct code review
const review = await reviewCode(codeString, {
  language: 'JavaScript',
  acceptanceCriteria: ['CRUD operations', 'LocalStorage'],
  rubric: [
    { category: 'Functionality', points: 40, criteria: 'All features work' },
    { category: 'Code Quality', points: 20, criteria: 'Clean code' },
  ],
  projectTitle: 'Todo App',
});

// Review entire submission (includes database updates)
const review = await reviewProjectSubmission(submissionId);
```

#### Review Structure

```typescript
interface CodeReview {
  overall_assessment: 'exceeds' | 'meets' | 'partially_meets' | 'does_not_meet';
  summary: string;
  strengths: string[];
  improvements: string[];
  bugs_and_issues: CodeIssue[];
  security_concerns: SecurityConcern[];
  best_practices_score: number; // 0-100
  code_quality_score: number; // 0-100
  functionality_score: number; // 0-100
  overall_score: number; // 0-100
  rubric_scores: RubricScore[];
  detailed_feedback: string;
}
```

#### API Endpoint

```bash
POST /api/assessments/projects/submit
```

**Request Body:**
```json
{
  "projectId": "project-uuid",
  "code": "const todoApp = { ... }",
  "files": [
    { "filename": "index.html", "url": "s3://..." }
  ],
  "notes": "Implemented all features",
  "demoUrl": "https://my-demo.com"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "submission": {
      "id": "submission-uuid",
      "ai_review": {
        "overall_score": 85,
        "overall_assessment": "meets",
        "summary": "Solid implementation...",
        "strengths": ["Clean code", "Good naming"],
        "improvements": ["Add comments", "Optimize loop"]
      }
    },
    "xp_awarded": 200
  }
}
```

**XP Rewards:**
- Project submission: 200 XP

### 5. Peer Review System

Students review each other's work to learn from different approaches.

#### Features
- Anonymous or attributed reviews
- Guided review forms with rubric
- Automatic assignment of reviewers
- Review validation (prevent spam)
- XP rewards for reviewers

#### Usage

```typescript
import {
  assignPeerReviewers,
  submitPeerReview,
  aggregatePeerFeedback,
} from '@/lib/assessments';

// Assign 3 reviewers to a submission
const assignments = await assignPeerReviewers(submissionId, {
  count: 3,
  excludeIds: ['student-id-to-exclude'],
});

// Submit a peer review
await submitPeerReview(assignmentId, {
  rating: 4, // 1-5 stars
  code_quality_rating: 4,
  functionality_rating: 5,
  strengths: ['Clean code', 'Good UI'],
  improvements: ['Add error handling', 'Optimize'],
  comments: 'Great work overall! The UI is intuitive...',
  would_use_approach: true,
});

// Get aggregated feedback
const feedback = await aggregatePeerFeedback(submissionId);
console.log(feedback.avg_rating); // 4.2
console.log(feedback.reviewer_consensus); // "Strong work overall..."
```

#### API Endpoints

**Get Assignments:**
```bash
GET /api/assessments/peer-review?status=pending
```

**Submit Review:**
```bash
POST /api/assessments/peer-review
```

**Request Body:**
```json
{
  "assignmentId": "assignment-uuid",
  "review": {
    "rating": 4,
    "code_quality_rating": 4,
    "functionality_rating": 5,
    "strengths": ["Clean code", "Good UI"],
    "improvements": ["Add comments"],
    "comments": "Great work overall!",
    "would_use_approach": true
  }
}
```

**XP Rewards:**
- Peer review completion: 50 XP

## Rate Limits

| Action | Limit | Window |
|--------|-------|--------|
| Quiz Generation | 5 | 1 hour |
| Quiz Submission | 10 | 1 hour |
| Project Creation | 20 | 24 hours |
| Project Submission | 10 | 24 hours |
| Peer Review Submission | 20 | 24 hours |

## Feature Gating

All assessment features require **PRO or ENTERPRISE** tier:
- `FEATURE_QUIZZES`
- `FEATURE_PROJECTS`

Peer review is available in **ENTERPRISE** tier only (future implementation).

## Database Schema

### Tables

1. **project_templates** - Pre-built project scaffolds
2. **projects** - Student-specific projects
3. **project_submissions** - Submitted work with reviews
4. **peer_review_assignments** - Peer review assignments
5. **quiz_attempts** - Enhanced with feedback and timing

### Key Fields

**project_submissions:**
- `ai_review`: JSONB - Full AI review object
- `ai_score`: INTEGER - 0-100 score
- `peer_review_count`: INTEGER
- `peer_review_avg_score`: DECIMAL
- `final_score`: INTEGER - After creator override

**peer_review_assignments:**
- `status`: 'pending' | 'in_progress' | 'completed' | 'skipped'
- `review`: JSONB - Full review data
- `xp_awarded`: INTEGER

## Best Practices

### For Creators

1. **Quiz Generation**
   - Use 5-10 videos for best results
   - Mix question types for variety
   - Set appropriate difficulty for audience
   - Review generated questions before publishing

2. **Project Templates**
   - Provide clear acceptance criteria
   - Include starter code when helpful
   - Set realistic time estimates
   - Create detailed rubrics (4-5 categories)

3. **Code Review**
   - Review AI feedback before sharing
   - Add personal notes when needed
   - Use rubric scores to be consistent
   - Encourage resubmissions for learning

4. **Peer Review**
   - Assign 2-3 reviewers per submission
   - Provide review guidelines to students
   - Monitor review quality
   - Reward thoughtful reviews

### For Students

1. **Taking Quizzes**
   - Read questions carefully
   - Review explanations after submission
   - Retake to improve understanding
   - Track your progress over time

2. **Project Work**
   - Start with beginner templates
   - Read all acceptance criteria
   - Test thoroughly before submission
   - Learn from AI feedback

3. **Peer Reviews**
   - Be constructive and respectful
   - Focus on what works and what could improve
   - Provide specific suggestions
   - Learn from reviewing others' code

## Troubleshooting

### Quiz Generation Issues

**Problem:** Quiz generation fails
**Solutions:**
- Ensure videos have transcripts processed
- Check if you've exceeded rate limits
- Verify PRO tier access
- Try with fewer videos (3-5)

### Code Review Issues

**Problem:** AI review seems inaccurate
**Solutions:**
- Ensure code is properly formatted
- Include all necessary files
- Check that rubric criteria are clear
- Review may need creator override

### Peer Review Issues

**Problem:** Not enough reviewers available
**Solutions:**
- Encourage more students to submit projects
- Wait for more submissions before assigning
- Reduce reviewer count requirement
- Manual assignment by creator

## Future Enhancements

- [ ] Live coding challenges
- [ ] Automated test execution
- [ ] Plagiarism detection
- [ ] Video code walkthroughs
- [ ] Collaborative debugging sessions
- [ ] Code diff visualization
- [ ] Interview-style assessments
- [ ] Certification badges

## Support

For issues or questions:
- Check rate limits and feature access
- Review error messages in API responses
- Contact support with submission IDs
- Refer to API documentation

## Related Documentation

- [Feature Gating Guide](./FEATURE_GATING.md)
- [Gamification System](./GAMIFICATION.md)
- [Video Processing](./VIDEO_PROCESSING.md)
- [API Reference](./API_REFERENCE.md)
