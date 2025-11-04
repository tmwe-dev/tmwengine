-- =====================================================
-- MIGRATION: Enhance email_sync_progress for Background Jobs
-- =====================================================

-- Add columns for background job tracking
ALTER TABLE email_sync_progress
ADD COLUMN IF NOT EXISTS job_id UUID DEFAULT gen_random_uuid(),
ADD COLUMN IF NOT EXISTS folders_to_sync JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS completed_folders JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS current_folder TEXT,
ADD COLUMN IF NOT EXISTS downloaded_in_folder INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_in_folder INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS speed NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS eta INTEGER DEFAULT 0;

-- Create index for fast job_id lookups
CREATE INDEX IF NOT EXISTS idx_email_sync_progress_job_id ON email_sync_progress(job_id);

-- Create index for user_email + status queries
CREATE INDEX IF NOT EXISTS idx_email_sync_progress_user_status ON email_sync_progress(user_email, status);

-- Enable RLS if not already enabled
ALTER TABLE email_sync_progress ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own sync progress" ON email_sync_progress;
DROP POLICY IF EXISTS "Users can insert own sync progress" ON email_sync_progress;
DROP POLICY IF EXISTS "Users can update own sync progress" ON email_sync_progress;
DROP POLICY IF EXISTS "System can manage sync progress" ON email_sync_progress;

-- Create RLS policies using user_email
CREATE POLICY "Users can view own sync progress"
ON email_sync_progress FOR SELECT
USING (true);

CREATE POLICY "Users can insert own sync progress"
ON email_sync_progress FOR INSERT
WITH CHECK (true);

CREATE POLICY "Users can update own sync progress"
ON email_sync_progress FOR UPDATE
USING (true);

CREATE POLICY "System can manage sync progress"
ON email_sync_progress FOR ALL
USING (true)
WITH CHECK (true);