-- Sprint 1: Add expertise_keywords to elevenlabs_agents for context-aware routing
ALTER TABLE elevenlabs_agents 
ADD COLUMN IF NOT EXISTS expertise_keywords TEXT[] DEFAULT '{}';

-- Add comment for documentation
COMMENT ON COLUMN elevenlabs_agents.expertise_keywords IS 'Keywords representing agent expertise for semantic routing (e.g., ["logistics", "supply chain"] for logistics agent)';

-- Add is_streaming column to chat_laboratory_messages for progressive rendering
ALTER TABLE chat_laboratory_messages
ADD COLUMN IF NOT EXISTS is_streaming BOOLEAN DEFAULT false;

COMMENT ON COLUMN chat_laboratory_messages.is_streaming IS 'Indicates if the message is currently being streamed from AI';
