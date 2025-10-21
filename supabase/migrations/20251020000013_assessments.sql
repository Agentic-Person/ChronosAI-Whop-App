-- =====================================================
-- Assessment System Tables
-- Migration: 20251020000013_assessments.sql
-- Purpose: Project templates, student projects, submissions, peer reviews
-- =====================================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- Project Templates Table
-- Pre-built project scaffolds for students
-- =====================================================
CREATE TABLE IF NOT EXISTS project_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL, -- 'web', 'mobile', 'data', 'ml', 'game', etc.
  difficulty TEXT NOT NULL CHECK (difficulty IN ('beginner', 'intermediate', 'advanced')),
  starter_code TEXT, -- Optional boilerplate code
  acceptance_criteria JSONB NOT NULL DEFAULT '[]'::jsonb, -- Array of criteria strings
  rubric JSONB NOT NULL DEFAULT '[]'::jsonb, -- Array of {category, points, criteria}
  technologies JSONB DEFAULT '[]'::jsonb, -- Array of tech stack items
  estimated_hours INTEGER, -- Time estimate for completion
  learning_objectives JSONB DEFAULT '[]'::jsonb, -- What students will learn
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES creators(id) ON DELETE SET NULL, -- Can be platform or creator-specific
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- Student Projects Table
-- Individual projects assigned to or chosen by students
-- =====================================================
CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  template_id UUID REFERENCES project_templates(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'not_started' CHECK (status IN ('not_started', 'in_progress', 'submitted', 'graded', 'revision_requested')),
  due_date TIMESTAMPTZ,
  custom_requirements JSONB, -- Override template requirements
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- Project Submissions Table
-- Student work submissions with AI and peer reviews
-- =====================================================
CREATE TABLE IF NOT EXISTS project_submissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  submission_number INTEGER DEFAULT 1, -- Track resubmissions

  -- Submission content
  code TEXT, -- Main code submission
  files JSONB, -- Array of {filename, url, size, type}
  notes TEXT, -- Student notes about submission
  demo_url TEXT, -- Live demo or video walkthrough

  -- AI Review
  ai_review JSONB, -- {summary, strengths[], improvements[], scores{}}
  ai_score INTEGER CHECK (ai_score >= 0 AND ai_score <= 100), -- 0-100
  ai_reviewed_at TIMESTAMPTZ,

  -- Peer Reviews (stored as array, but assignments tracked separately)
  peer_review_count INTEGER DEFAULT 0,
  peer_review_avg_score DECIMAL(4,2), -- Average peer score

  -- Final grading
  final_score INTEGER CHECK (final_score >= 0 AND final_score <= 100),
  final_feedback TEXT,
  graded_by UUID REFERENCES creators(id) ON DELETE SET NULL, -- Optional creator override
  graded_at TIMESTAMPTZ,

  -- Timestamps
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Ensure one submission per project (unless resubmission)
  UNIQUE(project_id, submission_number)
);

-- =====================================================
-- Peer Review Assignments Table
-- Manages peer review assignments and submissions
-- =====================================================
CREATE TABLE IF NOT EXISTS peer_review_assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  submission_id UUID NOT NULL REFERENCES project_submissions(id) ON DELETE CASCADE,
  reviewer_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,

  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'skipped')),

  -- Review content (stored when completed)
  review JSONB, -- {rating, strengths[], improvements[], comments}
  score INTEGER CHECK (score >= 0 AND score <= 100),
  time_spent_minutes INTEGER,

  -- Gamification
  xp_awarded INTEGER DEFAULT 0, -- XP given to reviewer

  -- Timestamps
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Prevent self-review and duplicate assignments
  CHECK (reviewer_id != (SELECT student_id FROM project_submissions WHERE id = submission_id)),
  UNIQUE(submission_id, reviewer_id)
);

-- =====================================================
-- Quiz Enhancements
-- Add feedback and timing to existing quiz_attempts table
-- =====================================================
ALTER TABLE quiz_attempts
  ADD COLUMN IF NOT EXISTS feedback JSONB, -- Per-question feedback
  ADD COLUMN IF NOT EXISTS time_spent_seconds INTEGER,
  ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMPTZ DEFAULT NOW();

-- =====================================================
-- Indexes for Performance
-- =====================================================

-- Project templates
CREATE INDEX IF NOT EXISTS idx_project_templates_category ON project_templates(category, difficulty);
CREATE INDEX IF NOT EXISTS idx_project_templates_active ON project_templates(is_active, created_at DESC);

