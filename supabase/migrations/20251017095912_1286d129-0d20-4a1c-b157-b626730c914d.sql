-- Add auto_advance_tabs field to chat_laboratory_bar_mode table
ALTER TABLE chat_laboratory_bar_mode 
ADD COLUMN IF NOT EXISTS auto_advance_tabs BOOLEAN DEFAULT false;