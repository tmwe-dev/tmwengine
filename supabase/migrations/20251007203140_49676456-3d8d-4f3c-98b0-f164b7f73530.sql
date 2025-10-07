-- Fase 3: Aggiorna tabella user_profiles con preferenze lingua

-- Aggiungi colonne per preferenze lingua se non esistono
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_profiles' AND column_name = 'preferred_language') THEN
    ALTER TABLE public.user_profiles ADD COLUMN preferred_language TEXT NOT NULL DEFAULT 'it';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_profiles' AND column_name = 'reading_language') THEN
    ALTER TABLE public.user_profiles ADD COLUMN reading_language TEXT NOT NULL DEFAULT 'it';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_profiles' AND column_name = 'writing_language') THEN
    ALTER TABLE public.user_profiles ADD COLUMN writing_language TEXT NOT NULL DEFAULT 'it';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_profiles' AND column_name = 'translation_mode') THEN
    ALTER TABLE public.user_profiles ADD COLUMN translation_mode TEXT NOT NULL DEFAULT 'none';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_profiles' AND column_name = 'auto_translate_writing') THEN
    ALTER TABLE public.user_profiles ADD COLUMN auto_translate_writing BOOLEAN NOT NULL DEFAULT false;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_profiles' AND column_name = 'enable_auto_speaker') THEN
    ALTER TABLE public.user_profiles ADD COLUMN enable_auto_speaker BOOLEAN NOT NULL DEFAULT false;
  END IF;
END $$;

COMMENT ON COLUMN public.user_profiles.preferred_language IS 'Lingua preferita dell''utente';
COMMENT ON COLUMN public.user_profiles.reading_language IS 'Lingua in cui l''utente vuole leggere i messaggi';
COMMENT ON COLUMN public.user_profiles.writing_language IS 'Lingua in cui l''utente scrive i messaggi';
COMMENT ON COLUMN public.user_profiles.translation_mode IS 'Modalità traduzione: none, read_only, write_only, both, dual_view (originale sopra, traduzione sotto)';
COMMENT ON COLUMN public.user_profiles.auto_translate_writing IS 'Se true, traduce automaticamente i messaggi scritti dall''utente';
COMMENT ON COLUMN public.user_profiles.enable_auto_speaker IS 'Se true, legge automaticamente i messaggi in arrivo';