-- Projects
CREATE INDEX IF NOT EXISTS idx_projects_student ON projects(student_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_projects_template ON projects(template_id);
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status, due_date);

-- Project submissions
CREATE INDEX IF NOT EXISTS idx_project_submissions_student ON project_submissions(student_id, submitted_at DESC);
CREATE INDEX IF NOT EXISTS idx_project_submissions_project ON project_submissions(project_id, submission_number DESC);
CREATE INDEX IF NOT EXISTS idx_project_submissions_grading ON project_submissions(graded_at) WHERE final_score IS NULL;

-- Peer review assignments
CREATE INDEX IF NOT EXISTS idx_peer_review_reviewer ON peer_review_assignments(reviewer_id, status);
CREATE INDEX IF NOT EXISTS idx_peer_review_submission ON peer_review_assignments(submission_id, status);
CREATE INDEX IF NOT EXISTS idx_peer_review_pending ON peer_review_assignments(status, assigned_at) WHERE status = 'pending';

-- =====================================================
-- Row Level Security (RLS) Policies
-- =====================================================

-- Enable RLS
ALTER TABLE project_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE peer_review_assignments ENABLE ROW LEVEL SECURITY;

-- Project Templates: Public read, creator write
CREATE POLICY "Public can view active templates" ON project_templates
  FOR SELECT USING (is_active = true);

CREATE POLICY "Creators can manage their templates" ON project_templates
  FOR ALL USING (created_by IN (SELECT id FROM creators WHERE whop_user_id = auth.uid()));

-- Projects: Students can manage their own projects
CREATE POLICY "Students can view their own projects" ON projects
  FOR SELECT USING (student_id IN (SELECT id FROM students WHERE whop_user_id = auth.uid()));

CREATE POLICY "Students can create their own projects" ON projects
  FOR INSERT WITH CHECK (student_id IN (SELECT id FROM students WHERE whop_user_id = auth.uid()));

CREATE POLICY "Students can update their own projects" ON projects
  FOR UPDATE USING (student_id IN (SELECT id FROM students WHERE whop_user_id = auth.uid()));

-- Project Submissions: Students can manage their submissions
CREATE POLICY "Students can view their own submissions" ON project_submissions
  FOR SELECT USING (
    student_id IN (SELECT id FROM students WHERE whop_user_id = auth.uid())
    OR id IN (SELECT submission_id FROM peer_review_assignments WHERE reviewer_id IN (SELECT id FROM students WHERE whop_user_id = auth.uid()))
  );

CREATE POLICY "Students can create their own submissions" ON project_submissions
  FOR INSERT WITH CHECK (student_id IN (SELECT id FROM students WHERE whop_user_id = auth.uid()));

CREATE POLICY "Students can update their ungraded submissions" ON project_submissions
  FOR UPDATE USING (
    student_id IN (SELECT id FROM students WHERE whop_user_id = auth.uid())
    AND final_score IS NULL
  );

-- Peer Review Assignments: Reviewers can see their assignments
CREATE POLICY "Reviewers can view their assignments" ON peer_review_assignments
  FOR SELECT USING (reviewer_id IN (SELECT id FROM students WHERE whop_user_id = auth.uid()));

CREATE POLICY "Reviewers can update their assignments" ON peer_review_assignments
  FOR UPDATE USING (
    reviewer_id IN (SELECT id FROM students WHERE whop_user_id = auth.uid())
    AND status IN ('pending', 'in_progress')
  );

-- =====================================================
-- Triggers for Updated_At Timestamps
-- =====================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_project_templates_updated_at BEFORE UPDATE ON project_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON projects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_project_submissions_updated_at BEFORE UPDATE ON project_submissions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- Seed Default Project Templates
-- =====================================================

