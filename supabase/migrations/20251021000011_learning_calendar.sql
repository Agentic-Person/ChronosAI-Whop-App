-- Learning Calendar Migration
-- Adds tables for personalized learning schedules and onboarding

-- ============================================
-- SCHEDULE PREFERENCES TABLE
-- ============================================

-- Store student's learning schedule preferences
CREATE TABLE IF NOT EXISTS schedule_preferences (
  student_id UUID PRIMARY KEY REFERENCES students(id) ON DELETE CASCADE,

  -- Timeline preferences
  target_completion_date DATE,
  available_hours_per_week INTEGER NOT NULL DEFAULT 5,

  -- Scheduling preferences
  preferred_days TEXT[] NOT NULL DEFAULT ARRAY['monday', 'wednesday', 'friday'],
  preferred_time_slots TEXT[] NOT NULL DEFAULT ARRAY['evening'],
  session_length VARCHAR(20) NOT NULL DEFAULT 'medium', -- 'short', 'medium', 'long'

  -- Learning preferences
  primary_goal VARCHAR(50), -- 'career-change', 'skill-upgrade', 'side-project', 'curiosity'
  skill_level VARCHAR(20) DEFAULT 'beginner', -- 'beginner', 'intermediate', 'advanced'
  learning_style VARCHAR(20), -- 'visual', 'hands-on', 'mixed'
  pace_preference VARCHAR(20), -- 'steady', 'intensive', 'flexible'
  break_frequency VARCHAR(20), -- 'frequent', 'moderate', 'minimal'

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for lookups
CREATE INDEX idx_schedule_preferences_student ON schedule_preferences(student_id);

-- ============================================
-- CALENDAR EVENTS TABLE
-- ============================================

-- Check if calendar_events table already exists, if not create it
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'calendar_events') THEN
    CREATE TABLE calendar_events (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
      video_id UUID NOT NULL REFERENCES videos(id) ON DELETE CASCADE,

      -- Scheduling
      scheduled_date TIMESTAMPTZ NOT NULL,
      session_duration INTEGER NOT NULL, -- minutes

      -- Completion tracking
      completed BOOLEAN DEFAULT FALSE,
      completed_at TIMESTAMPTZ,
      actual_duration INTEGER, -- actual minutes spent (if different from planned)

      -- Rescheduling
      rescheduled_from TIMESTAMPTZ, -- original date if rescheduled
      reschedule_count INTEGER DEFAULT 0,

      -- Learning metadata
      learning_objectives TEXT[],
      prerequisites UUID[], -- video IDs that should be completed first
      estimated_difficulty INTEGER CHECK (estimated_difficulty BETWEEN 1 AND 5),

      -- Notes
      notes TEXT,

      -- Metadata
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
  END IF;
END
$$;

-- Indexes for calendar queries
CREATE INDEX IF NOT EXISTS idx_calendar_events_student_date
  ON calendar_events(student_id, scheduled_date);

CREATE INDEX IF NOT EXISTS idx_calendar_events_video
  ON calendar_events(video_id);

CREATE INDEX IF NOT EXISTS idx_calendar_events_upcoming
  ON calendar_events(student_id, scheduled_date)
  WHERE completed = FALSE AND scheduled_date >= CURRENT_DATE;

CREATE INDEX IF NOT EXISTS idx_calendar_events_completed
  ON calendar_events(student_id, completed_at)
  WHERE completed = TRUE;

-- ============================================
-- STUDY SESSIONS TABLE
-- ============================================

-- Track actual study sessions for analytics
CREATE TABLE IF NOT EXISTS study_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  event_id UUID REFERENCES calendar_events(id) ON DELETE SET NULL,

  -- Session timing
  started_at TIMESTAMPTZ NOT NULL,
  ended_at TIMESTAMPTZ,
  duration_minutes INTEGER,

  -- Completion
  completed BOOLEAN DEFAULT FALSE,

  -- Notes
  session_notes TEXT,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for analytics queries
CREATE INDEX idx_study_sessions_student
  ON study_sessions(student_id, started_at DESC);

CREATE INDEX idx_study_sessions_event
  ON study_sessions(event_id);

-- ============================================
-- FUNCTIONS
-- ============================================

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_calendar_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for calendar_events
DROP TRIGGER IF EXISTS calendar_events_updated_at ON calendar_events;
CREATE TRIGGER calendar_events_updated_at
  BEFORE UPDATE ON calendar_events
  FOR EACH ROW
  EXECUTE FUNCTION update_calendar_updated_at();

-- Trigger for schedule_preferences
DROP TRIGGER IF EXISTS schedule_preferences_updated_at ON schedule_preferences;
CREATE TRIGGER schedule_preferences_updated_at
  BEFORE UPDATE ON schedule_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_calendar_updated_at();

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Get upcoming events for a student
CREATE OR REPLACE FUNCTION get_upcoming_events(
  p_student_id UUID,
  p_limit INTEGER DEFAULT 5
)
RETURNS TABLE (
  id UUID,
  video_id UUID,
  scheduled_date TIMESTAMPTZ,
  session_duration INTEGER,
  video_title TEXT,
  video_duration INTEGER,
  completed BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    ce.id,
    ce.video_id,
    ce.scheduled_date,
    ce.session_duration,
    v.title AS video_title,
    v.duration AS video_duration,
    ce.completed
  FROM calendar_events ce
  JOIN videos v ON v.id = ce.video_id
  WHERE ce.student_id = p_student_id
    AND ce.completed = FALSE
    AND ce.scheduled_date >= CURRENT_DATE
  ORDER BY ce.scheduled_date ASC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- Get student study statistics
CREATE OR REPLACE FUNCTION get_study_stats(p_student_id UUID)
RETURNS JSON AS $$
DECLARE
  v_total_sessions INTEGER;
  v_total_minutes INTEGER;
  v_avg_session_length NUMERIC;
  v_completion_rate NUMERIC;
  v_streak_days INTEGER;
  v_sessions_this_week INTEGER;
  v_result JSON;
BEGIN
  -- Total completed sessions
  SELECT COUNT(*)
  INTO v_total_sessions
  FROM study_sessions
  WHERE student_id = p_student_id AND completed = TRUE;

  -- Total minutes studied
  SELECT COALESCE(SUM(duration_minutes), 0)
  INTO v_total_minutes
  FROM study_sessions
  WHERE student_id = p_student_id AND completed = TRUE;

  -- Average session length
  SELECT COALESCE(AVG(duration_minutes), 0)
  INTO v_avg_session_length
  FROM study_sessions
  WHERE student_id = p_student_id AND completed = TRUE;

  -- Completion rate
  SELECT CASE
    WHEN COUNT(*) = 0 THEN 0
    ELSE ROUND((COUNT(*) FILTER (WHERE completed = TRUE)::NUMERIC / COUNT(*)) * 100, 2)
  END
  INTO v_completion_rate
  FROM calendar_events
  WHERE student_id = p_student_id
    AND scheduled_date < CURRENT_DATE;

  -- Current streak (simplified - consecutive days with completed sessions)
  WITH daily_completions AS (
    SELECT DISTINCT DATE(completed_at) as completion_date
    FROM calendar_events
    WHERE student_id = p_student_id AND completed = TRUE
    ORDER BY completion_date DESC
  ),
  streak_calc AS (
    SELECT
      completion_date,
      ROW_NUMBER() OVER (ORDER BY completion_date DESC) as rn,
      completion_date - INTERVAL '1 day' * ROW_NUMBER() OVER (ORDER BY completion_date DESC) as streak_group
    FROM daily_completions
  )
  SELECT COUNT(*)
  INTO v_streak_days
  FROM streak_calc
  WHERE streak_group = (SELECT streak_group FROM streak_calc ORDER BY completion_date DESC LIMIT 1);

  -- Sessions this week
  SELECT COUNT(*)
  INTO v_sessions_this_week
  FROM study_sessions
  WHERE student_id = p_student_id
    AND started_at >= DATE_TRUNC('week', CURRENT_DATE)
    AND completed = TRUE;

  -- Build JSON result
  v_result := json_build_object(
    'totalSessionsCompleted', v_total_sessions,
    'totalMinutesStudied', v_total_minutes,
    'averageSessionLength', v_avg_session_length,
    'completionRate', v_completion_rate,
    'streakDays', COALESCE(v_streak_days, 0),
    'sessionsThisWeek', v_sessions_this_week
  );

  RETURN v_result;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

-- Enable RLS on all tables
ALTER TABLE schedule_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE study_sessions ENABLE ROW LEVEL SECURITY;

-- Schedule Preferences Policies
CREATE POLICY "Students can view their own schedule preferences"
  ON schedule_preferences FOR SELECT
  USING (auth.uid()::text = student_id::text);

CREATE POLICY "Students can update their own schedule preferences"
  ON schedule_preferences FOR UPDATE
  USING (auth.uid()::text = student_id::text);

CREATE POLICY "Students can insert their own schedule preferences"
  ON schedule_preferences FOR INSERT
  WITH CHECK (auth.uid()::text = student_id::text);

-- Calendar Events Policies
CREATE POLICY "Students can view their own calendar events"
  ON calendar_events FOR SELECT
  USING (auth.uid()::text = student_id::text);

CREATE POLICY "Students can update their own calendar events"
  ON calendar_events FOR UPDATE
  USING (auth.uid()::text = student_id::text);

CREATE POLICY "Students can insert their own calendar events"
  ON calendar_events FOR INSERT
  WITH CHECK (auth.uid()::text = student_id::text);

CREATE POLICY "Students can delete their own calendar events"
  ON calendar_events FOR DELETE
  USING (auth.uid()::text = student_id::text);

-- Study Sessions Policies
CREATE POLICY "Students can view their own study sessions"
  ON study_sessions FOR SELECT
  USING (auth.uid()::text = student_id::text);

CREATE POLICY "Students can insert their own study sessions"
  ON study_sessions FOR INSERT
  WITH CHECK (auth.uid()::text = student_id::text);

CREATE POLICY "Students can update their own study sessions"
  ON study_sessions FOR UPDATE
  USING (auth.uid()::text = student_id::text);

-- ============================================
-- GRANTS
-- ============================================

-- Grant access to authenticated users
GRANT ALL ON schedule_preferences TO authenticated;
GRANT ALL ON calendar_events TO authenticated;
GRANT ALL ON study_sessions TO authenticated;

-- Grant execute on functions
GRANT EXECUTE ON FUNCTION get_upcoming_events TO authenticated;
GRANT EXECUTE ON FUNCTION get_study_stats TO authenticated;

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON TABLE schedule_preferences IS 'Student learning schedule preferences from onboarding';
COMMENT ON TABLE calendar_events IS 'AI-generated personalized learning calendar events';
COMMENT ON TABLE study_sessions IS 'Actual study session tracking for analytics';
COMMENT ON FUNCTION get_upcoming_events IS 'Returns upcoming calendar events for a student';
COMMENT ON FUNCTION get_study_stats IS 'Returns comprehensive study statistics for a student';
