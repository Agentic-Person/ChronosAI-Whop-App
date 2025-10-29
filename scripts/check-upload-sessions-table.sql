-- Check if upload_sessions table exists
-- Run this query first to see if the table is present
SELECT
    table_name,
    table_type
FROM
    information_schema.tables
WHERE
    table_schema = 'public'
    AND table_name = 'upload_sessions';

-- If the above returns 0 rows, the table doesn't exist
-- Run the migration below to create it:

/*
CREATE TABLE IF NOT EXISTS upload_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    creator_id UUID NOT NULL REFERENCES creators(id) ON DELETE CASCADE,
    session_token TEXT UNIQUE NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    is_active BOOLEAN DEFAULT true,
    uploaded_count INTEGER DEFAULT 0,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_upload_sessions_token ON upload_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_upload_sessions_creator ON upload_sessions(creator_id);
CREATE INDEX IF NOT EXISTS idx_upload_sessions_expiry ON upload_sessions(expires_at);
*/
