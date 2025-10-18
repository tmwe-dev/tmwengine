-- FIX 1: Pulizia memoria contaminata da conversazioni precedenti
-- Ripulisci TUTTE le conversazioni con < 10 messaggi
UPDATE chat_laboratory_conversations
SET riassunto_contesto = NULL,
    last_summarized_at = NULL,
    last_message_summarized = 0
WHERE (
  SELECT COUNT(*) 
  FROM chat_laboratory_messages 
  WHERE conversation_id = chat_laboratory_conversations.id
) < 10;

-- Ripulisci anche i summary_chunks per conversazioni brevi
UPDATE chat_laboratory_conversations
SET summary_chunks = '[]'::jsonb
WHERE (
  SELECT COUNT(*) 
  FROM chat_laboratory_messages 
  WHERE conversation_id = chat_laboratory_conversations.id
) < 10;