INSERT INTO project_templates (title, description, category, difficulty, starter_code, acceptance_criteria, rubric, technologies, estimated_hours, learning_objectives) VALUES
(
  'Build a Todo App',
  'Create a full-featured todo list application with CRUD operations, filtering, and local storage persistence.',
  'web',
  'beginner',
  '// Starter HTML and CSS provided
<!DOCTYPE html>
<html>
<head>
  <title>My Todo App</title>
  <link rel="stylesheet" href="styles.css">
</head>
<body>
  <div id="app"></div>
  <script src="app.js"></script>
</body>
</html>',
  '["Add new todos", "Mark todos as complete", "Delete todos", "Filter by status (all/active/completed)", "Persist data in localStorage", "Responsive design"]'::jsonb,
  '[
    {"category": "Functionality", "points": 40, "criteria": "All CRUD operations work correctly"},
    {"category": "Code Quality", "points": 20, "criteria": "Clean, well-organized JavaScript"},
    {"category": "UI/UX", "points": 20, "criteria": "Intuitive interface and responsive design"},
    {"category": "Data Persistence", "points": 20, "criteria": "LocalStorage implementation"}
  ]'::jsonb,
  '["HTML", "CSS", "JavaScript", "LocalStorage"]'::jsonb,
  8,
  '["DOM manipulation", "Event handling", "LocalStorage API", "Array methods", "Responsive design"]'::jsonb
),
(
  'REST API with Node.js',
  'Build a RESTful API for a blog platform with authentication, CRUD operations, and database integration.',
  'web',
  'intermediate',
  '// Express.js starter
const express = require(''express'');
const app = express();

app.use(express.json());

// Your routes here

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));',
  '["User authentication (JWT)", "CRUD endpoints for posts", "Database integration (PostgreSQL/MongoDB)", "Input validation", "Error handling", "API documentation"]'::jsonb,
  '[
    {"category": "API Design", "points": 25, "criteria": "RESTful endpoints with proper HTTP methods"},
    {"category": "Authentication", "points": 20, "criteria": "Secure JWT implementation"},
    {"category": "Database", "points": 20, "criteria": "Proper schema and queries"},
    {"category": "Error Handling", "points": 15, "criteria": "Comprehensive error responses"},
    {"category": "Documentation", "points": 20, "criteria": "Clear API documentation"}
  ]'::jsonb,
  '["Node.js", "Express.js", "PostgreSQL", "JWT", "bcrypt"]'::jsonb,
  15,
  '["RESTful API design", "Authentication & authorization", "Database modeling", "Middleware", "Security best practices"]'::jsonb
),
(
  'Data Analysis with Python',
  'Analyze a dataset using pandas, create visualizations, and present insights in a Jupyter notebook.',
  'data',
  'beginner',
  '# Python data analysis starter
import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns

# Load your dataset
df = pd.read_csv(''data.csv'')

# Your analysis here',
  '["Load and clean dataset", "Perform exploratory data analysis", "Create 5+ visualizations", "Statistical analysis", "Document findings in markdown", "Clear conclusions"]'::jsonb,
  '[
    {"category": "Data Cleaning", "points": 20, "criteria": "Proper handling of missing values and outliers"},
    {"category": "Analysis", "points": 30, "criteria": "Meaningful statistical insights"},
    {"category": "Visualizations", "points": 25, "criteria": "Clear, well-labeled charts"},
    {"category": "Documentation", "points": 25, "criteria": "Well-documented notebook with insights"}
  ]'::jsonb,
  '["Python", "pandas", "matplotlib", "seaborn", "Jupyter"]'::jsonb,
  10,
  '["Data cleaning", "Exploratory data analysis", "Data visualization", "Statistical thinking", "Jupyter notebooks"]'::jsonb
),
(
  'Landing Page Design',
  'Design and build a modern, responsive landing page for a fictional product or service.',
  'web',
  'beginner',
  '<!-- HTML5 Boilerplate -->
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Product Landing Page</title>
  <link rel="stylesheet" href="styles.css">
</head>
<body>
  <!-- Your content here -->
</body>
</html>',
  '["Hero section with CTA", "Features section", "Testimonials/social proof", "Pricing table", "Contact form", "Mobile responsive", "Modern design"]'::jsonb,
  '[
    {"category": "Design", "points": 30, "criteria": "Modern, attractive visual design"},
    {"category": "Responsiveness", "points": 25, "criteria": "Works on mobile, tablet, desktop"},
    {"category": "Content", "points": 20, "criteria": "Complete sections with quality content"},
    {"category": "Code Quality", "points": 25, "criteria": "Clean HTML/CSS structure"}
  ]'::jsonb,
  '["HTML", "CSS", "Flexbox/Grid", "Responsive Design"]'::jsonb,
  6,
  '["HTML semantics", "CSS layout (Flexbox/Grid)", "Responsive design", "Design principles", "User experience"]'::jsonb
);

-- =====================================================
-- Comments
-- =====================================================

COMMENT ON TABLE project_templates IS 'Pre-built project templates for students to choose from';
COMMENT ON TABLE projects IS 'Individual student projects, either from templates or custom';
COMMENT ON TABLE project_submissions IS 'Student work submissions with AI and peer reviews';
COMMENT ON TABLE peer_review_assignments IS 'Peer review assignments and submitted reviews';
