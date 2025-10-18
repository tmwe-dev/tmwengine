-- ============================================================
-- MIGRATION: Bar Chat Autonomo - Schema Update
-- Aggiunge support per agent_interaction_mode, conversation_style
-- Rimuove dipendenza da turn_strategy obsoleto
-- ============================================================

-- 1. Aggiungi colonna agent_interaction_mode in chat_laboratory_bar_mode
ALTER TABLE chat_laboratory_bar_mode 
ADD COLUMN IF NOT EXISTS agent_interaction_mode TEXT DEFAULT 'consultation'
CHECK (agent_interaction_mode IN ('consultation', 'free_bar'));

COMMENT ON COLUMN chat_laboratory_bar_mode.agent_interaction_mode IS 
'Modalità interazione agenti: consultation (1 volta ciascuno) | free_bar (max 3 autonomo)';

-- 2. Aggiungi colonna conversation_style se non esiste già in chat_laboratory_bar_mode
ALTER TABLE chat_laboratory_bar_mode 
ADD COLUMN IF NOT EXISTS conversation_style TEXT DEFAULT 'colleagues'
CHECK (conversation_style IN ('boss_talk', 'colleagues', 'bar_chat'));

COMMENT ON COLUMN chat_laboratory_bar_mode.conversation_style IS 
'Stile conversazionale: boss_talk | colleagues | bar_chat';

-- 3. Rendi turn_strategy nullable (non più obbligatorio)
ALTER TABLE chat_laboratory_bar_mode 
ALTER COLUMN turn_strategy DROP NOT NULL;

-- 4. Imposta turn_strategy a NULL per record con RANDOM_30 o SMART_PRIORITY (obsoleti)
UPDATE chat_laboratory_bar_mode 
SET turn_strategy = NULL 
WHERE turn_strategy IN ('RANDOM_30', 'SMART_PRIORITY');

-- 5. Aggiungi colonna current_turn_interventions in chat_laboratory_conversations
ALTER TABLE chat_laboratory_conversations 
ADD COLUMN IF NOT EXISTS current_turn_interventions JSONB DEFAULT '{}'::jsonb;

COMMENT ON COLUMN chat_laboratory_conversations.current_turn_interventions IS 
'Contatore interventi per agente nel turno corrente: {"gemini": 2, "chatgpt": 1, "claude": 0}';