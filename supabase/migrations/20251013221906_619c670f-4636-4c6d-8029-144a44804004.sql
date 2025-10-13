-- Aggiungi sistema TTS duale a user_profiles
-- Data: 2025-01-13
-- Motivo: Supporto ElevenLabs TTS + Thai language

-- Aggiungi colonna per selezionare il motore TTS
ALTER TABLE public.user_profiles 
ADD COLUMN IF NOT EXISTS tts_engine TEXT DEFAULT 'native' CHECK (tts_engine IN ('native', 'elevenlabs'));

-- Aggiungi colonna per la voce ElevenLabs preferita
ALTER TABLE public.user_profiles 
ADD COLUMN IF NOT EXISTS preferred_elevenlabs_voice TEXT DEFAULT '9BWtsMINqrJLrRacOk9x';

-- Commenti per documentazione
COMMENT ON COLUMN public.user_profiles.tts_engine IS 'Motore TTS: native (browser SpeechSynthesis) o elevenlabs (API premium)';
COMMENT ON COLUMN public.user_profiles.preferred_elevenlabs_voice IS 'Voice ID ElevenLabs preferita (default: Aria - 9BWtsMINqrJLrRacOk9x)';
