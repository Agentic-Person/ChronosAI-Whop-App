-- ============================================================================
-- COURSES TABLE
-- ============================================================================
-- Create courses table for organizing videos into structured learning paths
CREATE TABLE courses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    creator_id UUID REFERENCES creators(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    thumbnail_url TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    order_index INTEGER DEFAULT 0,
    settings JSONB DEFAULT '{}', -- Course-specific settings
    video_count INTEGER DEFAULT 0, -- Denormalized count for performance
    total_duration INTEGER DEFAULT 0, -- Total duration in seconds
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for efficient querying
CREATE INDEX idx_courses_creator ON courses(creator_id);
CREATE INDEX idx_courses_active ON courses(is_active);
CREATE INDEX idx_courses_order ON courses(order_index);

-- ============================================================================
-- UPLOAD QUEUE TABLE
-- ============================================================================
-- Queue system for handling multiple video uploads
CREATE TABLE upload_queue (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    creator_id UUID REFERENCES creators(id) ON DELETE CASCADE,
    course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
    upload_type VARCHAR(50) NOT NULL, -- 'file', 'youtube', 'youtube_playlist'
    source_url TEXT, -- YouTube URL or file path
    file_name TEXT,
    file_size BIGINT,
    status VARCHAR(50) DEFAULT 'pending', -- pending, processing, completed, failed
    error_message TEXT,
    video_id UUID REFERENCES videos(id) ON DELETE SET NULL, -- Reference to created video
    metadata JSONB DEFAULT '{}', -- Additional metadata
    position INTEGER NOT NULL, -- Queue position
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_queue_creator ON upload_queue(creator_id);
CREATE INDEX idx_queue_course ON upload_queue(course_id);
CREATE INDEX idx_queue_status ON upload_queue(status);
CREATE INDEX idx_queue_position ON upload_queue(position);

-- ============================================================================
-- UPDATE VIDEOS TABLE
-- ============================================================================
-- Add course_id to videos table
ALTER TABLE videos
ADD COLUMN course_id UUID REFERENCES courses(id) ON DELETE SET NULL;

-- Add index for course-based queries
CREATE INDEX idx_videos_course ON videos(course_id);

-- ============================================================================
-- COURSE STATS FUNCTION (for updating video_count and total_duration)
-- ============================================================================
CREATE OR REPLACE FUNCTION update_course_stats()
RETURNS TRIGGER AS $$
BEGIN
    -- Update course stats when videos are added/removed/updated
    IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
        UPDATE courses
        SET
            video_count = (
                SELECT COUNT(*)
                FROM videos
                WHERE course_id = NEW.course_id
            ),
            total_duration = (
                SELECT COALESCE(SUM(duration_seconds), 0)
                FROM videos
                WHERE course_id = NEW.course_id
            ),
            updated_at = NOW()
        WHERE id = NEW.course_id;
    END IF;

    IF TG_OP = 'DELETE' OR (TG_OP = 'UPDATE' AND OLD.course_id IS DISTINCT FROM NEW.course_id) THEN
        UPDATE courses
        SET
            video_count = (
                SELECT COUNT(*)
                FROM videos
                WHERE course_id = OLD.course_id
            ),
            total_duration = (
                SELECT COALESCE(SUM(duration_seconds), 0)
                FROM videos
                WHERE course_id = OLD.course_id
            ),
            updated_at = NOW()
        WHERE id = OLD.course_id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for auto-updating course stats
CREATE TRIGGER update_course_stats_trigger
AFTER INSERT OR UPDATE OR DELETE ON videos
FOR EACH ROW
EXECUTE FUNCTION update_course_stats();

-- ============================================================================
-- DEFAULT DEMO COURSES
-- ============================================================================
-- Insert demo courses for the default creator (for demo purposes)
INSERT INTO courses (creator_id, title, description, order_index, is_active)
SELECT
    id,
    course_title,
    course_description,
    course_order,
    true
FROM creators
CROSS JOIN (
    VALUES
        ('Getting Started', 'Learn the fundamentals and build a strong foundation', 1),
        ('Advanced Techniques', 'Master advanced concepts and best practices', 2),
        ('Master Class', 'Expert-level strategies and real-world applications', 3)
) AS demo_courses(course_title, course_description, course_order)
WHERE whop_company_id = 'dev_company_001' -- Default dev creator
ON CONFLICT DO NOTHING;

-- ============================================================================
-- QUEUE POSITION MANAGEMENT FUNCTION
-- ============================================================================
CREATE OR REPLACE FUNCTION get_next_queue_position(p_creator_id UUID)
RETURNS INTEGER AS $$
DECLARE
    next_position INTEGER;
BEGIN
    SELECT COALESCE(MAX(position), 0) + 1
    INTO next_position
    FROM upload_queue
    WHERE creator_id = p_creator_id
    AND status IN ('pending', 'processing');

    RETURN next_position;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- RLS POLICIES
-- ============================================================================
-- Enable RLS on new tables
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE upload_queue ENABLE ROW LEVEL SECURITY;

-- Courses policies
CREATE POLICY "Creators can manage their own courses" ON courses
    FOR ALL USING (creator_id IN (
        SELECT id FROM creators WHERE whop_user_id = auth.uid()::text
    ));

CREATE POLICY "Students can view courses from their creator" ON courses
    FOR SELECT USING (creator_id IN (
        SELECT creator_id FROM students WHERE whop_user_id = auth.uid()::text
    ));

-- Upload queue policies
CREATE POLICY "Creators can manage their upload queue" ON upload_queue
    FOR ALL USING (creator_id IN (
        SELECT id FROM creators WHERE whop_user_id = auth.uid()::text
    ));

-- Update videos RLS to include course access
DROP POLICY IF EXISTS "Creators can manage their own videos" ON videos;
CREATE POLICY "Creators can manage their own videos" ON videos
    FOR ALL USING (creator_id IN (
        SELECT id FROM creators WHERE whop_user_id = auth.uid()::text
    ));

DROP POLICY IF EXISTS "Students can view videos from their creator" ON videos;
CREATE POLICY "Students can view videos from their creator" ON videos
    FOR SELECT USING (creator_id IN (
        SELECT creator_id FROM students WHERE whop_user_id = auth.uid()::text
    ));