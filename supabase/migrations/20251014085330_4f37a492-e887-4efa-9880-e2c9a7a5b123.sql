-- Add message reduction and sequential timing settings to chat_laboratory_conversations
ALTER TABLE chat_laboratory_conversations 
ADD COLUMN IF NOT EXISTS reduce_user_messages BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS pause_between_agents_ms INTEGER DEFAULT 800;

-- Update existing rows
UPDATE chat_laboratory_conversations 
SET reduce_user_messages = true, 
    pause_between_agents_ms = 800
WHERE reduce_user_messages IS NULL;