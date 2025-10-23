-- ============================================================================
-- UPLOAD SESSIONS TABLE (for QR code mobile uploads)
-- ============================================================================
CREATE TABLE upload_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    creator_id UUID NOT NULL REFERENCES creators(id) ON DELETE CASCADE,
    session_token TEXT UNIQUE NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    is_active BOOLEAN DEFAULT true,
    uploaded_count INTEGER DEFAULT 0,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_upload_sessions_token ON upload_sessions(session_token);
CREATE INDEX idx_upload_sessions_creator ON upload_sessions(creator_id);
CREATE INDEX idx_upload_sessions_expiry ON upload_sessions(expires_at);

-- Auto-expire sessions after 15 minutes
CREATE OR REPLACE FUNCTION check_session_expiry()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.expires_at < NOW() THEN
        NEW.is_active = FALSE;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_check_session_expiry
    BEFORE UPDATE ON upload_sessions
    FOR EACH ROW
    EXECUTE FUNCTION check_session_expiry();

-- ============================================================================
-- ENHANCED RLS POLICIES (Row Level Security)
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE creators ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE video_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE upload_sessions ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- CREATORS RLS POLICIES
-- ============================================================================

-- Creators can view their own data
CREATE POLICY "Creators can view own data"
    ON creators FOR SELECT
    USING (auth.uid()::text = whop_user_id);

-- Creators can update their own settings
CREATE POLICY "Creators can update own data"
    ON creators FOR UPDATE
    USING (auth.uid()::text = whop_user_id);

-- Service role can do everything (for backend operations)
CREATE POLICY "Service role full access to creators"
    ON creators FOR ALL
    USING (auth.role() = 'service_role');

-- ============================================================================
-- VIDEOS RLS POLICIES
-- ============================================================================

-- Creators can view their own videos
CREATE POLICY "Creators can view own videos"
    ON videos FOR SELECT
    USING (
        creator_id IN (
            SELECT id FROM creators WHERE whop_user_id = auth.uid()::text
        )
    );

-- Creators can insert their own videos
CREATE POLICY "Creators can insert own videos"
    ON videos FOR INSERT
    WITH CHECK (
        creator_id IN (
            SELECT id FROM creators WHERE whop_user_id = auth.uid()::text
        )
    );

-- Creators can update their own videos
CREATE POLICY "Creators can update own videos"
    ON videos FOR UPDATE
    USING (
        creator_id IN (
            SELECT id FROM creators WHERE whop_user_id = auth.uid()::text
        )
    );

-- Creators can delete their own videos
CREATE POLICY "Creators can delete own videos"
    ON videos FOR DELETE
    USING (
        creator_id IN (
            SELECT id FROM creators WHERE whop_user_id = auth.uid()::text
        )
    );

-- Students can view videos from their enrolled creators
CREATE POLICY "Students can view enrolled creator videos"
    ON videos FOR SELECT
    USING (
        creator_id IN (
            SELECT creator_id FROM students WHERE whop_user_id = auth.uid()::text
        )
    );

-- Service role full access
CREATE POLICY "Service role full access to videos"
    ON videos FOR ALL
    USING (auth.role() = 'service_role');

-- ============================================================================
-- VIDEO CHUNKS RLS POLICIES
-- ============================================================================

-- Creators can view their own video chunks
CREATE POLICY "Creators can view own chunks"
    ON video_chunks FOR SELECT
    USING (
        video_id IN (
            SELECT id FROM videos WHERE creator_id IN (
                SELECT id FROM creators WHERE whop_user_id = auth.uid()::text
            )
        )
    );

-- Students can view chunks from enrolled creators
CREATE POLICY "Students can view enrolled creator chunks"
    ON video_chunks FOR SELECT
    USING (
        video_id IN (
            SELECT v.id FROM videos v
            INNER JOIN students s ON s.creator_id = v.creator_id
            WHERE s.whop_user_id = auth.uid()::text
        )
    );

-- Service role full access
CREATE POLICY "Service role full access to chunks"
    ON video_chunks FOR ALL
    USING (auth.role() = 'service_role');

-- ============================================================================
-- CHAT SESSIONS RLS POLICIES
-- ============================================================================

-- Students can view their own sessions
CREATE POLICY "Students can view own sessions"
    ON chat_sessions FOR SELECT
    USING (
        student_id IN (
            SELECT id FROM students WHERE whop_user_id = auth.uid()::text
        )
    );

-- Students can create their own sessions
CREATE POLICY "Students can create own sessions"
    ON chat_sessions FOR INSERT
    WITH CHECK (
        student_id IN (
            SELECT id FROM students WHERE whop_user_id = auth.uid()::text
        )
    );

