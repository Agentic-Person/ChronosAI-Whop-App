-- ============================================================================
-- MODULE 10: DISCORD INTEGRATION - ENTERPRISE TIER
-- ============================================================================
-- This migration adds Discord integration support including:
-- - Account linking (OAuth)
-- - Channel management for study groups
-- - Event scheduling
-- - Notification tracking
-- - Verification codes for account linking

-- ============================================================================
-- DISCORD INTEGRATIONS TABLE
-- ============================================================================
-- Links student accounts to Discord accounts via OAuth
CREATE TABLE discord_integrations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID REFERENCES students(id) ON DELETE CASCADE,

    -- Discord user info
    discord_user_id VARCHAR(100) UNIQUE NOT NULL,
    discord_username VARCHAR(100),
    discord_avatar VARCHAR(255),

    -- OAuth tokens for API access
    access_token TEXT,
    refresh_token TEXT,
    token_expires_at TIMESTAMPTZ,

    -- Guild membership tracking
    guild_joined_at TIMESTAMPTZ,
    guild_member_id VARCHAR(100),

    -- Notification preferences
    notifications_enabled BOOLEAN DEFAULT TRUE,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_discord_integrations_user ON discord_integrations(discord_user_id);
CREATE INDEX idx_discord_integrations_student ON discord_integrations(student_id);

