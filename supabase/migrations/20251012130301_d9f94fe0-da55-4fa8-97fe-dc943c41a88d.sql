-- Crea tabella per configurazione Voice Agent
CREATE TABLE IF NOT EXISTS public.voice_agent_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  elevenlabs_api_key TEXT NOT NULL,
  agent_id TEXT,
  enabled BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Abilita RLS
ALTER TABLE public.voice_agent_config ENABLE ROW LEVEL SECURITY;

-- Policy per permettere a tutti gli utenti autenticati di leggere/scrivere
CREATE POLICY "Allow all operations on voice_agent_config"
ON public.voice_agent_config
FOR ALL
USING (true)
WITH CHECK (true);

-- Trigger per aggiornare updated_at
CREATE TRIGGER update_voice_agent_config_updated_at
  BEFORE UPDATE ON public.voice_agent_config
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();