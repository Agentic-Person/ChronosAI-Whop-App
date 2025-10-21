-- ============================================================================
-- Creator Dashboard Tables and Materialized Views
-- Module 6: ENTERPRISE Tier Feature
-- ============================================================================

-- ============================================================================
-- CREATOR PREFERENCES
-- Store dashboard customization and notification settings
-- ============================================================================
CREATE TABLE creator_preferences (
    creator_id UUID PRIMARY KEY REFERENCES creators(id) ON DELETE CASCADE,
    dashboard_layout JSONB DEFAULT '{
        "defaultView": "overview",
        "cardOrder": ["students", "progress", "engagement", "support"],
        "chartPreferences": {
            "dateRange": "30d",
            "chartTypes": {
                "engagement": "line",
                "activity": "bar"
            }
        }
    }',
    notification_settings JSONB DEFAULT '{
        "emailNotifications": {
            "studentCompletion": true,
            "studentAtRisk": true,
            "quizFailure": true,
            "weeklySummary": true
        },
        "dashboardAlerts": {
            "newStudents": true,
            "lowEngagement": true,
            "contentIssues": true
        }
    }',
    export_preferences JSONB DEFAULT '{
        "defaultFormat": "csv",
        "includeMetadata": true,
        "dateFormat": "YYYY-MM-DD"
    }',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_creator_preferences_creator ON creator_preferences(creator_id);

-- ============================================================================
-- EXPORT LOGS
-- Track all data exports for audit and download history
-- ============================================================================
CREATE TABLE export_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    creator_id UUID REFERENCES creators(id) ON DELETE CASCADE,
    export_type TEXT NOT NULL, -- 'students', 'progress', 'chat', 'analytics', 'quiz_results'
    format TEXT NOT NULL, -- 'csv', 'pdf', 'json', 'xlsx'
    file_url TEXT,
    file_size_bytes INTEGER,
    filters JSONB, -- Store filter criteria used
    status TEXT DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed'
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

CREATE INDEX idx_export_logs_creator ON export_logs(creator_id);
CREATE INDEX idx_export_logs_created ON export_logs(created_at DESC);

-- ============================================================================
-- MATERIALIZED VIEW: Creator Analytics Cache
-- Pre-aggregated dashboard statistics for fast loading
-- Refreshed hourly via cron job
-- ============================================================================
CREATE MATERIALIZED VIEW creator_analytics_cache AS
SELECT
    c.id as creator_id,
    c.company_name,
    c.subscription_tier as current_plan,

    -- Student statistics
    COUNT(DISTINCT s.id) as total_students,
    COUNT(DISTINCT CASE
        WHEN s.last_active >= NOW() - INTERVAL '7 days'
        THEN s.id
    END) as active_students_7d,
    COUNT(DISTINCT CASE
        WHEN s.last_active >= NOW() - INTERVAL '30 days'
        THEN s.id
    END) as active_students_30d,
    COUNT(DISTINCT CASE
        WHEN s.created_at >= DATE_TRUNC('month', NOW())
        THEN s.id
    END) as new_students_this_month,

    -- Video statistics
    COUNT(DISTINCT v.id) as total_videos,
    COUNT(DISTINCT CASE
        WHEN v.transcript_processed = true
        THEN v.id
    END) as processed_videos,
    SUM(v.duration_seconds) as total_video_duration_seconds,

    -- Engagement metrics
    COUNT(DISTINCT vp.id) as total_video_views,
    AVG(vp.watch_percentage) as avg_watch_percentage,
    COUNT(DISTINCT CASE
        WHEN vp.completed = true
        THEN vp.id
    END) as total_completions,

    -- Chat metrics
    COUNT(DISTINCT cs.id) as total_chat_sessions,
    COUNT(DISTINCT cm.id) FILTER (WHERE cm.role = 'user') as total_user_messages,
    COUNT(DISTINCT cm.id) FILTER (WHERE cm.role = 'assistant') as total_ai_responses,

    -- Quiz metrics (if quizzes table exists)
    COUNT(DISTINCT q.id) as total_quizzes,
    COUNT(DISTINCT qa.id) as total_quiz_attempts,
    COUNT(DISTINCT CASE
        WHEN qa.passed = true
        THEN qa.id
    END) as total_quiz_passes,

    -- Calculated metrics
    CASE
        WHEN COUNT(DISTINCT s.id) > 0
        THEN ROUND((COUNT(DISTINCT vp.id)::NUMERIC / COUNT(DISTINCT s.id)), 2)
        ELSE 0
    END as avg_videos_per_student,

    -- Last updated timestamp
    NOW() as cached_at

