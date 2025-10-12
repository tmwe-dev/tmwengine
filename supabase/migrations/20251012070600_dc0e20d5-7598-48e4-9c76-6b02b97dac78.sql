-- Add economy mode columns to message tables
-- Chat Laboratory Messages
ALTER TABLE chat_laboratory_messages 
ADD COLUMN IF NOT EXISTS content_user_friendly text,
ADD COLUMN IF NOT EXISTS content_summary text,
ADD COLUMN IF NOT EXISTS is_summary_available boolean DEFAULT false;

-- Chat AI Messages
ALTER TABLE chat_messages 
ADD COLUMN IF NOT EXISTS content_user_friendly text,
ADD COLUMN IF NOT EXISTS content_summary text,
ADD COLUMN IF NOT EXISTS is_summary_available boolean DEFAULT false;

-- Intranet Messages
ALTER TABLE intranet_messages 
ADD COLUMN IF NOT EXISTS content_user_friendly text,
ADD COLUMN IF NOT EXISTS content_summary text,
ADD COLUMN IF NOT EXISTS is_summary_available boolean DEFAULT false;

-- Add economy mode settings to conversation/room tables
-- Chat Laboratory Conversations (default: economy ON, summaries ON)
ALTER TABLE chat_laboratory_conversations 
ADD COLUMN IF NOT EXISTS economy_mode boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS show_summaries_only boolean DEFAULT true;

-- Chat AI Conversations (default: economy ON, summaries ON)
ALTER TABLE chat_conversations 
ADD COLUMN IF NOT EXISTS economy_mode boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS show_summaries_only boolean DEFAULT true;

-- Intranet Rooms (default: economy ON, summaries ON)
ALTER TABLE intranet_rooms 
ADD COLUMN IF NOT EXISTS economy_mode boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS show_summaries_only boolean DEFAULT true;

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_chat_lab_messages_summary ON chat_laboratory_messages(is_summary_available) WHERE is_summary_available = true;
CREATE INDEX IF NOT EXISTS idx_chat_messages_summary ON chat_messages(is_summary_available) WHERE is_summary_available = true;
CREATE INDEX IF NOT EXISTS idx_intranet_messages_summary ON intranet_messages(is_summary_available) WHERE is_summary_available = true;