-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";

-- ============================================================================
-- CREATORS TABLE
-- ============================================================================
CREATE TABLE creators (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    whop_company_id VARCHAR(255) UNIQUE NOT NULL,
    whop_user_id VARCHAR(255) NOT NULL,
    company_name VARCHAR(255) NOT NULL,
    subscription_tier VARCHAR(50) DEFAULT 'starter', -- starter, pro, enterprise
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_creators_whop_company ON creators(whop_company_id);

-- ============================================================================
-- STUDENTS TABLE
-- ============================================================================
CREATE TABLE students (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    whop_user_id VARCHAR(255) UNIQUE NOT NULL,
    whop_membership_id VARCHAR(255) NOT NULL,
    creator_id UUID REFERENCES creators(id) ON DELETE CASCADE,
    email VARCHAR(255),
    name VARCHAR(255),
    learning_preferences JSONB DEFAULT '{}', -- pace, interests, goals
    onboarding_completed BOOLEAN DEFAULT FALSE,
    xp_points INTEGER DEFAULT 0,
    level INTEGER DEFAULT 1,
    streak_days INTEGER DEFAULT 0,
    last_active TIMESTAMP DEFAULT NOW(),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_students_creator ON students(creator_id);
CREATE INDEX idx_students_whop_user ON students(whop_user_id);

-- ============================================================================
-- VIDEOS TABLE
-- ============================================================================
CREATE TABLE videos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    creator_id UUID REFERENCES creators(id) ON DELETE CASCADE,
    title VARCHAR(500) NOT NULL,
    description TEXT,
    video_url TEXT NOT NULL,
    thumbnail_url TEXT,
    duration_seconds INTEGER,
    transcript TEXT,
    transcript_processed BOOLEAN DEFAULT FALSE,
    category VARCHAR(100),
    tags TEXT[], -- Technology tags
    difficulty_level VARCHAR(50), -- beginner, intermediate, advanced
    order_index INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_videos_creator ON videos(creator_id);
CREATE INDEX idx_videos_category ON videos(category);
CREATE INDEX idx_videos_tags ON videos USING GIN(tags);

-- ============================================================================
-- VIDEO CHUNKS (RAG Vector Storage)
-- ============================================================================
CREATE TABLE video_chunks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    video_id UUID REFERENCES videos(id) ON DELETE CASCADE,
    chunk_text TEXT NOT NULL,
    chunk_index INTEGER NOT NULL,
    start_timestamp INTEGER, -- Seconds
    end_timestamp INTEGER, -- Seconds
    embedding vector(1536), -- OpenAI ada-002 dimensions
    topic_tags TEXT[], -- Auto-detected topics
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_chunks_video ON video_chunks(video_id);
CREATE INDEX idx_chunks_embedding ON video_chunks USING ivfflat (embedding vector_cosine_ops);

-- ============================================================================
-- CHAT SESSIONS
-- ============================================================================
CREATE TABLE chat_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID REFERENCES students(id) ON DELETE CASCADE,
    creator_id UUID REFERENCES creators(id) ON DELETE CASCADE,
    title VARCHAR(255) DEFAULT 'New Conversation',
    context_type VARCHAR(50), -- general, project-specific, quiz-help
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_chat_student ON chat_sessions(student_id);

-- ============================================================================
-- CHAT MESSAGES
-- ============================================================================
CREATE TABLE chat_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID REFERENCES chat_sessions(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL, -- 'user' or 'assistant'
    content TEXT NOT NULL,
    video_references JSONB, -- [{video_id, title, timestamp, relevance_score}]
    feedback VARCHAR(20), -- 'positive', 'negative', null
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_messages_session ON chat_messages(session_id);

-- ============================================================================
-- QUIZZES
-- ============================================================================
CREATE TABLE quizzes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    creator_id UUID REFERENCES creators(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    video_ids UUID[],
    difficulty VARCHAR(50) DEFAULT 'medium', -- easy, medium, hard
    questions JSONB NOT NULL, -- Array of question objects
    passing_score INTEGER DEFAULT 70,
    time_limit_minutes INTEGER, -- Optional time limit
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_quizzes_creator ON quizzes(creator_id);

-- ============================================================================
-- QUIZ ATTEMPTS
-- ============================================================================
CREATE TABLE quiz_attempts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    quiz_id UUID REFERENCES quizzes(id) ON DELETE CASCADE,
    student_id UUID REFERENCES students(id) ON DELETE CASCADE,
    answers JSONB NOT NULL,
    score INTEGER NOT NULL,
    passed BOOLEAN NOT NULL,
    time_taken_seconds INTEGER,
    completed_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_attempts_quiz ON quiz_attempts(quiz_id);
CREATE INDEX idx_attempts_student ON quiz_attempts(student_id);

-- ============================================================================
-- PROJECTS
-- ============================================================================
CREATE TABLE projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    creator_id UUID REFERENCES creators(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    type VARCHAR(100), -- 'web-app', 'mobile-app', 'trading-bot', etc.
    requirements JSONB, -- Detailed requirements and rubric
    technologies TEXT[], -- ['React', 'Node.js', 'PostgreSQL']
    difficulty_level VARCHAR(50), -- beginner, intermediate, advanced
    estimated_hours INTEGER,
    milestone_structure JSONB, -- Array of milestones
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_projects_creator ON projects(creator_id);
CREATE INDEX idx_projects_type ON projects(type);

-- ============================================================================
-- PROJECT SUBMISSIONS
-- ============================================================================
CREATE TABLE project_submissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    student_id UUID REFERENCES students(id) ON DELETE CASCADE,
    submission_url TEXT, -- GitHub repo, deployed URL, etc.
    submission_files JSONB, -- File uploads
    demo_video_url TEXT,
    status VARCHAR(50) DEFAULT 'in-progress', -- in-progress, submitted, reviewed, passed
    feedback TEXT,
    ai_review JSONB, -- AI-generated code review
    peer_reviews JSONB, -- Array of peer reviews
    score INTEGER,
    milestones_completed JSONB, -- Track milestone progress
    submitted_at TIMESTAMP,
    reviewed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_submissions_project ON project_submissions(project_id);
CREATE INDEX idx_submissions_student ON project_submissions(student_id);

-- ============================================================================
-- CALENDAR EVENTS
-- ============================================================================
CREATE TABLE calendar_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID REFERENCES students(id) ON DELETE CASCADE,
    event_type VARCHAR(50) NOT NULL, -- 'video', 'quiz', 'project', 'milestone', 'study-session'
    video_id UUID REFERENCES videos(id) ON DELETE SET NULL,
    quiz_id UUID REFERENCES quizzes(id) ON DELETE SET NULL,
    project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    scheduled_date DATE NOT NULL,
    scheduled_time TIME,
    duration_minutes INTEGER,
    status VARCHAR(50) DEFAULT 'pending', -- pending, completed, skipped
    reminder_sent BOOLEAN DEFAULT FALSE,
    completed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_calendar_student ON calendar_events(student_id);
CREATE INDEX idx_calendar_date ON calendar_events(scheduled_date);

-- ============================================================================
-- VIDEO PROGRESS
-- ============================================================================
CREATE TABLE video_progress (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID REFERENCES students(id) ON DELETE CASCADE,
    video_id UUID REFERENCES videos(id) ON DELETE CASCADE,
    last_position_seconds INTEGER DEFAULT 0,
    watch_time_seconds INTEGER DEFAULT 0,
    completion_percentage INTEGER DEFAULT 0,
    completed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(student_id, video_id)
);

CREATE INDEX idx_progress_student ON video_progress(student_id);
CREATE INDEX idx_progress_video ON video_progress(video_id);

-- ============================================================================
-- STUDY GROUPS
-- ============================================================================
CREATE TABLE study_groups (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    creator_id UUID REFERENCES creators(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    project_focus VARCHAR(100), -- Project type they're working on
    max_members INTEGER DEFAULT 5,
    discord_channel_id VARCHAR(255),
    discord_role_id VARCHAR(255),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_groups_creator ON study_groups(creator_id);

-- ============================================================================
-- STUDY GROUP MEMBERS
-- ============================================================================
CREATE TABLE study_group_members (
    group_id UUID REFERENCES study_groups(id) ON DELETE CASCADE,
    student_id UUID REFERENCES students(id) ON DELETE CASCADE,
    role VARCHAR(50) DEFAULT 'member', -- 'member', 'leader', 'mentor'
    joined_at TIMESTAMP DEFAULT NOW(),
    PRIMARY KEY (group_id, student_id)
);

CREATE INDEX idx_group_members_student ON study_group_members(student_id);

-- ============================================================================
-- ACHIEVEMENTS
-- ============================================================================
CREATE TABLE achievements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    icon_url TEXT,
    animation_type VARCHAR(50), -- 'confetti', 'stars', 'fireworks', 'rocket'
    xp_value INTEGER DEFAULT 0,
    criteria JSONB, -- Conditions to unlock
    rarity VARCHAR(50) DEFAULT 'common', -- common, rare, epic, legendary
    created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================================
-- STUDENT ACHIEVEMENTS
-- ============================================================================
CREATE TABLE student_achievements (
    student_id UUID REFERENCES students(id) ON DELETE CASCADE,
    achievement_id UUID REFERENCES achievements(id) ON DELETE CASCADE,
    unlocked_at TIMESTAMP DEFAULT NOW(),
    PRIMARY KEY (student_id, achievement_id)
);

CREATE INDEX idx_student_achievements ON student_achievements(student_id);

-- ============================================================================
-- DISCORD LINKS
-- ============================================================================
CREATE TABLE discord_links (
    student_id UUID REFERENCES students(id) ON DELETE CASCADE,
    discord_user_id VARCHAR(255) UNIQUE NOT NULL,
    discord_username VARCHAR(255),
    discord_discriminator VARCHAR(10),
    linked_at TIMESTAMP DEFAULT NOW(),
    PRIMARY KEY (student_id)
);

CREATE INDEX idx_discord_user ON discord_links(discord_user_id);

-- ============================================================================
-- ANALYTICS EVENTS
-- ============================================================================
CREATE TABLE analytics_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID REFERENCES students(id) ON DELETE CASCADE,
    event_type VARCHAR(100) NOT NULL,
    event_data JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_analytics_student ON analytics_events(student_id);
CREATE INDEX idx_analytics_type ON analytics_events(event_type);
CREATE INDEX idx_analytics_created ON analytics_events(created_at);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE creators ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE video_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE video_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE study_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE study_group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE discord_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;

-- RLS Policies will be added based on specific requirements
-- For now, service role key will be used for backend operations
