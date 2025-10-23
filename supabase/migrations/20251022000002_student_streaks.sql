-- ============================================================================
-- Student Streaks Migration
-- ============================================================================
-- Tracks daily activity streaks for CHRONOS bonus rewards
-- ============================================================================

-- ============================================================================
-- TABLE: student_streaks
-- ============================================================================

CREATE TABLE student_streaks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL UNIQUE REFERENCES students(id) ON DELETE CASCADE,
  current_streak INT DEFAULT 0 CHECK (current_streak >= 0),
  longest_streak INT DEFAULT 0 CHECK (longest_streak >= 0),
  last_activity_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Indexes
CREATE INDEX idx_student_streaks_student ON student_streaks(student_id);
CREATE INDEX idx_student_streaks_activity ON student_streaks(last_activity_date DESC);

-- Updated_at trigger
CREATE TRIGGER update_student_streaks_updated_at
  BEFORE UPDATE ON student_streaks
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- FUNCTION: update_student_streak
-- ============================================================================
-- Updates student's streak based on activity
-- Returns the current streak count
-- ============================================================================

CREATE OR REPLACE FUNCTION update_student_streak(p_student_id UUID)
RETURNS INT
LANGUAGE plpgsql
AS $$
DECLARE
  v_current_streak INT;
  v_last_date DATE;
  v_today DATE := CURRENT_DATE;
BEGIN
  -- Get current streak data
  SELECT current_streak, last_activity_date
  INTO v_current_streak, v_last_date
  FROM student_streaks
  WHERE student_id = p_student_id;

  -- First time activity
  IF NOT FOUND THEN
    INSERT INTO student_streaks (student_id, current_streak, longest_streak, last_activity_date)
    VALUES (p_student_id, 1, 1, v_today);
    RETURN 1;
  END IF;

  -- Already counted today
  IF v_last_date = v_today THEN
    RETURN v_current_streak;
  END IF;

  -- Consecutive day
  IF v_last_date = v_today - INTERVAL '1 day' THEN
    v_current_streak := v_current_streak + 1;

    UPDATE student_streaks
    SET
      current_streak = v_current_streak,
      longest_streak = GREATEST(longest_streak, v_current_streak),
      last_activity_date = v_today,
      updated_at = NOW()
    WHERE student_id = p_student_id;

    RETURN v_current_streak;
  END IF;

  -- Streak broken - reset to 1
  UPDATE student_streaks
  SET
    current_streak = 1,
    last_activity_date = v_today,
    updated_at = NOW()
  WHERE student_id = p_student_id;

  RETURN 1;
END;
$$;

-- ============================================================================
-- Row Level Security (RLS)
-- ============================================================================

ALTER TABLE student_streaks ENABLE ROW LEVEL SECURITY;

-- Students can view their own streak
CREATE POLICY "Students can view own streak"
  ON student_streaks FOR SELECT
  USING (student_id = auth.uid());

-- Students can update their own streak (via function only)
CREATE POLICY "Students can update own streak"
  ON student_streaks FOR UPDATE
  USING (student_id = auth.uid());

-- Creators can view student streaks
CREATE POLICY "Creators can view student streaks"
  ON student_streaks FOR SELECT
  USING (
    student_id IN (
      SELECT s.id FROM students s
      JOIN creators c ON s.creator_id = c.id
      WHERE c.whop_user_id = auth.uid()
    )
  );

-- ============================================================================
-- Comments
-- ============================================================================

COMMENT ON TABLE student_streaks IS 'Tracks daily activity streaks for students';
COMMENT ON FUNCTION update_student_streak IS 'Updates student streak and returns current count';

-- ============================================================================
-- End of Migration
-- ============================================================================
