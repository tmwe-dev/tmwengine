-- ============================================
-- MIGRAZIONE: Dynamic Turn-Taking per Bar Chat
-- Data: 2025-01-14
-- Descrizione: Aggiunge colonne per gestione intelligente turni conversazione
-- ============================================

-- 1. Aggiungi colonna turn_strategy (enum via CHECK constraint)
ALTER TABLE public.chat_laboratory_bar_mode
ADD COLUMN turn_strategy text NOT NULL DEFAULT 'RANDOM_30'
CHECK (turn_strategy IN ('RANDOM_30', 'ROUND_ROBIN', 'SMART_PRIORITY', 'INTERRUPT_BASED'));

-- 2. Aggiungi colonna cognitive_buffers (JSON array dei buffer agenti)
ALTER TABLE public.chat_laboratory_bar_mode
ADD COLUMN cognitive_buffers jsonb DEFAULT '[]'::jsonb;

-- 3. Aggiungi colonna pause_between_turns_ms (pausa configurabile tra turni)
ALTER TABLE public.chat_laboratory_bar_mode
ADD COLUMN pause_between_turns_ms integer DEFAULT 800
CHECK (pause_between_turns_ms >= 400 AND pause_between_turns_ms <= 2000);

-- 4. Aggiungi colonna enable_direct_call_detection (rileva @nome_agente)
ALTER TABLE public.chat_laboratory_bar_mode
ADD COLUMN enable_direct_call_detection boolean DEFAULT true;

-- 5. Crea indice per performance su conversation_id (se non esiste già)
CREATE INDEX IF NOT EXISTS idx_bar_mode_conversation_id 
ON public.chat_laboratory_bar_mode(conversation_id);

-- 6. Commenti per documentazione schema
COMMENT ON COLUMN public.chat_laboratory_bar_mode.turn_strategy IS 
'Strategia di selezione prossimo speaker: RANDOM_30 (casuale 30%), ROUND_ROBIN (a turno), SMART_PRIORITY (basata su priorità), INTERRUPT_BASED (basata su interruzioni)';

COMMENT ON COLUMN public.chat_laboratory_bar_mode.cognitive_buffers IS 
'Buffer cognitivi per ogni agente: [{agent_id, pending_context, last_speak_time, priority_score}]';

COMMENT ON COLUMN public.chat_laboratory_bar_mode.pause_between_turns_ms IS 
'Pausa in millisecondi tra turni agenti (range: 400-2000ms)';

COMMENT ON COLUMN public.chat_laboratory_bar_mode.enable_direct_call_detection IS 
'Abilita rilevamento chiamate dirette come "@Claude" o "@GPT" nei messaggi utente';