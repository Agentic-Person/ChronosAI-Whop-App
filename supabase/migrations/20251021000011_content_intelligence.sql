-- Module 11: Content Intelligence
-- Database schema for AI-powered content analysis, recommendations, and insights

-- ============================================
-- KNOWLEDGE GAPS TRACKING
-- ============================================

-- Student difficulty levels and engagement scores
ALTER TABLE students
  ADD COLUMN IF NOT EXISTS difficulty_level TEXT DEFAULT 'intermediate' CHECK (difficulty_level IN ('beginner', 'intermediate', 'advanced')),
  ADD COLUMN IF NOT EXISTS engagement_score INTEGER DEFAULT 50 CHECK (engagement_score >= 0 AND engagement_score <= 100),
  ADD COLUMN IF NOT EXISTS last_engagement_update TIMESTAMPTZ;

-- Knowledge gaps tracking
CREATE TABLE IF NOT EXISTS knowledge_gaps (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  concept TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  evidence JSONB NOT NULL DEFAULT '{}'::jsonb,
  recommendations JSONB DEFAULT '[]'::jsonb,
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'closed')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_knowledge_gaps_student ON knowledge_gaps(student_id, status);
CREATE INDEX idx_knowledge_gaps_severity ON knowledge_gaps(severity, status);
CREATE INDEX idx_knowledge_gaps_created ON knowledge_gaps(created_at DESC);

-- ============================================
-- CONTENT HEALTH METRICS
-- ============================================

-- Content health metrics for video quality tracking
CREATE TABLE IF NOT EXISTS content_health_metrics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  video_id UUID NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
  metric_date DATE NOT NULL,
  completion_rate DECIMAL(5,4),
  avg_quiz_score DECIMAL(5,2),
  rewatch_rate DECIMAL(5,4),
  confusion_signals INTEGER DEFAULT 0,
  avg_satisfaction DECIMAL(3,2),
  student_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(video_id, metric_date)
);

CREATE INDEX idx_content_health_video ON content_health_metrics(video_id, metric_date DESC);
CREATE INDEX idx_content_health_date ON content_health_metrics(metric_date DESC);
CREATE INDEX idx_content_health_quality ON content_health_metrics(completion_rate, avg_quiz_score);

-- ============================================
-- AI INSIGHTS
-- ============================================

-- AI-generated insights for creators
CREATE TABLE IF NOT EXISTS ai_insights (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  creator_id UUID NOT NULL REFERENCES creators(id) ON DELETE CASCADE,
  insight_type TEXT NOT NULL CHECK (insight_type IN (
    'content_quality',
    'student_risk',
    'gap_detection',
    'engagement_drop',
    'performance_improvement',
    'content_recommendation'
  )),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  actionable BOOLEAN DEFAULT true,
  actions JSONB DEFAULT '[]'::jsonb,
  metadata JSONB DEFAULT '{}'::jsonb,
  dismissed BOOLEAN DEFAULT FALSE,
  dismissed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_ai_insights_creator ON ai_insights(creator_id, created_at DESC);
CREATE INDEX idx_ai_insights_priority ON ai_insights(priority, dismissed, created_at DESC);
CREATE INDEX idx_ai_insights_type ON ai_insights(insight_type, dismissed);

-- ============================================
-- STUDENT PREDICTIONS
-- ============================================

-- ML predictions for student outcomes
CREATE TABLE IF NOT EXISTS student_predictions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  prediction_type TEXT NOT NULL CHECK (prediction_type IN (
    'dropout_risk',
    'quiz_performance',
    'completion_time',
    'concept_mastery',
    'engagement_forecast'
  )),
  prediction_value DECIMAL(10,4) NOT NULL,
  confidence DECIMAL(3,2) NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
  factors JSONB DEFAULT '[]'::jsonb,
  interventions JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  actioned BOOLEAN DEFAULT FALSE,
  actioned_at TIMESTAMPTZ
);

CREATE INDEX idx_student_predictions_student ON student_predictions(student_id, prediction_type, expires_at);
CREATE INDEX idx_student_predictions_risk ON student_predictions(prediction_type, prediction_value DESC);
CREATE INDEX idx_student_predictions_expires ON student_predictions(expires_at);

-- ============================================
-- PERSONALIZED LEARNING PATHS
-- ============================================

