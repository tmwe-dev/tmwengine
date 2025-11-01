-- Create table for email folder lock preferences
CREATE TABLE IF NOT EXISTS email_folder_locks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_email TEXT NOT NULL,
  folder_name TEXT NOT NULL,
  is_locked BOOLEAN DEFAULT false,
  locked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_email, folder_name)
);

-- Create index for faster lookups by user
CREATE INDEX IF NOT EXISTS idx_folder_locks_user ON email_folder_locks(user_email);

-- Create index for faster lookups by user and folder
CREATE INDEX IF NOT EXISTS idx_folder_locks_user_folder ON email_folder_locks(user_email, folder_name);

-- Enable RLS
ALTER TABLE email_folder_locks ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own folder locks
CREATE POLICY "Users can view their own folder locks"
ON email_folder_locks
FOR SELECT
USING (auth.jwt()->>'email' = user_email);

-- Policy: Users can insert their own folder locks
CREATE POLICY "Users can insert their own folder locks"
ON email_folder_locks
FOR INSERT
WITH CHECK (auth.jwt()->>'email' = user_email);

-- Policy: Users can update their own folder locks
CREATE POLICY "Users can update their own folder locks"
ON email_folder_locks
FOR UPDATE
USING (auth.jwt()->>'email' = user_email);

-- Policy: Users can delete their own folder locks
CREATE POLICY "Users can delete their own folder locks"
ON email_folder_locks
FOR DELETE
USING (auth.jwt()->>'email' = user_email);

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_folder_locks_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_folder_locks_updated_at_trigger
BEFORE UPDATE ON email_folder_locks
FOR EACH ROW
EXECUTE FUNCTION update_folder_locks_updated_at();