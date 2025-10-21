-- Study Buddy System Migration
-- Creates tables for AI-powered study buddy matching, study groups, and collaboration

-- Enable UUID extension (if not already enabled)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Study Buddy Matches and Connections
CREATE TABLE IF NOT EXISTS study_buddy_matches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_a_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  student_b_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,

  -- Match quality
  compatibility_score INTEGER NOT NULL CHECK (compatibility_score BETWEEN 0 AND 100),
  match_reasoning TEXT,

  -- Status
  status VARCHAR(20) NOT NULL DEFAULT 'suggested' CHECK (status IN ('suggested', 'connected', 'declined')),

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  connected_at TIMESTAMPTZ,

  -- Ensure unique pairing (regardless of order)
  CONSTRAINT unique_study_match UNIQUE (
    LEAST(student_a_id, student_b_id),
    GREATEST(student_a_id, student_b_id)
  ),
  CONSTRAINT no_self_match CHECK (student_a_id != student_b_id)
);

-- Study Groups (enhanced from previous scaffold)
CREATE TABLE IF NOT EXISTS study_groups (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL,
  description TEXT,
  type VARCHAR(30) NOT NULL CHECK (type IN ('learning-circle', 'project-team', 'accountability-pod', 'workshop')),

  -- Focus area
  focus_module INTEGER,
  focus_project VARCHAR(255),
  focus_topic VARCHAR(100),

  -- Configuration
  max_members INTEGER NOT NULL DEFAULT 5 CHECK (max_members BETWEEN 2 AND 10),
  recruiting_status VARCHAR(20) DEFAULT 'open' CHECK (recruiting_status IN ('open', 'invite-only', 'closed')),
  min_level INTEGER,
  max_level INTEGER,
  required_topics JSONB DEFAULT '[]',

  -- Schedule
  timezone VARCHAR(50),
  meeting_schedule TEXT,
  requirements TEXT,
  is_public BOOLEAN DEFAULT true,
  start_date DATE,
  end_date DATE,

  -- Activity requirements
  min_weekly_check_ins INTEGER DEFAULT 0,
  min_weekly_messages INTEGER DEFAULT 0,

  -- Status and metrics
  created_by UUID NOT NULL REFERENCES students(id),
  activity_score INTEGER DEFAULT 100 CHECK (activity_score BETWEEN 0 AND 100),
  total_messages INTEGER DEFAULT 0,
  last_activity_at TIMESTAMPTZ DEFAULT NOW(),

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Study Group Members
CREATE TABLE IF NOT EXISTS study_group_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  group_id UUID NOT NULL REFERENCES study_groups(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,

  role VARCHAR(20) NOT NULL DEFAULT 'member' CHECK (role IN ('creator', 'admin', 'member')),

  -- Activity tracking
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_active_at TIMESTAMPTZ DEFAULT NOW(),
  total_messages INTEGER DEFAULT 0,
  total_check_ins INTEGER DEFAULT 0,
  contribution_score INTEGER DEFAULT 0 CHECK (contribution_score BETWEEN 0 AND 100),

  -- Status
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'left', 'removed')),
  left_at TIMESTAMPTZ,

  CONSTRAINT unique_group_member UNIQUE (group_id, student_id)
);

