-- Add icon column to email_sender_groups table
ALTER TABLE email_sender_groups 
ADD COLUMN IF NOT EXISTS icon TEXT;

-- Add comment to describe the column
COMMENT ON COLUMN email_sender_groups.icon IS 
  'Lucide React icon name for the group (e.g., Building2, Mail, AlertCircle)';