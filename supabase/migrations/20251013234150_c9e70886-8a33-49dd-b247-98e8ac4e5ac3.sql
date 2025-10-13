-- Migration: Aggiungi default_voice_id a voice_agent_config
-- Date: 2025-01-13
-- Purpose: Supportare selezione dinamica voice ElevenLabs

ALTER TABLE public.voice_agent_config
ADD COLUMN IF NOT EXISTS default_voice_id TEXT;

-- Commento descrittivo
COMMENT ON COLUMN public.voice_agent_config.default_voice_id IS 
'ElevenLabs Voice ID predefinito per TTS. Se NULL, usa primo agent attivo da elevenlabs_agents.';