-- Shared Notes (for collaborative learning)
CREATE TABLE IF NOT EXISTS shared_notes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  group_id UUID NOT NULL REFERENCES study_groups(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT,
  last_edited_by UUID REFERENCES students(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Note Revisions (version history)
CREATE TABLE IF NOT EXISTS note_revisions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  note_id UUID NOT NULL REFERENCES shared_notes(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  editor_id UUID NOT NULL REFERENCES students(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Study Sessions
CREATE TABLE IF NOT EXISTS study_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  group_id UUID NOT NULL REFERENCES study_groups(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  scheduled_start TIMESTAMPTZ NOT NULL,
  scheduled_end TIMESTAMPTZ NOT NULL,
  actual_start TIMESTAMPTZ,
  actual_end TIMESTAMPTZ,
  summary TEXT,
  attendees UUID[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Group Chat Messages
CREATE TABLE IF NOT EXISTS group_chat_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  group_id UUID NOT NULL REFERENCES study_groups(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  message_type VARCHAR(20) DEFAULT 'text' CHECK (message_type IN ('text', 'code', 'file', 'system')),
  metadata JSONB,
  is_pinned BOOLEAN DEFAULT FALSE,

  -- Reactions
  reactions JSONB DEFAULT '[]',

  -- Threading
  reply_to UUID REFERENCES group_chat_messages(id),

  -- Moderation
  flagged BOOLEAN DEFAULT FALSE,
  flagged_reason TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  edited_at TIMESTAMPTZ
);

-- Study Check-Ins
CREATE TABLE IF NOT EXISTS study_check_ins (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID NOT NULL REFERENCES students(id),
  group_id UUID REFERENCES study_groups(id),
  buddy_id UUID REFERENCES students(id),

  -- Progress metrics
  videos_watched INTEGER DEFAULT 0,
  quizzes_taken INTEGER DEFAULT 0,
  project_hours DECIMAL(4,1) DEFAULT 0,
  xp_earned INTEGER DEFAULT 0,

  -- Mood and feedback
  mood VARCHAR(20) CHECK (mood IN ('struggling', 'ok', 'confident', 'crushing-it')),
  blockers TEXT,
  wins TEXT,

  -- Commitments
  next_week_commitment TEXT,
  previous_commitment_met BOOLEAN,

  -- Metadata
  check_in_date DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Ensure one check-in per day per group
  CONSTRAINT unique_daily_group_checkin UNIQUE (student_id, group_id, check_in_date)
);

-- Shared Projects
CREATE TABLE IF NOT EXISTS shared_projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  group_id UUID NOT NULL REFERENCES study_groups(id) ON DELETE CASCADE,

  name VARCHAR(100) NOT NULL,
  description TEXT,

  -- GitHub integration
  github_repo VARCHAR(255),
  branches JSONB DEFAULT '[]',

  -- Task management
  tasks JSONB DEFAULT '[]',

  -- Status
  status VARCHAR(20) DEFAULT 'planning' CHECK (status IN ('planning', 'in-progress', 'review', 'completed')),
  progress INTEGER DEFAULT 0 CHECK (progress BETWEEN 0 AND 100),

  -- Resources
  references JSONB DEFAULT '[]',
  code_snippets JSONB DEFAULT '[]',

  -- Metadata
  created_by UUID NOT NULL REFERENCES students(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- Matching Preferences
CREATE TABLE IF NOT EXISTS matching_preferences (
  student_id UUID PRIMARY KEY REFERENCES students(id) ON DELETE CASCADE,

  -- Availability
  weekly_availability_hours INTEGER,
  timezone VARCHAR(50),
  preferred_study_times JSONB DEFAULT '[]',

  -- Goals and interests
  primary_goal VARCHAR(50),
  interested_topics JSONB DEFAULT '[]',
  project_interests JSONB DEFAULT '[]',

  -- Learning style
  learning_style VARCHAR(30),
  communication_preference VARCHAR(20) CHECK (communication_preference IN ('text', 'voice', 'video', 'any')),
  competitiveness INTEGER CHECK (competitiveness BETWEEN 1 AND 5),

  -- Preferences
  open_to_matching BOOLEAN DEFAULT TRUE,
  preferred_group_size INTEGER DEFAULT 4 CHECK (preferred_group_size BETWEEN 2 AND 10),
  language_preferences JSONB DEFAULT '["en"]',

  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Safety Reports
CREATE TABLE IF NOT EXISTS safety_reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  reported_by UUID NOT NULL REFERENCES students(id),
  reported_user UUID NOT NULL REFERENCES students(id),

  context VARCHAR(20) NOT NULL CHECK (context IN ('message', 'profile', 'behavior')),
  category VARCHAR(30) NOT NULL CHECK (category IN ('harassment', 'inappropriate-content', 'spam', 'other')),
  description TEXT NOT NULL,
  evidence JSONB DEFAULT '[]',

  -- Status
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'under-review', 'resolved', 'dismissed')),
  reviewed_by UUID REFERENCES creators(id),
  resolution TEXT,
  action_taken VARCHAR(50),

  created_at TIMESTAMPTZ DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ
);

-- Indexes for Performance
CREATE INDEX idx_buddy_matches_student_a ON study_buddy_matches(student_a_id, status);
CREATE INDEX idx_buddy_matches_student_b ON study_buddy_matches(student_b_id, status);
CREATE INDEX idx_buddy_matches_suggested ON study_buddy_matches(status, created_at DESC) WHERE status = 'suggested';

CREATE INDEX idx_study_groups_recruiting ON study_groups(recruiting_status, activity_score DESC) WHERE recruiting_status = 'open';
CREATE INDEX idx_study_groups_type ON study_groups(type, created_at DESC);
CREATE INDEX idx_study_groups_creator ON study_groups(created_by);

CREATE INDEX idx_group_members_student ON study_group_members(student_id, status);
CREATE INDEX idx_group_members_group ON study_group_members(group_id, status);
CREATE INDEX idx_group_members_active ON study_group_members(group_id, last_active_at DESC) WHERE status = 'active';

CREATE INDEX idx_shared_notes_group ON shared_notes(group_id, updated_at DESC);
CREATE INDEX idx_note_revisions_note ON note_revisions(note_id, created_at DESC);

CREATE INDEX idx_study_sessions_group ON study_sessions(group_id, scheduled_start);
CREATE INDEX idx_study_sessions_upcoming ON study_sessions(scheduled_start) WHERE actual_start IS NULL;

CREATE INDEX idx_group_chat_group ON group_chat_messages(group_id, created_at DESC);
CREATE INDEX idx_group_chat_thread ON group_chat_messages(reply_to) WHERE reply_to IS NOT NULL;
CREATE INDEX idx_group_chat_flagged ON group_chat_messages(flagged, created_at DESC) WHERE flagged = TRUE;

CREATE INDEX idx_check_ins_student ON study_check_ins(student_id, check_in_date DESC);
CREATE INDEX idx_check_ins_group ON study_check_ins(group_id, check_in_date DESC);

CREATE INDEX idx_shared_projects_group ON shared_projects(group_id, created_at DESC);
CREATE INDEX idx_shared_projects_status ON shared_projects(status, updated_at DESC);

CREATE INDEX idx_safety_reports_status ON safety_reports(status, created_at DESC);
CREATE INDEX idx_safety_reports_reported_user ON safety_reports(reported_user);

-- Row Level Security (RLS) Policies

-- Study Buddy Matches: Students can view their own matches
ALTER TABLE study_buddy_matches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students can view their buddy matches"
  ON study_buddy_matches FOR SELECT
  USING (
    auth.uid() IN (
      SELECT user_id FROM students WHERE id = student_a_id OR id = student_b_id
    )
  );

CREATE POLICY "Students can create buddy matches"
  ON study_buddy_matches FOR INSERT
  WITH CHECK (
    auth.uid() IN (
      SELECT user_id FROM students WHERE id = student_a_id OR id = student_b_id
    )
  );

CREATE POLICY "Students can update their matches"
  ON study_buddy_matches FOR UPDATE
  USING (
    auth.uid() IN (
      SELECT user_id FROM students WHERE id = student_a_id OR id = student_b_id
    )
  );

-- Study Groups: Public read, members can write
ALTER TABLE study_groups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view public groups"
  ON study_groups FOR SELECT
  USING (
    is_public = TRUE OR
    created_by IN (SELECT id FROM students WHERE user_id = auth.uid())
  );

CREATE POLICY "Students can create groups"
  ON study_groups FOR INSERT
  WITH CHECK (
    created_by IN (SELECT id FROM students WHERE user_id = auth.uid())
  );

CREATE POLICY "Group creator can update"
  ON study_groups FOR UPDATE
  USING (
    created_by IN (SELECT id FROM students WHERE user_id = auth.uid())
  );

-- Group Members: Members can see other members
ALTER TABLE study_group_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Group members can see each other"
  ON study_group_members FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM study_group_members sgm
      JOIN students s ON s.id = sgm.student_id
      WHERE sgm.group_id = study_group_members.group_id
      AND s.user_id = auth.uid()
      AND sgm.status = 'active'
    )
  );

CREATE POLICY "Students can join groups"
  ON study_group_members FOR INSERT
  WITH CHECK (
    student_id IN (SELECT id FROM students WHERE user_id = auth.uid())
  );

-- Group Messages: Only group members can see/send
ALTER TABLE group_chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Group members can view messages"
  ON group_chat_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM study_group_members sgm
      JOIN students s ON s.id = sgm.student_id
      WHERE sgm.group_id = group_chat_messages.group_id
      AND s.user_id = auth.uid()
      AND sgm.status = 'active'
    )
  );

CREATE POLICY "Group members can send messages"
  ON group_chat_messages FOR INSERT
  WITH CHECK (
    sender_id IN (SELECT id FROM students WHERE user_id = auth.uid()) AND
    EXISTS (
      SELECT 1 FROM study_group_members sgm
      WHERE sgm.group_id = group_chat_messages.group_id
      AND sgm.student_id = sender_id
      AND sgm.status = 'active'
    )
  );

-- Shared Notes: Group members only
ALTER TABLE shared_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Group members can view notes"
  ON shared_notes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM study_group_members sgm
      JOIN students s ON s.id = sgm.student_id
      WHERE sgm.group_id = shared_notes.group_id
      AND s.user_id = auth.uid()
      AND sgm.status = 'active'
    )
  );

