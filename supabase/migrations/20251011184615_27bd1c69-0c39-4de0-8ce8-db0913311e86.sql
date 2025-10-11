-- Fix chat_laboratory_bar_mode constraint to allow both 'laboratory' and 'bar' modes
ALTER TABLE chat_laboratory_bar_mode 
DROP CONSTRAINT IF EXISTS chat_laboratory_bar_mode_mode_check;

ALTER TABLE chat_laboratory_bar_mode 
ADD CONSTRAINT chat_laboratory_bar_mode_mode_check 
CHECK (mode IN ('laboratory', 'bar'));