-- AI-generated personalized learning paths
CREATE TABLE IF NOT EXISTS learning_paths (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  creator_id UUID NOT NULL REFERENCES creators(id) ON DELETE CASCADE,
  goal TEXT NOT NULL,
  total_duration_weeks INTEGER,
  path_structure JSONB NOT NULL DEFAULT '{}'::jsonb,
  milestones JSONB DEFAULT '[]'::jsonb,
  status TEXT DEFAULT 'active' CHECK (status IN ('draft', 'active', 'paused', 'completed', 'abandoned')),
  progress_percentage DECIMAL(5,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_learning_paths_student ON learning_paths(student_id, status);
CREATE INDEX idx_learning_paths_creator ON learning_paths(creator_id, status);
CREATE INDEX idx_learning_paths_status ON learning_paths(status, created_at DESC);

-- ============================================
-- CONTENT RECOMMENDATIONS
-- ============================================

-- AI-generated content recommendations for creators
CREATE TABLE IF NOT EXISTS content_recommendations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  creator_id UUID NOT NULL REFERENCES creators(id) ON DELETE CASCADE,
  recommendation_type TEXT NOT NULL CHECK (recommendation_type IN (
    'fill_gap',
    'improve_quality',
    'trending_topic',
    'skill_completion',
    'student_demand'
  )),
  topic TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  impact_score DECIMAL(5,2) CHECK (impact_score >= 0 AND impact_score <= 100),
  reasoning JSONB DEFAULT '{}'::jsonb,
  estimated_impact JSONB DEFAULT '{}'::jsonb,
  suggested_outline JSONB DEFAULT '[]'::jsonb,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'planned', 'in_progress', 'created', 'dismissed')),
  created_video_id UUID REFERENCES videos(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  dismissed_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_content_recommendations_creator ON content_recommendations(creator_id, status, priority DESC);
CREATE INDEX idx_content_recommendations_score ON content_recommendations(impact_score DESC);
CREATE INDEX idx_content_recommendations_type ON content_recommendations(recommendation_type, status);

-- ============================================
-- ADAPTIVE DIFFICULTY TRACKING
-- ============================================

-- Track difficulty adjustments over time
CREATE TABLE IF NOT EXISTS difficulty_adjustments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  video_id UUID REFERENCES videos(id) ON DELETE CASCADE,
  previous_level TEXT NOT NULL,
  new_level TEXT NOT NULL,
  reason TEXT NOT NULL,
  performance_data JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_difficulty_adjustments_student ON difficulty_adjustments(student_id, created_at DESC);
CREATE INDEX idx_difficulty_adjustments_video ON difficulty_adjustments(video_id);

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

-- Enable RLS on all tables
ALTER TABLE knowledge_gaps ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_health_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE learning_paths ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE difficulty_adjustments ENABLE ROW LEVEL SECURITY;

-- Knowledge gaps policies
CREATE POLICY "Students can view their own knowledge gaps"
  ON knowledge_gaps FOR SELECT
  USING (auth.uid() IN (
    SELECT user_id FROM students WHERE id = knowledge_gaps.student_id
  ));

CREATE POLICY "Creators can view gaps for their students"
  ON knowledge_gaps FOR SELECT
  USING (auth.uid() IN (
    SELECT c.user_id FROM creators c
    INNER JOIN students s ON s.creator_id = c.id
    WHERE s.id = knowledge_gaps.student_id
  ));

-- Content health metrics policies
CREATE POLICY "Creators can view their content health metrics"
  ON content_health_metrics FOR SELECT
  USING (auth.uid() IN (
    SELECT c.user_id FROM creators c
    INNER JOIN videos v ON v.creator_id = c.id
    WHERE v.id = content_health_metrics.video_id
  ));

-- AI insights policies
CREATE POLICY "Creators can view their own insights"
  ON ai_insights FOR SELECT
  USING (auth.uid() IN (
    SELECT user_id FROM creators WHERE id = ai_insights.creator_id
  ));

CREATE POLICY "Creators can update their insights"
  ON ai_insights FOR UPDATE
  USING (auth.uid() IN (
    SELECT user_id FROM creators WHERE id = ai_insights.creator_id
  ));

-- Student predictions policies
CREATE POLICY "Students can view their own predictions"
  ON student_predictions FOR SELECT
  USING (auth.uid() IN (
    SELECT user_id FROM students WHERE id = student_predictions.student_id
  ));

CREATE POLICY "Creators can view predictions for their students"
  ON student_predictions FOR SELECT
  USING (auth.uid() IN (
    SELECT c.user_id FROM creators c
    INNER JOIN students s ON s.creator_id = c.id
    WHERE s.id = student_predictions.student_id
  ));

-- Learning paths policies
CREATE POLICY "Students can view their own learning paths"
  ON learning_paths FOR SELECT
  USING (auth.uid() IN (
    SELECT user_id FROM students WHERE id = learning_paths.student_id
  ));

CREATE POLICY "Creators can view learning paths for their students"
  ON learning_paths FOR SELECT
  USING (auth.uid() IN (
    SELECT user_id FROM creators WHERE id = learning_paths.creator_id
  ));

-- Content recommendations policies
CREATE POLICY "Creators can view their own content recommendations"
  ON content_recommendations FOR SELECT
  USING (auth.uid() IN (
    SELECT user_id FROM creators WHERE id = content_recommendations.creator_id
  ));

CREATE POLICY "Creators can update their recommendations"
  ON content_recommendations FOR UPDATE
  USING (auth.uid() IN (
    SELECT user_id FROM creators WHERE id = content_recommendations.creator_id
  ));

-- Difficulty adjustments policies
CREATE POLICY "Students can view their own difficulty adjustments"
  ON difficulty_adjustments FOR SELECT
  USING (auth.uid() IN (
    SELECT user_id FROM students WHERE id = difficulty_adjustments.student_id
  ));

CREATE POLICY "Creators can view difficulty adjustments for their students"
  ON difficulty_adjustments FOR SELECT
  USING (auth.uid() IN (
    SELECT c.user_id FROM creators c
    INNER JOIN students s ON s.creator_id = c.id
    WHERE s.id = difficulty_adjustments.student_id
  ));

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Function to calculate engagement score
CREATE OR REPLACE FUNCTION calculate_engagement_score(p_student_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_score INTEGER := 50;
  v_days_active INTEGER;
  v_completion_rate DECIMAL;
  v_avg_quiz_score DECIMAL;
  v_current_streak INTEGER;
BEGIN
  -- Get student data
  SELECT
    EXTRACT(DAY FROM (NOW() - created_at))::INTEGER,
    current_streak
  INTO v_days_active, v_current_streak
  FROM students
  WHERE id = p_student_id;

  -- Calculate completion rate
  SELECT
    CASE
      WHEN COUNT(*) > 0 THEN (COUNT(*) FILTER (WHERE completed = true)::DECIMAL / COUNT(*)) * 100
      ELSE 0
    END
  INTO v_completion_rate
  FROM learning_progress
  WHERE student_id = p_student_id;

  -- Calculate average quiz score
  SELECT COALESCE(AVG(score), 0)
  INTO v_avg_quiz_score
  FROM quiz_attempts
  WHERE student_id = p_student_id
  AND created_at > NOW() - INTERVAL '30 days';

  -- Calculate score
  v_score := LEAST(100, GREATEST(0,
    (v_completion_rate * 0.4)::INTEGER +
    (v_avg_quiz_score * 0.3)::INTEGER +
    (LEAST(v_current_streak * 2, 30))::INTEGER
  ));

  RETURN v_score;
END;
$$;

-- Function to update engagement scores
CREATE OR REPLACE FUNCTION update_engagement_score(p_student_id UUID)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
  v_new_score INTEGER;
BEGIN
  v_new_score := calculate_engagement_score(p_student_id);

  UPDATE students
  SET
    engagement_score = v_new_score,
    last_engagement_update = NOW()
  WHERE id = p_student_id;
END;
$$;

-- ============================================
-- TRIGGERS
-- ============================================

-- Auto-update timestamps
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_knowledge_gaps_updated_at
  BEFORE UPDATE ON knowledge_gaps
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_learning_paths_updated_at
  BEFORE UPDATE ON learning_paths
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_content_recommendations_updated_at
  BEFORE UPDATE ON content_recommendations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON TABLE knowledge_gaps IS 'Tracks identified knowledge gaps for students';
COMMENT ON TABLE content_health_metrics IS 'Daily metrics for video quality and effectiveness';
COMMENT ON TABLE ai_insights IS 'AI-generated insights and recommendations for creators';
COMMENT ON TABLE student_predictions IS 'ML predictions for student outcomes and risks';
COMMENT ON TABLE learning_paths IS 'Personalized learning paths generated by AI';
COMMENT ON TABLE content_recommendations IS 'AI recommendations for content creation';
COMMENT ON TABLE difficulty_adjustments IS 'History of adaptive difficulty level changes';

COMMENT ON FUNCTION calculate_engagement_score IS 'Calculates engagement score (0-100) for a student';
COMMENT ON FUNCTION update_engagement_score IS 'Updates engagement score for a student';
