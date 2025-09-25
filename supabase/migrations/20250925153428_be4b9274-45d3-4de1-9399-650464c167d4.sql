-- Aggiungi configurazioni chat alla tabella config_generale
ALTER TABLE public.config_generale ADD COLUMN IF NOT EXISTS memoria_messaggi INTEGER DEFAULT 10;
ALTER TABLE public.config_generale ADD COLUMN IF NOT EXISTS memoria_ore INTEGER DEFAULT 2;
ALTER TABLE public.config_generale ADD COLUMN IF NOT EXISTS usa_riassunto BOOLEAN DEFAULT false;
ALTER TABLE public.config_generale ADD COLUMN IF NOT EXISTS max_token_conversazione INTEGER DEFAULT 4000;
ALTER TABLE public.config_generale ADD COLUMN IF NOT EXISTS mostra_statistiche BOOLEAN DEFAULT true;

-- Aggiungi colonna per memoria completa per conversazione
ALTER TABLE public.chat_conversations ADD COLUMN IF NOT EXISTS memoria_completa BOOLEAN DEFAULT false;
ALTER TABLE public.chat_conversations ADD COLUMN IF NOT EXISTS riassunto_contesto TEXT;

-- Aggiungi statistiche per messaggi
ALTER TABLE public.chat_messages ADD COLUMN IF NOT EXISTS token_input INTEGER;
ALTER TABLE public.chat_messages ADD COLUMN IF NOT EXISTS token_output INTEGER;
ALTER TABLE public.chat_messages ADD COLUMN IF NOT EXISTS tempo_risposta_ms INTEGER;

-- Tabella per tracking utilizzo token
CREATE TABLE IF NOT EXISTS public.chat_usage_stats (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES public.chat_conversations(id) ON DELETE CASCADE,
  data_utilizzo DATE NOT NULL DEFAULT CURRENT_DATE,
  token_totali_input INTEGER NOT NULL DEFAULT 0,
  token_totali_output INTEGER NOT NULL DEFAULT 0,
  numero_messaggi INTEGER NOT NULL DEFAULT 0,
  tempo_totale_ms INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(conversation_id, data_utilizzo)
);

-- Enable RLS
ALTER TABLE public.chat_usage_stats ENABLE ROW LEVEL SECURITY;

-- Policy per usage stats
CREATE POLICY "Allow all operations on chat_usage_stats" 
ON public.chat_usage_stats 
FOR ALL 
USING (true);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_chat_usage_stats_conversation_id ON public.chat_usage_stats(conversation_id);
CREATE INDEX IF NOT EXISTS idx_chat_usage_stats_data ON public.chat_usage_stats(data_utilizzo);

-- Realtime per usage stats
ALTER TABLE public.chat_usage_stats REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_usage_stats;

-- Aggiorna la configurazione generale con valori di default
INSERT INTO public.config_generale (memoria_messaggi, memoria_ore, usa_riassunto, max_token_conversazione, mostra_statistiche) 
VALUES (10, 2, false, 4000, true)
ON CONFLICT (id) DO UPDATE SET
  memoria_messaggi = EXCLUDED.memoria_messaggi,
  memoria_ore = EXCLUDED.memoria_ore,
  usa_riassunto = EXCLUDED.usa_riassunto,
  max_token_conversazione = EXCLUDED.max_token_conversazione,
  mostra_statistiche = EXCLUDED.mostra_statistiche;