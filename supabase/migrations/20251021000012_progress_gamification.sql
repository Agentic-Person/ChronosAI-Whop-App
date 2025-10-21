-- =====================================================
-- Progress & Gamification System Migration
-- Adds XP tracking, streaks, achievements, and leaderboards
-- =====================================================

-- Add gamification columns to students table
ALTER TABLE students
ADD COLUMN IF NOT EXISTS current_level INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS total_xp INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS current_streak INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS longest_streak INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_activity_date DATE DEFAULT CURRENT_DATE;

-- Create index for XP sorting (leaderboard)
CREATE INDEX IF NOT EXISTS idx_students_total_xp ON students(total_xp DESC);

-- =====================================================
-- XP Transactions Table
-- Logs all XP-earning activities
-- =====================================================

CREATE TABLE IF NOT EXISTS xp_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  xp_amount INTEGER NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for querying
CREATE INDEX IF NOT EXISTS idx_xp_transactions_student ON xp_transactions(student_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_xp_transactions_action ON xp_transactions(action);

-- =====================================================
-- Streak History Table
-- Tracks daily activity for streak calculation
-- =====================================================

CREATE TABLE IF NOT EXISTS streak_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  xp_earned INTEGER DEFAULT 0,
  activities_completed INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(student_id, date)
);

-- Indexes for streak queries
CREATE INDEX IF NOT EXISTS idx_streak_history_student_date ON streak_history(student_id, date DESC);

-- =====================================================
-- Leaderboard Materialized View
-- Optimized view for fast leaderboard queries
-- =====================================================

CREATE MATERIALIZED VIEW IF NOT EXISTS leaderboard AS
SELECT
  s.id as student_id,
  s.name,
  s.avatar_url,
  s.total_xp,
  s.current_level,
  s.current_streak,
  s.creator_id,
  RANK() OVER (ORDER BY s.total_xp DESC) as global_rank,
  RANK() OVER (PARTITION BY s.creator_id ORDER BY s.total_xp DESC) as course_rank,
  NOW() as last_updated
FROM students s
WHERE s.total_xp > 0;

-- Indexes for leaderboard
CREATE UNIQUE INDEX IF NOT EXISTS idx_leaderboard_student ON leaderboard(student_id);
CREATE INDEX IF NOT EXISTS idx_leaderboard_global_rank ON leaderboard(global_rank);
CREATE INDEX IF NOT EXISTS idx_leaderboard_course_rank ON leaderboard(creator_id, course_rank);

-- =====================================================
-- Database Functions
-- =====================================================

-- Function to award XP and update student stats
CREATE OR REPLACE FUNCTION award_xp(
  p_student_id UUID,
  p_xp_amount INTEGER,
  p_action TEXT,
  p_metadata JSONB DEFAULT '{}'::jsonb
) RETURNS JSONB AS $$
DECLARE
  v_new_total_xp INTEGER;
  v_old_level INTEGER;
  v_new_level INTEGER;
  v_level_up BOOLEAN;
