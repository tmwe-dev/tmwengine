-- Aggiungi campo tmwe_email opzionale a user_profiles per il mapping
ALTER TABLE public.user_profiles 
ADD COLUMN IF NOT EXISTS tmwe_email text UNIQUE;

-- Aggiungi indice per ricerche veloci
CREATE INDEX IF NOT EXISTS idx_user_profiles_tmwe_email 
ON public.user_profiles(tmwe_email);

-- Commento per chiarezza
COMMENT ON COLUMN public.user_profiles.tmwe_email IS 'Email TMWE associata al profilo utente per il bridge OAuth';