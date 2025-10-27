-- Add composed_prompt_id to chat_laboratory_conversations
ALTER TABLE chat_laboratory_conversations 
ADD COLUMN composed_prompt_id UUID REFERENCES chat_laboratory_composed_prompts(id) ON DELETE SET NULL;

-- Add index for better query performance
CREATE INDEX idx_conversations_composed_prompt ON chat_laboratory_conversations(composed_prompt_id);

-- Add comment
COMMENT ON COLUMN chat_laboratory_conversations.composed_prompt_id IS 
'Se presente, questo prompt preconfezionato sostituisce il prompt globale per questa conversazione';
