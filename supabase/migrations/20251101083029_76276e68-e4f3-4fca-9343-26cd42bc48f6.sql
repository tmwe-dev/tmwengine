-- Drop existing email_id column if wrong type
ALTER TABLE email_ai_classifications 
DROP COLUMN IF EXISTS email_id CASCADE;

-- Re-add email_id column with correct UUID type
ALTER TABLE email_ai_classifications 
ADD COLUMN email_id uuid;

-- Create foreign key to email_messages
ALTER TABLE email_ai_classifications
ADD CONSTRAINT fk_email_ai_classifications_email_messages 
FOREIGN KEY (email_id) 
REFERENCES email_messages(id) 
ON DELETE CASCADE;

-- Create index for performance on JOIN queries
CREATE INDEX IF NOT EXISTS idx_email_ai_classifications_email_id 
ON email_ai_classifications(email_id);

-- Attempt to migrate existing data by matching email_uid with message_id
UPDATE email_ai_classifications ec
SET email_id = em.id
FROM email_messages em
WHERE ec.email_uid = em.message_id
  AND ec.email_id IS NULL
  AND ec.user_email = em.user_email;

-- Add documentation comment
COMMENT ON COLUMN email_ai_classifications.email_id IS 
'Foreign key to email_messages.id - ensures classification is tied to local DB backup. This enforces that Smart Inbox works exclusively with synchronized local data.';