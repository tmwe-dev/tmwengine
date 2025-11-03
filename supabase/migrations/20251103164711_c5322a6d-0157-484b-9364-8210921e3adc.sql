-- Indice per thread_id (strategia primaria futura)
CREATE INDEX IF NOT EXISTS idx_email_messages_thread_id 
ON email_messages(thread_id) 
WHERE thread_id IS NOT NULL;

-- Indice per message_id (lookup diretto)
CREATE INDEX IF NOT EXISTS idx_email_messages_message_id 
ON email_messages(message_id);

-- Indice per in_reply_to (costruzione thread RFC)
CREATE INDEX IF NOT EXISTS idx_email_messages_in_reply_to 
ON email_messages(in_reply_to) 
WHERE in_reply_to IS NOT NULL;

-- Indice composto per subject matching (strategia attuale)
CREATE INDEX IF NOT EXISTS idx_email_messages_subject_date 
ON email_messages(LOWER(subject), data_ricezione DESC);

-- Indice per from_email (filtro thread per mittente)
CREATE INDEX IF NOT EXISTS idx_email_messages_from_email 
ON email_messages(from_email, data_ricezione DESC);

-- Indice per user_email (RLS performance)
CREATE INDEX IF NOT EXISTS idx_email_messages_user_email 
ON email_messages(user_email);

-- Statistiche per ottimizzatore
ANALYZE email_messages;