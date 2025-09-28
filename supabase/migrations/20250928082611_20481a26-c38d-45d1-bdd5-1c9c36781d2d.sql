-- Aggiungi campi per il profilo utente nella tabella config_generale
ALTER TABLE public.config_generale 
ADD COLUMN IF NOT EXISTS nome_utente TEXT,
ADD COLUMN IF NOT EXISTS cognome_utente TEXT,  
ADD COLUMN IF NOT EXISTS email_utente TEXT,
ADD COLUMN IF NOT EXISTS ruolo_utente TEXT DEFAULT 'Utente',
ADD COLUMN IF NOT EXISTS telefono_utente TEXT;