FROM creators c
LEFT JOIN students s ON s.creator_id = c.id
LEFT JOIN videos v ON v.creator_id = c.id
LEFT JOIN video_progress vp ON vp.student_id = s.id
LEFT JOIN chat_sessions cs ON cs.creator_id = c.id
LEFT JOIN chat_messages cm ON cm.session_id = cs.id
LEFT JOIN quizzes q ON q.creator_id = c.id
LEFT JOIN quiz_attempts qa ON qa.quiz_id = q.id

GROUP BY c.id, c.company_name, c.subscription_tier;

-- Indexes for fast lookups
CREATE UNIQUE INDEX idx_creator_analytics_cache_creator ON creator_analytics_cache(creator_id);
CREATE INDEX idx_creator_analytics_cache_plan ON creator_analytics_cache(current_plan);

-- ============================================================================
-- MATERIALIZED VIEW: Daily Active Users (DAU)
-- Track student activity by date for engagement charts
-- ============================================================================
CREATE MATERIALIZED VIEW daily_active_users AS
SELECT
    DATE(vp.last_watched) as activity_date,
    v.creator_id,
    COUNT(DISTINCT vp.student_id) as active_count,
    COUNT(DISTINCT vp.video_id) as videos_watched,
    SUM(vp.watch_duration) as total_watch_time_seconds,
    AVG(vp.watch_percentage) as avg_completion
FROM video_progress vp
JOIN videos v ON v.id = vp.video_id
WHERE vp.last_watched >= CURRENT_DATE - INTERVAL '90 days'
GROUP BY DATE(vp.last_watched), v.creator_id;

CREATE INDEX idx_dau_creator_date ON daily_active_users(creator_id, activity_date DESC);
CREATE INDEX idx_dau_date ON daily_active_users(activity_date DESC);

-- ============================================================================
-- MATERIALIZED VIEW: Video Performance Analytics
-- Aggregated statistics per video for creator insights
-- ============================================================================
CREATE MATERIALIZED VIEW video_analytics AS
SELECT
    v.id as video_id,
    v.creator_id,
    v.title,
    v.category,
    v.difficulty_level,
    v.duration_seconds,

    -- View metrics
    COUNT(DISTINCT vp.student_id) as unique_viewers,
    COUNT(vp.id) as total_views,
    AVG(vp.watch_percentage) as avg_watch_percentage,
    AVG(vp.watch_duration) as avg_watch_duration_seconds,

    -- Completion metrics
    COUNT(CASE WHEN vp.completed = true THEN 1 END) as completions,
    ROUND(
        (COUNT(CASE WHEN vp.completed = true THEN 1 END)::NUMERIC /
         NULLIF(COUNT(DISTINCT vp.student_id), 0)) * 100,
        2
    ) as completion_rate,

    -- Engagement metrics
    COUNT(CASE WHEN vp.watch_percentage >= 75 THEN 1 END) as high_engagement_views,
    COUNT(CASE WHEN vp.watch_percentage < 25 THEN 1 END) as low_engagement_views,

    -- Drop-off analysis
    AVG(CASE WHEN vp.watch_percentage < 100 THEN vp.watch_percentage END) as avg_dropoff_percentage,

    -- Recent activity
    MAX(vp.last_watched) as last_viewed_at,
    COUNT(CASE WHEN vp.last_watched >= NOW() - INTERVAL '7 days' THEN 1 END) as views_last_7_days,

    NOW() as cached_at

FROM videos v
LEFT JOIN video_progress vp ON vp.video_id = v.id
GROUP BY v.id, v.creator_id, v.title, v.category, v.difficulty_level, v.duration_seconds;

CREATE INDEX idx_video_analytics_creator ON video_analytics(creator_id);
CREATE INDEX idx_video_analytics_views ON video_analytics(total_views DESC);
CREATE INDEX idx_video_analytics_completion ON video_analytics(completion_rate DESC);

-- ============================================================================
-- MATERIALIZED VIEW: Most Asked Questions
-- Top questions from chat to identify content gaps
-- ============================================================================
CREATE MATERIALIZED VIEW most_asked_questions AS
SELECT
    cs.creator_id,
    cm.content as question,
    COUNT(*) as ask_count,
    COUNT(DISTINCT cs.student_id) as unique_askers,

    -- Satisfaction metrics (if helpful_rating exists)
    AVG(CASE
        WHEN cm.helpful_rating IS NOT NULL
        THEN cm.helpful_rating
    END) as avg_satisfaction,
    COUNT(CASE WHEN cm.helpful_rating IS NOT NULL THEN 1 END) as rating_count,

    -- Related video (if context exists)
    cm.metadata->>'related_video_id' as related_video_id,

    -- Temporal data
    MAX(cm.created_at) as last_asked_at,
    COUNT(CASE WHEN cm.created_at >= NOW() - INTERVAL '7 days' THEN 1 END) as asks_last_7_days,
    COUNT(CASE WHEN cm.created_at >= NOW() - INTERVAL '30 days' THEN 1 END) as asks_last_30_days,

    NOW() as cached_at

