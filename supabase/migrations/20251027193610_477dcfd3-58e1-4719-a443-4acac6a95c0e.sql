-- Add personality_section_id to chat_laboratory_conversations
ALTER TABLE chat_laboratory_conversations
ADD COLUMN personality_section_id UUID REFERENCES chat_laboratory_prompt_sections(id);

-- Add index for better query performance
CREATE INDEX idx_conversations_personality ON chat_laboratory_conversations(personality_section_id);

-- Add comment
COMMENT ON COLUMN chat_laboratory_conversations.personality_section_id IS 'Assigned personality section for this conversation';