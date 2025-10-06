-- Aggiornare i record esistenti con user_email

-- 1. Aggiorna email_messages con l'email dall'unica credenziale TMWE esistente
UPDATE email_messages 
SET user_email = (SELECT email FROM user_tmwe_credentials LIMIT 1)
WHERE user_email IS NULL;

-- 2. Aggiorna email_attachments
UPDATE email_attachments 
SET user_email = (SELECT email FROM user_tmwe_credentials LIMIT 1)
WHERE user_email IS NULL;

-- 3. Aggiorna email_sync_logs
UPDATE email_sync_logs 
SET user_email = (SELECT email FROM user_tmwe_credentials LIMIT 1)
WHERE user_email IS NULL;

-- 4. Aggiorna email_sync_progress
UPDATE email_sync_progress 
SET user_email = (SELECT email FROM user_tmwe_credentials LIMIT 1)
WHERE user_email IS NULL;