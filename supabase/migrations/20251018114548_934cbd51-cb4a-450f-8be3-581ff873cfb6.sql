-- TASK 1: Ridurre pause conversazionali a 50ms (rimuovi constraint prima)

-- Rimuovi constraint che blocca valori < 400
ALTER TABLE chat_laboratory_bar_mode 
DROP CONSTRAINT IF EXISTS chat_laboratory_bar_mode_pause_between_turns_ms_check;

-- Rimuovi constraint su chat_laboratory_conversations se esiste
ALTER TABLE chat_laboratory_conversations 
DROP CONSTRAINT IF EXISTS chat_laboratory_conversations_pause_between_agents_ms_check;

-- Aggiungi nuovi constraint che permettono 50ms
ALTER TABLE chat_laboratory_bar_mode 
ADD CONSTRAINT chat_laboratory_bar_mode_pause_between_turns_ms_check 
CHECK (pause_between_turns_ms >= 50 AND pause_between_turns_ms <= 5000);

ALTER TABLE chat_laboratory_conversations 
ADD CONSTRAINT chat_laboratory_conversations_pause_between_agents_ms_check 
CHECK (pause_between_agents_ms >= 50 AND pause_between_agents_ms <= 5000);

-- Aggiorna default
ALTER TABLE chat_laboratory_bar_mode 
ALTER COLUMN pause_between_turns_ms SET DEFAULT 50;

ALTER TABLE chat_laboratory_conversations 
ALTER COLUMN pause_between_agents_ms SET DEFAULT 50;

-- Aggiorna record esistenti
UPDATE chat_laboratory_bar_mode SET pause_between_turns_ms = 50 WHERE pause_between_turns_ms = 800;
UPDATE chat_laboratory_conversations SET pause_between_agents_ms = 50 WHERE pause_between_agents_ms = 800;