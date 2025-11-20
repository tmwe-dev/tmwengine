-- Make rubrica_id optional in attivita table
ALTER TABLE attivita ALTER COLUMN rubrica_id DROP NOT NULL;

-- Add sender_email column for email automation
ALTER TABLE attivita ADD COLUMN IF NOT EXISTS sender_email TEXT;

-- Create index for sender_email lookups
CREATE INDEX IF NOT EXISTS idx_attivita_sender_email ON attivita(sender_email);

-- Add comment for documentation
COMMENT ON COLUMN attivita.sender_email IS 'Email address of the sender when activity is created from email automation (without rubrica contact)';
COMMENT ON COLUMN attivita.rubrica_id IS 'Optional reference to rubrica contact - null for email-only activities';