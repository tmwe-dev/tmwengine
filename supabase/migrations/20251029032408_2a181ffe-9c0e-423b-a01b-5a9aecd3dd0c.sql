-- Fix sync_status constraint and update existing records
-- Step 1: Drop old constraint
ALTER TABLE email_messages DROP CONSTRAINT IF EXISTS email_messages_sync_status_check;

-- Step 2: Add new constraint with 'fun_email_backup' value
ALTER TABLE email_messages ADD CONSTRAINT email_messages_sync_status_check 
  CHECK (sync_status IN ('sincronizzato', 'parziale', 'errore', 'fun_email_backup'));

-- Step 3: Update existing records
UPDATE email_messages 
SET sync_status = 'fun_email_backup' 
WHERE sync_status = 'sincronizzato';