FROM chat_messages cm
JOIN chat_sessions cs ON cs.id = cm.session_id
WHERE cm.role = 'user'
  AND cm.created_at >= NOW() - INTERVAL '90 days'
  AND LENGTH(cm.content) > 10 -- Filter out short messages
GROUP BY cs.creator_id, cm.content, cm.metadata->>'related_video_id'
HAVING COUNT(*) >= 2; -- Only questions asked multiple times

CREATE INDEX idx_most_asked_questions_creator ON most_asked_questions(creator_id);
CREATE INDEX idx_most_asked_questions_count ON most_asked_questions(ask_count DESC);
CREATE INDEX idx_most_asked_questions_recent ON most_asked_questions(last_asked_at DESC);

-- ============================================================================
-- MATERIALIZED VIEW: Student Engagement Tiers
-- Categorize students by engagement level for at-risk detection
-- ============================================================================
CREATE MATERIALIZED VIEW student_engagement_tiers AS
SELECT
    s.id as student_id,
    s.creator_id,
    s.name,
    s.email,
    s.xp_points,
    s.level,
    s.streak_days,
    s.last_active,

    -- Activity metrics
    COUNT(DISTINCT vp.video_id) as videos_watched,
    AVG(vp.watch_percentage) as avg_completion_rate,
    SUM(vp.watch_duration) as total_watch_time_seconds,

    -- Quiz metrics
    COUNT(DISTINCT qa.id) as quiz_attempts,
    COUNT(CASE WHEN qa.passed = true THEN 1 END) as quizzes_passed,

    -- Chat metrics
    COUNT(DISTINCT cm.id) as messages_sent,

    -- Engagement tier calculation
    CASE
        WHEN s.last_active < NOW() - INTERVAL '14 days' THEN 'inactive'
        WHEN s.last_active < NOW() - INTERVAL '7 days' THEN 'at_risk'
        WHEN COUNT(DISTINCT vp.video_id) < 3 AND s.created_at < NOW() - INTERVAL '7 days' THEN 'low_engagement'
        WHEN COUNT(DISTINCT vp.video_id) >= 10 AND AVG(vp.watch_percentage) >= 75 THEN 'highly_engaged'
        WHEN COUNT(DISTINCT vp.video_id) >= 5 THEN 'engaged'
        ELSE 'moderate'
    END as engagement_tier,

    -- Progress metrics
    ROUND(
        (COUNT(DISTINCT vp.video_id)::NUMERIC /
         NULLIF((SELECT COUNT(*) FROM videos WHERE creator_id = s.creator_id), 0)) * 100,
        2
    ) as course_progress_percentage,

    NOW() as cached_at

FROM students s
LEFT JOIN video_progress vp ON vp.student_id = s.id
LEFT JOIN quiz_attempts qa ON qa.student_id = s.id
LEFT JOIN chat_sessions cs ON cs.student_id = s.id
LEFT JOIN chat_messages cm ON cm.session_id = cs.id AND cm.role = 'user'

GROUP BY s.id, s.creator_id, s.name, s.email, s.xp_points, s.level, s.streak_days, s.last_active;

CREATE INDEX idx_student_engagement_creator ON student_engagement_tiers(creator_id);
CREATE INDEX idx_student_engagement_tier ON student_engagement_tiers(engagement_tier);
CREATE INDEX idx_student_engagement_activity ON student_engagement_tiers(last_active DESC);

-- ============================================================================
-- FUNCTIONS: Database Helpers
-- ============================================================================

-- Function: Get average completion rate for a creator
CREATE OR REPLACE FUNCTION get_avg_completion_rate(creator_id_param UUID)
RETURNS NUMERIC AS $$
DECLARE
    avg_rate NUMERIC;
BEGIN
    SELECT ROUND(AVG(vp.watch_percentage), 2)
    INTO avg_rate
    FROM video_progress vp
    JOIN videos v ON v.id = vp.video_id
    WHERE v.creator_id = creator_id_param;

    RETURN COALESCE(avg_rate, 0);
END;
$$ LANGUAGE plpgsql;

