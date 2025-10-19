-- Rimuovi colonna cognitive_buffers dalla tabella chat_laboratory_bar_mode
ALTER TABLE public.chat_laboratory_bar_mode 
DROP COLUMN IF EXISTS cognitive_buffers;