-- ============================================================================
-- DISCORD CHANNELS TABLE
-- ============================================================================
-- Tracks automatically created Discord channels
CREATE TABLE discord_channels (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    creator_id UUID REFERENCES creators(id) ON DELETE CASCADE,

    -- Discord channel info
    discord_channel_id VARCHAR(100) UNIQUE NOT NULL,
    channel_name VARCHAR(100) NOT NULL,
    channel_type VARCHAR(50) NOT NULL, -- 'study_group', 'course', 'general', 'announcement'

    -- Link to platform entity
    linked_entity_id UUID, -- study_group_id, project_id, etc.
    linked_entity_type VARCHAR(50), -- 'study_group', 'project', etc.

    -- Channel settings
    is_private BOOLEAN DEFAULT TRUE,
    archived BOOLEAN DEFAULT FALSE,
    archived_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_discord_channels_entity ON discord_channels(linked_entity_id);
CREATE INDEX idx_discord_channels_creator ON discord_channels(creator_id);
CREATE INDEX idx_discord_channels_discord_id ON discord_channels(discord_channel_id);

-- ============================================================================
-- DISCORD EVENTS TABLE
-- ============================================================================
-- Scheduled events in Discord (Q&A sessions, study sessions, etc.)
CREATE TABLE discord_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    creator_id UUID REFERENCES creators(id) ON DELETE CASCADE,

    -- Discord event info
    discord_event_id VARCHAR(100),
    event_type VARCHAR(50) NOT NULL, -- 'qa', 'study-session', 'hackathon', 'workshop', 'code-review'

    -- Event details
    title VARCHAR(255) NOT NULL,
    description TEXT,

    -- Scheduling
    scheduled_start TIMESTAMPTZ NOT NULL,
    scheduled_end TIMESTAMPTZ NOT NULL,

    -- Voice channel for event
    voice_channel_id VARCHAR(100),

    -- Stats
    attendee_count INTEGER DEFAULT 0,
    recording_url TEXT, -- If event is recorded

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_discord_events_creator ON discord_events(creator_id);
CREATE INDEX idx_discord_events_schedule ON discord_events(scheduled_start);

-- ============================================================================
-- DISCORD NOTIFICATIONS TABLE
-- ============================================================================
-- Log of notifications sent via Discord
CREATE TABLE discord_notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID REFERENCES students(id) ON DELETE CASCADE,

    -- Discord message info
    discord_message_id VARCHAR(100),
    discord_channel_id VARCHAR(100),

    -- Notification details
    event_type VARCHAR(50) NOT NULL, -- 'xp_gained', 'level_up', 'achievement_unlocked', 'quiz_completed', etc.
    content JSONB NOT NULL, -- Full notification payload

    -- Delivery status
    sent_successfully BOOLEAN DEFAULT TRUE,
    error_message TEXT,

    sent_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_discord_notifications_student ON discord_notifications(student_id, sent_at DESC);
CREATE INDEX idx_discord_notifications_type ON discord_notifications(event_type);

-- ============================================================================
-- DISCORD VERIFICATION CODES TABLE
-- ============================================================================
-- Temporary codes for linking Discord accounts via /connect command
CREATE TABLE discord_verification_codes (
    code VARCHAR(10) PRIMARY KEY, -- e.g., "ABC123"
    student_id UUID REFERENCES students(id) ON DELETE CASCADE,

    expires_at TIMESTAMPTZ NOT NULL,
    used BOOLEAN DEFAULT FALSE,
    used_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_discord_verification_student ON discord_verification_codes(student_id);
CREATE INDEX idx_discord_verification_expires ON discord_verification_codes(expires_at) WHERE used = FALSE;

-- ============================================================================
-- UPDATE EXISTING TABLES
-- ============================================================================
-- Add Discord-related columns to existing tables

-- Add Discord channel ID to study_groups (already exists in initial schema)
-- ALTER TABLE study_groups ADD COLUMN IF NOT EXISTS discord_channel_id VARCHAR(255);
-- ALTER TABLE study_groups ADD COLUMN IF NOT EXISTS discord_role_id VARCHAR(255);

-- Add Discord ID column to students for quick lookups
ALTER TABLE students ADD COLUMN IF NOT EXISTS discord_id VARCHAR(100) UNIQUE;
CREATE INDEX IF NOT EXISTS idx_students_discord_id ON students(discord_id);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================
ALTER TABLE discord_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE discord_channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE discord_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE discord_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE discord_verification_codes ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Students can view their own Discord integration
CREATE POLICY discord_integrations_student_view
    ON discord_integrations FOR SELECT
    USING (student_id = auth.uid()::uuid);

-- Students can view their own notifications
CREATE POLICY discord_notifications_student_view
    ON discord_notifications FOR SELECT
    USING (student_id = auth.uid()::uuid);

-- Students can view verification codes they created
CREATE POLICY discord_verification_student_view
    ON discord_verification_codes FOR SELECT
    USING (student_id = auth.uid()::uuid);

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to generate random verification code
CREATE OR REPLACE FUNCTION generate_discord_verification_code()
RETURNS VARCHAR(10) AS $$
DECLARE
    code VARCHAR(10);
    code_exists BOOLEAN;
BEGIN
    LOOP
        -- Generate 6-character alphanumeric code
        code := upper(substring(md5(random()::text) from 1 for 6));

        -- Check if code already exists
        SELECT EXISTS(SELECT 1 FROM discord_verification_codes WHERE code = code AND used = FALSE AND expires_at > NOW())
        INTO code_exists;

        EXIT WHEN NOT code_exists;
    END LOOP;

    RETURN code;
END;
$$ LANGUAGE plpgsql;

-- Function to clean up expired verification codes
CREATE OR REPLACE FUNCTION cleanup_expired_discord_codes()
RETURNS void AS $$
BEGIN
    DELETE FROM discord_verification_codes
    WHERE expires_at < NOW() - INTERVAL '1 day';
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Update updated_at timestamp on discord_integrations
CREATE OR REPLACE FUNCTION update_discord_integrations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER discord_integrations_updated_at
    BEFORE UPDATE ON discord_integrations
    FOR EACH ROW
    EXECUTE FUNCTION update_discord_integrations_updated_at();

-- Update updated_at timestamp on discord_channels
CREATE TRIGGER discord_channels_updated_at
    BEFORE UPDATE ON discord_channels
    FOR EACH ROW
    EXECUTE FUNCTION update_discord_integrations_updated_at();

-- ============================================================================
-- COMMENTS
-- ============================================================================
COMMENT ON TABLE discord_integrations IS 'Links student accounts to Discord via OAuth';
COMMENT ON TABLE discord_channels IS 'Tracks automatically created Discord channels for study groups and courses';
COMMENT ON TABLE discord_events IS 'Scheduled community events in Discord (Q&A, study sessions, etc.)';
COMMENT ON TABLE discord_notifications IS 'Log of all notifications sent to students via Discord';
COMMENT ON TABLE discord_verification_codes IS 'Temporary verification codes for linking Discord accounts via bot commands';
