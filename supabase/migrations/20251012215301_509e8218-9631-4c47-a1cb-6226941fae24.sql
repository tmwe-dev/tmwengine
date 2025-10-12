-- Add message_sequence column to chat_laboratory_messages
ALTER TABLE chat_laboratory_messages 
ADD COLUMN message_sequence INTEGER;

-- Create index for performance
CREATE INDEX idx_lab_messages_sequence 
ON chat_laboratory_messages(conversation_id, message_sequence);

-- Populate sequence for existing messages based on created_at
UPDATE chat_laboratory_messages AS m
SET message_sequence = subq.row_num
FROM (
  SELECT id, 
         ROW_NUMBER() OVER (
           PARTITION BY conversation_id 
           ORDER BY created_at ASC
         ) as row_num
  FROM chat_laboratory_messages
) AS subq
WHERE m.id = subq.id;