# Content Intelligence System

## Overview

The Content Intelligence System uses AI and machine learning to analyze student learning patterns, detect knowledge gaps, predict engagement, and provide actionable insights to both students and creators.

**Enterprise Tier Feature** - Requires `FEATURE_CONTENT_INTELLIGENCE` access.

## Features

### 1. Knowledge Gap Detection

Automatically identifies topics and concepts that students struggle with:

- **Sources**: Quiz failures, chat questions, video rewatches
- **Severity Levels**: Low, Medium, High, Critical
- **Output**: Personalized recommendations for closing gaps

**API Endpoint**: `GET /api/intelligence/gaps`

```typescript
// Example response
{
  "success": true,
  "gaps": [
    {
      "concept": "React Hooks",
      "severity": "high",
      "evidence": {
        "questionsAsked": 12,
        "confusedStudents": 8,
        "mentionedInVideos": 5
      },
      "recommendations": [
        "Review video: Understanding useState",
        "Practice more hook examples"
      ]
    }
  ]
}
```

### 2. Adaptive Difficulty Engine

Adjusts content difficulty based on student performance:

- **Levels**: Beginner, Intermediate, Advanced
- **Triggers**: Quiz scores, completion rates, time spent
- **Actions**: Recommends appropriate next videos

**API Endpoint**: `GET /api/intelligence/recommendations?count=5`

### 3. Engagement Analytics

Predicts student engagement and identifies at-risk students:

- **Score**: 0-100 based on activity, streaks, completion, quiz performance
- **Risk Levels**: None, Low, Medium, High, Critical
- **Interventions**: Automated recommendations for improvement

**API Endpoint**: `GET /api/intelligence/engagement`

```typescript
// Example response
{
  "success": true,
  "engagement": {
    "score": 72,
    "trend": "stable",
    "risk_level": "low",
    "factors": [
      {
        "name": "Recent Activity",
        "current_value": 25,
        "target_value": 30,
        "impact": 0.25
      }
    ],
    "recommendations": [
      "Log in more frequently to maintain momentum"
    ]
  }
}
```

### 4. Content Health Monitor

Analyzes video quality and effectiveness:

- **Metrics**: Completion rate, quiz scores, confusion signals
- **Overall Score**: 0-100 quality rating
- **Issues**: Detects low completion, poor quiz performance, high confusion
- **Recommendations**: Actionable improvements for creators

**API Endpoint**: `GET /api/intelligence/health?videoId=xxx`

### 5. AI Insights Generator

Creates weekly AI-generated insights for creators:

- **Types**: Content quality, student risk, gap detection, engagement drop
- **Priority**: Low, Medium, High, Critical
- **Actions**: Specific recommendations for each insight

**API Endpoint**: `GET /api/intelligence/insights`

```typescript
// Example insight
{
  "id": "insight-123",
  "type": "student_risk",
  "title": "5 students at risk of dropping out",
  "description": "3 critical, 2 high risk. Reach out to keep them engaged.",
  "priority": "high",
  "actionable": true,
  "actions": [
    {
      "title": "View at-risk students",
      "description": "See list of students who need attention"
    }
  ]
}
```

### 6. Content Recommendations

Personalized video recommendations for students:

- **Collaborative filtering**: "Students like you also watched..."
- **Content-based**: Similar topics and difficulty
- **Learning paths**: AI-generated custom sequences

**API Endpoint**: `POST /api/intelligence/recommendations/path`

## React Components

### Student Components

#### `<KnowledgeGapWidget />`
Displays identified knowledge gaps with recommendations.

```tsx
import { KnowledgeGapWidget } from '@/components/intelligence/KnowledgeGapWidget';

<KnowledgeGapWidget />
```

#### `<EngagementScore />`
Shows gamified engagement score with circular progress.

```tsx
import { EngagementScore } from '@/components/intelligence/EngagementScore';

<EngagementScore />
```

### Creator Components

#### `<InsightsPanel />`
Displays AI-generated insights for creators.

```tsx
import { InsightsPanel } from '@/components/intelligence/InsightsPanel';

<InsightsPanel />
```

## Background Jobs

All intelligence features run automated background jobs using Inngest:

### Daily Jobs

**Update Engagement Scores** (2 AM daily)
- Calculates engagement scores for all students
- Stores predictions for at-risk students
- Updates student records

**Detect Knowledge Gaps** (3 AM daily)
- Analyzes active students for knowledge gaps
- Stores gaps in database
- Triggers recommendations

**Identify At-Risk Students** (7 AM daily)
- Identifies students likely to drop out
- Creates insights for creators
- Prepares intervention recommendations

### Weekly Jobs

**Analyze Content Health** (Sunday 4 AM)
- Analyzes all videos for quality metrics
- Identifies low-quality content
- Stores health metrics

**Generate Creator Insights** (Monday 6 AM)
- Generates AI insights for all creators
- Stores in database
- Sends email notifications (optional)

## Database Schema

### Tables

**`knowledge_gaps`**
- Tracks identified gaps for students
- Includes severity, evidence, recommendations
- Status: open, in_progress, closed

**`content_health_metrics`**
- Daily metrics for each video
- Completion rate, quiz scores, confusion signals
- Aggregated for trend analysis

