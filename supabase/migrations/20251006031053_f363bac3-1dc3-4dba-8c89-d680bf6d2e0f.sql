-- Aggiungere colonna user_email alle tabelle personali per supporto multi-utente

-- Tabella email_messages - aggiungere user_email
ALTER TABLE public.email_messages 
ADD COLUMN IF NOT EXISTS user_email TEXT;

-- Creare indice per performance
CREATE INDEX IF NOT EXISTS idx_email_messages_user_email 
ON public.email_messages(user_email);

-- Tabella email_attachments - aggiungere user_email
ALTER TABLE public.email_attachments 
ADD COLUMN IF NOT EXISTS user_email TEXT;

CREATE INDEX IF NOT EXISTS idx_email_attachments_user_email 
ON public.email_attachments(user_email);

-- Tabella email_sync_logs - aggiungere user_email
ALTER TABLE public.email_sync_logs 
ADD COLUMN IF NOT EXISTS user_email TEXT;

CREATE INDEX IF NOT EXISTS idx_email_sync_logs_user_email 
ON public.email_sync_logs(user_email);

-- Tabella email_sync_progress - aggiungere user_email  
ALTER TABLE public.email_sync_progress 
ADD COLUMN IF NOT EXISTS user_email TEXT;

CREATE INDEX IF NOT EXISTS idx_email_sync_progress_user_email 
ON public.email_sync_progress(user_email);

-- Commenti per documentazione
COMMENT ON COLUMN email_messages.user_email IS 'Email dell''utente proprietario del messaggio (da TMWE OAuth2)';
COMMENT ON COLUMN email_attachments.user_email IS 'Email dell''utente proprietario dell''allegato';
COMMENT ON COLUMN email_sync_logs.user_email IS 'Email dell''utente che ha avviato la sincronizzazione';
COMMENT ON COLUMN email_sync_progress.user_email IS 'Email dell''utente per il progresso della sincronizzazione';