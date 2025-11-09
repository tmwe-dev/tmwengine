
-- Cleanup database: remove empty emails and reset email_temp_index
-- This fixes the issue where Archives emails have "(No Subject)" and "Unknown" sender

-- Step 1: Delete all empty/incomplete emails for luca@tmwe.it
DELETE FROM email_messages
WHERE user_email = 'luca@tmwe.it'
  AND (
    (subject IS NULL OR subject = '' OR subject = '(No Subject)')
    OR from_email = 'Unknown'
  );

-- Step 2: Reset email_temp_index to allow re-download (fixed column name: folder not folder_name)
UPDATE email_temp_index
SET status = 'pending'
WHERE user_email = 'luca@tmwe.it'
  AND folder LIKE 'Archives%';

-- Log the cleanup operation
INSERT INTO project_history (operation, tables_modified, metadata)
VALUES (
  'data_cleanup',
  ARRAY['email_messages', 'email_temp_index'],
  '{"reason": "Remove empty emails with (No Subject) and Unknown sender", "user": "luca@tmwe.it", "folders": "Archives/*"}'::jsonb
);
