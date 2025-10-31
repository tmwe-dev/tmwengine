-- =====================================================
-- SMART INBOX INTELLIGENTE: Integrazione Server TMWE
-- Data: 2025-10-31
-- =====================================================

-- Aggiungi campi per integrazione server TMWE
ALTER TABLE email_ai_classifications 
ADD COLUMN IF NOT EXISTS email_uid TEXT,
ADD COLUMN IF NOT EXISTS folder_name TEXT DEFAULT 'INBOX',
ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT false;

-- Crea indice per ricerca veloce su email_uid
CREATE INDEX IF NOT EXISTS idx_email_ai_classifications_uid 
ON email_ai_classifications(email_uid, user_email);

-- Crea indice per email non verificate
CREATE INDEX IF NOT EXISTS idx_email_ai_classifications_unverified
ON email_ai_classifications(user_email, is_verified, confidence);

-- Rendi email_message_id nullable (legacy field)
ALTER TABLE email_ai_classifications 
ALTER COLUMN email_message_id DROP NOT NULL;