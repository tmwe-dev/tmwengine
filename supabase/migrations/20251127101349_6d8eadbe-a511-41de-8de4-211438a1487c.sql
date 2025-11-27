-- Add unique constraint on tmwe_email_id for Zero-Sync upsert to work
-- This enables proper upsert with onConflict: 'tmwe_email_id'

-- First, remove any duplicates (keep the most recent)
DELETE FROM email_ai_classifications a
USING email_ai_classifications b
WHERE a.tmwe_email_id = b.tmwe_email_id
  AND a.tmwe_email_id IS NOT NULL
  AND a.created_at < b.created_at;

-- Create unique index on tmwe_email_id (only for non-null values)
CREATE UNIQUE INDEX IF NOT EXISTS idx_email_ai_classifications_tmwe_email_id_unique 
ON email_ai_classifications(tmwe_email_id) 
WHERE tmwe_email_id IS NOT NULL;

-- Add comment explaining the constraint
COMMENT ON INDEX idx_email_ai_classifications_tmwe_email_id_unique IS 'Ensures unique tmwe_email_id for Zero-Sync architecture. Allows upsert with onConflict: tmwe_email_id';