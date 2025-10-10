-- Create user_sync_preferences table
CREATE TABLE user_sync_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_email TEXT NOT NULL,
  excluded_folders JSONB DEFAULT '["Trash", "Archives", "Junk", "Drafts", "Spam"]'::jsonb,
  included_folders JSONB DEFAULT '["INBOX", "Sent"]'::jsonb,
  date_filter_months INTEGER DEFAULT 24,
  default_sync_mode TEXT DEFAULT 'smart',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_email)
);

-- Enable RLS
ALTER TABLE user_sync_preferences ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own sync preferences"
ON user_sync_preferences FOR SELECT
USING (user_email IN (
  SELECT tmwe_email FROM user_profiles WHERE user_id = auth.uid()
));

CREATE POLICY "Users can update own sync preferences"
ON user_sync_preferences FOR UPDATE
USING (user_email IN (
  SELECT tmwe_email FROM user_profiles WHERE user_id = auth.uid()
));

CREATE POLICY "Users can insert own sync preferences"
ON user_sync_preferences FOR INSERT
WITH CHECK (user_email IN (
  SELECT tmwe_email FROM user_profiles WHERE user_id = auth.uid()
));

-- Trigger for updated_at
CREATE TRIGGER update_user_sync_preferences_updated_at
  BEFORE UPDATE ON user_sync_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();