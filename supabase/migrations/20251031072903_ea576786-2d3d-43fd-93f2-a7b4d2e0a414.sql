-- Fix: Add unique constraint for email_uid + user_email (required for upsert)

-- Drop the old unique constraint on email_message_id if it exists
ALTER TABLE email_ai_classifications 
DROP CONSTRAINT IF EXISTS email_ai_classifications_email_message_id_user_email_key;

-- Create unique constraint on (email_uid, user_email)
-- This ensures one classification per email per user
ALTER TABLE email_ai_classifications 
ADD CONSTRAINT email_ai_classifications_email_uid_user_email_key 
UNIQUE (email_uid, user_email);

-- Verify email_uid is not nullable (required for unique constraint)
ALTER TABLE email_ai_classifications 
ALTER COLUMN email_uid SET NOT NULL;