-- Function: Get peak learning hours for a creator
CREATE OR REPLACE FUNCTION get_peak_learning_hours(creator_id_param UUID)
RETURNS TABLE(hour INTEGER, activity_count BIGINT) AS $$
BEGIN
    RETURN QUERY
    SELECT
        EXTRACT(HOUR FROM vp.last_watched)::INTEGER as hour,
        COUNT(*) as activity_count
    FROM video_progress vp
    JOIN videos v ON v.id = vp.video_id
    WHERE v.creator_id = creator_id_param
      AND vp.last_watched >= NOW() - INTERVAL '30 days'
    GROUP BY EXTRACT(HOUR FROM vp.last_watched)
    ORDER BY activity_count DESC;
END;
$$ LANGUAGE plpgsql;

-- Function: Get average session time for a creator's students
CREATE OR REPLACE FUNCTION get_avg_session_time(creator_id_param UUID)
RETURNS INTEGER AS $$
DECLARE
    avg_time INTEGER;
BEGIN
    SELECT ROUND(AVG(vp.watch_duration) / 60)::INTEGER
    INTO avg_time
    FROM video_progress vp
    JOIN videos v ON v.id = vp.video_id
    WHERE v.creator_id = creator_id_param
      AND vp.last_watched >= NOW() - INTERVAL '30 days';

    RETURN COALESCE(avg_time, 0);
END;
$$ LANGUAGE plpgsql;

-- Function: Refresh all creator dashboard materialized views
CREATE OR REPLACE FUNCTION refresh_creator_dashboard_views()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY creator_analytics_cache;
    REFRESH MATERIALIZED VIEW CONCURRENTLY daily_active_users;
    REFRESH MATERIALIZED VIEW CONCURRENTLY video_analytics;
    REFRESH MATERIALIZED VIEW CONCURRENTLY most_asked_questions;
    REFRESH MATERIALIZED VIEW CONCURRENTLY student_engagement_tiers;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- CRON JOBS: Automated View Refreshes
-- Requires pg_cron extension
-- ============================================================================

-- Enable pg_cron extension (if not already enabled)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule: Refresh materialized views every hour
SELECT cron.schedule(
    'refresh-creator-analytics',
    '0 * * * *', -- Every hour at :00
    $$SELECT refresh_creator_dashboard_views();$$
);

-- Schedule: Cleanup old export logs (older than 30 days)
SELECT cron.schedule(
    'cleanup-export-logs',
    '0 2 * * *', -- Daily at 2 AM
    $$DELETE FROM export_logs WHERE created_at < NOW() - INTERVAL '30 days';$$
);

-- ============================================================================
-- TRIGGERS: Auto-update timestamps
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_creator_preferences_updated_at
    BEFORE UPDATE ON creator_preferences
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- INITIAL DATA: Create default preferences for existing creators
-- ============================================================================

INSERT INTO creator_preferences (creator_id)
SELECT id FROM creators
WHERE id NOT IN (SELECT creator_id FROM creator_preferences)
ON CONFLICT (creator_id) DO NOTHING;

-- ============================================================================
-- PERMISSIONS: Row Level Security (RLS)
-- ============================================================================

ALTER TABLE creator_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE export_logs ENABLE ROW LEVEL SECURITY;

-- Policy: Creators can only access their own preferences
CREATE POLICY creator_preferences_select_own
    ON creator_preferences FOR SELECT
    USING (creator_id = auth.uid());

CREATE POLICY creator_preferences_update_own
    ON creator_preferences FOR UPDATE
    USING (creator_id = auth.uid());

-- Policy: Creators can only access their own export logs
CREATE POLICY export_logs_select_own
    ON export_logs FOR SELECT
    USING (creator_id = auth.uid());

CREATE POLICY export_logs_insert_own
    ON export_logs FOR INSERT
    WITH CHECK (creator_id = auth.uid());

-- ============================================================================
-- COMMENTS: Documentation
-- ============================================================================

COMMENT ON TABLE creator_preferences IS 'Stores creator dashboard customization and notification settings';
COMMENT ON TABLE export_logs IS 'Audit log of all data exports by creators';
COMMENT ON MATERIALIZED VIEW creator_analytics_cache IS 'Pre-aggregated dashboard statistics for fast loading (refreshed hourly)';
COMMENT ON MATERIALIZED VIEW daily_active_users IS 'Daily student activity metrics for engagement charts';
COMMENT ON MATERIALIZED VIEW video_analytics IS 'Per-video performance statistics for creator insights';
COMMENT ON MATERIALIZED VIEW most_asked_questions IS 'Top questions from chat to identify content gaps';
COMMENT ON MATERIALIZED VIEW student_engagement_tiers IS 'Student categorization by engagement level for at-risk detection';

-- ============================================================================
-- DONE: Migration complete
-- ============================================================================
