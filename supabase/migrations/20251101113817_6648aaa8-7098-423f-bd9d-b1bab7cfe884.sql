-- Fix email_ai_classifications: add UNIQUE constraint on email_id
-- and make it NOT NULL since it's the FK to email_messages

-- First, ensure email_id is populated (should be already from cleanup)
UPDATE email_ai_classifications 
SET email_id = email_message_id 
WHERE email_id IS NULL AND email_message_id IS NOT NULL;

-- Make email_id NOT NULL
ALTER TABLE email_ai_classifications 
ALTER COLUMN email_id SET NOT NULL;

-- Add UNIQUE constraint on email_id
ALTER TABLE email_ai_classifications 
ADD CONSTRAINT email_ai_classifications_email_id_unique UNIQUE (email_id);