CREATE POLICY "Group members can create/update notes"
  ON shared_notes FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM study_group_members sgm
      JOIN students s ON s.id = sgm.student_id
      WHERE sgm.group_id = shared_notes.group_id
      AND s.user_id = auth.uid()
      AND sgm.status = 'active'
    )
  );

-- Matching Preferences: Students can only see/edit their own
ALTER TABLE matching_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students can view their own preferences"
  ON matching_preferences FOR SELECT
  USING (
    student_id IN (SELECT id FROM students WHERE user_id = auth.uid())
  );

CREATE POLICY "Students can update their own preferences"
  ON matching_preferences FOR ALL
  USING (
    student_id IN (SELECT id FROM students WHERE user_id = auth.uid())
  );

-- Add updated_at trigger for study_groups
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_study_groups_updated_at BEFORE UPDATE ON study_groups
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_shared_notes_updated_at BEFORE UPDATE ON shared_notes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_shared_projects_updated_at BEFORE UPDATE ON shared_projects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Comments for documentation
COMMENT ON TABLE study_buddy_matches IS 'AI-powered study buddy matching and connections';
COMMENT ON TABLE study_groups IS 'Collaborative study groups with various types and purposes';
COMMENT ON TABLE study_group_members IS 'Membership and activity tracking for study groups';
COMMENT ON TABLE shared_notes IS 'Collaborative notes for study groups';
COMMENT ON TABLE study_sessions IS 'Scheduled study sessions for groups';
COMMENT ON TABLE group_chat_messages IS 'Real-time chat messages within study groups';
COMMENT ON TABLE study_check_ins IS 'Weekly progress check-ins for accountability';
COMMENT ON TABLE shared_projects IS 'Collaborative projects with task management';
COMMENT ON TABLE matching_preferences IS 'Student preferences for study buddy matching';
COMMENT ON TABLE safety_reports IS 'Safety and moderation reports';
