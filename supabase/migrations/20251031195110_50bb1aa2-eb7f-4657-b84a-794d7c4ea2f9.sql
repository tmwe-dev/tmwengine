-- Aggiungi colonne mancanti a email_ai_classifications per salvare dati email completi
ALTER TABLE email_ai_classifications
ADD COLUMN IF NOT EXISTS subject TEXT,
ADD COLUMN IF NOT EXISTS body_preview TEXT,
ADD COLUMN IF NOT EXISTS body_text TEXT,
ADD COLUMN IF NOT EXISTS has_attachments BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS email_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS email_id INTEGER;

-- Aggiungi indici per migliorare le performance
CREATE INDEX IF NOT EXISTS idx_email_ai_classifications_email_id ON email_ai_classifications(email_id);
CREATE INDEX IF NOT EXISTS idx_email_ai_classifications_email_date ON email_ai_classifications(email_date);

-- Commento per documentare le nuove colonne
COMMENT ON COLUMN email_ai_classifications.subject IS 'Oggetto originale dell''email';
COMMENT ON COLUMN email_ai_classifications.body_preview IS 'Anteprima corpo email (primi 500 caratteri)';
COMMENT ON COLUMN email_ai_classifications.body_text IS 'Corpo completo dell''email';
COMMENT ON COLUMN email_ai_classifications.has_attachments IS 'Flag che indica se l''email ha allegati';
COMMENT ON COLUMN email_ai_classifications.email_date IS 'Data originale dell''email dal server';
COMMENT ON COLUMN email_ai_classifications.email_id IS 'ID dell''email sul server TMWE';