BEGIN
  -- Update student's total XP
  UPDATE students
  SET
    total_xp = total_xp + p_xp_amount,
    last_activity_date = CURRENT_DATE
  WHERE id = p_student_id
  RETURNING total_xp - p_xp_amount, total_xp INTO v_old_level, v_new_total_xp;

  -- Log the transaction
  INSERT INTO xp_transactions (student_id, action, xp_amount, metadata)
  VALUES (p_student_id, p_action, p_xp_amount, p_metadata);

  -- Calculate old and new levels
  -- Level formula: Level = floor(1 + log(total_xp / 100) / log(1.5))
  v_old_level := CASE
    WHEN v_new_total_xp - p_xp_amount <= 0 THEN 1
    ELSE GREATEST(1, FLOOR(1 + LOG(GREATEST(1, (v_new_total_xp - p_xp_amount)::NUMERIC / 100)) / LOG(1.5)))
  END;

  v_new_level := CASE
    WHEN v_new_total_xp <= 0 THEN 1
    ELSE GREATEST(1, FLOOR(1 + LOG(GREATEST(1, v_new_total_xp::NUMERIC / 100)) / LOG(1.5)))
  END;

  v_level_up := v_new_level > v_old_level;

  -- Update current level if leveled up
  IF v_level_up THEN
    UPDATE students
    SET current_level = v_new_level
    WHERE id = p_student_id;
  END IF;

  -- Return result
  RETURN jsonb_build_object(
    'success', TRUE,
    'old_total_xp', v_new_total_xp - p_xp_amount,
    'new_total_xp', v_new_total_xp,
    'xp_awarded', p_xp_amount,
    'old_level', v_old_level,
    'new_level', v_new_level,
    'level_up', v_level_up
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update daily streak
CREATE OR REPLACE FUNCTION update_streak(
  p_student_id UUID,
  p_xp_earned INTEGER DEFAULT 0,
  p_activities_completed INTEGER DEFAULT 1
) RETURNS JSONB AS $$
DECLARE
  v_last_active_date DATE;
  v_current_streak INTEGER;
  v_longest_streak INTEGER;
  v_days_since_active INTEGER;
  v_new_streak INTEGER;
  v_streak_broken BOOLEAN;
BEGIN
  -- Get current streak info
  SELECT
    last_activity_date,
    current_streak,
    longest_streak
  INTO v_last_active_date, v_current_streak, v_longest_streak
  FROM students
  WHERE id = p_student_id;

  -- Calculate days since last activity
  v_days_since_active := CURRENT_DATE - v_last_active_date;

  -- Determine new streak
  IF v_days_since_active = 0 THEN
    -- Same day, no change to streak
    v_new_streak := v_current_streak;
    v_streak_broken := FALSE;
  ELSIF v_days_since_active = 1 THEN
    -- Consecutive day, increment streak
    v_new_streak := v_current_streak + 1;
    v_streak_broken := FALSE;
  ELSE
    -- Streak broken, reset to 1
    v_new_streak := 1;
    v_streak_broken := TRUE;
  END IF;

  -- Update student record
  UPDATE students
  SET
    current_streak = v_new_streak,
    longest_streak = GREATEST(longest_streak, v_new_streak),
    last_activity_date = CURRENT_DATE
  WHERE id = p_student_id;

  -- Insert or update streak history
  INSERT INTO streak_history (student_id, date, xp_earned, activities_completed)
  VALUES (p_student_id, CURRENT_DATE, p_xp_earned, p_activities_completed)
  ON CONFLICT (student_id, date)
  DO UPDATE SET
    xp_earned = streak_history.xp_earned + EXCLUDED.xp_earned,
    activities_completed = streak_history.activities_completed + EXCLUDED.activities_completed;

  -- Return result
  RETURN jsonb_build_object(
    'success', TRUE,
    'current_streak', v_new_streak,
    'longest_streak', GREATEST(v_longest_streak, v_new_streak),
    'streak_broken', v_streak_broken,
    'days_since_active', v_days_since_active
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to refresh leaderboard (run daily via cron)
CREATE OR REPLACE FUNCTION refresh_leaderboard()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY leaderboard;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- Triggers
-- =====================================================

-- Trigger to update streak when student earns XP
CREATE OR REPLACE FUNCTION trigger_update_streak()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM update_streak(NEW.student_id, NEW.xp_amount, 1);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_xp_transaction_update_streak
AFTER INSERT ON xp_transactions
FOR EACH ROW
EXECUTE FUNCTION trigger_update_streak();

-- =====================================================
-- Row Level Security (RLS)
-- =====================================================

-- Enable RLS on new tables
ALTER TABLE xp_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE streak_history ENABLE ROW LEVEL SECURITY;

-- Students can view their own XP transactions
CREATE POLICY "Students can view own XP transactions"
ON xp_transactions FOR SELECT
USING (
  student_id IN (
    SELECT id FROM students WHERE whop_user_id = auth.uid()
  )
);

-- Students can view their own streak history
CREATE POLICY "Students can view own streak history"
ON streak_history FOR SELECT
USING (
  student_id IN (
    SELECT id FROM students WHERE whop_user_id = auth.uid()
  )
);

-- Creators can view XP transactions of their students
CREATE POLICY "Creators can view student XP transactions"
ON xp_transactions FOR SELECT
USING (
  student_id IN (
    SELECT s.id FROM students s
    INNER JOIN creators c ON s.creator_id = c.id
    WHERE c.whop_user_id = auth.uid()
  )
);

-- Creators can view streak history of their students
CREATE POLICY "Creators can view student streak history"
ON streak_history FOR SELECT
USING (
  student_id IN (
    SELECT s.id FROM students s
    INNER JOIN creators c ON s.creator_id = c.id
    WHERE c.whop_user_id = auth.uid()
  )
);

-- =====================================================
-- Seed Initial Data
-- =====================================================

-- Calculate and set initial levels for existing students
UPDATE students
SET current_level = CASE
  WHEN total_xp <= 0 THEN 1
  ELSE GREATEST(1, FLOOR(1 + LOG(GREATEST(1, total_xp::NUMERIC / 100)) / LOG(1.5)))
END
WHERE current_level = 1 AND total_xp > 0;

-- =====================================================
-- Comments
-- =====================================================

COMMENT ON TABLE xp_transactions IS 'Logs all XP-earning activities for students';
COMMENT ON TABLE streak_history IS 'Tracks daily activity streaks for students';
COMMENT ON MATERIALIZED VIEW leaderboard IS 'Optimized leaderboard rankings by XP';
COMMENT ON FUNCTION award_xp IS 'Awards XP to a student and updates their level';
COMMENT ON FUNCTION update_streak IS 'Updates student daily streak and activity history';
COMMENT ON FUNCTION refresh_leaderboard IS 'Refreshes the leaderboard materialized view';