-- Creators can view sessions for their students
CREATE POLICY "Creators can view student sessions"
    ON chat_sessions FOR SELECT
    USING (
        creator_id IN (
            SELECT id FROM creators WHERE whop_user_id = auth.uid()::text
        )
    );

-- Service role full access
CREATE POLICY "Service role full access to sessions"
    ON chat_sessions FOR ALL
    USING (auth.role() = 'service_role');

-- ============================================================================
-- CHAT MESSAGES RLS POLICIES
-- ============================================================================

-- Students can view messages in their sessions
CREATE POLICY "Students can view own messages"
    ON chat_messages FOR SELECT
    USING (
        session_id IN (
            SELECT cs.id FROM chat_sessions cs
            INNER JOIN students s ON s.id = cs.student_id
            WHERE s.whop_user_id = auth.uid()::text
        )
    );

-- Students can insert messages in their sessions
CREATE POLICY "Students can insert own messages"
    ON chat_messages FOR INSERT
    WITH CHECK (
        session_id IN (
            SELECT cs.id FROM chat_sessions cs
            INNER JOIN students s ON s.id = cs.student_id
            WHERE s.whop_user_id = auth.uid()::text
        )
    );

-- Creators can view messages from their students
CREATE POLICY "Creators can view student messages"
    ON chat_messages FOR SELECT
    USING (
        session_id IN (
            SELECT id FROM chat_sessions WHERE creator_id IN (
                SELECT id FROM creators WHERE whop_user_id = auth.uid()::text
            )
        )
    );

-- Service role full access
CREATE POLICY "Service role full access to messages"
    ON chat_messages FOR ALL
    USING (auth.role() = 'service_role');

-- ============================================================================
-- UPLOAD SESSIONS RLS POLICIES
-- ============================================================================

-- Creators can view their own upload sessions
CREATE POLICY "Creators can view own upload sessions"
    ON upload_sessions FOR SELECT
    USING (
        creator_id IN (
            SELECT id FROM creators WHERE whop_user_id = auth.uid()::text
        )
    );

-- Creators can create their own upload sessions
CREATE POLICY "Creators can create upload sessions"
    ON upload_sessions FOR INSERT
    WITH CHECK (
        creator_id IN (
            SELECT id FROM creators WHERE whop_user_id = auth.uid()::text
        )
    );

-- Creators can update their own upload sessions
CREATE POLICY "Creators can update own upload sessions"
    ON upload_sessions FOR UPDATE
    USING (
        creator_id IN (
            SELECT id FROM creators WHERE whop_user_id = auth.uid()::text
        )
    );

-- Service role full access
CREATE POLICY "Service role full access to upload sessions"
    ON upload_sessions FOR ALL
    USING (auth.role() = 'service_role');

-- ============================================================================
-- STORAGE BUCKET POLICIES
-- ============================================================================

-- Create storage buckets (if not exists)
-- Note: This is typically done via Supabase dashboard or API, not SQL
-- But we document the required buckets here

-- BUCKET: videos
-- - Private bucket for video storage
-- - Max file size: 500MB
-- - Allowed MIME types: video/mp4, video/quicktime, video/x-msvideo

-- BUCKET: assets
-- - Private bucket for misc assets
-- - Max file size: 10MB
-- - Allowed MIME types: image/*, application/pdf

-- BUCKET: thumbnails
-- - Public bucket for video thumbnails
-- - Max file size: 5MB
-- - Allowed MIME types: image/jpeg, image/png, image/webp

-- Storage RLS policies (set via Supabase Storage API):
-- 1. Creators can upload to their own folder: {creator_slug}/*
-- 2. Students can view videos from enrolled creators
-- 3. Thumbnails are publicly readable

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to get creator ID from authenticated user
CREATE OR REPLACE FUNCTION get_creator_id_from_auth()
RETURNS UUID AS $$
BEGIN
    RETURN (
        SELECT id FROM creators WHERE whop_user_id = auth.uid()::text LIMIT 1
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get student ID from authenticated user
CREATE OR REPLACE FUNCTION get_student_id_from_auth()
RETURNS UUID AS $$
BEGIN
    RETURN (
        SELECT id FROM students WHERE whop_user_id = auth.uid()::text LIMIT 1
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user is creator
CREATE OR REPLACE FUNCTION is_creator()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM creators WHERE whop_user_id = auth.uid()::text
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user is student
CREATE OR REPLACE FUNCTION is_student()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM students WHERE whop_user_id = auth.uid()::text
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
