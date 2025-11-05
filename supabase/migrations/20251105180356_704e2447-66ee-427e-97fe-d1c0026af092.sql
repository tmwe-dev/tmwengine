-- Create email_import_errors table for tracking failed email imports
CREATE TABLE IF NOT EXISTS email_import_errors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  uid text NOT NULL,
  folder_name text NOT NULL,
  user_email text NOT NULL,
  error_message text NOT NULL,
  error_type text NOT NULL,
  retry_count integer DEFAULT 0,
  status text DEFAULT 'pending',
  metadata jsonb DEFAULT '{}',
  first_error_at timestamptz DEFAULT now(),
  last_retry_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(uid, folder_name, user_email)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_email_errors_status ON email_import_errors(status);
CREATE INDEX IF NOT EXISTS idx_email_errors_user ON email_import_errors(user_email);
CREATE INDEX IF NOT EXISTS idx_email_errors_folder ON email_import_errors(folder_name);
CREATE INDEX IF NOT EXISTS idx_email_errors_retry ON email_import_errors(retry_count) WHERE status = 'pending';

-- Enable RLS
ALTER TABLE email_import_errors ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own errors" 
ON email_import_errors FOR SELECT 
USING (true);

CREATE POLICY "System can insert errors" 
ON email_import_errors FOR INSERT 
WITH CHECK (true);

CREATE POLICY "System can update errors" 
ON email_import_errors FOR UPDATE 
USING (true);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_email_import_errors_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_email_import_errors_updated_at
BEFORE UPDATE ON email_import_errors
FOR EACH ROW
EXECUTE FUNCTION update_email_import_errors_updated_at();