-- Add Bar Chat Audio Controls columns
-- Migration: add_bar_audio_controls
-- Date: 2025-01-12

-- Add interrupt_requested flag for stopping AI mid-response
ALTER TABLE chat_laboratory_bar_mode 
ADD COLUMN IF NOT EXISTS interrupt_requested boolean DEFAULT false;

-- Add continuous_mic_enabled toggle
ALTER TABLE chat_laboratory_bar_mode 
ADD COLUMN IF NOT EXISTS continuous_mic_enabled boolean DEFAULT false;

-- Create index for fast interrupt checks
CREATE INDEX IF NOT EXISTS idx_bar_mode_interrupt 
ON chat_laboratory_bar_mode(conversation_id, interrupt_requested)
WHERE interrupt_requested = true;

-- Comment for documentation
COMMENT ON COLUMN chat_laboratory_bar_mode.interrupt_requested IS 'Flag per interrompere generazione AI in corso';
COMMENT ON COLUMN chat_laboratory_bar_mode.continuous_mic_enabled IS 'Abilita registrazione microfono continua';