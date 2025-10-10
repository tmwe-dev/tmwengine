-- Aggiunge colonna per tracciare l'ultimo partecipante che ha parlato
ALTER TABLE chat_laboratory_conversations
ADD COLUMN IF NOT EXISTS last_speaker_index INTEGER DEFAULT 0;