-- Add summary tracking columns to chat_laboratory_conversations
ALTER TABLE chat_laboratory_conversations 
ADD COLUMN IF NOT EXISTS summary_chunks JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS last_summarized_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS last_message_summarized INTEGER DEFAULT 0;

-- Add index for efficient summary queries
CREATE INDEX IF NOT EXISTS idx_lab_conversations_last_summarized 
ON chat_laboratory_conversations(last_summarized_at DESC) 
WHERE last_summarized_at IS NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN chat_laboratory_conversations.summary_chunks IS 'Array of summary chunks: [{messageRange: [start, end], summary: string, keyPoints: string[], participants: string[]}]';
COMMENT ON COLUMN chat_laboratory_conversations.last_summarized_at IS 'Timestamp of last summary generation';
COMMENT ON COLUMN chat_laboratory_conversations.last_message_summarized IS 'Message count at last summarization';