**`ai_insights`**
- AI-generated insights for creators
- Priority levels, actionable items
- Can be dismissed by creator

**`student_predictions`**
- ML predictions (dropout risk, quiz performance)
- Confidence scores, contributing factors
- Expires after 7 days

**`learning_paths`**
- Personalized learning paths
- Goal-based sequences
- Progress tracking

**`content_recommendations`**
- Content creation suggestions for creators
- Impact scores, reasoning
- Tracks if created

**`difficulty_adjustments`**
- History of difficulty level changes
- Performance data that triggered change

## Usage Examples

### For Students

**Check Knowledge Gaps**
```typescript
const response = await fetch('/api/intelligence/gaps');
const { gaps } = await response.json();

// Display gaps and recommendations
gaps.forEach(gap => {
  console.log(`Gap: ${gap.concept} (${gap.severity})`);
  console.log(`Recommendations:`, gap.recommendations);
});
```

**Get Personalized Recommendations**
```typescript
const response = await fetch('/api/intelligence/recommendations?count=5');
const { recommendations } = await response.json();

// Show recommended videos
recommendations.forEach(video => {
  console.log(`Watch: ${video.title} (${video.difficulty})`);
  console.log(`Reason: ${video.reason}`);
});
```

**Check Engagement Score**
```typescript
const response = await fetch('/api/intelligence/engagement');
const { engagement } = await response.json();

console.log(`Score: ${engagement.score}/100`);
console.log(`Risk: ${engagement.risk_level}`);
console.log(`Tips:`, engagement.recommendations);
```

### For Creators

**Get Weekly Insights**
```typescript
const response = await fetch('/api/intelligence/insights');
const { insights } = await response.json();

// Display top priority insights
const topInsights = insights
  .filter(i => i.priority === 'high' || i.priority === 'critical')
  .slice(0, 5);

topInsights.forEach(insight => {
  console.log(`[${insight.priority}] ${insight.title}`);
  console.log(insight.description);
  console.log('Actions:', insight.actions);
});
```

**Check Content Health**
```typescript
const response = await fetch(`/api/intelligence/health?videoId=${videoId}`);
const { health } = await response.json();

console.log(`Overall Score: ${health.overall_score}/100`);
console.log(`Completion Rate: ${health.metrics.completion_rate}%`);
console.log(`Avg Quiz Score: ${health.metrics.avg_quiz_score}%`);

if (health.issues.length > 0) {
  console.log('Issues:', health.issues);
  console.log('Recommendations:', health.recommendations);
}
```

**Find Content Gaps**
```typescript
const response = await fetch('/api/intelligence/health/gaps', {
  method: 'POST'
});
const { gaps } = await response.json();

// Show missing topics
gaps.forEach(gap => {
  console.log(`Missing: ${gap.topic} (${gap.priority})`);
  console.log(`${gap.evidence.student_questions} students asked about this`);
});
```

**Identify At-Risk Students**
```typescript
const response = await fetch('/api/intelligence/engagement/at-risk', {
  method: 'POST'
});
const { students } = await response.json();

const critical = students.filter(s => s.risk_level === 'critical');
console.log(`${critical.length} students in critical risk`);

// Take action
critical.forEach(student => {
  console.log(`Contact: ${student.name} (${student.email})`);
  console.log(`Last active: ${student.last_active_at}`);
});
```

## AI Models Used

- **Claude 3.5 Sonnet**: Gap detection, insight generation, concept extraction
- **SQL Analytics**: Engagement scoring, content health metrics
- **Collaborative Filtering**: Content recommendations

## Privacy & Data Usage

- All analytics are aggregated and anonymized where possible
- Student data is only accessible to their assigned creator
- Predictions are stored for 7 days then auto-deleted
- Students can opt out of predictive analytics in settings

## Performance Considerations

- Background jobs run during low-traffic hours
- API responses cached for 5 minutes
- Heavy computations (AI analysis) queued via Inngest
- Database queries optimized with indexes

## Feature Gating

All intelligence features require **ENTERPRISE tier** subscription:

```typescript
import { withFeatureGate } from '@/lib/middleware/feature-gate';
import { Feature } from '@/lib/features/types';

export const GET = withFeatureGate(
  { feature: Feature.FEATURE_CONTENT_INTELLIGENCE },
  async (req) => {
    // Protected logic
  }
);
```

## Troubleshooting

### No insights appearing
- Check that background jobs are running (view Inngest dashboard)
- Verify creator has sufficient data (at least 10 students, 5 videos)
- Check database for stored insights

### Engagement scores not updating
- Verify `update_engagement_score` SQL function exists
- Check that daily job ran successfully
- Ensure student has recent activity

### Knowledge gaps not detected
- Student needs quiz failures or confusion questions
- AI API key must be configured (`ANTHROPIC_API_KEY`)
- Check Anthropic API quota

## Future Enhancements

- ML models for dropout prediction (Python/scikit-learn)
- A/B testing framework for learning paths
- Advanced knowledge graph visualization
- Automated content creation suggestions
- Sentiment analysis from chat messages

## Support

For issues or questions about Content Intelligence:
1. Check this documentation
2. Review Inngest job logs for errors
3. Verify feature gate access
4. Contact support with specific error messages
