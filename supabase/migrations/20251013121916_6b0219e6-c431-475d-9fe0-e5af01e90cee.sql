-- Add response_mode column to chat_laboratory_bar_mode table
ALTER TABLE public.chat_laboratory_bar_mode 
ADD COLUMN IF NOT EXISTS response_mode TEXT NOT NULL DEFAULT 'sequential';

-- Add comment to explain the field
COMMENT ON COLUMN public.chat_laboratory_bar_mode.response_mode IS 'Response mode: sequential (one agent at a time) or parallel (all agents together)';