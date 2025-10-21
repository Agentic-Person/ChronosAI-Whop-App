  # Creator Dashboard Documentation
**Module 6: ENTERPRISE Tier Feature**

## Overview

The Creator Dashboard is a comprehensive analytics and management system for educators on the Video Wizard platform. It provides real-time insights into student engagement, video performance, and learning outcomes.

**Access Level**: ENTERPRISE tier only (feature gated)

---

## Table of Contents

1. [Features](#features)
2. [Architecture](#architecture)
3. [Database Schema](#database-schema)
4. [Services](#services)
5. [API Endpoints](#api-endpoints)
6. [UI Components](#ui-components)
7. [Usage Guide](#usage-guide)
8. [Performance](#performance)
9. [Troubleshooting](#troubleshooting)

---

## Features

### 1. Dashboard Overview
- **Key Metrics Cards**: Total students, active students, completion rate, AI satisfaction
- **Engagement Charts**: Daily active users, learning activity trends
- **At-Risk Alerts**: Proactive identification of struggling students
- **Quick Actions**: Upload videos, invite students, generate quizzes

### 2. Student Management
- **Student List**: Searchable, filterable table with engagement tiers
- **Student Profiles**: Detailed view of individual student progress
- **Engagement Tiers**:
  - `highly_engaged`: 10+ videos, 75%+ completion
  - `engaged`: 5+ videos
  - `moderate`: Active but limited activity
  - `low_engagement`: <3 videos in first week
  - `at_risk`: Inactive for 7+ days
  - `inactive`: Inactive for 14+ days
- **Bulk Actions**: Export data, send announcements

### 3. Video Analytics
- **Performance Metrics**: Views, completion rate, avg watch time
- **Drop-off Analysis**: Identify where students stop watching
- **Engagement Heatmap**: Most/least engaged video sections
- **Related Questions**: Questions asked about each video

### 4. Quiz Analytics
- **Pass Rates**: Overall and per-quiz performance
- **Struggling Areas**: Quizzes with high fail rates
- **Question Analysis**: Which questions students find difficult

### 5. Chat Analytics
- **Most Asked Questions**: Identify content gaps
- **AI Satisfaction Rate**: Measure AI response quality
- **Chat Volume**: Trends over time

### 6. Export & Reports
- **Formats**: CSV, JSON, PDF (coming soon), Excel (coming soon)
- **Export Types**:
  - Student list with progress
  - Video analytics
  - Quiz results
  - Chat history
  - Analytics dashboard snapshot
- **Automated Reports**: Weekly email summaries (optional)

---

## Architecture

### Data Flow

```
┌─────────────────┐
│   Creator UI    │
│  (Next.js App)  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   API Routes    │ ◄─── Feature Gating (ENTERPRISE)
│ (Feature Gated) │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│    Services     │
│  - Analytics    │
│  - Students     │
│  - Videos       │
│  - Exports      │
└────────┬────────┘
         │
         ▼
┌─────────────────┐       ┌──────────────┐
│   Supabase DB   │◄─────►│ Redis Cache  │
│ + Materialized  │       │ (5 min TTL)  │
│     Views       │       └──────────────┘
└─────────────────┘
```

### Caching Strategy

**Multi-Level Caching**:
1. **Redis Cache**: API responses (5-minute TTL)
2. **Materialized Views**: Pre-aggregated stats (hourly refresh)
3. **Client Cache**: React Query (5-minute stale time)

**Cache Invalidation**:
- Automatic: Hourly cron job refreshes materialized views
- Manual: "Refresh" button on dashboard (admin only)
- Event-based: On student enrollment, video upload

---

## Database Schema

### Tables

#### `creator_preferences`
Stores dashboard customization settings.

```sql
CREATE TABLE creator_preferences (
    creator_id UUID PRIMARY KEY REFERENCES creators(id),
    dashboard_layout JSONB,
    notification_settings JSONB,
    export_preferences JSONB,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ
);
```

#### `export_logs`
Audit log of all data exports.

```sql
CREATE TABLE export_logs (
    id UUID PRIMARY KEY,
    creator_id UUID REFERENCES creators(id),
    export_type TEXT,
    format TEXT,
    file_url TEXT,
    file_size_bytes INTEGER,
    filters JSONB,
    status TEXT,
    created_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ
);
```

### Materialized Views

#### `creator_analytics_cache`
Pre-aggregated dashboard statistics (refreshed hourly).

**Key Metrics**:
- Total students, active students (7d, 30d)
- Total videos, processed videos
- Video views, avg watch percentage
- Chat sessions, messages
- Quiz attempts, passes

**Performance**: < 50ms query time (vs 2-5 seconds real-time)

#### `daily_active_users`
Daily student activity for engagement charts.

```sql
CREATE MATERIALIZED VIEW daily_active_users AS
SELECT
    DATE(last_watched) as activity_date,
    creator_id,
    COUNT(DISTINCT student_id) as active_count,
    COUNT(DISTINCT video_id) as videos_watched,
    SUM(watch_duration) as total_watch_time_seconds
FROM video_progress
GROUP BY DATE(last_watched), creator_id;
```

#### `video_analytics`
Per-video performance statistics.

**Metrics**:
- Unique viewers, total views
- Avg watch percentage, completion rate
- High/low engagement views
- Drop-off analysis

#### `most_asked_questions`
Top questions from chat (identifies content gaps).

```sql
CREATE MATERIALIZED VIEW most_asked_questions AS
SELECT
    creator_id,
    content as question,
    COUNT(*) as ask_count,
    COUNT(DISTINCT student_id) as unique_askers,
    AVG(helpful_rating) as avg_satisfaction,
    MAX(created_at) as last_asked_at
FROM chat_messages
WHERE role = 'user'
GROUP BY creator_id, content
HAVING COUNT(*) >= 2;
```

#### `student_engagement_tiers`
Student categorization by engagement level.

**Engagement Logic**:
```sql
CASE
    WHEN last_active < NOW() - INTERVAL '14 days' THEN 'inactive'
    WHEN last_active < NOW() - INTERVAL '7 days' THEN 'at_risk'
    WHEN videos_watched < 3 AND created_at < NOW() - INTERVAL '7 days' THEN 'low_engagement'
    WHEN videos_watched >= 10 AND avg_completion >= 75 THEN 'highly_engaged'
    WHEN videos_watched >= 5 THEN 'engaged'
    ELSE 'moderate'
END
```

### Cron Jobs

**Automated Maintenance**:

```sql
-- Refresh materialized views every hour
SELECT cron.schedule(
    'refresh-creator-analytics',
    '0 * * * *',
    $$SELECT refresh_creator_dashboard_views();$$
);

-- Cleanup old exports (30+ days)
SELECT cron.schedule(
    'cleanup-export-logs',
    '0 2 * * *',
    $$DELETE FROM export_logs WHERE created_at < NOW() - INTERVAL '30 days';$$
);
```

---

## Services

### 1. Analytics Service (`lib/creator/analytics-service.ts`)

**Primary Functions**:

```typescript
// Get complete dashboard overview
getOverviewStats(creatorId: string): Promise<DashboardStats>

// Get engagement metrics over time period
getStudentEngagement(creatorId: string, period: '7d' | '30d' | '90d'): Promise<EngagementMetrics>

// Get video performance statistics
getVideoPerformance(creatorId: string): Promise<VideoStats[]>

// Get quiz analytics
getQuizAnalytics(creatorId: string): Promise<QuizAnalytics>

// Get chat analytics
getChatAnalytics(creatorId: string): Promise<ChatAnalytics>
```

**Example Usage**:

```typescript
import { getOverviewStats } from '@/lib/creator/analytics-service';

const stats = await getOverviewStats(creatorId);
console.log(`Total Students: ${stats.students.total}`);
console.log(`Active This Week: ${stats.students.active}`);
console.log(`Avg Completion: ${stats.progress.avgCompletion}%`);
```

### 2. Student Management Service (`lib/creator/student-management.ts`)

**Primary Functions**:

```typescript
// Get filtered student list
getStudents(creatorId: string, filters: StudentFilters): Promise<StudentList>

// Get detailed student profile
getStudentDetails(studentId: string, creatorId: string): Promise<StudentDetailedProfile>

// Export student data
exportStudentData(creatorId: string, filters: StudentFilters, format: 'csv' | 'json'): Promise<string>

// Get at-risk students
getAtRiskStudents(creatorId: string): Promise<StudentProfile[]>

// Get top performers
getTopPerformers(creatorId: string): Promise<StudentProfile[]>
```

**Example Usage**:

```typescript
import { getStudents, getAtRiskStudents } from '@/lib/creator/student-management';

// Get all active students
const { students } = await getStudents(creatorId, {
    status: 'active',
    sortBy: 'lastActive',
    sortOrder: 'desc',
    limit: 50
});

// Get students needing attention
const atRisk = await getAtRiskStudents(creatorId);
```

### 3. Video Management Service (`lib/creator/video-management.ts`)

**Primary Functions**:

```typescript
// Get all videos with filters
getVideos(creatorId: string, filters: VideoFilters): Promise<Video[]>

// Update video metadata
updateVideoMetadata(videoId: string, creatorId: string, updates: VideoUpdates): Promise<Video>

// Reorder videos
reorderVideos(creatorId: string, videoIds: string[]): Promise<void>

// Delete video
deleteVideo(videoId: string, creatorId: string): Promise<void>

// Get detailed video analytics
getVideoAnalytics(videoId: string, creatorId: string): Promise<VideoAnalytics>
```

**Example Usage**:

```typescript
import { getVideos, getVideoAnalytics } from '@/lib/creator/video-management';

// Get all processed videos
const videos = await getVideos(creatorId, {
    status: 'completed',
    sortBy: 'views',
    sortOrder: 'desc'
});

// Get analytics for specific video
const analytics = await getVideoAnalytics(videoId, creatorId);
console.log(`Completion Rate: ${analytics.completion_rate}%`);
```

### 4. Export Service (`lib/creator/export-service.ts`)

**Primary Functions**:

```typescript
// Main export function
exportData(creatorId: string, options: ExportOptions): Promise<ExportResult>

// Convenience functions
exportStudentList(creatorId: string): Promise<Buffer>
exportChatHistory(creatorId: string): Promise<Buffer>
exportAnalyticsDashboard(creatorId: string, period: string): Promise<Buffer>
```

**Example Usage**:

```typescript
import { exportData } from '@/lib/creator/export-service';

const result = await exportData(creatorId, {
    type: 'students',
    format: 'csv',
    filters: { status: 'active' }
});

console.log(`Download: ${result.downloadUrl}`);
console.log(`Expires: ${result.expiresAt}`);
```

---

## API Endpoints

### Dashboard Overview

```
GET /api/creator/dashboard
```

**Query Parameters**:
- `period`: `7d` | `30d` | `90d` (default: `30d`)

**Response**:
```json
{
  "students": {
    "total": 245,
    "active": 187,
    "activePercentage": 76,
    "newThisMonth": 23,
    "trends": { "active": 12, "new": 5 }
  },
  "progress": {
    "avgCompletion": 62,
    "videosWatched": 1234,
    "quizzesPassed": 456
  },
  "engagement": {
    "dailyActiveUsers": [...],
    "peakHours": [...],
    "avgSessionTime": 28
  },
  "support": {
    "questionsAsked": 234,
    "aiAnswered": 215,
    "satisfactionRate": 0.92
  }
}
```

**Feature Gating**: ENTERPRISE tier required

### Student List

```
GET /api/creator/students
```

**Query Parameters**:
- `status`: `all` | `active` | `at-risk` | `inactive`
- `progress`: `0-25` | `26-50` | `51-75` | `76-100`
- `lastActive`: `today` | `week` | `month` | `inactive`
- `search`: Search by name or email
- `sortBy`: `name` | `progress` | `lastActive` | `xp`
- `sortOrder`: `asc` | `desc`
- `limit`: Number of results (default: 50)
- `offset`: Pagination offset

**Response**:
```json
{
  "students": [...],
  "total": 245,
  "page": 1,
  "pageSize": 50,
  "hasMore": true
}
```

### Export Data

```
POST /api/creator/export
```

**Request Body**:
```json
{
  "type": "students" | "progress" | "chat" | "analytics" | "quiz_results" | "videos",
  "format": "csv" | "json" | "pdf" | "xlsx",
  "filters": {
    "status": "active"
  }
}
```

**Response**:
```json
{
  "success": true,
  "downloadUrl": "https://storage.../export.csv",
  "fileSize": 12345,
  "expiresAt": "2025-10-22T10:00:00Z"
}
```

---

## UI Components

### Dashboard Layout

**Location**: `app/(dashboard)/creator/layout.tsx`

**Components**:
- `<Sidebar />`: Navigation with quick actions
- `<TopNav />`: Search, notifications, profile
- Main content area

### Metric Cards

**Location**: `components/dashboard/MetricCard.tsx`

**Props**:
```typescript
interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  change?: number; // Trend percentage
  icon: LucideIcon;
  iconColor: 'blue' | 'green' | 'purple' | 'orange' | 'red';
}
```

**Example**:
```tsx
<MetricCard
  title="Total Students"
  value={245}
  change={12}
  icon={Users}
  iconColor="blue"
/>
```

### Charts

**Location**: `components/dashboard/ChartCard.tsx`

**Supported Types**:
- Line chart (engagement over time)
- Bar chart (activity comparison)
- Donut chart (satisfaction breakdown)

**Example**:
```tsx
<ChartCard
  title="Daily Active Users"
  subtitle="Last 30 days"
  data={dailyActiveUsers}
  type="line"
/>
```

---

## Usage Guide

### For Creators

#### Accessing the Dashboard

1. Log in to Video Wizard
2. Ensure you have ENTERPRISE tier subscription
3. Navigate to `/creator` dashboard

#### Understanding Engagement Tiers

**Highly Engaged** (Green):
- Watched 10+ videos
- 75%+ avg completion rate
- Active in past 7 days

**Engaged** (Light Green):
- Watched 5+ videos
- Regular activity

**Moderate** (Yellow):
- Some activity but inconsistent

**Low Engagement** (Orange):
- <3 videos in first week
- Needs attention

**At Risk** (Red):
- Inactive for 7+ days
- May need intervention

**Inactive** (Gray):
- Inactive for 14+ days
- Consider re-engagement campaign

#### Identifying At-Risk Students

**Automatic Alerts**:
- Dashboard shows count of at-risk students
- Click to view full list
- Sort by "Last Active" to prioritize

**Proactive Actions**:
1. Review student profile
2. Check video watch history (where did they stop?)
3. Review quiz attempts (struggling areas)
4. Send personalized message or email
5. Adjust content based on patterns

#### Interpreting Video Analytics

**Completion Rate**:
- < 30%: Video may be too long or difficult
- 30-60%: Average engagement
- > 60%: High-quality content

**Drop-off Points**:
- Check avg drop-off percentage
- If students leave at same timestamp → content issue
- Consider splitting long videos

**Related Questions**:
- Many questions = confusion
- Review video clarity or add supplementary materials

---

## Performance

### Query Optimization

**Materialized Views**:
- Dashboard load time: < 2 seconds (target)
- Analytics query time: < 50ms (cached)
- Student list query: < 100ms (indexed)

**Caching**:
- Redis cache: 5-minute TTL for dashboard stats
- React Query: 5-minute stale time on client
- Materialized views: Hourly refresh

**Database Indexes**:
```sql
-- Student lookups
CREATE INDEX idx_students_creator ON students(creator_id);
CREATE INDEX idx_students_last_active ON students(last_active DESC);

-- Video analytics
CREATE INDEX idx_video_analytics_creator ON video_analytics(creator_id);
CREATE INDEX idx_video_analytics_views ON video_analytics(total_views DESC);

-- Chat questions
CREATE INDEX idx_most_asked_questions_creator ON most_asked_questions(creator_id);
CREATE INDEX idx_most_asked_questions_count ON most_asked_questions(ask_count DESC);
```

### Scalability

**Handles**:
- 10,000+ students per creator
- 1,000+ videos per creator
- 100,000+ chat messages

**Bottlenecks**:
- Real-time aggregation (solved by materialized views)
- Large exports (solved by background jobs)

---

## Troubleshooting

### Dashboard Loads Slowly

**Symptoms**:
- Dashboard takes > 5 seconds to load

**Solutions**:
1. Check materialized view freshness:
   ```sql
   SELECT cached_at FROM creator_analytics_cache WHERE creator_id = 'xxx';
   ```
2. Manually refresh views:
   ```sql
   SELECT refresh_creator_dashboard_views();
   ```
3. Check Redis cache status
4. Review database query logs

### Export Fails

**Symptoms**:
- Export returns 500 error

**Solutions**:
1. Check export logs:
   ```sql
   SELECT * FROM export_logs WHERE creator_id = 'xxx' ORDER BY created_at DESC LIMIT 10;
   ```
2. Verify storage bucket permissions
3. Check file size limits (max 100MB)
4. Review error message in `error_message` column

### Student Count Mismatch

**Symptoms**:
- Dashboard shows different student count than expected

**Solutions**:
1. Refresh materialized view:
   ```sql
   REFRESH MATERIALIZED VIEW creator_analytics_cache;
   ```
2. Verify creator_id filter:
   ```sql
   SELECT COUNT(*) FROM students WHERE creator_id = 'xxx';
   ```
3. Check for soft-deleted students

### Feature Gate Blocks Access

**Symptoms**:
- "Feature Access Denied" error on dashboard

**Solutions**:
1. Verify creator's subscription tier:
   ```sql
   SELECT subscription_tier FROM creators WHERE id = 'xxx';
   ```
2. Ensure `subscription_tier = 'enterprise'`
3. Check Whop membership status
4. Contact support if tier is correct but access denied

---

## Best Practices

### For Optimal Performance

1. **Regular View Refreshes**: Ensure cron jobs are running
2. **Limit Export Size**: Use filters to reduce export data
3. **Archive Old Data**: Move old chat/logs to cold storage after 6 months
4. **Monitor Cache Hit Rate**: Track Redis cache effectiveness

### For Better Student Outcomes

1. **Weekly Review**: Check at-risk students every Monday
2. **Content Iteration**: Update videos with high drop-off rates
3. **Proactive Engagement**: Message students before they become inactive
4. **Data-Driven Decisions**: Use analytics to guide content creation

---

## Support

**Documentation**: `/docs/CREATOR_DASHBOARD.md`
**Implementation Guide**: `/tasks/06-creator-dashboard/IMPLEMENTATION.md`
**API Reference**: `/docs/API_REFERENCE.md` (coming soon)

**Contact**:
- Technical issues: support@videowizard.com
- Feature requests: feature-requests@videowizard.com
- Enterprise support: enterprise@videowizard.com

---

**Built with**: Next.js 14, Supabase, PostgreSQL, Redis, shadcn/ui
**Module**: 6 - Creator Dashboard
**Tier**: ENTERPRISE
