-- Rimuovi il campo active_elevenlabs_agents da chat_laboratory_bar_mode
-- Non è più necessario perché usiamo direttamente is_active dalla tabella elevenlabs_agents

ALTER TABLE chat_laboratory_bar_mode DROP COLUMN IF EXISTS active_elevenlabs_agents;